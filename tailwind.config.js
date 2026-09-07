/** @type {import('tailwindcss').Config} */

// Setiap warna dibaca dari variabel CSS `--w-<nama>` (tiga angka RGB) yang
// didefinisikan di input.css untuk tema terang DAN gelap. Utilitasnya
// (bg-kertas, text-tinta, ...) tidak berubah; yang berganti hanya nilai di
// balik variabelnya saat `data-tema="gelap"` dipasang di <html>.
// `<alpha-value>` membuat bentuk bg-tinta/25 dan decoration-bata/40 tetap
// bekerja.
const w = (nama) => `rgb(var(--w-${nama}) / <alpha-value>)`;

module.exports = {
    // Gelap dipilih lewat atribut, bukan media query: pengguna memilih
    // sendiri di sidebar, dan "ikut sistem" adalah salah satu pilihannya.
    // Skrip yang memasang atributnya: assets/js/tema.js.
    darkMode: ["selector", '[data-tema="gelap"]'],

    // Halaman depan (`index.html` + `beranda.js`) SENGAJA di luar Tailwind —
    // ia gelap dan memakai `assets/css/beranda.css` sendiri. Tanpa dikecualikan,
    // kelas-kelasnya ikut menumpuk di app.css yang tidak pernah memakainya.
    // `node_modules` dan `uji` dikecualikan supaya pemindaian tidak menyapu
    // ribuan berkas yang bukan milik situs ini.
    content: [
        "./**/*.html",
        "!./index.html",
        "!./node_modules/**",
        "!./uji/**",
        "./assets/js/**/*.js",
        "!./assets/js/beranda.js",
        "!./assets/js/jscroot/**",
    ],

    // Kelas yang dirakit dinamis di JavaScript tidak terlihat oleh pemindai
    // Tailwind. Tanpa disebut di sini, kelasnya hilang dari app.css.
    safelist: ["is-sah", "is-belum", "is-kosong"],

    theme: {
        // Palet DIGANTI, bukan diperluas. Skala bawaan Tailwind memuat 22
        // rona yang tidak satu pun berasal dari dokumen ini; membiarkannya
        // ada berarti mengundang warna asing masuk diam-diam.
        colors: {
            transparent: "transparent",
            current: "currentColor",

            // Diambil dari PUNGGUNG BUKIT di kaki halaman depan
            // di kaki halaman depan, bukan dikarang, dan bukan
            // dari logo kampus langsung. Logo itu merah pekat #E1000F; dipakai
            // apa adanya ia berteriak di layar yang dipandangi berjam-jam.
            // Gunung itu versi lembutnya, dan sudah ada di halaman depan.
            //
            // Piksel gunungnya diukur, bukan dikira:
            //   puncak  #BE9392  rona   1°  jenuh 25%
            //   lereng  #9A7273  rona 359°  jenuh 17%
            //   bayang  #624345  rona 356°  jenuh 19%
            //
            // Pada jenuh 17% warnanya jadi abu kecokelatan, tidak terbaca
            // sebagai warna. Jadi rona muka gunung yang terkena cahaya
            // dipertahankan lalu dikuatkan seperlunya: rona 7°, jenuh 37%.
            //
            // Ronanya SENGAJA digeser dari 359° ke 7°. `galat` di bawah
            // berona 357° — nyaris sama. Tanpa geseran itu, tautan dan pesan
            // kesalahan jadi satu warna. Sekarang selisihnya 10° rona plus
            // 31 poin jenuh; pesan galat tetap juga ditandai kotak bertoner
            // dan kata, bukan warna saja.
            //
            //   bata       #9C5248  5,65 di kertas · 4,88 di latar
            //   bata-dalam #5E2F29  10,97 memikul teks putih
            //   bata-muda  #F6E7E3  4,70 terhadap bata di atasnya
            bata: { DEFAULT: w("bata"), dalam: w("bata-dalam"), muda: w("bata-muda") },


            // Kontras diukur, bukan dikira-kira. Nilai sebelumnya (#64798C
            // dan #9AAAB9) menghasilkan 4,51 dan 2,38 terhadap putih —
            // yang kedua jauh di bawah ambang 4,5 untuk teks kecil, dan
            // eyebrow di sini berukuran 11px.
            //   redup #4A5D70  6,79 di kartu · 5,86 di latar
            //   samar #5D7186  5,03 di kartu · 4,34 di latar
            // Karena itu `samar` hanya dipakai di atas kartu putih.
            tinta: { DEFAULT: w("tinta"), redup: w("tinta-redup"), samar: w("tinta-samar") },

            // Kertas dingin bersemu biru — sengaja bukan krem, dan sengaja
            // TIDAK ikut menghangat: latar netral sejuk membuat bata di
            // atasnya terbaca sebagai warna, bukan sebagai noda.
            kertas: w("kertas"),
            latar: w("latar"),
            // `garis` dan `tipis` memisahkan — itu hiasan, dan WCAG tidak
            // menuntut apa-apa darinya. `kendali` MEMBENTUK: ia satu-satunya
            // penanda di mana kotak isian berakhir, dan kotaknya duduk di
            // atas kartu putih. WCAG 1.4.11 minta 3:1 untuk itu; #CFDAE4
            // hanya 1,42. #8195AB = 3,08 di kertas, masih sekeluarga sejuk.
            // `kendali` diukur ulang: #8195AB memang 3,08 di KERTAS, tapi
            // kotak isian dan segmen juga duduk langsung di `latar`, dan di
            // sana ia cuma 2,66 — di bawah ambang 3:1 WCAG 1.4.11, padahal
            // ia satu-satunya penanda batas kendalinya.
            //   #6E8299  3,09 di latar · 3,85 di kertas
            garis: { DEFAULT: w("garis"), tipis: w("garis-tipis"), kendali: w("garis-kendali") },

            // Penanda status dipakai sebagai teks 11px huruf besar DI ATAS
            // latar mudanya sendiri, jadi ambangnya 4,5 — bukan 3. Nilai
            // sebelumnya (#14804A dan #A8621C) menghasilkan 4,30 dan 4,09
            // terhadap muda-nya: keduanya di bawah ambang, di kolom yang
            // justru paling sering dibaca sekilas.
            //   sah   #137C48  4,53 di sah-muda   · 5,24 di kertas
            //   belum #9E5C1A  4,53 di belum-muda · 5,25 di kertas
            //   galat #B4232A  5,39 di galat-muda · 6,53 di kertas
            sah: { DEFAULT: w("sah"), muda: w("sah-muda") },
            belum: { DEFAULT: w("belum"), muda: w("belum-muda") },
            galat: { DEFAULT: w("galat"), muda: w("galat-muda") },
            // Tirai di balik laci dan sidebar ponsel. Alfanya ikut tema:
            // tinta biru tua 25% di terang, hitam 60% di gelap.
            tirai: w("tirai"),
        },

        fontFamily: {
            // Archivo dipakai untuk dua peran lewat sumbu LEBARNYA: melebar
            // untuk judul, normal untuk teks. Satu keluarga, dua watak.
            judul: ['"Archivo"', "system-ui", "sans-serif"],
            teks: ['"Archivo"', "system-ui", "sans-serif"],
            // NIM, nomor sertifikat, tahun ajaran, dan nilai semuanya kode
            // berformat tetap. Mono di sini fungsional, bukan gaya-gayaan.
            data: ['"Azeret Mono"', "ui-monospace", "monospace"],
        },

        extend: {
            fontSize: {
                mikro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }],
            },
            // ── skala elevasi ──
            //
            // Sampai 5 September 2026 seluruh aplikasi memakai SATU nilai
            // bayangan. Akibatnya semua permukaan duduk di ketinggian yang
            // sama dan antarmuka tidak pernah memberi tahu apa yang di atas
            // apa: laci modal dan kartu diam tampak sederajat, dan kepala
            // tabel yang menempel tidak terlihat melayang saat baris
            // menyelinap di bawahnya.
            //
            // Empat tingkat, dipakai untuk MENYATAKAN LAPISAN — bukan hiasan.
            // Halaman depan boleh berkedalaman kaya karena digulir sekali;
            // halaman ini dipandangi berjam-jam, dan blur di belakang tabel
            // merampas kontras justru pada angka yang sedang dibaca.
            //
            //   kartu  permukaan istirahat (kartu, panel)
            //   naik   yang menempel: kepala tabel, kolom pertama
            //   laci   permukaan modal: laci, sidebar ponsel
            boxShadow: {
                kartu: "0 1px 2px rgb(var(--w-bayang) / .06), 0 8px 24px -12px rgb(var(--w-bayang) / .18)",
                naik: "0 1px 0 rgb(var(--w-bayang) / .08), 0 6px 12px -8px rgb(var(--w-bayang) / .28)",
                "naik-kanan": "1px 0 0 rgb(var(--w-bayang) / .08), 6px 0 12px -8px rgb(var(--w-bayang) / .28)",
                laci: "0 2px 8px rgb(var(--w-bayang) / .10), 0 24px 64px -20px rgb(var(--w-bayang) / .45)",
            },
        },
    },

    // TANPA plugin Flowbite. Nol kelasnya dipakai di repo ini — sidebarnya
    // ditulis tangan, lacinya punya penjebak fokus sendiri — tapi `addBase`
    // miliknya tetap menyuntik ke app.css: kotak centang tercentang BIRU
    // (#1c64f2) dan bersudut siku, cincin fokusnya biru, `progress` biru
    // (#3f83f8), dan panah `select` abu (#6B7280). Sembilan belas kemunculan
    // warna asing di palet yang paragraf di atas bilang "DIGANTI, bukan
    // diperluas". `accent-bata` pada kotak centangnya tidak pernah berlaku
    // karena Flowbite menyetel `appearance: none`.
    plugins: [],
};
