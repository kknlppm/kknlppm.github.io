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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pasangKepalaTabel);
} else {
    pasangKepalaTabel();
}
