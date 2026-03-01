// Ürünleri okuyabilmek için config dosyasından çekiyoruz
const { ziynetUrunleri, gramUrunleri, piyasaUrunleri } = require('../config/products');

const saatAyirla = (tarihMetni) => {
    if (!tarihMetni) return "";
    return tarihMetni.split(" ")[1] || tarihMetni;
};

function fiyatlariHesapla(anaVeri) {
    let tvVerisi = { "Ziynet & Sarrafiye": [], "Gram Altın": [], "Piyasalar": [] };

    if (!anaVeri || !anaVeri["ALTIN"]) return tvVerisi;

    let hasAltinAlis = anaVeri["ALTIN"].alis;
    let hasAltinSatis = anaVeri["ALTIN"].satis;
    let altinSaat = saatAyirla(anaVeri["ALTIN"].tarih);

    // 1. ZİYNET
    ziynetUrunleri.forEach(ayar => {
        tvVerisi["Ziynet & Sarrafiye"].push({
            isim: ayar.isim, saat: altinSaat,
            yeniAlis: Math.floor((hasAltinAlis * ayar.yeniAlis) / 50) * 50 + ayar.alisAyar,
            yeniSatis: Math.ceil((hasAltinSatis * ayar.yeniSatis) / 50) * 50 + ayar.satisAyar,
            eskiAlis: Math.floor((hasAltinAlis * ayar.eskiAlis) / 50) * 50 + ayar.eskiAlisAyar,
            eskiSatis: Math.ceil((hasAltinSatis * ayar.eskiSatis) / 50) * 50 + ayar.eskiSatisAyar
        });
    });

    // 2. GRAM
    gramUrunleri.forEach(ayar => {
        if (ayar.manuel) {
            tvVerisi["Gram Altın"].push({
                isim: ayar.isim, saat: altinSaat,
                alis: ayar.alisAyar,
                satis: ayar.satisAyar
            });
        } else if (anaVeri[ayar.kod]) {
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

// Sadece ana fonksiyonu dışarı aktarıyoruz
module.exports = { fiyatlariHesapla };