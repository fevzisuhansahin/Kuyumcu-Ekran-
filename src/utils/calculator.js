// Ürünleri okuyabilmek için config dosyasından çekiyoruz
const { ziynetUrunleri, gramUrunleri, piyasaUrunleri } = require('../config/products');

const saatAyirla = (tarihMetni) => {
    if (!tarihMetni) return "";
    return tarihMetni.split(" ")[1] || tarihMetni;
};

function fiyatlariHesapla(anaVeri) {
    let tvVerisi = { "Ziynet & Sarrafiye": [], "Gram Altın": [], "Piyasalar": [] };

    // 1. HAYAT KURTARICI DOKUNUŞ: Sadece Özbağ'ın yeni veri yapısı (Örn: CEYREK) varsa kabul et, yoksa eski Levent verisini çöpe atıp Acil Duruma geç!
    const guvenliVeri = (anaVeri && anaVeri["CEYREK"]) ? anaVeri : {
        "ALTIN": { alis: 7300, satis: 7400, tarih: "Bekleniyor" },
        "KULCEALTIN": { alis: 7300, satis: 7400, tarih: "Bekleniyor" },
        "GUMUSTRY": { alis: 120, satis: 130, tarih: "Bekleniyor" },
        "CEYREK": { yeniAlis: 12000, yeniSatis: 12100, eskiAlis: 11900, eskiSatis: 12000 },
        "YARIM": { yeniAlis: 24000, yeniSatis: 24200, eskiAlis: 23800, eskiSatis: 24000 },
        "TAM": { yeniAlis: 48000, yeniSatis: 48400, eskiAlis: 47600, eskiSatis: 48000 },
        "GREMSE": { yeniAlis: 120000, yeniSatis: 121000, eskiAlis: 119000, eskiSatis: 120000 },
        "ATA": { yeniAlis: 49000, yeniSatis: 49500, eskiAlis: 49000, eskiSatis: 49500 }
    };

    let altinSaat = guvenliVeri["ALTIN"]?.tarih ? saatAyirla(guvenliVeri["ALTIN"].tarih) : "Bekleniyor";

    // 1. ZİYNET (Matematik/Çarpan Yok, Doğrudan Veri Çekiliyor)
    ziynetUrunleri.forEach(ayar => {
        let hamFiyat = guvenliVeri[ayar.kod] || { yeniAlis: 0, yeniSatis: 0, eskiAlis: 0, eskiSatis: 0 };

        tvVerisi["Ziynet & Sarrafiye"].push({
            isim: ayar.isim, saat: altinSaat,
            yeniAlis: Math.floor(hamFiyat.yeniAlis / 50) * 50 + ayar.alisAyar,
            yeniSatis: Math.ceil(hamFiyat.yeniSatis / 50) * 50 + ayar.satisAyar,
            eskiAlis: Math.floor(hamFiyat.eskiAlis / 50) * 50 + ayar.eskiAlisAyar,
            eskiSatis: Math.ceil(hamFiyat.eskiSatis / 50) * 50 + ayar.eskiSatisAyar
        });
    });

    // 2. GRAM
    gramUrunleri.forEach(ayar => {
        if (ayar.manuel) {
            // Bilezik gibi sadece adminin girdiği fiyattan ibaret ürünler
            tvVerisi["Gram Altın"].push({
                isim: ayar.isim, saat: altinSaat,
                alis: ayar.alisAyar,
                satis: ayar.satisAyar
            });
        } else {
            // Külçe vb. ürünler
            let hamFiyat = guvenliVeri[ayar.kod] || guvenliVeri["ALTIN"] || { alis: 0, satis: 0 };
            let saat = guvenliVeri[ayar.kod]?.tarih ? saatAyirla(guvenliVeri[ayar.kod].tarih) : altinSaat;

            tvVerisi["Gram Altın"].push({
                isim: ayar.isim, saat: saat,
                alis: Math.floor(hamFiyat.alis / 50) * 50 + ayar.alisAyar,
                satis: Math.ceil(hamFiyat.satis / 50) * 50 + ayar.satisAyar
            });
        }
    });

    // 3. PİYASA
    piyasaUrunleri.forEach(ayar => {
        let hamFiyat = guvenliVeri[ayar.kod] || guvenliVeri["ALTIN"] || { alis: 0, satis: 0 };
        let saat = guvenliVeri[ayar.kod]?.tarih ? saatAyirla(guvenliVeri[ayar.kod].tarih) : altinSaat;

        // YENİ: Gümüş için "Çarpan" İstisnası!
        // Eğer ürün kodu GUMUSTRY ise 10'a yuvarla, değilse standart 50'ye yuvarla.
        let yuvarlamaKati = (ayar.kod === "GUMUSTRY") ? 10 : 50;

        tvVerisi["Piyasalar"].push({
            isim: ayar.isim, saat: saat,
            alis: Math.floor(hamFiyat.alis / yuvarlamaKati) * yuvarlamaKati + ayar.alisAyar,
            satis: Math.ceil(hamFiyat.satis / yuvarlamaKati) * yuvarlamaKati + ayar.satisAyar
        });
    });

    return tvVerisi;
}

// Sadece ana fonksiyonu dışarı aktarıyoruz
module.exports = { fiyatlariHesapla };


// // Ürünleri okuyabilmek için config dosyasından çekiyoruz
// const { ziynetUrunleri, gramUrunleri, piyasaUrunleri } = require('../config/products');

// const saatAyirla = (tarihMetni) => {
//     if (!tarihMetni) return "";
//     return tarihMetni.split(" ")[1] || tarihMetni;
// };

// function fiyatlariHesapla(anaVeri) {
//     let tvVerisi = { "Ziynet & Sarrafiye": [], "Gram Altın": [], "Piyasalar": [] };

//     // 1. HAYAT KURTARICI DOKUNUŞ: Hafıza bomboşsa (ilk kurulum anı) 0 olmasın diye geçici fiyat tabanı!
//     // Levent'ten tek bir fiyat düştüğünde burası sonsuza dek devre dışı kalıp hafızadaki veriyi kullanacak.
//     const guvenliVeri = anaVeri || {
//         "ALTIN": { alis: 7000, satis: 7500, tarih: "Bekleniyor" },
//         "KULCEALTIN": { alis: 7000, satis: 7500, tarih: "Bekleniyor" },
//         "GUMUSTRY": { alis: 120, satis: 130, tarih: "Bekleniyor" }
//     };

//     let hasAltinAlis = guvenliVeri["ALTIN"].alis;
//     let hasAltinSatis = guvenliVeri["ALTIN"].satis;
//     let altinSaat = saatAyirla(guvenliVeri["ALTIN"].tarih);

//     // 1. ZİYNET
//     ziynetUrunleri.forEach(ayar => {
//         tvVerisi["Ziynet & Sarrafiye"].push({
//             isim: ayar.isim, saat: altinSaat,
//             yeniAlis: Math.floor((hasAltinAlis * ayar.yeniAlis) / 50) * 50 + ayar.alisAyar,
//             yeniSatis: Math.ceil((hasAltinSatis * ayar.yeniSatis) / 50) * 50 + ayar.satisAyar,
//             eskiAlis: Math.floor((hasAltinAlis * ayar.eskiAlis) / 50) * 50 + ayar.eskiAlisAyar,
//             eskiSatis: Math.ceil((hasAltinSatis * ayar.eskiSatis) / 50) * 50 + ayar.eskiSatisAyar
//         });
//     });

//     // 2. GRAM
//     gramUrunleri.forEach(ayar => {
//         if (ayar.manuel) {
//             tvVerisi["Gram Altın"].push({
//                 isim: ayar.isim, saat: altinSaat,
//                 alis: ayar.alisAyar,
//                 satis: ayar.satisAyar
//             });
//         } else {
//             let baseAlis = guvenliVeri[ayar.kod] ? guvenliVeri[ayar.kod].alis : hasAltinAlis;
//             let baseSatis = guvenliVeri[ayar.kod] ? guvenliVeri[ayar.kod].satis : hasAltinSatis;
//             let saat = guvenliVeri[ayar.kod] ? saatAyirla(guvenliVeri[ayar.kod].tarih) : altinSaat;

//             tvVerisi["Gram Altın"].push({
//                 isim: ayar.isim, saat: saat,
//                 alis: Math.floor(baseAlis / 50) * 50 + ayar.alisAyar,
//                 satis: Math.ceil(baseSatis / 50) * 50 + ayar.satisAyar
//             });
//         }
//     });

//     // 3. PİYASA
//     piyasaUrunleri.forEach(ayar => {
//         let baseAlis = guvenliVeri[ayar.kod] ? guvenliVeri[ayar.kod].alis : hasAltinAlis;
//         let baseSatis = guvenliVeri[ayar.kod] ? guvenliVeri[ayar.kod].satis : hasAltinSatis;
//         let saat = guvenliVeri[ayar.kod] ? saatAyirla(guvenliVeri[ayar.kod].tarih) : altinSaat;

//         tvVerisi["Piyasalar"].push({
//             isim: ayar.isim, saat: saat,
//             alis: Math.floor(baseAlis / 50) * 50 + ayar.alisAyar,
//             satis: Math.ceil(baseSatis / 50) * 50 + ayar.satisAyar
//         });
//     });

//     return tvVerisi;
// }

// // Sadece ana fonksiyonu dışarı aktarıyoruz
// module.exports = { fiyatlariHesapla };