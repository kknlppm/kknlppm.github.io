// Kerangka aplikasi: sidebar kiri + kepala halaman.
//
// Tautan yang ditampilkan mengikuti peran. Ini KENYAMANAN, bukan keamanan —
// yang menegakkan izin adalah backend. Menyembunyikan tautan hanya supaya
// orang tidak menekan sesuatu yang pasti ditolak.
//
// Bentuknya mengikuti pola sidebar Flowbite 2.5.2 (Tailwind 3, MIT), tapi
// JS-nya ditulis di sini: yang dibutuhkan cuma buka/tutup di ponsel, dan itu
// tiga puluh baris — bukan alasan memuat flowbite.min.js seharga 133 KB.
//
// Sidebar menggantikan baris tab mendatar. Baris itu butuh 596px sedangkan
// ponsel memuat 350px, jadi tiga tujuan terakhir tidak terlihat ADA. Dalam
// kolom, ketujuhnya terbaca sekaligus.

import { getUser, logout } from "./auth.js";
import { PERAN as P } from "./config.js";
import { el } from "./ui.js";

// Urutannya mengikuti alur kerja: daftar orang dulu, lalu menilai, lalu
// menerbitkan. Data induk paling belakang karena paling jarang disentuh.
// Bagian sidebar. STATIS — bukan menu bersarang yang bisa dibuka-tutup.
//
// Menu bersarang menambah keadaan buka/tutup, penyorotan induk-aktif, dan
// ingatan "ini di bawah apa" untuk pohon yang cuma dua tingkat dengan sembilan
// daun; setiap klik tambahan menuju daun dibayar setiap hari. Label statis
// memberi manfaat pemindaian yang sama dengan biaya interaksi nol, dan tetap
// bekerja saat sidebar diciutkan jadi rel ikon — di sana ia jadi garis pemisah.
const BAGIAN = { kkn: "Kuliah Kerja Nyata", data: "Data", sistem: "Sistem", akun: "Akun" };

const TAUTAN = [
    // URUTANNYA MENGIKAT: label bagian digambar saat bagiannya berganti,
    // jadi tujuan sebagian yang sama harus berdampingan. Menyisipkan satu
    // baris di tempat yang salah membuat satu judul bagian muncul dua kali.
    { url: "/data-kkn/",      label: "Register",   ikon: "register",   bagian: "kkn",    peran: [P.ADMIN, P.PEMBAYARAN, P.MAHASISWA, P.DOSEN, P.VALIDASI_LPPM, P.ADMIN_FAKULTAS] },
    { url: "/kelompok/",      label: "Kelompok",   ikon: "kelompok",   bagian: "kkn",    peran: [P.ADMIN, P.ADMIN_FAKULTAS] },
    { url: "/penilaian/",     label: "Penilaian",  ikon: "penilaian",  bagian: "kkn",    peran: [P.ADMIN, P.DOSEN] },
    { url: "/sertifikat/",    label: "Sertifikat", ikon: "sertifikat", bagian: "kkn",    peran: [P.ADMIN, P.VALIDASI_LPPM] },
    { url: "/nilai-matkul/",  label: "Nilai matkul", ikon: "matkul",  bagian: "kkn",    peran: [P.ADMIN, P.DOSEN] },
    { url: "/data-induk/",    label: "Data induk", ikon: "induk",      bagian: "data",   peran: [P.ADMIN, P.ADMIN_FAKULTAS] },
    { url: "/kelola-berita/", label: "Berita",     ikon: "berita",     bagian: "data",   peran: [P.ADMIN] },
    { url: "/pengaturan/",    label: "Pengaturan", ikon: "pengaturan", bagian: "sistem", peran: [P.ADMIN] },
    { url: "/akun/",          label: "Akun saya",  ikon: "sandi",      bagian: "akun",   peran: [P.ADMIN, P.PEMBAYARAN, P.MAHASISWA, P.DOSEN, P.VALIDASI_LPPM, P.ADMIN_FAKULTAS] },
];

// Ikon garis 24×24 dari kumpulan Feather (MIT), disalin sebagai jalur — bukan
// dimuat sebagai pustaka. Tujuh ikon tidak sepadan dengan satu ketergantungan,
// dan tanpa ikon sidebar tidak bisa diciutkan jadi kolom sempit.
const IKON = {
    register:   ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
    kelompok:   ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
                 "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
    penilaian:  ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
    sertifikat: ["M12 1a7 7 0 1 1 0 14 7 7 0 0 1 0-14z", "M8.21 13.89L7 23l5-3 5 3-1.21-9.12"],
    induk:      ["M12 2c5 0 9 1.34 9 3s-4 3-9 3-9-1.34-9-3 4-3 9-3z",
                 "M21 12c0 1.66-4 3-9 3s-9-1.34-9-3", "M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"],
    berita:     ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6",
                 "M16 13H8", "M16 17H8"],
    ciut:       ["M15 18l-6-6 6-6"],
    matkul:     ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
    sandi:      ["M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z", "M7 11V7a5 5 0 0 1 10 0v4"],
    keluar:     ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
    // tema tampilan
    sistem:     ["M3 5h18v11H3z", "M8 21h8", "M12 16v5"],
    terang:     ["M12 3v2", "M12 19v2", "M3 12h2", "M19 12h2", "M5.6 5.6l1.4 1.4", "M17 17l1.4 1.4",
                 "M5.6 18.4l1.4-1.4", "M17 7l1.4-1.4", "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8"],
    gelap:      ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
    pengaturan: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3",
                 "M1 14h6", "M9 8h6", "M17 16h6"],
};

function gambarIkon(nama) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.75");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    (IKON[nama] || []).forEach(function (d) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        svg.appendChild(path);
    });
    return svg;
}

const KUNCI_CIUT = "kkn_sisi_ciut";

export function pasang(judul, keterangan) {
    const u = getUser() || {};

    const bar = document.createElement("div");
    bar.className = "pita-atas";
    bar.setAttribute("aria-hidden", "true");
    document.body.prepend(bar);

    const boleh = TAUTAN.filter(function (t) { return t.peran.includes(u.role); });
    // Digambar hanya kalau perannya punya lebih dari satu tujuan. Menu satu
    // butir bukan menu, dan mahasiswa tidak perlu kehilangan 240px layar
    // untuk satu tautan ke halaman yang sedang ia buka.
    const adaSisi = boleh.length > 1;

    let sisi = null, tirai = null, tombolMenu = null;

    if (adaSisi) {
        document.body.classList.add("ada-sisi");
        // Pilihan ciut/lebar bertahan antar halaman. Kalau localStorage
        // ditolak (mode penyamaran), sidebar cuma kembali lebar — tidak rusak.
        try {
            if (localStorage.getItem(KUNCI_CIUT) === "1") document.body.classList.add("sisi-ciut");
        } catch (e) { /* diabaikan */ }

        tirai = document.createElement("div");
        tirai.className = "sisi__tirai";
        tirai.hidden = true;
        document.body.appendChild(tirai);

        sisi = document.createElement("aside");
        sisi.className = "sisi";
        sisi.id = "sisi";

        const merek = el("div", "sisi__merek");
        // Lambang kampus apa adanya — ia asal-usul palet bata, jadi tidak
        // perlu kotak berwarna di belakangnya. alt kosong: namanya sudah
        // tertulis di sebelahnya, dan saat sidebar diciutkan title-nya
        // yang bicara.
        const lambang = document.createElement("img");
        lambang.src = "/assets/img/logo-unfari.png";
        lambang.alt = "";
        lambang.width = 28; lambang.height = 27;
        merek.appendChild(lambang);
        merek.title = "KKN LPPM · Universitas Al-Ghifari";
        merek.appendChild(el("span", "sisi__label", "KKN LPPM"));

        // Ciutkan jadi kolom ikon. Bukan hiasan: sidebar 240px mengambil
        // lebar dari tabel, dan di layar 1440px itu membuat nama mahasiswa
        // membungkus dua baris — tinggi baris terukur 78px, hampir dua kali
        // lipat. Diciutkan, isi halaman kembali 1380px.
        const ciut = el("button", "sisi__ciut hidden lg:grid");
        ciut.type = "button";
        ciut.innerHTML = "";
        ciut.appendChild(gambarIkon("ciut"));
        merek.appendChild(ciut);
        sisi.appendChild(merek);

        function segarkanCiut() {
            const ada = document.body.classList.contains("sisi-ciut");
            ciut.setAttribute("aria-expanded", String(!ada));
            ciut.setAttribute("aria-label", ada ? "Lebarkan menu" : "Ciutkan menu");
            ciut.title = ada ? "Lebarkan menu" : "Ciutkan menu";
        }
        ciut.setAttribute("aria-controls", "sisi");
        segarkanCiut();
        ciut.addEventListener("click", function () {
            const ada = document.body.classList.toggle("sisi-ciut");
            try { localStorage.setItem(KUNCI_CIUT, ada ? "1" : "0"); } catch (e) { /* diabaikan */ }
            segarkanCiut();
        });

        const nav = document.createElement("nav");
        nav.className = "sisi__nav";
        nav.setAttribute("aria-label", "Bagian aplikasi");
        const banyakBagian = new Set(boleh.map(function (t) { return t.bagian; })).size > 1;
        const sekarang = window.location.pathname.replace(/\/+$/, "/");
        let bagianTerakhir = null;
        boleh.forEach(function (t) {
            // Label bagian digambar saat bagiannya BERGANTI, dan hanya kalau
            // masih ada bagian lain sesudahnya. Peran yang seluruh tujuannya
            // ada di satu bagian tidak perlu diberi judul untuk satu-satunya
            // kelompok yang ia punya.
            if (t.bagian !== bagianTerakhir && banyakBagian) {
                bagianTerakhir = t.bagian;
                nav.appendChild(el("div", "sisi__bagian", BAGIAN[t.bagian] || ""));
            }
            const a = el("a", "sisi__tautan");
            a.href = t.url;
            // title dibaca sebagai tooltip saat sidebar diciutkan jadi ikon.
            a.title = t.label;
            a.appendChild(gambarIkon(t.ikon));
            a.appendChild(el("span", "sisi__label", t.label));
            if (sekarang === t.url) a.setAttribute("aria-current", "page");
            nav.appendChild(a);
        });
        sisi.appendChild(nav);

        // Identitas dan Keluar duduk di KAKI sidebar. Keluar adalah tombol
        // yang paling jarang ditekan dan paling mahal kalau salah tekan,
        // jadi ia paling jauh dari jalur tangan.
        const kaki = el("div", "sisi__kaki");
        const ident = el("div", "sisi__label");
        ident.appendChild(el("div", "text-sm font-medium leading-tight truncate", u.name || ""));
        ident.appendChild(el("div", "eyebrow text-tinta-redup mb-3", u.role_name || ""));
        kaki.appendChild(ident);

        // Sakelar tema. Logikanya di tema.js (dimuat di head supaya tidak
        // berkedip); di sini hanya tombol dan penanda mana yang aktif.
        const tema = el("div", "sisi__tema");
        tema.setAttribute("role", "group");
        tema.setAttribute("aria-label", "Tema tampilan");
        [["sistem", "Ikut sistem"], ["terang", "Terang"], ["gelap", "Gelap"]].forEach(function (p) {
            const b = el("button", "sisi__tema-tombol");
            b.type = "button";
            b.title = p[1];
            b.setAttribute("aria-label", "Tema " + p[1].toLowerCase());
            b.dataset.tema = p[0];
            b.appendChild(gambarIkon(p[0]));
            b.addEventListener("click", function () {
                if (window.kknTema) window.kknTema.setel(p[0]);
                tandaiTema();
            });
            tema.appendChild(b);
        });
        function tandaiTema() {
            const aktif = window.kknTema ? window.kknTema.pilihan() : "sistem";
            tema.querySelectorAll("button").forEach(function (b) {
                b.setAttribute("aria-pressed", String(b.dataset.tema === aktif));
            });
        }
        tandaiTema();
        document.addEventListener("kkn:tema", tandaiTema);
        kaki.appendChild(tema);

        // Ikon + label, bukan teks saja: saat sidebar diciutkan jadi rel
        // 60px, kata "Keluar" meluber keluar dari tombolnya.
        const keluar = el("button", "tombol-halus w-full sisi__keluar");
        keluar.type = "button";
        keluar.title = "Keluar";
        keluar.appendChild(gambarIkon("keluar"));
        keluar.appendChild(el("span", "sisi__label", "Keluar"));
        keluar.addEventListener("click", function () { logout(); });
        kaki.appendChild(keluar);
        sisi.appendChild(kaki);

        document.body.appendChild(sisi);
    }

    const head = document.createElement("header");
    head.className = "kepala";
    const wrap = el("div", "kepala__isi");

    if (adaSisi) {
        tombolMenu = el("button", "kepala__menu lg:hidden");
        tombolMenu.type = "button";
        tombolMenu.setAttribute("aria-label", "Buka menu");
        tombolMenu.setAttribute("aria-controls", "sisi");
        tombolMenu.setAttribute("aria-expanded", "false");
        // Tiga garis digambar sendiri — tidak perlu pustaka ikon untuk ini.
        for (let i = 0; i < 3; i++) tombolMenu.appendChild(el("i"));
        wrap.appendChild(tombolMenu);
    }

    const kiri = el("div", "min-w-0");
    // <h1> yang sungguhan. Sebelumnya judul halaman ditulis sebagai <div>,
    // jadi ketujuh halaman aplikasi tidak punya satu pun judul — pembaca
    // layar tidak bisa menjelajahinya lewat struktur.
    kiri.appendChild(el("h1", "judul-halaman text-lg leading-tight", judul));
    kiri.appendChild(el("div", "eyebrow text-tinta-redup",
        keterangan || "LPPM · Universitas Al-Ghifari"));
    wrap.appendChild(kiri);

    // Tanpa sidebar, identitas dan Keluar HARUS ada di kepala.
    //
    // Peran bertujuan tunggal (mahasiswa, pembayaran) tidak diberi sidebar —
    // menu satu butir bukan menu. Tapi tombol Keluar tinggal di kaki sidebar,
    // jadi tanpa cabang ini kedua peran itu tidak punya cara keluar sama
    // sekali. Cacat yang lahir bersama sidebar-nya sendiri.
    if (!adaSisi) {
        const kanan = el("div", "flex items-center gap-4 shrink-0 ml-auto");
        const ident = el("div", "text-right hidden sm:block");
        ident.appendChild(el("div", "text-sm font-medium leading-tight", u.name || ""));
        ident.appendChild(el("div", "eyebrow text-tinta-redup", u.role_name || ""));
        kanan.appendChild(ident);
        const keluar = el("button", "tombol-halus", "Keluar");
        keluar.type = "button";
        keluar.addEventListener("click", function () { logout(); });
        kanan.appendChild(keluar);
        wrap.appendChild(kanan);
    }

    head.appendChild(wrap);
    bar.after(head);

    if (!adaSisi) return;

    function buka() {
        document.body.classList.add("sisi-terbuka");
        tirai.hidden = false;
        tombolMenu.setAttribute("aria-expanded", "true");
        const pertama = sisi.querySelector("a, button");
        if (pertama) pertama.focus();
        document.addEventListener("keydown", padaTombol, true);
    }
    function tutup() {
        document.body.classList.remove("sisi-terbuka");
        tirai.hidden = true;
        tombolMenu.setAttribute("aria-expanded", "false");
        tombolMenu.focus();
        document.removeEventListener("keydown", padaTombol, true);
    }
    function padaTombol(e) { if (e.key === "Escape") { e.preventDefault(); tutup(); } }

    tombolMenu.addEventListener("click", function () {
        if (document.body.classList.contains("sisi-terbuka")) tutup(); else buka();
    });
    tirai.addEventListener("click", tutup);
    sisi.querySelectorAll(".sisi__tautan").forEach(function (a) {
        a.addEventListener("click", function () {
            if (document.body.classList.contains("sisi-terbuka")) tutup();
        });
    });
}

export { PERAN } from "./config.js";
