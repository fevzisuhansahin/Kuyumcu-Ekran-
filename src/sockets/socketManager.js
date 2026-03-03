// src/sockets/socketManager.js

const fs = require('fs');
const path = require('path');
const { ziynetUrunleri, gramUrunleri, piyasaUrunleri } = require('../config/products');
const { fiyatlariHesapla } = require('../utils/calculator');

const ADMIN_SIFRE = process.env.ADMIN_SIFRE;
const AYARLAR_DOSYASI = path.join(__dirname, '../../data', 'settings.json');

// Dışarıdan io nesnesini, ortak state objesini ve tvyeYayinla fonksiyonunu içeri alıyoruz
module.exports = (io, state, tvyeYayinla) => {
    io.on("connection", (soket) => {
        soket.emit("kayan_yazi_guncelle", state.kayanYaziMetni);

        if (state.sonHesaplananFiyatlar !== null) {
            soket.emit("guncel_fiyatlar", state.sonHesaplananFiyatlar);
        }

        soket.on("admin_giris_yap", (girilenSifre) => {
            if (girilenSifre === ADMIN_SIFRE) {
                console.log("🔓 Admin girişi başarılı.");
                let tumAyarlar = [...ziynetUrunleri, ...gramUrunleri, ...piyasaUrunleri].map(urun => ({
                    isim: urun.isim, kod: urun.kod,
                    alisAyar: urun.alisAyar, satisAyar: urun.satisAyar,
                    eskiAlisAyar: urun.eskiAlisAyar || 0, eskiSatisAyar: urun.eskiSatisAyar || 0
                }));

                let taslakFiyatlar = state.guncelHamVeri ? fiyatlariHesapla(state.guncelHamVeri) : state.sonHesaplananFiyatlar;
                soket.emit("giris_basarili", { ayarlar: tumAyarlar, kayanYazi: state.kayanYaziMetni, taslak: taslakFiyatlar });
            } else {
                console.log("❌ Hatalı admin girişi denemesi.");
                soket.emit("giris_hatali");
            }
        });

        soket.on("ayarlari_guncelle", (gelenData) => {
            console.log("💾 Admin yeni kar marjlarını kaydetti!");
            const yeniMiktarlar = gelenData.fiyatlar;
            state.kayanYaziMetni = gelenData.kayanYazi;
            io.emit("kayan_yazi_guncelle", state.kayanYaziMetni);

            const tumUrunler = [...ziynetUrunleri, ...gramUrunleri, ...piyasaUrunleri];
            tumUrunler.forEach(u => {
                if (yeniMiktarlar[u.kod]) {
                    u.alisAyar = yeniMiktarlar[u.kod].alisAyar;
                    u.satisAyar = yeniMiktarlar[u.kod].satisAyar;
                    if (yeniMiktarlar[u.kod].eskiAlisAyar !== undefined) {
                        u.eskiAlisAyar = yeniMiktarlar[u.kod].eskiAlisAyar;
                        u.eskiSatisAyar = yeniMiktarlar[u.kod].eskiSatisAyar;
                    }
                }
            });

            // YENİ: guncelHamVeri'yi de koruyarak kaydediyoruz
            const kaydedilecekData = { ...yeniMiktarlar, kayanYazi: state.kayanYaziMetni, guncelHamVeri: state.guncelHamVeri };
            fs.writeFile(AYARLAR_DOSYASI, JSON.stringify(kaydedilecekData, null, 2), (err) => {
                if (err) console.log("❌ Ayarlar dosyaya kaydedilirken hata oluştu!");
            });

            tvyeYayinla();
        });
    });
};