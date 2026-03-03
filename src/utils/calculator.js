// Ürünleri okuyabilmek için config dosyasından çekiyoruz
const { ziynetUrunleri, gramUrunleri, piyasaUrunleri } = require('../config/products');

const saatAyirla = (tarihMetni) => {
    if (!tarihMetni) return "";
    return tarihMetni.split(" ")[1] || tarihMetni;
};

function fiyatlariHesapla(anaVeri) {
    let tvVerisi = { "Ziynet & Sarrafiye": [], "Gram Altın": [], "Piyasalar": [] };

    // 1. HAYAT KURTARICI DOKUNUŞ: Hafıza bomboşsa (ilk kurulum anı) 0 olmasın diye geçici fiyat tabanı!
    // Levent'ten tek bir fiyat düştüğünde burası sonsuza dek devre dışı kalıp hafızadaki veriyi kullanacak.
    const guvenliVeri = anaVeri || {
        "ALTIN": { alis: 7000, satis: 7500, tarih: "Bekleniyor" },
        "KULCEALTIN": { alis: 7000, satis: 7500, tarih: "Bekleniyor" },
        "GUMUSTRY": { alis: 120, satis: 130, tarih: "Bekleniyor" }
    };

    let hasAltinAlis = guvenliVeri["ALTIN"].alis;
    let hasAltinSatis = guvenliVeri["ALTIN"].satis;
    let altinSaat = saatAyirla(guvenliVeri["ALTIN"].tarih);

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
        } else {
            let baseAlis = guvenliVeri[ayar.kod] ? guvenliVeri[ayar.kod].alis : hasAltinAlis;
            let baseSatis = guvenliVeri[ayar.kod] ? guvenliVeri[ayar.kod].satis : hasAltinSatis;
            let saat = guvenliVeri[ayar.kod] ? saatAyirla(guvenliVeri[ayar.kod].tarih) : altinSaat;

            tvVerisi["Gram Altın"].push({
                isim: ayar.isim, saat: saat,
                alis: Math.floor(baseAlis / 50) * 50 + ayar.alisAyar,
                satis: Math.ceil(baseSatis / 50) * 50 + ayar.satisAyar
            });
        }
    });

    // 3. PİYASA
    piyasaUrunleri.forEach(ayar => {
        let baseAlis = guvenliVeri[ayar.kod] ? guvenliVeri[ayar.kod].alis : hasAltinAlis;
        let baseSatis = guvenliVeri[ayar.kod] ? guvenliVeri[ayar.kod].satis : hasAltinSatis;
        let saat = guvenliVeri[ayar.kod] ? saatAyirla(guvenliVeri[ayar.kod].tarih) : altinSaat;

        tvVerisi["Piyasalar"].push({
            isim: ayar.isim, saat: saat,
            alis: Math.floor(baseAlis / 50) * 50 + ayar.alisAyar,
            satis: Math.ceil(baseSatis / 50) * 50 + ayar.satisAyar
        });
    });

    return tvVerisi;
}

// Sadece ana fonksiyonu dışarı aktarıyoruz
module.exports = { fiyatlariHesapla };