// Mesin daftar keikutsertaan KKN — satu tabel untuk tiga halaman.
//
// Sampai 8 September 2026 tabel ini tertanam di /data-kkn/ ("Register") dan
// ditumpangi tiga pekerjaan sekaligus: mendaftarkan, membayar, dan melihat
// buku besar. Pemilik: "Register untuk pendaftaran; Data induk menampung
// semua data". Jadi tabelnya dikeluarkan ke sini, dan tiap halaman memakainya
// dengan kolom, saringan tetap, dan tindakan barisnya sendiri:
//
//   /pendaftaran/  tahun aktif, tindakan Batalkan, laci Daftarkan peserta
//   /pembayaran/   saringan bayar (bawaan belum bayar), laci status bayar
//   /data-induk/   tab Peserta: semua tahun, baca-saja
//
// Semuanya menulis lewat textContent — nama mahasiswa dan judul KKN adalah
// masukan pengguna (lihat catatan XSS di auth.js).

import { getJSON } from "./jscroot/api.js";
import { backend, BAYAR } from "./config.js";
import { tokenHeader } from "./auth.js";
import { el, sel, tanda, deretNilai, sembunyikan, kosongkan, sehat } from "./ui.js";

// Sebagian data menuliskan "Kelompok 22", sebagian hanya "33". Kolomnya
// sudah berjudul Kelompok; awalannya dibuang supaya tidak terbaca dua kali.
export function nomorKelompok(s) {
    return String(s || "").replace(/^kelompok\s+/i, "");
}

function selNama(r) {
    // Nama TIDAK dibungkus: satu nama tiga baris menaikkan tinggi seluruh
    // barisnya. Yang terpotong tetap terbaca lewat `title`.
    const td = el("td", "font-medium");
    td.title = r.name || "";
    const bungkus = el("div", "flex items-center gap-1.5 min-w-0");
    bungkus.appendChild(el("span", "truncate", r.name || "—"));
    if (r.ketua) bungkus.appendChild(el("span", "tanda is-belum shrink-0", "ketua"));
    td.appendChild(bungkus);
    return td;
}

function selTeksRedup(teks, kelas) {
    const td = sel(teks, "text-xs text-tinta-redup truncate " + (kelas || ""));
    td.title = teks || "";
    return td;
}

function selNilai(r) {
    const td = el("td", "text-right whitespace-nowrap");
    if (r.nilai > 0) {
        td.appendChild(el("span", "font-data text-sm tabular-nums", r.nilai));
        td.appendChild(el("span", "huruf-mutu text-bata ml-1.5", r.huruf || ""));
    } else {
        td.appendChild(el("span", "text-tinta-samar", "—"));
    }
    return td;
}

// Status bayar sebagai penanda; kalau halamannya memberi tindakan bayar,
// penanda itu sekaligus tombolnya.
function selBayar(r, padaKlik) {
    const b = BAYAR.find(function (x) { return x.nilai === (r.status_bayar || 0); }) || BAYAR[0];
    const td = el("td", "hidden sm:table-cell whitespace-nowrap");
    if (!padaKlik) {
        td.appendChild(el("span", "tanda is-" + b.tanda, b.teks));
        if (r.ket) td.title = r.ket;
        return td;
    }
    const tombol = el("button", "tanda is-" + b.tanda + " hover:ring-1 hover:ring-bata", b.teks);
    tombol.type = "button";
    tombol.title = r.ket ? r.ket + " — klik untuk mengubah" : "Klik untuk mengubah";
    tombol.addEventListener("click", function () { padaKlik(r); });
    td.appendChild(tombol);
    return td;
}

// Lebar kolom dipatok (`table-fixed` di halamannya): tanpa itu "Judul KKN",
// yang 98% baris kosong, mengambil 352px dan mendorong Nilai keluar layar.
const KOLOM = {
    nim:        { judul: "NIM", th: "w-[6.5rem]", sel: function (r) { return sel(r.nim, "kode whitespace-nowrap"); } },
    nama:       { judul: "Nama", th: "", sel: selNama },
    prodi:      { judul: "Program studi", th: "hidden lg:table-cell w-[8.5rem]",
                  sel: function (r) { return selTeksRedup(r.prodi, "hidden lg:table-cell"); } },
    kelompok:   { judul: "Kelompok", th: "w-[5rem]", sel: function (r) { return sel(nomorKelompok(r.kelompok), "kode"); } },
    ta:         { judul: "TA", th: "hidden md:table-cell w-[6rem]",
                  sel: function (r) { return sel(r.tahun_ajaran, "kode whitespace-nowrap hidden md:table-cell"); } },
    lokasi:     { judul: "Lokasi", th: "hidden xl:table-cell w-[9rem]",
                  sel: function (r) { return selTeksRedup(r.lokasi, "hidden xl:table-cell"); } },
    judul:      { judul: "Judul KKN", th: "hidden 2xl:table-cell w-[9rem]",
                  sel: function (r) { return selTeksRedup(r.judul_kkn, "hidden 2xl:table-cell"); } },
    bayar:      { judul: "Bayar", th: "hidden sm:table-cell w-[6.5rem]",
                  sel: function (r, aksi) { return selBayar(r, aksi.bayar); } },
    komponen:   { judul: "H·S·L·QP·QL", th: "w-[6.5rem]", redup: true, sel: function (r) { return deretNilai(r); } },
    nilai:      { judul: "Nilai", th: "text-right w-[4.5rem]", sel: selNilai },
    sertifikat: { judul: "Sertifikat", th: "w-[6rem]",
                  sel: function (r) { return r.has_cert ? tanda("terbit", "sah") : tanda("belum", "kosong"); } },
    tindakan:   { judul: "Tindakan", th: "text-right w-[7rem]", sel: function (r, aksi) { return aksi.tindakan(r); } },
};

// buatPeserta memasang mesin ke elemen-elemen halaman.
//
// cfg: { kepala, isi, pesan, ringkasan, kolom: [nama kolom…],
//        posisi?, sebelumnya?, berikutnya?   (paginasi bawaan)
//        padaMeta?(meta)                     (halaman menggambar paginasinya sendiri)
//        saring: { tahun, bayar, q, group_id, cert, limit }, aksi: { bayar?(r), tindakan?(r) } }
export function buatPeserta(cfg) {
    const kolom = cfg.kolom.map(function (n) { return KOLOM[n]; });
    const aksi = cfg.aksi || {};
    const saring = Object.assign({ tahun: "", bayar: "", q: "", group_id: "", cert: "", limit: 50 }, cfg.saring || {});
    let halaman = 1, totalHalaman = 1, total = 0, urutanMuat = 0;

    function gambarKepala() {
        kosongkan(cfg.kepala);
        kolom.forEach(function (k) {
            const th = el("th", k.th);
            if (k.redup) th.appendChild(el("span", "text-tinta-redup", k.judul));
            else th.textContent = k.judul;
            cfg.kepala.appendChild(th);
        });
    }

    function barisPesan(teks) {
        const tr = el("tr");
        const td = el("td", "text-center py-10 text-tinta-redup text-sm", teks);
        td.colSpan = kolom.length;
        tr.appendChild(td);
        return tr;
    }

    function gambarBaris(r) {
        const tr = el("tr");
        // Disimpan supaya satu baris bisa digambar ulang atau dibuang sendiri
        // tanpa memuat ulang seluruh daftar — memuat ulang membuang posisi
        // gulung, dan petugas yang mengerjakan sepuluh orang berturut-turut
        // harus mencari tempatnya lagi sepuluh kali.
        r.__tr = tr;
        kolom.forEach(function (k) { tr.appendChild(k.sel(r, aksi)); });
        return tr;
    }

    function tulisRingkasan() {
        if (cfg.ringkasan) cfg.ringkasan.textContent = total.toLocaleString("id-ID") + " peserta";
    }

    function muat(hal) {
        if (hal) halaman = hal;
        sembunyikan(cfg.pesan);
        gambarKepala();
        kosongkan(cfg.isi);
        cfg.isi.appendChild(barisPesan("Memuat…"));

        const p = new URLSearchParams({ page: String(halaman), limit: String(saring.limit) });
        if (saring.tahun) p.set("tahun_ajaran", saring.tahun);
        if (saring.bayar !== "" && saring.bayar != null) p.set("bayar", String(saring.bayar));
        if (saring.group_id) p.set("group_id", saring.group_id);
        if (saring.cert) p.set("cert", saring.cert);
        if (saring.q && saring.q.trim()) p.set("q", saring.q.trim());

        const nomor = ++urutanMuat;   // jawaban yang lebih lama dari permintaan terbaru dibuang
        getJSON(backend.kkn.participations + "?" + p.toString(), function (hasil) {
            if (nomor !== urutanMuat) return;
            jawabanMuat(hasil);
        }, ...tokenHeader());
    }

    function jawabanMuat(hasil) {
        if (!sehat(hasil, cfg.pesan)) {
            kosongkan(cfg.isi);
            cfg.isi.appendChild(barisPesan("Gagal memuat."));
            return;
        }
        const amplop = hasil.data || {};
        kosongkan(cfg.isi);
        const baris = amplop.data || [];
        if (!baris.length) cfg.isi.appendChild(barisPesan("Tidak ada peserta yang cocok."));
        else baris.forEach(function (r) { cfg.isi.appendChild(gambarBaris(r)); });

        const m = amplop.meta || {};
        totalHalaman = m.total_pages || 1;
        total = m.total || 0;
        tulisRingkasan();
        if (cfg.padaMeta) cfg.padaMeta(m);
        if (cfg.posisi) cfg.posisi.textContent = "Halaman " + (m.page || 1) + " dari " + totalHalaman;
        if (cfg.sebelumnya) cfg.sebelumnya.disabled = (m.page || 1) <= 1;
        if (cfg.berikutnya) cfg.berikutnya.disabled = (m.page || 1) >= totalHalaman;
    }

    function gantiBaris(r) {
        const tr = r.__tr;
        if (tr && tr.parentNode) tr.replaceWith(gambarBaris(r));
    }

    function hapusBaris(r) {
        const tr = r.__tr;
        if (!tr || !tr.parentNode) return;
        tr.remove();
        total = Math.max(0, total - 1);
        tulisRingkasan();
        if (!cfg.isi.querySelectorAll("tr").length) cfg.isi.appendChild(barisPesan("Tidak ada peserta yang cocok."));
    }

    if (cfg.sebelumnya) cfg.sebelumnya.addEventListener("click", function () { if (halaman > 1) muat(halaman - 1); });
    if (cfg.berikutnya) cfg.berikutnya.addEventListener("click", function () { if (halaman < totalHalaman) muat(halaman + 1); });

    return { muat: muat, saring: saring, gambarBaris: gambarBaris, gantiBaris: gantiBaris,
             hapusBaris: hapusBaris, barisPesan: barisPesan, halaman: function () { return halaman; } };
}

// pasangSegmen menggambar deretan tombol saringan (tahun, status bayar).
// Mengembalikan { pilih(nilai) } untuk mengubah pilihan dari luar.
export function pasangSegmen(wadah, pilihan, awal, padaPilih) {
    kosongkan(wadah);
    let kini = awal;
    function tandai() {
        wadah.querySelectorAll("button").forEach(function (x) {
            x.setAttribute("aria-pressed", String(x.dataset.nilai === kini));
        });
    }
    pilihan.forEach(function (o) {
        const b = el("button", "", o.teks);
        b.type = "button";
        b.dataset.nilai = o.nilai;
        b.addEventListener("click", function () {
            kini = o.nilai;
            tandai();
            padaPilih(o.nilai);
        });
        wadah.appendChild(b);
    });
    tandai();
    return { pilih: function (nilai) { kini = nilai; tandai(); }, nilai: function () { return kini; } };
}

// Daftar tahun akademik resmi (Pengaturan). Saringan opsional: kalau gagal,
// halamannya tetap terbuka tanpa tombol tahun. Sengaja TIDAK lewat sehat() —
// 401 ditangani panggilan utama, dan dua pengalihan bersamaan berkedip.
export function muatTahunAkademik(lalu) {
    getJSON(backend.master.academicYears, function (hasil) {
        const daftar = (hasil && hasil.status === 200) ? (((hasil.data || {}).data) || []) : [];
        lalu(Array.isArray(daftar) ? daftar.filter(function (t) { return typeof t === "string"; }) : []);
    }, ...tokenHeader());
}

export function tahunAkademikAktif(lalu) {
    getJSON(backend.master.academicYearAktif, function (hasil) {
        const d = (hasil && hasil.status === 200) ? ((hasil.data || {}).data || {}) : {};
        lalu(typeof d.tahun_ajaran === "string" ? d.tahun_ajaran : "");
    }, ...tokenHeader());
}
