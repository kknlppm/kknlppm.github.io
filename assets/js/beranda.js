// Perilaku halaman depan publik.
//
// Yang digerakkan mesin (scrollcraft.js): reveal-on-entry, stagger, parallax.
// Yang tinggal di sini cuma tiga hal yang memang milik halaman ini:
//
//   1. Lembar malam  — ciri khas halaman ini, dikode di halaman, bukan di mesin
//   2. Tanya jawab   — datanya di berkas ini
//   3. Berita        — satu-satunya panggilan API, dan ia harus boleh gagal
//
// SATU ATURAN YANG TIDAK BOLEH DIBALIK: kartu dan accordion digambar lewat
// createElement + textContent, tidak pernah innerHTML. Halaman ini satu origin
// dengan aplikasi yang memegang token di localStorage, dan judul berita datang
// dari luar. Lebih mudah tidak pernah membuka jalur itu daripada menutupnya
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

/* Lembar malam ----------------------------------------------------------
 *
 * Tiap bab masuk masih tertutup lembar berwarna ground bab SEBELUMNYA. Saat
 * batasnya lewat, lembar itu surut ke atas dan tidak pernah kembali, jadi
 * cahayanya datang dari bawah seperti fajar sungguhan.
 *
 * Nilainya ditulis ke `--kelupas`; CSS yang memutuskan artinya. Dibaca dalam
 * satu gelung rAF supaya semua getBoundingClientRect terjadi berurutan dan
 * tidak menyelang-nyeling baca-tulis tata letak.
 */
const bab = $$(".bab");
const hero = $(".bab--malam");
const bilah = $("#bilah");
const burger = $("#burger");
const menuPonsel = $("#menuPonsel");

/* Menu ponsel ----------------------------------------------------------- */
if (burger && menuPonsel) {
    const buka = (ya) => {
        menuPonsel.hidden = !ya;
        burger.setAttribute("aria-expanded", String(ya));
        burger.setAttribute("aria-label", ya ? "Tutup menu" : "Buka menu");
    };
    burger.addEventListener("click", () => buka(menuPonsel.hidden));
    menuPonsel.addEventListener("click", (e) => { if (e.target.closest("a")) buka(false); });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !menuPonsel.hidden) { buka(false); burger.focus(); }
    });
}

// Bilah melayang di atas lima ground, jadi ia harus tahu ground mana yang
// sedang di bawahnya. Diukur di y=48px, yaitu tinggi bilahnya sendiri.
function setelBilah(H) {
    if (!bilah) return;
    for (const b of bab) {
        const r = b.getBoundingClientRect();
        if (r.top <= 48 && r.bottom > 48) {
            if (bilah.dataset.tanah !== b.dataset.tanah) {
                bilah.dataset.tanah = b.dataset.tanah;
            }
            // Warna ground diambil apa adanya, bukan ditebak: kelima babnya
            // lima warna, dan latar generik akan berpita di empat di antaranya.
            const warna = getComputedStyle(b).backgroundColor;
            if (bilah.dataset.warna !== warna) {
                bilah.dataset.warna = warna;
                bilah.style.setProperty("--folio-latar", warna);
            }
            return;
        }
    }
}

// `--gulir` 0..1 menjalankan seluruh adegan hero: tujuh bidang dengan laju
// berbeda, dua di antaranya berlawanan arah. Satu nilai skalar, dan CSS yang
// memutuskan artinya untuk tiap bidang.
//
// Pembaginya dijaga: kalau tinggi hero dan tinggi layar kebetulan sama,
// pembagian nol membuat adegannya melompat satu piksel di gulir pertama.
function ukurAdegan(H) {
    if (!hero) return;
    const jarak = hero.offsetHeight - H;
    if (jarak < 80) { hero.style.setProperty("--gulir", "0"); return; }
    const p = -hero.getBoundingClientRect().top / jarak;
    hero.style.setProperty("--gulir", (p < 0 ? 0 : p > 1 ? 1 : p).toFixed(4));
}

if (bab.length && !kurangGerak) {
    let menunggu = false;

    const ukur = () => {
        menunggu = false;
        const H = window.innerHeight;
        let terdekat = null;

        for (const b of bab) {
            const r = b.getBoundingClientRect();

            // 0 saat puncak bab masih di bawah lipatan, 1 setelah ia naik
            // 55% layar. Fajarnya selesai lebih awal daripada babnya supaya
            // pembaca membaca di ground yang sudah tenang, bukan yang sedang
            // berubah di bawah matanya.
            const maju = (H - r.top) / (H * 0.55);
            const kelupas = maju < 0 ? 0 : maju > 1 ? 1 : maju;
            b.style.setProperty("--kelupas", kelupas.toFixed(4));

            // Bab yang sedang dibaca: yang MEMUAT garis sepertiga atas
            // layar. Dulu ini "yang tepinya paling dekat", dan itu bias ke bab
            // BERIKUTNYA begitu tepinya mendekat dari bawah: folio menulis
            // "Siang" sementara pembacanya masih di Pagi.
            const garis = H * 0.33;
            if (r.top <= garis && r.bottom > garis) {
                terdekat = b;
            }
        }


        setelBilah(H);
        ukurAdegan(H);
    };

    const jadwalkan = () => {
        if (menunggu) return;
        menunggu = true;
        requestAnimationFrame(ukur);
    };

    addEventListener("scroll", jadwalkan, { passive: true });
    addEventListener("resize", jadwalkan);
    ukur();
} else if (bab.length) {
    // Gerak dikurangi: groundnya tetap berganti tegas antar bab, lembarnya
    // saja yang tidak dianimasikan. Bilah dan adegannya tetap perlu nilai
    // awal yang masuk akal.
    addEventListener("scroll", () => setelBilah(window.innerHeight), { passive: true });
    setelBilah(window.innerHeight);
    ukurAdegan(window.innerHeight);
}

/* Respons pointer di hero -----------------------------------------------
 *
 * TAMBAHAN, bukan satu-satunya cara merasakan adegannya: sentuh, papan
 * ketik, dan gerak-dikurangi tetap mendapat komposisi yang lengkap. Tidak
 * pernah mengunci kursor.
 *
 * Nilainya diredam, bukan dipakai mentah: pointer yang diikuti persis
 * terasa seperti stiker yang menempel di kursor, bukan seperti kedalaman.
 */
if (hero && !kurangGerak && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let tujuan = 0, kini = 0, jalan = false;

    hero.addEventListener("pointermove", (e) => {
        tujuan = (e.clientX / window.innerWidth - 0.5) * 2;   // -1..1
        if (!jalan) { jalan = true; requestAnimationFrame(redam); }
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
        tujuan = 0;
        if (!jalan) { jalan = true; requestAnimationFrame(redam); }
    });

    function redam() {
        kini += (tujuan - kini) * 0.075;
        hero.style.setProperty("--tikus", kini.toFixed(4));
        if (Math.abs(tujuan - kini) > 0.001) { requestAnimationFrame(redam); }
        else { jalan = false; }
    }
}

/* Tanya jawab ----------------------------------------------------------- */

const TANYA = [
    ["Apa itu KKN dan siapa yang wajib mengikutinya?",
     ["Kuliah Kerja Nyata adalah kegiatan pengabdian kepada masyarakat yang " +
      "diselenggarakan LPPM Universitas Al-Ghifari. Mahasiswa ditempatkan dalam " +
      "kelompok di lokasi tertentu, didampingi seorang Dosen Pembimbing Lapangan.",
      "Ketentuan siapa yang wajib mengikuti dan pada semester ke berapa " +
      "mengikuti aturan program studi masing-masing."]],

    ["Bagaimana nilai KKN dihitung?",
     ["Ada lima aspek yang dinilai Dosen Pembimbing Lapangan, masing-masing " +
      "0 sampai 100: Kehadiran (H), Sikap (S), Kepemimpinan (L), Kualitas " +
      "Perencanaan (QP), dan Kualitas Luaran (QL).",
      "Nilai akhir adalah rata-rata kelimanya, dibulatkan. Huruf mutunya: " +
      "A untuk 80 ke atas, B untuk 68 sampai 79, C untuk 56 sampai 67, dan " +
      "D untuk 45 sampai 55. Di bawah 45 dinyatakan tidak lulus."]],

    ["Bagaimana cara masuk ke aplikasi?",
     ["Mahasiswa masuk memakai NIM sebagai nama pengguna. Dosen dan staf " +
      "memakai nama pengguna yang diberikan LPPM.",
      "Kalau sandi terlupa atau akun belum aktif, hubungi LPPM. Pengaturan " +
      "akun tidak bisa dilakukan sendiri dari halaman masuk."]],

    ["Bagaimana memeriksa keaslian sertifikat KKN?",
     ["Pindai kode QR yang tercetak di sertifikat. Ia langsung membuka halaman " +
      "verifikasi dan menampilkan nama, NIM, program studi, nomor sertifikat, " +
      "dan tanggal terbitnya.",
      "Verifikasi terbuka untuk umum dan tidak memerlukan akun. Pemindainya " +
      "tidak perlu punya hubungan apa pun dengan kampus.",
      "Kalau kode QR-nya rusak, sobek, atau tercetak terlalu buram untuk " +
      "dipindai, hubungi LPPM."]],

    ["Apakah nilai saya terlihat oleh mahasiswa lain?",
     ["Tidak. Halaman verifikasi sertifikat yang terbuka untuk umum hanya " +
      "menampilkan identitas dan keabsahan sertifikatnya. Nilai tidak pernah " +
      "ikut ditampilkan di sana.",
      "Di dalam aplikasi, apa yang bisa dilihat seseorang ditentukan perannya."]],
];

const daftarTanya = $("#daftarFaq");
if (daftarTanya) {
    TANYA.forEach(([tanya, jawab], i) => {
        const bungkus = el("div", "acc");

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
    });
}

/* Berita ----------------------------------------------------------------
 *
 * Satu-satunya panggilan API di halaman ini, dan ia harus boleh gagal tanpa
 * merusak apa pun. Karena itu TIDAK memakai ui.js:sehat(): halaman publik
 * tidak boleh melempar pengunjung ke /login/ hanya karena servernya diam.
 */

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
        // Tanpa foto, blok ini hanya ruang mati. Ringkasannya ditaruh di sini
        // supaya kartunya tetap memberi tahu sesuatu.
        isi.className = "pos__tanpa-foto";
        if (b.ringkasan) isi.appendChild(el("p", null, b.ringkasan));
    }
    gbr.appendChild(isi);

    const badan = el("div", "pos__isi");
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

if (wadahBerita && beritaKosong) {
    let dijawab = false;

    // jscroot `api.js` menelan galat jaringan ke console TANPA memanggil
    // callback-nya. Tanpa penjaga ini, bagian berita menggantung dalam keadaan
    // kosong tanpa pernah menyerah, dan tidak ada yang tahu bedanya "belum ada
    // berita" dari "server tidak terjangkau".
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
        const daftar = ((hasil.data || {}).data) || [];
        if (!daftar.length) return;
        daftar.slice(0, 3).forEach((b) => wadahBerita.appendChild(kartuBerita(b)));
        wadahBerita.hidden = false;
        beritaKosong.hidden = true;
    });
}

/* Tahun berjalan di kolofon --------------------------------------------- */
const tahun = $("#tahunKini");
if (tahun) tahun.textContent = String(new Date().getFullYear());
