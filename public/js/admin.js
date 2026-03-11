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

    const gruplar = {
        "CEYREK": "ziynet", "YARIM": "ziynet", "TAM": "ziynet", "GREMSE": "ziynet", "ATA": "ziynet",
        "ALTIN": "piyasa", "GUMUSTRY": "piyasa",
        "KULCEALTIN": "gram", "BILEZIK": "gram"
    };

    document.getElementById("tbody-ziynet").innerHTML = "";
    document.getElementById("tbody-piyasa").innerHTML = "";
    document.getElementById("tbody-gram").innerHTML = "";

    // ARTIK HESAPLAMA YOK: Direkt kaydedilen kârı (makası) veya Bilezik fiyatını ekrana basıyoruz
    data.ayarlar.forEach(urun => {
        let hedefTablo = gruplar[urun.kod];
        if (!hedefTablo) return;

        // YENİ: Adım (Step) aralığını ürüne göre belirliyoruz!
        let adimAraligi = "50"; // Varsayılan olarak her şey 50'şer artsın
        if (urun.kod === "GUMUSTRY") {
            adimAraligi = "10"; // Sadece Gümüş 10'ar 10'ar artsın!
        }

        if (hedefTablo === "ziynet") {
            document.getElementById("tbody-ziynet").innerHTML += `
                <tr class="urun-ayar" data-kod="${urun.kod}" data-eski-var="true">
                    <td class="isim-sutunu">${urun.isim}</td>
                    <td><input type="number" step="${adimAraligi}" class="fiyat-input" id="alis_${urun.kod}" value="${urun.alisAyar || 0}"></td>
                    <td><input type="number" step="${adimAraligi}" class="fiyat-input" id="satis_${urun.kod}" value="${urun.satisAyar || 0}"></td>
                    <td><input type="number" step="${adimAraligi}" class="fiyat-input" id="eski_alis_${urun.kod}" value="${urun.eskiAlisAyar || 0}"></td>
                    <td><input type="number" step="${adimAraligi}" class="fiyat-input" id="eski_satis_${urun.kod}" value="${urun.eskiSatisAyar || 0}"></td>
                </tr>
            `;
        } else {
            document.getElementById("tbody-" + hedefTablo).innerHTML += `
                <tr class="urun-ayar" data-kod="${urun.kod}">
                    <td class="isim-sutunu">${urun.isim}</td>
                    <td><input type="number" step="${adimAraligi}" class="fiyat-input" id="alis_${urun.kod}" value="${urun.alisAyar || 0}"></td>
                    <td><input type="number" step="${adimAraligi}" class="fiyat-input" id="satis_${urun.kod}" value="${urun.satisAyar || 0}"></td>
                </tr>
            `;
        }
    });
});

// TV ekranına giden veriyi admin panelinden de gizlice dinliyoruz
socket.on("guncel_fiyatlar", (tvVerisi) => {
    const saatEtiketi = document.getElementById("canli-saat-etiketi");

    if (saatEtiketi && tvVerisi["Ziynet & Sarrafiye"] && tvVerisi["Ziynet & Sarrafiye"].length > 0) {
        // TV'ye giden verinin içinden saati cımbızla alıyoruz
        const guncelSaat = tvVerisi["Ziynet & Sarrafiye"][0].saat;
        saatEtiketi.innerText = guncelSaat;

        // Fiyat her güncellendiğinde yazının bir anlık parlamasını sağlayan "Canlı Atış" efekti (Kalp atışı gibi)
        saatEtiketi.style.color = "#ffffff";
        setTimeout(() => { saatEtiketi.style.color = "#4ade80"; }, 300);
    }
});

function kaydet() {
    let fiyatlar = {};
    document.querySelectorAll(".urun-ayar").forEach(satir => {
        let kod = satir.getAttribute("data-kod");
        let eskiVar = satir.getAttribute("data-eski-var");

        // Direkt input içindeki saf rakamı alıp gönderiyoruz (Tersine mühendislik bitti!)
        let ayarObj = {
            alisAyar: Number(document.getElementById("alis_" + kod).value),
            satisAyar: Number(document.getElementById("satis_" + kod).value)
        };

        if (eskiVar === "true") {
            ayarObj.eskiAlisAyar = Number(document.getElementById("eski_alis_" + kod).value);
            ayarObj.eskiSatisAyar = Number(document.getElementById("eski_satis_" + kod).value);
        }

        fiyatlar[kod] = ayarObj;
    });

    const kayanYaziMetni = document.getElementById("kayan_yazi_input").value;
    socket.emit("ayarlari_guncelle", { fiyatlar: fiyatlar, kayanYazi: kayanYaziMetni });

    const bildirimDiv = document.getElementById("bildirim");
    bildirimDiv.classList.add("goster");
    setTimeout(() => { bildirimDiv.classList.remove("goster"); }, 3000);
}