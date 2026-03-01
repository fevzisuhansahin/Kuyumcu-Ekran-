let ziynetUrunleri = [
    { isim: "ÇEYREK", kod: "CEYREK", yeniAlis: 1.63, yeniSatis: 1.65, eskiAlis: 1.625, eskiSatis: 1.645, alisAyar: 0, satisAyar: 0, eskiAlisAyar: 0, eskiSatisAyar: 0 },
    { isim: "YARIM", kod: "YARIM", yeniAlis: 3.27, yeniSatis: 3.29, eskiAlis: 3.24, eskiSatis: 3.275, alisAyar: 0, satisAyar: 0, eskiAlisAyar: 0, eskiSatisAyar: 0 },
    { isim: "TAM", kod: "TAM", yeniAlis: 6.51, yeniSatis: 6.54, eskiAlis: 6.47, eskiSatis: 6.525, alisAyar: 0, satisAyar: 0, eskiAlisAyar: 0, eskiSatisAyar: 0 },
    { isim: "GREMSE", kod: "GREMSE", yeniAlis: 16.22, yeniSatis: 16.30, eskiAlis: 16.14, eskiSatis: 16.26, alisAyar: 0, satisAyar: 0, eskiAlisAyar: 0, eskiSatisAyar: 0 },
    { isim: "ATA", kod: "ATA", yeniAlis: 6.67, yeniSatis: 6.715, eskiAlis: 6.67, eskiSatis: 6.715, alisAyar: 0, satisAyar: 0, eskiAlisAyar: 0, eskiSatisAyar: 0 }
];

let gramUrunleri = [
    { isim: "1 GR", kod: "KULCEALTIN", alisAyar: 0, satisAyar: 0 },
    { isim: "BİLEZİK", kod: "BILEZIK", alisAyar: 0, satisAyar: 0, manuel: true }
];

let piyasaUrunleri = [
    { isim: "HAS", kod: "ALTIN", alisAyar: 0, satisAyar: 0 },
    { isim: "GÜMÜŞ", kod: "GUMUSTRY", alisAyar: 0, satisAyar: 0 }
];

// Bu listeleri diğer dosyaların kullanabilmesi için dışa aktarıyoruz
module.exports = {
    ziynetUrunleri,
    gramUrunleri,
    piyasaUrunleri
};