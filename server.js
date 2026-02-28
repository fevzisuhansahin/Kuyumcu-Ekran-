const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const ioClient = require('socket.io-client');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const app = express();
app.use(express.static('public'));

// --- GİZLİ KAPIMIZ (ADMİN PANELİ YÖNLENDİRMESİ) ---
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const server = http.createServer(app);
const io = socketIo(server);

// --- ADMİN ŞİFRESİ ---
const ADMIN_SIFRE = "123";
const AYARLAR_DOSYASI = path.join(__dirname, 'data', 'settings.json'); // YENİ: Ayarların kaydedileceği dosyanın yolu

let kayanYaziMetni = "";

// --- VARSAYILAN AYARLAR ---
// Artık sadece Has Altın (ALTIN) fiyatını alıp bu standart katsayılarla çarpıyoruz.
let ziynetUrunleri = [

    { isim: "ÇEYREK", kod: "CEYREK", yeniAlis: 1.63, yeniSatis: 1.65, eskiAlis: 1.625, eskiSatis: 1.645, alisAyar: 0, satisAyar: 0 },
    { isim: "YARIM", kod: "YARIM", yeniAlis: 3.27, yeniSatis: 3.29, eskiAlis: 3.24, eskiSatis: 3.275, alisAyar: 0, satisAyar: 0 },
    { isim: "TAM", kod: "TAM", yeniAlis: 6.51, yeniSatis: 6.54, eskiAlis: 6.47, eskiSatis: 6.525, alisAyar: 0, satisAyar: 0 },
    { isim: "GREMSE", kod: "GREMSE", yeniAlis: 16.22, yeniSatis: 16.30, eskiAlis: 16.14, eskiSatis: 16.26, alisAyar: 0, satisAyar: 0 },
    { isim: "ATA", kod: "ATA", yeniAlis: 6.67, yeniSatis: 6.715, eskiAlis: 6.67, eskiSatis: 6.715, alisAyar: 0, satisAyar: 0 }
];

let gramUrunleri = [
    { isim: "1 GR", kod: "KULCEALTIN", alisAyar: 0, satisAyar: 0 }
];

let piyasaUrunleri = [
    { isim: "ALTIN", kod: "ALTIN", alisAyar: 0, satisAyar: 0 },
    { isim: "GÜMÜŞ", kod: "GUMUSTRY", alisAyar: 0, satisAyar: 0 }
];

// --- YENİ: HAFIZAYI (JSON) YÜKLEME FONKSİYONU ---
function ayarlariYukle() {
    if (fs.existsSync(AYARLAR_DOSYASI)) {
        try {
            const kayitliVeri = fs.readFileSync(AYARLAR_DOSYASI, 'utf8');
            const kayitliAyarlar = JSON.parse(kayitliVeri);

            if (kayitliAyarlar.kayanYazi) {
                kayanYaziMetni = kayitliAyarlar.kayanYazi;
            }

            // Kayıtlı ayarları mevcut ürünlerimize uyguluyoruz
            const tumUrunler = [...ziynetUrunleri, ...gramUrunleri, ...piyasaUrunleri];
            tumUrunler.forEach(u => {
                if (kayitliAyarlar[u.kod]) {
                    u.alisAyar = kayitliAyarlar[u.kod].alisAyar;
                    u.satisAyar = kayitliAyarlar[u.kod].satisAyar;
                }
            });
            console.log("📂 Eski ayarlar ve kayan yazı başarıyla yüklendi!");
        } catch (err) {
            console.log("⚠️ Ayarlar dosyası okunamadı, varsayılanlar kullanılacak.");
        }
    } else {
        console.log("🆕 Ayar dosyası bulunamadı, sistem varsayılan ayarlarla başlıyor.");
    }
}

// Sistem başlarken eski ayarları hemen yükle
ayarlariYukle();

// YENİ MİMARİ DEĞİŞKENLERİ
let sonHesaplananFiyatlar = null; // Sadece TV'nin gördüğü (Onaylanmış)
let guncelHamVeri = null; // Sadece Admin'in gördüğü (Bekleme Odası)

const saatAyirla = (tarihMetni) => {
    if (!tarihMetni) return "";
    return tarihMetni.split(" ")[1] || tarihMetni;
};

// SADECE HESAPLAMA YAPAN SAF FONKSİYON
function fiyatlariHesapla(anaVeri) {
    let tvVerisi = { "Ziynet & Sarrafiye": [], "Gram Altın": [], "Piyasalar": [] };

    // Güvenlik: Eğer sistemde Has Altın (ALTIN) verisi yoksa hesaplama yapamayız
    if (!anaVeri || !anaVeri["ALTIN"]) return tvVerisi;

    // Tüm ziynetleri hesaplamak için baz alacağımız saf ALTIN fiyatı
    let hasAltinAlis = anaVeri["ALTIN"].alis;
    let hasAltinSatis = anaVeri["ALTIN"].satis;
    let altinSaat = saatAyirla(anaVeri["ALTIN"].tarih);

    // 1. ZİYNET
    ziynetUrunleri.forEach(ayar => {
        tvVerisi["Ziynet & Sarrafiye"].push({
            isim: ayar.isim, saat: altinSaat,
            // Alışları aşağı (floor) yuvarla, Satışlara kar ekle ve yukarı (ceil) yuvarla
            yeniAlis: Math.floor((hasAltinAlis * ayar.yeniAlis) / 50) * 50 + ayar.alisAyar,
            yeniSatis: Math.ceil((hasAltinSatis * ayar.yeniSatis) / 50) * 50 + ayar.satisAyar,
            eskiAlis: Math.floor((hasAltinAlis * ayar.eskiAlis) / 50) * 50 + ayar.alisAyar,
            eskiSatis: Math.ceil((hasAltinSatis * ayar.eskiSatis) / 50) * 50 + ayar.satisAyar
        });
    });

    // 2. GRAM
    gramUrunleri.forEach(ayar => {
        if (anaVeri[ayar.kod]) {
            tvVerisi["Gram Altın"].push({
                isim: ayar.isim, saat: saatAyirla(anaVeri[ayar.kod].tarih),
                alis: Math.floor((anaVeri[ayar.kod].alis) / 50) * 50 + ayar.alisAyar,
                satis: Math.ceil((anaVeri[ayar.kod].satis) / 50) * 50 + ayar.satisAyar
            });
        }
    });

    // 3. PİYASA
    piyasaUrunleri.forEach(ayar => {
        if (anaVeri[ayar.kod]) {
            tvVerisi["Piyasalar"].push({
                isim: ayar.isim, saat: saatAyirla(anaVeri[ayar.kod].tarih),
                alis: Math.floor((anaVeri[ayar.kod].alis) / 50) * 50 + ayar.alisAyar,
                satis: Math.ceil((anaVeri[ayar.kod].satis) / 50) * 50 + ayar.satisAyar
            });
        }
    });

    return tvVerisi;
}

// ONAYLANAN VERİYİ TV'YE FIRLATMA KOMUTU
function tvyeYayinla() {
    if (!guncelHamVeri) return;
    sonHesaplananFiyatlar = fiyatlariHesapla(guncelHamVeri);
    io.emit("guncel_fiyatlar", sonHesaplananFiyatlar);
    console.log("📺 YENİ FİYATLAR TV EKRANINA YANSITILDI!");
}

// --- 2. ADIM: DIŞARIDAN SADECE İHTİYAÇ ANINDA VERİ ÇEKME ---
function piyasadanTekSeferlikVeriCek(otomatikYayinla = false) {
    console.log("📡 Piyasadan açılış verisi bekleniyor...");
    const geciciSoket = ioClient("https://www.leventkuyumculuk.com", { transports: ["polling", "websocket"] });

    geciciSoket.once("price_changed", (gelenVeri) => {
        if (gelenVeri && gelenVeri.data) {
            // Veriyi daima bekleme odasına (havuza) atıyoruz
            guncelHamVeri = { ...guncelHamVeri, ...gelenVeri.data };

            if (otomatikYayinla) {
                tvyeYayinla(); // Sunucu ilk açıldığında TV boş kalmasın diye yayınlar
            } else {
                console.log("✅ Sabah 09:00 verisi BEKLEME ODASINA alındı. Admin onayı bekleniyor...");
            }
        }
        geciciSoket.disconnect();
    });
}

// A) Sunucu ilk çalıştığında 1 kere çek ve TV'ye yayınla
piyasadanTekSeferlikVeriCek(true);

// B) Her sabah 09:00'da çek ama ASLA YAYINLAMA (Sadece Bekleme Odasına al)
cron.schedule('0 9 * * *', () => {
    console.log("⏰ Saat tam 09:00! Piyasa verisi çekiliyor...");
    piyasadanTekSeferlikVeriCek(false);
}, { timezone: "Europe/Istanbul" });

// --- İÇ HABERLEŞME (TV ve Admin Paneli) ---
io.on("connection", (soket) => {
    // TV ilk bağlandığında kayan yazıyı da gönder
    soket.emit("kayan_yazi_guncelle", kayanYaziMetni);

    // Yeni bağlanan TV'ye BEKLEME ODASINI değil, ONAYLANMIŞ eski fiyatı göster
    if (sonHesaplananFiyatlar !== null) {
        soket.emit("guncel_fiyatlar", sonHesaplananFiyatlar);
    }

    soket.on("admin_giris_yap", (girilenSifre) => {
        if (girilenSifre === ADMIN_SIFRE) {
            console.log("🔓 Admin girişi başarılı.");
            let tumAyarlar = [...ziynetUrunleri, ...gramUrunleri, ...piyasaUrunleri].map(urun => ({
                isim: urun.isim,
                kod: urun.kod,
                alisAyar: urun.alisAyar, // Alış ayarını HTML'e yolla
                satisAyar: urun.satisAyar // Satış ayarını HTML'e yolla
            }));

            // SİHİRLİ DOKUNUŞ: Admine TV'yi değil, bekleme odasındaki "Taslak" veriyi yolluyoruz
            let taslakFiyatlar = guncelHamVeri ? fiyatlariHesapla(guncelHamVeri) : sonHesaplananFiyatlar;

            soket.emit("giris_basarili", { ayarlar: tumAyarlar, kayanYazi: kayanYaziMetni, taslak: taslakFiyatlar });
        } else {
            console.log("❌ Hatalı admin girişi denemesi.");
            soket.emit("giris_hatali");
        }
    });

    soket.on("ayarlari_guncelle", (gelenData) => {
        console.log("💾 Admin yeni kar marjlarını kaydetti!");

        const yeniMiktarlar = gelenData.fiyatlar;
        kayanYaziMetni = gelenData.kayanYazi; // Kayan yazıyı hafızaya al

        // TV ekranlarına anında yeni kayan yazıyı yolla
        io.emit("kayan_yazi_guncelle", kayanYaziMetni);

        // Gelen ÇİFT AYARLARI objelere kaydediyoruz
        // 1. Ayarları sisteme anlık olarak işle
        const tumUrunler = [...ziynetUrunleri, ...gramUrunleri, ...piyasaUrunleri];
        tumUrunler.forEach(u => {
            if (yeniMiktarlar[u.kod]) {
                u.alisAyar = yeniMiktarlar[u.kod].alisAyar;
                u.satisAyar = yeniMiktarlar[u.kod].satisAyar;
            }
        });

        // JSON'a kayan yazıyı da dahil et
        const kaydedilecekData = { ...yeniMiktarlar, kayanYazi: kayanYaziMetni };

        // 2. YENİ: Ayarları fiziksel dosyaya (JSON) kalıcı olarak kaydet
        fs.writeFile(AYARLAR_DOSYASI, JSON.stringify(kaydedilecekData, null, 2), (err) => {
            if (err) console.log("❌ Ayarlar dosyaya kaydedilirken hata oluştu!", err);
        });

        // Admin onayladığı için bekleme odasındaki veriyi yeni ayarlarla TV'ye yansıtıyoruz!
        tvyeYayinla();
    });
});

server.listen(3000, () => {
    console.log("🚀 KENDİ SUNUCUMUZ ÇALIŞIYOR!");
    console.log("📺 TV Ekranı için   : http://localhost:3000");
    console.log("⚙️  Admin Paneli için: http://localhost:3000/admin");
});