// server.js

const express = require('express');
const http = require('http');
require('dotenv').config();
const socketIo = require('socket.io');
const ioClient = require('socket.io-client');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

// --- MODÜLLERİMİZ ---
const { ziynetUrunleri, gramUrunleri, piyasaUrunleri } = require('./src/config/products');
const { fiyatlariHesapla } = require('./src/utils/calculator');
const socketYoneticisi = require('./src/sockets/socketManager');

const app = express();
app.use(express.static('public'));

app.get('/gediz_sistem_yonetim_0103', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const server = http.createServer(app);
const io = socketIo(server);

const AYARLAR_DOSYASI = path.join(__dirname, 'data', 'settings.json');

// --- MODERN MİMARİ: ORTAK DURUM (STATE) OBJESİ ---
const state = {
    kayanYaziMetni: "",
    sonHesaplananFiyatlar: null,
    guncelHamVeri: null
};

function ayarlariYukle() {
    if (fs.existsSync(AYARLAR_DOSYASI)) {
        try {
            const kayitliVeri = fs.readFileSync(AYARLAR_DOSYASI, 'utf8');
            const kayitliAyarlar = JSON.parse(kayitliVeri);

            if (kayitliAyarlar.kayanYazi) state.kayanYaziMetni = kayitliAyarlar.kayanYazi;

            const tumUrunler = [...ziynetUrunleri, ...gramUrunleri, ...piyasaUrunleri];
            tumUrunler.forEach(u => {
                if (kayitliAyarlar[u.kod]) {
                    u.alisAyar = kayitliAyarlar[u.kod].alisAyar;
                    u.satisAyar = kayitliAyarlar[u.kod].satisAyar;
                    if (u.eskiAlisAyar !== undefined) {
                        u.eskiAlisAyar = kayitliAyarlar[u.kod].eskiAlisAyar || 0;
                        u.eskiSatisAyar = kayitliAyarlar[u.kod].eskiSatisAyar || 0;
                    }
                }
            });
            console.log("📂 Eski ayarlar ve kayan yazı başarıyla yüklendi!");
        } catch (err) {
            console.log("⚠️ Ayarlar dosyası okunamadı.");
        }
    }
}

ayarlariYukle();

function tvyeYayinla() {
    if (!state.guncelHamVeri) return;
    state.sonHesaplananFiyatlar = fiyatlariHesapla(state.guncelHamVeri);
    io.emit("guncel_fiyatlar", state.sonHesaplananFiyatlar);
    console.log("📺 YENİ FİYATLAR TV EKRANINA YANSITILDI!");
}

function piyasadanTekSeferlikVeriCek(otomatikYayinla = false) {
    console.log("📡 Piyasadan açılış verisi bekleniyor...");
    const geciciSoket = ioClient("https://www.leventkuyumculuk.com", {
        transports: ["polling", "websocket"],
        timeout: 10000
    });

    geciciSoket.once("price_changed", (gelenVeri) => {
        if (gelenVeri && gelenVeri.data) {
            state.guncelHamVeri = { ...state.guncelHamVeri, ...gelenVeri.data };
            if (otomatikYayinla) {
                tvyeYayinla();
            } else {
                console.log("✅ Sabah 09:00 verisi BEKLEME ODASINA alındı.");
            }
        }
        geciciSoket.disconnect();
    });

    geciciSoket.once("connect_error", (hata) => {
        console.log("⚠️ UYARI: Karşı siteye bağlanılamadı!");
        geciciSoket.disconnect();
        console.log("⏳ B Planı Devrede: 5 dakika sonra bağlantı tekrar denenecek...");
        setTimeout(() => { piyasadanTekSeferlikVeriCek(otomatikYayinla); }, 5 * 60 * 1000);
    });
}

piyasadanTekSeferlikVeriCek(true);

cron.schedule('0 9 * * *', () => {
    console.log("⏰ Saat tam 09:00! Piyasa verisi çekiliyor...");
    piyasadanTekSeferlikVeriCek(false);
}, { timezone: "Europe/Istanbul" });

// --- SOKET HABERLEŞMESİNİ HARİCİ YÖNETİCİYE DEVREDİYORUZ ---
socketYoneticisi(io, state, tvyeYayinla);

server.listen(3000, () => {
    console.log("🚀 KENDİ SUNUCUMUZ ÇALIŞIYOR!");
    console.log("📺 TV Ekranı için   : http://localhost:3000");
    console.log("⚙️  Admin Paneli için: http://localhost:3000/admin");
});