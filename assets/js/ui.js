// Perkakas antarmuka.
//
// Semuanya menulis lewat textContent, tidak pernah innerHTML — token ada di
// localStorage, jadi satu celah XSS berarti sesi tercuri. Nama mahasiswa dan
// judul KKN adalah masukan pengguna dan harus diperlakukan begitu.
//
// Karena itu di sini TIDAK dipakai `setInner` milik jscroot `element.js`
// (ia menulis lewat innerHTML). Yang boleh untuk data dari basis data hanya
// `setInnerText`, atau simpul yang dibangun sendiri di bawah ini.

import { clear as bersihkanSesi } from "./auth.js";
import { redirect } from "./jscroot/url.js";

export function el(tag, kelas, teks) {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = String(teks);
    return e;
}

// opsi membuat <option>. WAJIB dipakai, jangan el("option", ...).
//
// `el` hanya mengisi textContent. Untuk <option> tanpa atribut `value`,
// peramban memakai TEKSNYA sebagai nilai — jadi pilihan penampung
// "Pilih kelompok…" bernilai "Pilih kelompok…", bukan "". Akibatnya
// `if (!sel.value)` tidak pernah benar: keadaan kosong tidak pernah
// tampil dan teks penampung terkirim ke server sebagai id.
export function opsi(nilai, teks, mati) {
    const o = document.createElement("option");
    o.value = nilai == null ? "" : String(nilai);
    o.textContent = teks;
    if (mati) o.disabled = true;
    return o;
}

export function sel(teks, kelas) {
    const td = document.createElement("td");
    td.className = kelas || "";
    td.textContent = teks == null || teks === "" ? "—" : String(teks);
    if (teks == null || teks === "") td.classList.add("text-tinta-samar");
    return td;
}

// deretNilai menggambar kelima komponen nilai KKN sebagai lima batang
// yang tingginya sebanding dengan skornya.
//
// Inilah satu-satunya tempat halaman ini bersuara. Ia menjawab pertanyaan
// yang benar-benar dihadapi dosen di akhir semester — siapa yang belum
// lengkap dinilai — tanpa perlu membuka satu per satu.
// Dinyalakan sekali setelah penggambaran pertama: sesudah itu deret nilai
// muncul langsung, tanpa animasi.
let ui_sudahTampil = false;
if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { ui_sudahTampil = true; });
    });
}

export function deretNilai(r) {
    const komponen = [
        ["H", r.nilai_h], ["S", r.nilai_s], ["L", r.nilai_l],
        ["QP", r.nilai_qp], ["QL", r.nilai_ql],
    ];
    const wadah = el("div", "deret-nilai");
    // Judul dibaca pembaca layar dan muncul saat disinggahi kursor;
    // batangnya sendiri tidak menyampaikan angkanya.
    wadah.title = komponen.map(function (k) { return k[0] + " " + (k[1] || 0); }).join("  ");

    komponen.forEach(function (k, i) {
        const nilai = Number(k[1]) || 0;
        const i_ = document.createElement("i");
        if (nilai <= 0) {
            i_.dataset.kosong = "1";
        } else {
            // Dipetakan dari 45, bukan dari 0.
            //
            // Hampir seluruh nilai KKN jatuh di rentang 75-95. Pada skala
            // 0-100 kelima batangnya tampak sama tinggi dan deretnya berubah
            // jadi hiasan. Pita yang benar-benar informatif adalah 45 ke
            // atas — di bawah itu semuanya gagal dan selisihnya tidak
            // menolong siapa pun.
            const b = Math.min(100, Math.max(45, nilai));
            i_.style.height = Math.round(5 + ((b - 45) / 55) * 15) + "px";
        }
        // Animasi HANYA saat baris ini pertama kali disisipkan. Sebelumnya
        // tiap penggambaran ulang menjalankan sampai 250 animasi tinggi
        // sekaligus, dan halaman ini menggambar ulang pada tiap ketikan di
        // kotak cari (tunda 350ms) dan tiap baris yang disegarkan di tempat.
        if (!ui_sudahTampil) i_.style.animationDelay = (i * 28) + "ms";
        else i_.style.animation = "none";
        wadah.appendChild(i_);
    });

    const td = document.createElement("td");
    td.appendChild(wadah);
    return td;
}

export function tanda(teks, jenis) {
    const sah = ["is-sah", "is-belum", "is-kosong"];
    const kelas = "is-" + jenis;
    const s = el("span", "tanda " + (sah.includes(kelas) ? kelas : "is-kosong"), teks);
    const td = document.createElement("td");
    td.appendChild(s);
    return td;
}

export function pesan(elemen, teks, jenis) {
    if (!elemen) return;
    const warna = jenis === "galat" ? "bg-galat-muda text-galat"
        : jenis === "sah" ? "bg-sah-muda text-sah"
        : "bg-belum-muda text-belum";
    elemen.className = "rounded-xl px-3 py-2 text-sm mb-4 " + warna;
    elemen.textContent = teks;
    elemen.hidden = false;
}

export function sembunyikan(elemen) { if (elemen) elemen.hidden = true; }

export function kosongkan(elemen) { while (elemen && elemen.firstChild) elemen.removeChild(elemen.firstChild); }

// sehat memeriksa hasil panggilan jscroot dan mengembalikan true kalau
// pemanggil boleh melanjutkan.
//
// jscroot `api.js` memanggil callback dengan {status, data} dan TIDAK
// menangani apa pun sendiri: 401 tidak diperlakukan khusus, dan galat
// jaringan hanya masuk console.log tanpa callback dipanggil sama sekali.
// Jadi tiap fungsi jawaban di tiap halaman harus mulai dengan pemeriksaan
// ini — kalau tidak, sesi yang habis tampak sebagai halaman kosong tanpa
// sebab, dan token berumur 2 jam membuat itu kejadian harian.
export function sehat(hasil, elPesan) {
    if (!hasil || typeof hasil.status !== "number") {
        pesan(elPesan, "Tidak ada jawaban dari server. Periksa sambungan.", "galat");
        return false;
    }
    if (hasil.status === 401) {
        bersihkanSesi();
        redirect("/login/");
        return false;
    }
    if (hasil.status < 200 || hasil.status >= 300) {
        const d = hasil.data || {};
        pesan(elPesan, d.message || ("Gagal memuat (HTTP " + hasil.status + ")."), "galat");
        return false;
    }
    return true;
}

/* Kepala tabel melayang HANYA saat barisnya menyelinap di bawahnya.
 *
 * Sebelumnya `shadow-naik` menempel permanen: pita abu dengan bayangan jatuh
 * di dalam kartu putih yang tidak sedang digulir terbaca sebagai chrome
 * tetap, bukan sebagai lapisan. Bayangan menyatakan bahwa ada sesuatu di
 * bawahnya; kalau tidak ada, ia berbohong.
 *
 * Dipasang sekali untuk semua halaman yang memuat ui.js, jadi tidak ada
 * halaman yang perlu tahu soal ini.
 */
/* Tinggi daerah gulir tabel dihitung dari posisi SEBENARNYA.
 *
 * Tujuh halaman memakai konstanta tangan `calc(100vh - 14..17rem)`, dan
 * semuanya mengandaikan toolbar satu baris. Di bawah ~900px toolbar itu
 * membungkus jadi dua atau tiga baris (segmen tahun saja 516px), dan pada
 * penunjuk kasar kendalinya tumbuh 38px jadi 44px. Begitu itu terjadi,
 * halamannya ikut bergulir DI SAMPING tabelnya: dua bilah gulir, kepala
 * tabel yang menempel hanya bekerja di yang dalam, dan kepala halaman
 * tergulir hilang.
 *
 * Diukur, bukan ditebak: sisa layar setelah tepi atas kotaknya, dikurangi
 * apa pun yang berdiri di bawahnya (kontrol halaman) plus satu jarak.
 */
function pasangTinggiTabel() {
    const kotak = [...document.querySelectorAll(".overflow-auto")]
        .filter((k) => k.querySelector("table.register"));
    if (!kotak.length) return;

    const hitung = () => {
        for (const k of kotak) {
            k.style.maxHeight = "";
            const atas = k.getBoundingClientRect().top;
            let bawah = 0;
            let n = k.parentElement ? k.parentElement.nextElementSibling : null;
            while (n) {
                if (!n.hasAttribute("hidden")) {
                    const r = n.getBoundingClientRect();
                    if (r.height > 0) bawah += r.height + 16;
                }
                n = n.nextElementSibling;
            }
            const sisa = window.innerHeight - atas - bawah - 20;
            k.style.maxHeight = Math.max(220, Math.round(sisa)) + "px";
        }
    };

    let tunggu;
    const jadwalkan = () => {
        clearTimeout(tunggu);
        tunggu = setTimeout(hitung, 60);
    };
    addEventListener("resize", jadwalkan, { passive: true });
    if (typeof ResizeObserver === "function") {
        const ro = new ResizeObserver(jadwalkan);
        const utama = document.querySelector("main");
        if (utama) ro.observe(utama);
    }
    hitung();
}

/* Kepala halaman selebar isinya.
 *
 * `.kepala__isi` dipatok 1400px sementara `main` berbeda-beda: 1400, 1200,
 * 1060, dan 576. Di 1440px dengan sidebar terbuka, judul halaman Penilaian
 * berdiri 70px di kiri toolbar-nya sendiri, dan kartu Akun 312px. Lebarnya
 * dibaca dari `main`, bukan ditebak per halaman.
 */
function samakanLebarKepala() {
    const kepala = document.querySelector(".kepala__isi");
    const utama = document.querySelector("main");
    if (!kepala || !utama) return;
    const lebar = getComputedStyle(utama).maxWidth;
    if (lebar && lebar !== "none") kepala.style.maxWidth = lebar;
}

function pasangKepalaTabel() {
    document.querySelectorAll("table.register").forEach(function (tabel) {
        const kotak = tabel.closest(".overflow-auto, .overflow-y-auto");
        if (!kotak) return;
        const perbarui = function () {
            tabel.classList.toggle("kepala-melayang", kotak.scrollTop > 2);
        };
        kotak.addEventListener("scroll", perbarui, { passive: true });
        perbarui();
    });
}

/* Kepala halaman melayang hanya saat halaman bergulir di bawahnya. Di
 * halaman tabel dokumennya tidak bergulir, jadi kelas ini tidak pernah
 * terpasang di sana; di Penilaian dan Pengaturan ia yang menyatakan bahwa
 * judulnya berada DI ATAS isi yang lewat. */
function pasangKepalaHalaman() {
    // Dicari saat dibutuhkan, bukan sekali di awal: berkas ini dievaluasi
    // SEBELUM halaman memanggil nav.js:pasang() yang membangun kepalanya,
    // jadi pada saat itu `.kepala` belum ada.
    const perbarui = function () {
        const kepala = document.querySelector(".kepala");
        if (kepala) kepala.classList.toggle("melayang", window.scrollY > 2);
    };
    addEventListener("scroll", perbarui, { passive: true });
    perbarui();
}

/* Segmen yang menggulung mendatar: tepi kanannya memudar selama masih ada
 * tombol yang tersembunyi di sana. Tombolnya digambar belakangan oleh
 * halaman, jadi perubahannya diamati, bukan diperiksa sekali di awal. */
function pasangSegmen() {
    const semua = document.querySelectorAll(".segmen");
    if (!semua.length) return;
    const periksa = function (seg) {
        const sisa = seg.scrollWidth - seg.clientWidth - seg.scrollLeft;
        seg.classList.toggle("segmen--lanjut", sisa > 4);
    };
    semua.forEach(function (seg) {
        seg.addEventListener("scroll", function () { periksa(seg); }, { passive: true });
        if (typeof MutationObserver === "function") {
            new MutationObserver(function () { periksa(seg); })
                .observe(seg, { childList: true, attributes: true, attributeFilter: ["hidden"] });
        }
        periksa(seg);
    });
    addEventListener("resize", function () { semua.forEach(periksa); }, { passive: true });
}

function pasangTataLetak() {
    samakanLebarKepala();
    pasangKepalaTabel();
    pasangKepalaHalaman();
    pasangSegmen();
    pasangTinggiTabel();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pasangTataLetak);
} else {
    pasangTataLetak();
}
