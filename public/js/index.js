// public/js/index.js

function saatiGuncelle() {
    const simdi = new Date();
    const saatDakika = simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const saniye = String(simdi.getSeconds()).padStart(2, '0');
    const tarihSecenekleri = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const tarihStr = simdi.toLocaleDateString('tr-TR', tarihSecenekleri);

    document.getElementById('saat-metni').innerHTML = `${saatDakika}<span class="saniye">:${saniye}</span>`;
    document.getElementById('tarih-metni').innerText = tarihStr;
}

setInterval(saatiGuncelle, 1000);
saatiGuncelle();

const temaButonu = document.getElementById("tema-butonu");

// 1. Sayfa açılışında hafızadan KESİN yükleme
if (localStorage.getItem("seciliTema") === "acik") {
    document.body.classList.add("acik-tema");
    temaButonu.innerText = "🌙 Koyu Tema";
} else {
    document.body.classList.remove("acik-tema");
    temaButonu.innerText = "☀️ Açık Tema";
}

// 2. Tıklama olayını "Zırhlı" hale getiriyoruz
temaButonu.addEventListener("click", (olay) => {
    olay.preventDefault(); // Hızlı tıklamalarda tarayıcının saçmalamasını engeller

    // Toggle yerine KESİN (Explicit) geçiş mantığı
    if (document.body.classList.contains("acik-tema")) {
        // Açıksa -> Kesinlikle Koyuya geç
        document.body.classList.remove("acik-tema");
        temaButonu.innerText = "☀️ Açık Tema";
        localStorage.setItem("seciliTema", "koyu");
    } else {
        // Koyuyysa -> Kesinlikle Açığa geç
        document.body.classList.add("acik-tema");
        temaButonu.innerText = "🌙 Koyu Tema";
        localStorage.setItem("seciliTema", "acik");
    }
});

const socket = io();
const formatla = (sayi) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sayi);

let oncekiFiyatlar = {};

socket.on("kayan_yazi_guncelle", (yeniYazi) => {
    document.getElementById("kayan-yazi-ekrani").innerText = yeniYazi;
});

socket.on("guncel_fiyatlar", (grupluFiyatlar) => {
    const ekranIcerik = document.getElementById("ekran-icerik");
    ekranIcerik.innerHTML = "";
    const grupSirasi = ["Ziynet & Sarrafiye", "Piyasalar", "Gram Altın"];

    grupSirasi.forEach(grupAdi => {
        const urunler = grupluFiyatlar[grupAdi];
        if (!urunler || urunler.length === 0) return;

        let html = `<div class="grup-karti" data-grup="${grupAdi}"><h2 class="grup-baslik">${grupAdi}</h2><table>`;

        if (grupAdi === "Ziynet & Sarrafiye") {
            html += `<tr><th class="sol">ÜRÜN</th><th>YENİ ALIŞ</th><th>YENİ SATIŞ</th><th>ESKİ ALIŞ</th><th>ESKİ SATIŞ</th></tr>`;
            urunler.forEach(urun => {
                let yonSinifi = "";
                if (oncekiFiyatlar[urun.isim]) {
                    if (urun.yeniSatis > oncekiFiyatlar[urun.isim]) yonSinifi = "artti";
                    else if (urun.yeniSatis < oncekiFiyatlar[urun.isim]) yonSinifi = "dustu";
                }
                oncekiFiyatlar[urun.isim] = urun.yeniSatis;

                html += `<tr class="${yonSinifi}"><td class="isim-sutunu"><span class="isim-metni">${urun.isim}</span></td><td>${formatla(urun.yeniAlis)}</td><td>${formatla(urun.yeniSatis)}</td><td>${formatla(urun.eskiAlis)}</td><td>${formatla(urun.eskiSatis)}</td></tr>`;
            });
        } else {
            html += `<tr><th class="sol">BİRİM</th><th>ALIŞ</th><th>SATIŞ</th></tr>`;
            urunler.forEach(urun => {
                let yonSinifi = "";
                if (oncekiFiyatlar[urun.isim]) {
                    if (urun.satis > oncekiFiyatlar[urun.isim]) yonSinifi = "artti";
                    else if (urun.satis < oncekiFiyatlar[urun.isim]) yonSinifi = "dustu";
                }
                oncekiFiyatlar[urun.isim] = urun.satis;

                html += `<tr class="${yonSinifi}"><td class="isim-sutunu"><span class="isim-metni">${urun.isim}</span></td><td>${formatla(urun.alis)}</td><td>${formatla(urun.satis)}</td></tr>`;
            });
        }
        html += `</table></div>`;
        ekranIcerik.innerHTML += html;
    });
});