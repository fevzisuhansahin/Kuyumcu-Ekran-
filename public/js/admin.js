function saatiGuncelle() {
    const simdi = new Date();
    const saatDakika = simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const saniye = String(simdi.getSeconds()).padStart(2, '0');
    const tarihSecenekleri = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const tarihStr = simdi.toLocaleDateString('tr-TR', tarihSecenekleri);
    document.getElementById('saat-metni').innerHTML = `${saatDakika}<span class="saniye">:${saniye}</span>`;
    document.getElementById('tarih-metni').innerText = tarihStr;
}
setInterval(saatiGuncelle, 1000); saatiGuncelle();

const temaButonu = document.getElementById("tema-butonu");
if (localStorage.getItem("seciliTema") === "acik") {
    document.body.classList.add("acik-tema");
    temaButonu.innerText = "🌙 Koyu Tema";
}
temaButonu.addEventListener("click", () => {
    document.body.classList.toggle("acik-tema");
    if (document.body.classList.contains("acik-tema")) {
        temaButonu.innerText = "🌙 Koyu Tema";
        localStorage.setItem("seciliTema", "acik");
    } else {
        temaButonu.innerText = "☀️ Açık Tema";
        localStorage.setItem("seciliTema", "koyu");
    }
});

const socket = io();
let sonCanliFiyatlar = {};

function girisYap() {
    const sifre = document.getElementById("sifre").value;
    socket.emit("admin_giris_yap", sifre);
}

socket.on("giris_hatali", () => {
    alert("Hatalı şifre girdiniz!");
    document.getElementById("sifre").value = "";
});

socket.on("giris_basarili", (data) => {
    document.getElementById("login-ekrani").style.display = "none";
    document.getElementById("ekran-icerik").style.display = "grid";

    document.getElementById("kayan_yazi_input").value = data.kayanYazi;

    // Veriyi cebimize tam obje olarak alıyoruz (Eski ve Yeni fiyatlar dahil)
    let tvVerisi = data.taslak;
    if (tvVerisi) {
        if (tvVerisi["Ziynet & Sarrafiye"]) tvVerisi["Ziynet & Sarrafiye"].forEach(item => sonCanliFiyatlar[item.isim] = item);
        if (tvVerisi["Gram Altın"]) tvVerisi["Gram Altın"].forEach(item => sonCanliFiyatlar[item.isim] = item);
        if (tvVerisi["Piyasalar"]) tvVerisi["Piyasalar"].forEach(item => sonCanliFiyatlar[item.isim] = item);
    }

    const gruplar = {
        "CEYREK": "ziynet", "YARIM": "ziynet", "TAM": "ziynet", "GREMSE": "ziynet", "ATA": "ziynet",
        "ALTIN": "piyasa", "GUMUSTRY": "piyasa",
        "KULCEALTIN": "gram", "BILEZIK": "gram"
    };

    document.getElementById("tbody-ziynet").innerHTML = "";
    document.getElementById("tbody-piyasa").innerHTML = "";
    document.getElementById("tbody-gram").innerHTML = "";

    data.ayarlar.forEach(urun => {
        let guncel = sonCanliFiyatlar[urun.isim] || {};
        let hedefTablo = gruplar[urun.kod];
        if (!hedefTablo) return;

        if (hedefTablo === "ziynet") {
            let baseAlis = (guncel.yeniAlis || 0) - urun.alisAyar;
            let baseSatis = (guncel.yeniSatis || 0) - urun.satisAyar;
            let baseEskiAlis = (guncel.eskiAlis || 0) - (urun.eskiAlisAyar || 0);
            let baseEskiSatis = (guncel.eskiSatis || 0) - (urun.eskiSatisAyar || 0);

            document.getElementById("tbody-ziynet").innerHTML += `
                <tr class="urun-ayar" data-kod="${urun.kod}" data-base-alis="${baseAlis}" data-base-satis="${baseSatis}" data-base-eski-alis="${baseEskiAlis}" data-base-eski-satis="${baseEskiSatis}">
                    <td class="isim-sutunu">${urun.isim}</td>
                    <td><input type="number" step="50" class="fiyat-input" id="alis_${urun.kod}" value="${guncel.yeniAlis || 0}"></td>
                    <td><input type="number" step="50" class="fiyat-input" id="satis_${urun.kod}" value="${guncel.yeniSatis || 0}"></td>
                    <td><input type="number" step="50" class="fiyat-input" id="eski_alis_${urun.kod}" value="${guncel.eskiAlis || 0}"></td>
                    <td><input type="number" step="50" class="fiyat-input" id="eski_satis_${urun.kod}" value="${guncel.eskiSatis || 0}"></td>
                </tr>
            `;
        } else {
            let baseAlis = (guncel.alis || 0) - urun.alisAyar;
            let baseSatis = (guncel.satis || 0) - urun.satisAyar;

            document.getElementById("tbody-" + hedefTablo).innerHTML += `
                <tr class="urun-ayar" data-kod="${urun.kod}" data-base-alis="${baseAlis}" data-base-satis="${baseSatis}">
                    <td class="isim-sutunu">${urun.isim}</td>
                    <td><input type="number" step="50" class="fiyat-input" id="alis_${urun.kod}" value="${guncel.alis || 0}"></td>
                    <td><input type="number" step="50" class="fiyat-input" id="satis_${urun.kod}" value="${guncel.satis || 0}"></td>
                </tr>
            `;
        }
    });
});

function kaydet() {
    let fiyatlar = {};
    document.querySelectorAll(".urun-ayar").forEach(satir => {
        let kod = satir.getAttribute("data-kod");
        let baseAlis = Number(satir.getAttribute("data-base-alis"));
        let baseSatis = Number(satir.getAttribute("data-base-satis"));
        let inputAlis = Number(document.getElementById("alis_" + kod).value);
        let inputSatis = Number(document.getElementById("satis_" + kod).value);

        let ayarObj = { alisAyar: inputAlis - baseAlis, satisAyar: inputSatis - baseSatis };

        let baseEskiAlis = satir.getAttribute("data-base-eski-alis");
        let baseEskiSatis = satir.getAttribute("data-base-eski-satis");

        if (baseEskiAlis !== null && baseEskiSatis !== null) {
            let inputEskiAlis = Number(document.getElementById("eski_alis_" + kod).value);
            let inputEskiSatis = Number(document.getElementById("eski_satis_" + kod).value);
            ayarObj.eskiAlisAyar = inputEskiAlis - Number(baseEskiAlis);
            ayarObj.eskiSatisAyar = inputEskiSatis - Number(baseEskiSatis);
        }

        fiyatlar[kod] = ayarObj;
    });

    const kayanYaziMetni = document.getElementById("kayan_yazi_input").value;
    socket.emit("ayarlari_guncelle", { fiyatlar: fiyatlar, kayanYazi: kayanYaziMetni });

    const bildirimDiv = document.getElementById("bildirim");
    bildirimDiv.classList.add("goster");
    setTimeout(() => { bildirimDiv.classList.remove("goster"); }, 3000);
}