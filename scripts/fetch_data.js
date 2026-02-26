const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const ioClient = require('socket.io-client'); // Karşıdan veri çekmek için
const path = require('path');

// Kendi sunucumuzu ayağa kaldırıyoruz (Express)
const app = express();
app.use(express.static('public')); // TV ekranı dosyalarını dışa açıyoruz

// --- GİZLİ KAPIMIZ (ADMİN PANELİ YÖNLENDİRMESİ) ---
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const server = http.createServer(app);
const io = socketIo(server); // Kendi canlı yayın kanalımız (TV için)

// --- ADMİN ŞİFRESİ ---
const ADMIN_SIFRE = "123";

// 1. ADIM:
// --- SİSTEMİN KALBİ: ÜRÜNLER, GRUPLAR VE KAR MARJLARI ---
// (Buradaki kar marjlarını şimdilik örnek yazdım, Admin panelini yapınca oradan değişecek)
// Ziynetler hem eski hem yeni kodunu barındırıyor
let ziynetUrunleri = [
    { isim: "ÇEYREK", yeniKod: "CEYREK_YENI", eskiKod: "CEYREK_ESKI", kar: 150 },
    { isim: "YARIM", yeniKod: "YARIM_YENI", eskiKod: "YARIM_ESKI", kar: 300 },
    { isim: "TAM", yeniKod: "TEK_YENI", eskiKod: "TEK_ESKI", kar: 600 },
    { isim: "GREMSE", yeniKod: "GREMESE_YENI", eskiKod: "GREMESE_ESKI", kar: 1500 },
    { isim: "ATA", yeniKod: "ATA_YENI", eskiKod: "ATA_ESKI", kar: 650 }
];

let gramUrunleri = [
    { isim: "1 GR", kod: "KULCEALTIN", kar: 60 }
];

let piyasaUrunleri = [
    { isim: "ALTIN", kod: "ALTIN", kar: 50 },
    { isim: "GÜMÜŞ", kod: "GUMUSTRY", kar: 5 }
];

// --- YENİ EKLENEN KISIM: Son Fiyatları Hafızada Tutacak Değişken ---
let sonHesaplananFiyatlar = null;
let sonGelenHamVeri = null; // Admin kaydettiğinde anında hesaplamak için ham veriyi tutuyoruz

// Gelen "22-02-2026 17:00:02" metninden sadece "17:00:02" kısmını alan yardımcı fonksiyon
const saatAyirla = (tarihMetni) => {
    if (!tarihMetni) return "";
    return tarihMetni.split(" ")[1] || tarihMetni;
};

// --- HESAPLAMA MOTORU (Hem yeni veri gelince hem de admin kaydedince çalışır) ---
function fiyatlariHesaplaVeYayinla(anaVeri) {
    sonGelenHamVeri = anaVeri; // Ham veriyi hafızaya al

    // Verileri TV'ye göndermeden önce senin istediğin 3 gruba ayırıyoruz
    let tvVerisi = {
        "Ziynet & Sarrafiye": [],
        "Gram Altın": [],
        "Piyasalar": []
    };

    // 1. ZİYNET
    ziynetUrunleri.forEach(ayar => {
        if (anaVeri[ayar.yeniKod] && anaVeri[ayar.eskiKod]) {
            tvVerisi["Ziynet & Sarrafiye"].push({
                isim: ayar.isim,
                saat: saatAyirla(anaVeri[ayar.yeniKod].tarih),
                yeniAlis: Number((anaVeri[ayar.yeniKod].alis).toFixed(2)),
                yeniSatis: Number((anaVeri[ayar.yeniKod].satis + ayar.kar).toFixed(2)),
                eskiAlis: Number((anaVeri[ayar.eskiKod].alis).toFixed(2)),
                eskiSatis: Number((anaVeri[ayar.eskiKod].satis + ayar.kar).toFixed(2))
            });
        }
    });

    // 2. GRAM
    gramUrunleri.forEach(ayar => {
        if (anaVeri[ayar.kod]) {
            tvVerisi["Gram Altın"].push({
                isim: ayar.isim,
                saat: saatAyirla(anaVeri[ayar.kod].tarih),
                alis: Number((anaVeri[ayar.kod].alis).toFixed(2)),
                satis: Number((anaVeri[ayar.kod].satis + ayar.kar).toFixed(2))
            });
        }
    });

    // 3. PİYASA
    piyasaUrunleri.forEach(ayar => {
        if (anaVeri[ayar.kod]) {
            tvVerisi["Piyasalar"].push({
                isim: ayar.isim,
                saat: saatAyirla(anaVeri[ayar.kod].tarih),
                alis: Number((anaVeri[ayar.kod].alis).toFixed(2)),
                satis: Number((anaVeri[ayar.kod].satis + ayar.kar).toFixed(2))
            });
        }
    });

    // --- YENİ EKLENEN KISIM: Hesaplanan fiyatı hafızaya al ---
    sonHesaplananFiyatlar = tvVerisi;

    console.log("\n💰 TV Ekranına Gönderilen Yeni Fiyatlar:");
    console.log(tvVerisi);

    // 3. ADIM: KENDİ TV EKRANIMIZA YENİ FİYATLARI CANLI YAYINLA
    // 'guncel_fiyatlar' adında bir kanal açıp bizim TV'ye fırlatıyoruz
    io.emit("guncel_fiyatlar", tvVerisi); // TV'lere gönder
}

// 2. ADIM: DIŞARIDAN VERİ ÇEKME VE İŞLEME
const leventSocket = ioClient("https://www.leventkuyumculuk.com", {
    transports: ["polling", "websocket"]
});
console.log("⏳ Levent Kuyumculuk'a bağlanılıyor...");

// Sadece 'price_changed' kanalını dinliyoruz
leventSocket.on("price_changed", (gelenVeri) => {
    if (!gelenVeri || !gelenVeri.data) return;
    fiyatlariHesaplaVeYayinla(gelenVeri.data);
    console.log(gelenVeri);
});

// --- İÇ HABERLEŞME (TV ve Admin Paneli) ---
io.on("connection", (soket) => {

    // 1. Yeni TV bağlanırsa son fiyatı ver
    if (sonHesaplananFiyatlar !== null) {
        soket.emit("guncel_fiyatlar", sonHesaplananFiyatlar);
    }

    // 2. ADMİN: Şifre Kontrolü
    soket.on("admin_giris_yap", (girilenSifre) => {
        if (girilenSifre === ADMIN_SIFRE) {
            console.log("🔓 Admin girişi başarılı.");
            // Tüm ürünleri tek bir listede birleştirip admine (HTML'e) yolluyoruz
            let tumAyarlar = [...ziynetUrunleri, ...gramUrunleri, ...piyasaUrunleri].map(urun => ({
                isim: urun.isim,
                kod: urun.yeniKod || urun.kod, // Inputun ID'sini bulmak için kodunu yolluyoruz
                kar: urun.kar
            }));
            soket.emit("giris_basarili", tumAyarlar);
        } else {
            console.log("❌ Hatalı admin girişi denemesi.");
            soket.emit("giris_hatali");
        }
    });

    // 3. ADMİN: Yeni Karları Kaydetme
    soket.on("ayarlari_guncelle", (yeniMiktarlar) => {
        console.log("💾 Admin yeni kar marjlarını kaydetti!");

        // Gelen listeye göre bizim dizilerdeki (array) karları güncelliyoruz
        ziynetUrunleri.forEach(u => { if (yeniMiktarlar[u.yeniKod] !== undefined) u.kar = yeniMiktarlar[u.yeniKod]; });
        gramUrunleri.forEach(u => { if (yeniMiktarlar[u.kod] !== undefined) u.kar = yeniMiktarlar[u.kod]; });
        piyasaUrunleri.forEach(u => { if (yeniMiktarlar[u.kod] !== undefined) u.kar = yeniMiktarlar[u.kod]; });

        // Güncelleme biter bitmez, en son çekilen fiyatlarla yeni karları birleştirip TV'ye vur!
        if (sonGelenHamVeri !== null) {
            fiyatlariHesaplaVeYayinla(sonGelenHamVeri);
        }
    });
});

// Sunucumuzu 3000 portunda çalıştırıyoruz
server.listen(3000, () => {
    console.log("🚀 KENDİ SUNUCUMUZ ÇALIŞIYOR!");
    console.log("📺 TV Ekranı için   : http://localhost:3000");
    console.log("⚙️  Admin Paneli için: http://localhost:3000/admin");
});