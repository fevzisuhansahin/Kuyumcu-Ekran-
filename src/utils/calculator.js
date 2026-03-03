const { ziynetUrunleri, gramUrunleri, piyasaUrunleri } = require('../config/products');

const saatAyirla = (tarihMetni) => {
    if (!tarihMetni) return "";
    return tarihMetni.split(" ")[1] || tarihMetni;
};

function fiyatlariHesapla(anaVeri) {
    let tvVerisi = { "Ziynet & Sarrafiye": [], "Gram Altın": [], "Piyasalar": [] };

    let hasAltinAlis = 0;
    let hasAltinSatis = 0;
    let altinSaat = "Bekleniyor";

    if (anaVeri && anaVeri["ALTIN"]) {
        hasAltinAlis = anaVeri["ALTIN"].alis;
        hasAltinSatis = anaVeri["ALTIN"].satis;
        altinSaat = saatAyirla(anaVeri["ALTIN"].tarih);
    }

    // 1. ZİYNET (Sadece piyasa verisi varsa hesaplanır)
    if (hasAltinAlis > 0) {
        ziynetUrunleri.forEach(ayar => {
            tvVerisi["Ziynet & Sarrafiye"].push({
                isim: ayar.isim, saat: altinSaat,
                yeniAlis: Math.floor((hasAltinAlis * ayar.yeniAlis) / 50) * 50 + ayar.alisAyar,
                yeniSatis: Math.ceil((hasAltinSatis * ayar.yeniSatis) / 50) * 50 + ayar.satisAyar,
                eskiAlis: Math.floor((hasAltinAlis * ayar.eskiAlis) / 50) * 50 + ayar.eskiAlisAyar,
                eskiSatis: Math.ceil((hasAltinSatis * ayar.eskiSatis) / 50) * 50 + ayar.eskiSatisAyar
            });
        });
    }

    // 2. GRAM (Manuel ürünler piyasa durgun olsa bile hesaplanır!)
    gramUrunleri.forEach(ayar => {
        if (ayar.manuel) {
            tvVerisi["Gram Altın"].push({
                isim: ayar.isim, saat: altinSaat,
                alis: ayar.alisAyar,
                satis: ayar.satisAyar
            });
        } else if (anaVeri && anaVeri[ayar.kod]) {
            tvVerisi["Gram Altın"].push({
                isim: ayar.isim, saat: saatAyirla(anaVeri[ayar.kod].tarih),
                alis: Math.floor((anaVeri[ayar.kod].alis) / 50) * 50 + ayar.alisAyar,
                satis: Math.ceil((anaVeri[ayar.kod].satis) / 50) * 50 + ayar.satisAyar
            });
        }
    });

    // 3. PİYASA
    if (anaVeri) {
        piyasaUrunleri.forEach(ayar => {
            if (anaVeri[ayar.kod]) {
                tvVerisi["Piyasalar"].push({
                    isim: ayar.isim, saat: saatAyirla(anaVeri[ayar.kod].tarih),
                    alis: Math.floor((anaVeri[ayar.kod].alis) / 50) * 50 + ayar.alisAyar,
                    satis: Math.ceil((anaVeri[ayar.kod].satis) / 50) * 50 + ayar.satisAyar
                });
            }
        });
    }

    return tvVerisi;
}

module.exports = { fiyatlariHesapla };