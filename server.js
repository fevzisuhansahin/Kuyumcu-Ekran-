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
// CSS, JS ve resimler gibi statik dosyalar için public ana klasörünü açık tutuyoruz
app.use(express.static('public'));

// 1. ANA SAYFA (TV EKRANI) Yönlendirmesi
app.get('/', (req, res) => {
    // Artık 'public' içinde değil, 'public/html' içinde aramasını söylüyoruz
    res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

// 2. ADMİN PANELİ Yönlendirmesi
app.get('/gediz_sistem_yonetim_0103', (req, res) => {
    // Admin panelinin de yeni adresini ('html' klasörü) gösteriyoruz
    res.sendFile(path.join(__dirname, 'public', 'html', 'admin.html'));
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

            // YENİ: Hafızadaki son piyasa fiyatlarını çekiyoruz (Levent sessizse hayat kurtarır)
            if (kayitliAyarlar.guncelHamVeri) state.guncelHamVeri = kayitliAyarlar.guncelHamVeri;

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
    // YENİ: Ham veri olmasa bile fırlatmayı durdurmuyoruz (Manuel ürünler için)
    state.sonHesaplananFiyatlar = fiyatlariHesapla(state.guncelHamVeri);
    io.emit("guncel_fiyatlar", state.sonHesaplananFiyatlar);
    console.log("📺 YENİ FİYATLAR TV EKRANINA YANSITILDI!");
}

// --- YENİ ÖZBAĞ ENTEGRASYONU ---
function piyasadanTekSeferlikVeriCek(otomatikYayinla = false) {
    console.log("📡 Özbağ Toptancı'dan veri bekleniyor...");

    // Özbağ'ın ana socket adresine bağlanıyoruz
    const geciciSoket = ioClient("wss://veri.ozbag.com", {
        transports: ["websocket"], // Sadece websocket kullanmaya zorluyoruz
        timeout: 10000
    });

    // Postacının adı artık "prices"
    geciciSoket.on("prices", (gelenVeriArray) => {
        if (gelenVeriArray && Array.isArray(gelenVeriArray)) {
            console.log("✅ Özbağ'dan güncel veri paketi başarıyla çekildi!");

            // 1. Özbağ'ın dizisini hızlı arama yapabilmek için objeye çeviriyoruz
            let ozbag = {};
            gelenVeriArray.forEach(urun => {
                ozbag[urun.Code] = urun;
            });

            // HAS'ın saatini alalım (Tüm ekran için geçerli olur)
            let formatliSaat = ozbag['HAS'] ? new Date(ozbag['HAS'].Time).toLocaleTimeString('tr-TR') : new Date().toLocaleTimeString('tr-TR');

            // 2. Doğrudan Eşleştirme (Matematik Yok!)
            let donusturulmusVeri = {
                "ALTIN": { alis: ozbag['HAS']?.Bid || 0, satis: ozbag['HAS']?.Ask || 0, tarih: formatliSaat },
                "GUMUSTRY": { alis: ozbag['XAGUSD']?.Bid || 0, satis: ozbag['XAGUSD']?.Ask || 0, tarih: formatliSaat },

                "CEYREK": {
                    yeniAlis: ozbag['YENİ ÇEYR']?.Bid || 0, yeniSatis: ozbag['YENİ ÇEYR']?.Ask || 0,
                    eskiAlis: ozbag['ESKİ ÇEYREK']?.Bid || 0, eskiSatis: ozbag['ESKİ ÇEYREK']?.Ask || 0
                },
                "YARIM": {
                    yeniAlis: ozbag['YENİ YARIM']?.Bid || 0, yeniSatis: ozbag['YENİ YARIM']?.Ask || 0,
                    eskiAlis: ozbag['ESKİ YARIM']?.Bid || 0, eskiSatis: ozbag['ESKİ YARIM']?.Ask || 0
                },
                "TAM": {
                    yeniAlis: ozbag['YENİ TAM']?.Bid || 0, yeniSatis: ozbag['YENİ TAM']?.Ask || 0,
                    eskiAlis: ozbag['ESKİ TAM']?.Bid || 0, eskiSatis: ozbag['ESKİ TAM']?.Ask || 0
                },
                "GREMSE": {
                    yeniAlis: ozbag['YENİ GRAMSE']?.Bid || 0, yeniSatis: ozbag['YENİ GRAMSE']?.Ask || 0,
                    eskiAlis: ozbag['ESKİ GRAMSE']?.Bid || 0, eskiSatis: ozbag['ESKİ GRAMSE']?.Ask || 0
                },
                "ATA": {
                    yeniAlis: ozbag['YENİ ATA']?.Bid || 0, yeniSatis: ozbag['YENİ ATA']?.Ask || 0,
                    eskiAlis: ozbag['ESKİ ATA']?.Bid || 0, eskiSatis: ozbag['ESKİ ATA']?.Ask || 0
                }
            };

            // Gelen yeni veriyi mevcut verilerimizin üzerine yazıyoruz
            state.guncelHamVeri = { ...state.guncelHamVeri, ...donusturulmusVeri };

            // YENİ: Özbağ'dan gelen veriyi KALICI HAFIZAYA (settings.json) yazıyoruz
            try {
                const kayitliVeri = fs.existsSync(AYARLAR_DOSYASI) ? JSON.parse(fs.readFileSync(AYARLAR_DOSYASI, 'utf8')) : {};
                kayitliVeri.guncelHamVeri = state.guncelHamVeri;
                fs.writeFileSync(AYARLAR_DOSYASI, JSON.stringify(kayitliVeri, null, 2));
            } catch (e) { console.log("Hafıza yazma hatası."); }

            if (otomatikYayinla) {
                tvyeYayinla();
            } else {
                console.log("✅ Sabah verisi BEKLEME ODASINA alındı.");
            }
        }
    });

    geciciSoket.on("connect_error", (hata) => {
        console.log("⚠️ UYARI: Özbağ sunucusuna bağlanılamadı! Hata:", hata.message);
        console.log("⏳ B Planı Devrede: 5 dakika sonra bağlantı tekrar denenecek...");

        // EKSİK OLAN HAYAT KURTARICI KOD BURASI!
        tvyeYayinla();

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

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KENDİ SUNUCUMUZ ${PORT} PORTUNDA ÇALIŞIYOR!`);
    console.log(`📺 TV Ekranı için   : http://localhost:${PORT}`);
    console.log(`⚙️  Admin Paneli için: http://localhost:${PORT}/admin`);
});

// // sadece localhostta (127.0.0.1) çalışacak şekil
// server.listen(3000, () => {
//     console.log("🚀 KENDİ SUNUCUMUZ ÇALIŞIYOR!");
//     console.log("📺 TV Ekranı için   : http://localhost:3000");
//     console.log("⚙️  Admin Paneli için: http://localhost:3000/admin");
// });