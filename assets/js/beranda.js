// Perilaku halaman depan publik.
//
// Diturunkan dari `js/main.js` milik Fora: kepala halaman yang berubah saat
// digulir, reveal-on-scroll, parallax hero, tab, dan accordion. Yang tidak
// ikut: cookie banner (aplikasi ini tidak memakai cookie pelacak sama sekali,
// jadi meminta persetujuan untuk sesuatu yang tidak ada itu teater) dan
// formulir kontak (tidak ada yang menerimanya).
//
// SATU PERBEDAAN YANG DISENGAJA DAN TIDAK BOLEH DIBALIK: Fora menggambar
// accordion dan kartu lewat `innerHTML` dengan templat string. Di sini
// semuanya lewat createElement + textContent. Halaman ini satu origin dengan
// aplikasi yang memegang token di localStorage — begitu isinya datang dari
// luar (Tahap B: berita yang ditulis admin), jalur innerHTML jadi jalan masuk
// pencurian sesi. Lebih mudah tidak pernah membukanya daripada menutupnya
// nanti setengah-setengah.

import { getJSON } from "/assets/js/jscroot/api.js";
import { backend } from "/assets/js/config.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const el = (tag, kelas, teks) => {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = String(teks);
    return e;
};

const kurangGerak = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Kepala halaman ------------------------------------------------------- */
const nav = $("#nav");
const saatGulir = () => nav && nav.classList.toggle("is-scrolled", window.scrollY > 20);
window.addEventListener("scroll", saatGulir, { passive: true });
saatGulir();

$("#burger")?.addEventListener("click", function () {
    const buka = document.body.classList.toggle("nav-open");
    this.setAttribute("aria-expanded", String(buka));
});
$$(".nav__mobile a").forEach((a) => a.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    $("#burger")?.setAttribute("aria-expanded", "false");
}));

/* Reveal saat digulir --------------------------------------------------- */
const pengamat = new IntersectionObserver((masuk) => {
    masuk.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); pengamat.unobserve(e.target); }
    });
}, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
$$("[data-reveal]").forEach((e) => pengamat.observe(e));

/* Parallax sertifikat di hero ------------------------------------------ */
const mock = $(".hero__mock");
if (mock && !kurangGerak) {
    const geser = () => {
        const y = Math.min(window.scrollY, 600);
        mock.style.transform = `translateY(${-y * 0.1}px) scale(${1 + y * 0.00006})`;
    };
    window.addEventListener("scroll", geser, { passive: true });
    geser();
}

/* Paragraf intro: katanya menyala satu per satu saat digulir ------------ */
//
// Fora melakukan ini dengan p.innerHTML = teks.split(...).map(...). Di sini
// tiap kata jadi simpul teks tersendiri — hasil tampilannya sama, tapi tidak
// ada teks yang pernah ditafsirkan sebagai markup.
$$(".intro p").forEach((p) => {
    const kata = p.textContent.split(/(\s+)/);
    p.textContent = "";
    kata.forEach((k) => {
        if (/\S/.test(k)) {
            p.appendChild(el("span", "w", k));
        } else {
            p.appendChild(document.createTextNode(k));
        }
    });
});
const kataIntro = $$(".intro .w");
if (kataIntro.length) {
    const nyala = () => {
        const tinggi = window.innerHeight;
        kataIntro.forEach((w) => w.classList.toggle("lit", w.getBoundingClientRect().top < tinggi * 0.62));
    };
    window.addEventListener("scroll", nyala, { passive: true });
    nyala();
}

/* Kelompok: lambang per tahun ajaran ----------------------------------- */
//
// Panggilan publik kedua di halaman ini, dan seperti berita ia harus boleh
// gagal tanpa merusak apa pun. Bedanya: berita punya keadaan kosong, seksi
// ini tetap TERSEMBUNYI sampai ada yang bisa ditampilkan. Kotak bertuliskan
// "belum ada lambang" hanya memberi tahu pengunjung apa yang belum
// dikerjakan LPPM.
const seksiKelompok = $("#kelompok");
const tabTahun = $("#tabTahun");
const kisiLambang = $("#daftarLambang");
const tombolSemua = $("#lambangSemua");
// Berapa ubin yang tampil sebelum tombol "tampilkan semua": dua baris di
// lebar penuh, empat baris tiga ubin di ponsel. Angkanya HARUS sama dengan
// aturan nth-child di beranda.css.
const batasUbin = () => (matchMedia("(max-width: 900px)").matches ? 12 : 16);

function nomorKelompok(k) {
    return String(k.kelompok || "").replace(/^kelompok\s+/i, "");
}

function ubinLambang(k, i) {
    const ubin = el("div", "lambang__ubin");
    ubin.dataset.reveal = "";
    ubin.style.setProperty("--d", Math.min(i, 24) * 28 + "ms");

    const gbr = el("div", "lambang__gbr");
    const img = el("img");
    // Alamatnya dari server, dan server hanya menerima berkas di folder
    // lambang repo ini. Dipasang sebagai atribut, tidak pernah disisipkan ke
    // markup.
    img.src = k.lambang;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 160;
    img.height = 160;
    gbr.appendChild(img);
    ubin.appendChild(gbr);

    // textContent, selalu: julukan diketik admin.
    const nomor = "Kelompok " + nomorKelompok(k);
    ubin.appendChild(el("div", "lambang__nama", k.julukan || nomor));
    if (k.julukan) ubin.appendChild(el("div", "lambang__no", nomor));
    return ubin;
}

function gambarLambang(daftar) {
    // Dikelompokkan per tahun ajaran, terbaru dulu. Server sudah
    // mengurutkannya begitu; di sini hanya dipecah.
    const perTahun = new Map();
    daftar.forEach((k) => {
        if (!k || !k.lambang || !k.tahun_ajaran) return;
        if (!perTahun.has(k.tahun_ajaran)) perTahun.set(k.tahun_ajaran, []);
        perTahun.get(k.tahun_ajaran).push(k);
    });
    const tahun = [...perTahun.keys()].sort().reverse();
    if (!tahun.length) return false;

    const tombol = tahun.map((ta) => {
        const b = el("button", null, ta);
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", "false");
        b.setAttribute("aria-controls", "daftarLambang");
        tabTahun.appendChild(b);
        return b;
    });
    tabTahun.style.setProperty("--n", String(tahun.length));
    // Satu tahun saja: deretan tab dengan satu tab bukan pilihan, cuma hiasan.
    tabTahun.hidden = tahun.length < 2;
    const pil = $(".tabs__pill", tabTahun);
    let kini = 0;

    const ke = (n) => {
        kini = (n + tahun.length) % tahun.length;
        tombol.forEach((b, k) => {
            b.classList.toggle("is-active", k === kini);
            b.setAttribute("aria-selected", String(k === kini));
        });
        if (pil) pil.style.transform = `translateX(${kini * 100}%)`;
        kisiLambang.textContent = "";
        const daftarTahun = perTahun.get(tahun[kini]);
        daftarTahun.forEach((k, i) => kisiLambang.appendChild(ubinLambang(k, i)));
        kisiLambang.classList.add("terbatas");
        if (tombolSemua) tombolSemua.hidden = daftarTahun.length <= batasUbin();
        $$("[data-reveal]", kisiLambang).forEach((e) => pengamat.observe(e));
    };

    tombolSemua?.addEventListener("click", () => {
        kisiLambang.classList.remove("terbatas");
        tombolSemua.hidden = true;
        // Ubin yang tadi display:none belum pernah dilaporkan pengamat
        // sebagai terlihat; sekarang ia tampil dan pengamat melaporkannya.
        $$("[data-reveal]", kisiLambang).forEach((e) => pengamat.observe(e));
    });

    tombol.forEach((b, k) => b.addEventListener("click", () => ke(k)));
    // Panah kiri/kanan saat fokus ada di deretan tab — perilaku baku tablist.
    tabTahun.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        ke(kini + (e.key === "ArrowRight" ? 1 : -1));
        tombol[kini].focus();
    });

    ke(0);
    return true;
}

if (seksiKelompok && tabTahun && kisiLambang) {
    getJSON(backend.kkn.lambangPublik, (hasil) => {
        if (!hasil || hasil.status !== 200) return;   // seksi tetap tersembunyi
        const daftar = ((hasil.data || {}).data) || [];
        if (!Array.isArray(daftar) || !gambarLambang(daftar)) return;
        seksiKelompok.hidden = false;
        $$("[data-reveal]", seksiKelompok).forEach((e) => pengamat.observe(e));
    });
}

/* FAQ ------------------------------------------------------------------- */
//
// Pertanyaannya nyata, jawabannya diambil dari perilaku sistem yang sudah
// berjalan — bukan karangan. Kalau salah satunya berubah di aplikasi,
// jawabannya di sini harus ikut berubah.
const TANYA = [
    ["Apa itu KKN dan siapa yang mengikutinya?",
     ["Kuliah Kerja Nyata adalah kegiatan pengabdian kepada masyarakat yang " +
      "diselenggarakan LPPM Universitas Al-Ghifari. Mahasiswa ditempatkan dalam " +
      "kelompok di sebuah desa mitra, didampingi seorang Dosen Pembimbing Lapangan.",
      "Ketentuan siapa yang wajib mengikuti dan pada semester ke berapa " +
      "mengikuti aturan program studi masing-masing."]],

    ["Di mana kelompok ditempatkan?",
     ["Di desa-desa mitra, sebagian besar di Kabupaten Bandung dan Bandung " +
      "Barat; angkatan sebelumnya juga di Cianjur. Setiap kelompok tinggal di " +
      "posko di desanya selama periode KKN berlangsung.",
      "Penempatan ditentukan LPPM. Kelompok dan lambangnya bisa dilihat di " +
      "bagian Kelompok, dan kegiatannya di bagian Berita."]],

    ["Apa saja yang dikerjakan selama KKN?",
     ["Programnya mengikuti kebutuhan desa. Yang paling sering: mengajar di SD " +
      "dan PAUD, penyuluhan kesehatan dan posyandu, bank sampah dan kerja bakti, " +
      "pendampingan usaha warga, serta kegiatan keagamaan dan peringatan hari besar.",
      "Setiap kelompok mencatat kegiatannya sebagai berita, lengkap dengan " +
      "fotonya, dan itu yang tampil di halaman ini."]],

    ["Bagaimana nilai KKN dihitung?",
     ["Ada lima aspek yang dinilai Dosen Pembimbing Lapangan, masing-masing " +
      "0 sampai 100: Kehadiran (H), Sikap (S), Kepemimpinan (L), Kualitas " +
      "Perencanaan (QP), dan Kualitas Luaran (QL).",
      "Nilai akhir adalah rata-rata kelimanya, dibulatkan. Huruf mutunya: " +
      "A untuk 80 ke atas, B untuk 68\u201379, C untuk 56\u201367, dan D untuk 45\u201355. " +
      "Di bawah 45 dinyatakan tidak lulus. Nilai hanya terlihat oleh yang " +
      "bersangkutan, pembimbingnya, dan LPPM."]],

    ["Bagaimana memeriksa keaslian sertifikat KKN?",
     ["Pindai kode QR yang tercetak di sertifikat. Ia langsung membuka halaman " +
      "verifikasi dan menampilkan nama, NIM, program studi, nomor sertifikat, " +
      "dan tanggal terbitnya.",
      "Verifikasi terbuka untuk umum dan tidak memerlukan akun \u2014 pemindai " +
      "tidak perlu punya hubungan apa pun dengan kampus.",
      "Kalau kode QR-nya rusak, sobek, atau tercetak terlalu buram untuk " +
      "dipindai, hubungi LPPM."]],
];

const daftarTanya = $("#daftarFaq");
if (daftarTanya) {
    TANYA.forEach(([tanya, jawab], i) => {
        const bungkus = el("div", "acc");
        bungkus.dataset.reveal = "";
        bungkus.style.setProperty("--d", i * 60 + "ms");

        const tombol = el("button", "acc__q");
        tombol.type = "button";
        tombol.setAttribute("aria-expanded", "false");
        tombol.appendChild(el("span", null, tanya));
        tombol.appendChild(el("i", null, "▾"));

        const isi = el("div", "acc__a");
        const isiId = "faq-" + i;
        isi.id = isiId;
        tombol.setAttribute("aria-controls", isiId);
        jawab.forEach((paragraf) => isi.appendChild(el("p", null, paragraf)));

        tombol.addEventListener("click", () => {
            const terbuka = bungkus.classList.contains("is-open");
            $$(".acc.is-open", daftarTanya).forEach((lain) => {
                lain.classList.remove("is-open");
                $(".acc__a", lain).style.maxHeight = 0;
                $(".acc__q", lain).setAttribute("aria-expanded", "false");
            });
            if (!terbuka) {
                bungkus.classList.add("is-open");
                isi.style.maxHeight = isi.scrollHeight + "px";
                tombol.setAttribute("aria-expanded", "true");
            }
        });

        bungkus.appendChild(tombol);
        bungkus.appendChild(isi);
        daftarTanya.appendChild(bungkus);
        pengamat.observe(bungkus);
    });
}

/* Berita ---------------------------------------------------------------- */
//
// Satu-satunya panggilan API di halaman ini, dan ia harus boleh gagal tanpa
// merusak apa pun: sisa halaman depan tetap utuh, dan yang tampil hanya
// keadaan kosong. Karena itu TIDAK memakai ui.js:sehat() — halaman publik
// tidak boleh melempar pengunjung ke /login/ hanya karena servernya diam.

const wadahBerita = $("#daftarBerita");
const beritaKosong = $("#beritaKosong");

function tanggalIndonesia(iso) {
    if (!iso) return "";
    const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
                   "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.getDate() + " " + bulan[d.getMonth()] + " " + d.getFullYear();
}

function kartuBerita(b) {
    const a = el("a", "pos");
    a.href = "/berita/?slug=" + encodeURIComponent(b.slug || "");

    const gbr = el("div", "pos__gbr");
    const isi = el("div");
    // Alamat foto datang dari server dan dipasang lewat style, bukan disisipkan
    // ke markup. encodeURI menjaga tanda kutip tidak bisa keluar dari url().
    const foto = (b.foto || [])[0];
    if (foto) {
        isi.style.backgroundImage = 'url("' + encodeURI(foto) + '")';
    } else {
        // Tanpa foto, blok 4:3 ini hanya ruang mati. Ringkasannya ditaruh di
        // sini supaya kartunya tetap memberi tahu sesuatu — dan sebagian
        // berita memang tidak akan pernah punya foto.
        isi.className = "pos__tanpa-foto";
        if (b.ringkasan) isi.appendChild(el("p", null, b.ringkasan));
    }
    gbr.appendChild(isi);

    const badan = el("div", "pos__isi");
    // textContent, selalu. Judul dan ringkasan diketik admin.
    badan.appendChild(el("div", "pos__judul", b.judul || ""));

    const meta = el("div", "pos__meta");
    const tgl = tanggalIndonesia(b.tanggal_terbit);
    if (tgl) meta.appendChild(el("span", null, tgl));
    if (b.penulis) meta.appendChild(el("span", null, b.penulis));
    badan.appendChild(meta);

    a.appendChild(gbr);
    a.appendChild(badan);
    return a;
}

function gambarBerita(daftar) {
    if (!daftar.length) return;                 // keadaan kosong sudah tampil
    daftar.slice(0, 3).forEach((b) => wadahBerita.appendChild(kartuBerita(b)));
    wadahBerita.hidden = false;
    beritaKosong.hidden = true;
    $$("[data-reveal]", wadahBerita).forEach((e) => pengamat.observe(e));
}

if (wadahBerita && beritaKosong) {
    let dijawab = false;

    // jscroot `api.js` menelan galat jaringan ke console TANPA memanggil
    // callback-nya. Tanpa penjaga ini, bagian berita akan menggantung dalam
    // keadaan kosong tanpa pernah menyerah — tampak sama saja, tapi tidak ada
    // yang tahu bedanya "belum ada berita" dari "server tidak terjangkau".
    const penjaga = setTimeout(() => {
        if (dijawab) return;
        dijawab = true;
        beritaKosong.textContent = "";
        beritaKosong.appendChild(el("b", null, "Berita belum bisa dimuat"));
        beritaKosong.appendChild(document.createTextNode(
            "Server tidak terjangkau saat ini. Sisa halaman ini tetap bisa dibaca."));
    }, 10000);

    getJSON(backend.news.daftar + "?limit=3", (hasil) => {
        if (dijawab) return;
        dijawab = true;
        clearTimeout(penjaga);
        if (!hasil || hasil.status !== 200) return;   // keadaan kosong bertahan
        gambarBerita(((hasil.data || {}).data) || []);
    });
}

/* Tahun berjalan di kaki halaman ---------------------------------------- */
const tahun = $("#tahunKini");
if (tahun) tahun.textContent = String(new Date().getFullYear());
