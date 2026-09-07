// Uji adopsi jscroot.
//
// Menjaga hal-hal yang bisa rusak diam-diam setelah lapisan JS berpindah ke
// jscroot, dan yang tidak akan terlihat sebagai galat di konsol:
//
//   1. Setiap halaman benar-benar memuat rantai modulnya (satu impor salah
//      tulis membuat seluruh skrip halaman tidak berjalan, tanpa suara).
//   2. Halaman terlindungi mengirim header "login" berisi token — nama header
//      ini konvensi GoCroot/jscroot, dan salah nama berarti 401 di semuanya.
//   3. Halaman verifikasi publik TIDAK mengirim token sama sekali.
//   4. Data dari basis data tidak pernah ditafsirkan sebagai HTML.
//   5. Alur masuk menyimpan sesi dan mengalihkan sesuai peran.
//   6. 401 membuang sesi dan kembali ke /login/ — jscroot `api.js` tidak
//      menangani ini sendiri, jadi kalau ui.js:sehat() dilewati di satu
//      halaman, sesi habis akan tampak sebagai halaman kosong tanpa sebab.
//   7. Halaman depan publik berdiri sendiri: tidak mengalihkan, tidak
//      memanggil API sama sekali, dan modulnya benar-benar berjalan.
//   8. Halaman depan tetap tampil untuk yang sudah punya sesi — itu keputusan
//      pemilik, dan gampang tergerus kalau nanti ada yang memasang penjaga.
//   9. Rantai QR `/verifikasi/<token>` -> 404.html -> `?token=` masih utuh,
//      dan alamat berita `/berita/<slug>` ikut lewat jalur yang sama tanpa
//      merusaknya. Bentuk jalur QR tercetak di 140+ sertifikat.
//  10. Berita: kartunya digambar dari /news, judul ber-HTML tetap teks, dan
//      tautan `javascript:` tidak pernah jadi href.
//  11. API berita mati TIDAK merusak sisa halaman depan — jscroot menelan
//      galat jaringan tanpa memanggil callback, jadi ini gampang lolos dari
//      perhatian sampai ada yang membuka situs saat backend sedang mati.
//  12. Pilihan penampung di <select> bernilai "" — bukan teksnya. Ini gagal
//      TANPA SUARA: keadaan kosong tidak pernah tampil dan teks penampung
//      terkirim ke server sebagai id.
//  13. Tidak ada halaman yang menggulung mendatar di layar ponsel. Ini juga
//      diam: halamannya tampak utuh di layar lebar, dan di ponsel isinya
//      cuma bergeser ke luar layar.
//  14. Kolom pertama tabel tetap terlihat setelah digeser ke kanan — di
//      ponsel tabelnya SELALU lebih lebar dari layar, dan tanpa itu barisnya
//      jadi anonim tepat saat Nilai dan Sertifikat akhirnya terlihat.
//  15. Sasaran sentuh 44px HANYA pada penunjuk kasar. Kerapatan di tetikus
//      disengaja; kalau aturannya bocor ke sana, tabel jadi renggang.
//  16. Sidebar memuat SEMUA tujuan peran sekaligus, tanpa digulung. Baris tab
//      lama butuh 596px sedangkan ponsel memuat 350px — tiga tujuan terakhir
//      tidak terlihat ADA. Itu yang diganti, jadi itu yang dijaga.
//  17. SETIAP peran punya tombol Keluar. Peran bertujuan tunggal tidak diberi
//      sidebar, dan Keluar tinggal di kaki sidebar — cacat yang lahir bersama
//      sidebar itu sendiri, dan tidak terlihat kalau hanya diuji sebagai admin.
//  18. Tiap peran mendarat di PEKERJAANNYA, dan ?bayar= benar-benar dibaca.
//      `getQueryString()` jscroot tidak menerima argumen: memanggilnya dengan
//      argumen mengembalikan Proxy yang truthy, jadi penyaringnya diam-diam
//      tidak terpasang dan petugas melihat 1.706 baris, bukan 17.
//
// Backend TIDAK perlu hidup: jawabannya dipalsukan lewat page.route, jadi uji
// ini bisa dijalankan sendirian.
//
// Menjalankan:  python3 -m http.server 5173  (dari akar kkn-frontend)
//               node uji-jscroot.mjs

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const B = "http://localhost:5173";
const browser = await chromium.launch();
let gagal = 0;
const lapor = (ok, teks) => { if (!ok) gagal++; console.log((ok ? "✓ " : "✗ ") + teks); };

// Amplop GoCroot palsu, supaya halaman punya sesuatu untuk digambar.
const amplop = (data, meta) => ({ status: "ok", data, meta });

async function halamanBaru(sesi) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const galat = [];
    page.on("console", (m) => { if (m.type() === "error") galat.push("console: " + m.text()); });
    page.on("pageerror", (e) => galat.push("pageerror: " + e.message));
    page.on("requestfailed", (r) => {
        if (!/app\.css|favicon/.test(r.url())) galat.push("gagal muat: " + r.url());
    });
    if (sesi) {
        // Dipasang SEKALI lewat evaluate, bukan addInitScript: addInitScript
        // berjalan ulang di setiap navigasi, jadi ia akan menanam kembali
        // token yang baru saja dibuang halaman — dan uji 401 berubah jadi
        // gelung pengalihan yang menuduh kode padahal ujinya yang salah.
        await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
        await page.evaluate(() => {
            localStorage.setItem("kkn_token", "token-uji-123");
            localStorage.setItem("kkn_user", JSON.stringify({ name: "Uji", role: 1, role_name: "Admin" }));
        });
    }
    return { ctx, page, galat };
}

// ---------- 1. Semua halaman memuat tanpa galat ----------
const HALAMAN = ["/", "/login/", "/data-kkn/", "/data-induk/", "/kelompok/",
                 "/penilaian/", "/sertifikat/", "/pengaturan/", "/verifikasi/"];

const header = {};   // jalur -> header yang terkirim
for (const jalur of HALAMAN) {
    const { ctx, page, galat } = await halamanBaru(jalur !== "/login/" && jalur !== "/");
    await page.route("**/localhost:8090/**", async (route) => {
        const h = route.request().headers();
        header[jalur] = header[jalur] || h;
        await route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify(amplop([], { total: 0, page: 1, total_pages: 1 })) });
    });
    await page.goto(B + jalur, { waitUntil: "networkidle" });
    lapor(galat.length === 0, `memuat ${jalur}` + (galat.length ? "\n    " + galat.join("\n    ") : ""));
    await ctx.close();
}

// ---------- 2. Header token jscroot benar-benar terkirim ----------
const terlindungi = ["/data-kkn/", "/kelompok/", "/penilaian/", "/sertifikat/", "/pengaturan/", "/data-induk/"];
for (const jalur of terlindungi) {
    const h = header[jalur];
    lapor(h && h["login"] === "token-uji-123",
        `${jalur} mengirim header "login"` + (h ? ` = ${JSON.stringify(h["login"])}` : " (tidak ada permintaan)"));
}

// ---------- 3. Halaman verifikasi TIDAK boleh mengirim token ----------
{
    const { ctx, page } = await halamanBaru(true);
    let dikirim = null;
    await page.route("**/localhost:8090/**", async (route) => {
        dikirim = route.request().headers();
        await route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify(amplop({ sah: true, nama: "Budi", nim: "1234" })) });
    });
    await page.goto(B + "/verifikasi/?token=" + "a".repeat(32), { waitUntil: "networkidle" });
    lapor(dikirim && !dikirim["login"], "verifikasi publik tidak mengirim token" +
        (dikirim && dikirim["login"] ? ` (TERKIRIM: ${dikirim["login"]})` : ""));
    const teks = await page.textContent("#hasil");
    lapor(/Budi/.test(teks || ""), "verifikasi menggambar hasilnya");
    await ctx.close();
}

// ---------- 4. Disiplin XSS: data tidak boleh jadi HTML ----------
{
    const { ctx, page } = await halamanBaru(true);
    await page.route("**/localhost:8090/**", async (route) => {
        const u = route.request().url();
        if (u.includes("/api/participations")) {
            await route.fulfill({ status: 200, contentType: "application/json",
                body: JSON.stringify(amplop(
                    [{ id: "x", nim: "999", name: '<img src=x onerror="window.__XSS=1">',
                       prodi: "TI", kelompok: "1", tahun_ajaran: "2024/2025",
                       judul_kkn: "<script>window.__XSS=1</script>", nilai: 0, has_cert: false }],
                    { total: 1, page: 1, total_pages: 1 })) });
        } else {
            await route.fulfill({ status: 200, contentType: "application/json",
                body: JSON.stringify(amplop([], {})) });
        }
    });
    await page.goto(B + "/data-kkn/", { waitUntil: "networkidle" });
    const img = await page.locator("#isiTabel img").count();
    const xss = await page.evaluate(() => window.__XSS === 1);
    const tampak = await page.textContent("#isiTabel");
    lapor(img === 0 && !xss, `nama berisi HTML tidak ditafsirkan (img=${img}, xss=${xss})`);
    lapor(/<img/.test(tampak || ""), "…dan tetap tampil sebagai teks apa adanya");
    await ctx.close();
}

// ---------- 5. Alur masuk lengkap ----------
{
    const { ctx, page, galat } = await halamanBaru(false);
    await page.route("**/localhost:8090/**", (r) => r.fulfill({ status: 200,
        contentType: "application/json", body: JSON.stringify(amplop([], { total: 0 })) }));
    await page.route("**/localhost:8090/auth/login", async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify(amplop({ token: "token-baru", user: { name: "Admin", role: 1 } })) });
    });
    await page.goto(B + "/login/", { waitUntil: "networkidle" });
    await page.fill("#uname", "admin");
    await page.fill("#password", "rahasia");
    await page.click("#tombolMasuk");
    await page.waitForURL("**/data-kkn/**", { timeout: 5000 }).catch(() => {});
    const tersimpan = await page.evaluate(() => localStorage.getItem("kkn_token"));
    lapor(tersimpan === "token-baru", `masuk menyimpan token (${tersimpan})`);
    lapor(page.url().includes("/data-kkn/"), `masuk mengalihkan ke halaman peran (${page.url()})`);
    lapor(galat.length === 0, "alur masuk tanpa galat" + (galat.length ? "\n    " + galat.join("\n    ") : ""));
    await ctx.close();
}

// ---------- 6. 401 membuang sesi dan kembali ke /login/ ----------
{
    const { ctx, page } = await halamanBaru(true);
    await page.route("**/localhost:8090/**", (r) => r.fulfill({ status: 401,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", message: "token kedaluwarsa" }) }));
    await page.goto(B + "/data-kkn/", { waitUntil: "commit" }).catch(() => {});
    await page.waitForURL("**/login/**", { timeout: 8000 }).catch(() => {});
    const sisa = await page.evaluate(() => localStorage.getItem("kkn_token"));
    lapor(page.url().includes("/login/"), `401 mengalihkan ke /login/ (${page.url()})`);
    lapor(sisa === null, `401 membuang token (sisa: ${sisa})`);
    await ctx.close();
}

// ---------- 7. Halaman depan publik ----------
{
    const { ctx, page, galat } = await halamanBaru(false);
    const dipanggil = [];
    // Lambang kelompok: dua tahun ajaran, dan satu julukan yang berisi markup —
    // ia harus tampil sebagai TEKS, bukan jadi elemen.
    // Tahun pertama 18 kelompok — lebih dari dua baris, supaya tombol
    // "tampilkan semua" ikut teruji. Kelompok 2 berjulukan markup: ia harus
    // tampil sebagai TEKS. Kelompok 3 tanpa julukan.
    const LAMBANG = Array.from({ length: 18 }, (_, i) => ({
        kelompok: "Kelompok " + (i + 1), kelompok_no: i + 1, tahun_ajaran: "2025-2026",
        julukan: i === 1 ? "<img src=x onerror=alert(1)>" : (i === 2 ? undefined : "Julukan " + (i + 1)),
        lambang: "/assets/kelompok/2025-2026/" + (i + 1) + ".webp",
    })).concat([
        { kelompok: "Kelompok 2", kelompok_no: 2, tahun_ajaran: "2024-2025", julukan: "Sampurna Mandala", lambang: "/assets/kelompok/2024-2025/d.webp" },
    ]);
    await page.route("**/localhost:8090/**", (r) => {
        const jalur = new URL(r.request().url()).pathname;
        dipanggil.push(jalur);
        const isi = jalur === "/kelompok" ? amplop(LAMBANG) : amplop([], { total: 0, page: 1, total_pages: 1 });
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(isi) });
    });
    // Berkas lambangnya tidak ada di repo uji; yang diuji kisinya, bukan
    // gambarnya. Semua dilayani logo yang memang ada supaya tidak ada 404.
    await page.route("**/assets/kelompok/**", (r) => r.fulfill({ path: decodeURIComponent(new URL("../assets/img/logo-unfari.png", import.meta.url).pathname) }));
    await page.goto(B + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    lapor(new URL(page.url()).pathname === "/", `halaman depan tidak mengalihkan (${page.url()})`);
    // Galat CORS/jaringan dari /news tidak dihitung: ia diuji tersendiri di
    // bagian 11, dan di sini yang dijaga adalah halamannya sendiri.
    const galatNyata = galat.filter((g) => !/\/news/.test(g));
    lapor(galatNyata.length === 0, "halaman depan memuat tanpa galat" +
        (galatNyata.length ? "\n    " + galatNyata.join("\n    ") : ""));

    // Dulu di sini tertulis "tidak memanggil API sama sekali" — benar untuk
    // Tahap A, dan salah begitu berita lahir. Yang sebenarnya dijaga: halaman
    // PUBLIK tidak boleh menyentuh satu pun rute yang butuh token.
    const berkewenangan = dipanggil.filter((j) => j.startsWith("/api/"));
    lapor(berkewenangan.length === 0,
        `halaman depan tidak memanggil rute ber-token (${JSON.stringify(dipanggil)})`);

    // Modulnya benar-benar berjalan, bukan sekadar tidak melempar galat.
    const faq = await page.locator("#daftarFaq .acc").count();
    lapor(faq >= 5, `tanya jawab tergambar (${faq} butir)`);

    // Lambang kelompok: seksi tampil begitu ada lambang, satu tab per tahun
    // ajaran (terbaru dulu), dan ubin hanya untuk tahun yang dipilih.
    lapor(await page.locator("#kelompok").isVisible(), "seksi kelompok tampil karena ada lambang");
    const tabTahun = await page.locator("#tabTahun button").allTextContents();
    lapor(tabTahun.join(",") === "2025-2026,2024-2025", `tab tahun ajaran terbaru dulu (${tabTahun.join(",")})`);
    const ubin1 = await page.locator("#daftarLambang .lambang__ubin").count();
    lapor(ubin1 === 18, `tahun pertama menggambar 18 ubin (${ubin1})`);
    const tampak = await page.locator("#daftarLambang .lambang__ubin:visible").count();
    lapor(tampak === 16, `dua baris dulu: 16 yang tampak (${tampak})`);
    lapor(await page.locator("#lambangSemua").isVisible(), "tombol tampilkan semua ada");
    await page.click("#lambangSemua"); await page.waitForTimeout(200);
    lapor(await page.locator("#daftarLambang .lambang__ubin:visible").count() === 18
        && await page.locator("#lambangSemua").isHidden(), "tampilkan semua membuka sisanya dan menyembunyikan tombolnya");
    const namaUbin = await page.locator("#daftarLambang .lambang__nama").allTextContents();
    lapor(namaUbin[2] === "Kelompok 3", `tanpa julukan, ubin bernama nomornya ("${namaUbin[2]}")`);
    // Julukan ber-markup tetap teks: tidak ada <img> tambahan di kisi selain
    // lambangnya sendiri, dan teksnya terbaca apa adanya.
    const imgKisi = await page.locator("#daftarLambang img").count();
    lapor(imgKisi === 18 && namaUbin[1].includes("<img src=x"),
        `julukan ber-HTML tetap teks (img=${imgKisi}, nama="${namaUbin[1]}")`);
    await page.locator("#tabTahun button").nth(1).click();
    await page.waitForTimeout(200);
    const ubin2 = await page.locator("#daftarLambang .lambang__ubin").count();
    lapor(ubin2 === 1, `tab kedua mengganti kisi (${ubin2} ubin)`);
    lapor(await page.locator("#lambangSemua").isHidden(), "satu ubin: tombol tampilkan semua tidak muncul");
    lapor(await page.locator("#tabTahun button").nth(1).getAttribute("aria-selected") === "true",
        "tab kedua ditandai terpilih");

    // Satu-satunya pintu keluar halaman depan adalah Masuk.
    const masuk = await page.locator('a[href="/login/"]').count();
    lapor(masuk > 0, `tautan Masuk ada (${masuk})`);

    // Verifikasi sengaja TIDAK ditautkan dari mana pun: halamannya tidak punya
    // medan isian token, jadi tautan ke sana selalu berakhir di "Sertifikat
    // tidak ditemukan". Jalannya cuma satu — pindai QR.
    const verif = await page.locator('a[href^="/verifikasi/"]').count();
    lapor(verif === 0, `tidak ada tautan Verifikasi di halaman depan (${verif})`);

    await ctx.close();
}

// ---------- 8. Halaman depan tetap tampil walau sudah punya sesi ----------
{
    const { ctx, page } = await halamanBaru(true);
    await page.goto(B + "/", { waitUntil: "networkidle" });
    lapor(new URL(page.url()).pathname === "/",
        `yang sudah masuk pun melihat halaman depan (${page.url()})`);
    const hero = await page.locator(".hero__content .h1").count();
    lapor(hero === 1, "isi halaman depan tergambar untuk pengguna bersesi");
    await ctx.close();
}

// ---------- 9. Rantai QR: /verifikasi/<token> lewat 404.html ----------
//
// Bentuk jalur inilah yang tercetak di kode QR pada 140+ sertifikat yang sudah
// beredar, dan ia TIDAK BISA diubah. GitHub Pages menyajikan 404.html untuk
// jalur yang tidak punya berkas; server statis biasa tidak. Jadi di sini
// dijalankan server kecil yang meniru perilaku Pages — kalau tidak, uji ini
// lulus di laptop dan gagal di produksi.
{
    const AKAR = fileURLToPath(new URL("..", import.meta.url));
    const TIPE = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
                   ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" };

    const pages = createServer(async (req, res) => {
        const jalur = decodeURIComponent(new URL(req.url, "http://x").pathname);
        let berkas = join(AKAR, normalize(jalur).replace(/^(\.\.[/\\])+/, ""));
        if (jalur.endsWith("/")) berkas = join(berkas, "index.html");
        try {
            const isi = await readFile(berkas);
            res.writeHead(200, { "Content-Type": TIPE[extname(berkas)] || "application/octet-stream" });
            res.end(isi);
        } catch {
            // Persis Pages: 404 dijawab dengan 404.html, bukan halaman bawaan.
            const isi = await readFile(join(AKAR, "404.html"));
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end(isi);
        }
    });
    await new Promise((r) => pages.listen(5174, r));

    const { ctx, page } = await halamanBaru(false);
    const TOKEN = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    let diminta = null;
    await page.route("**/localhost:8090/**", (r) => {
        diminta = r.request().url();
        return r.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify(amplop({ sah: true, nama: "Contoh Peserta", nim: "12345" })) });
    });

    await page.goto("http://localhost:5174/verifikasi/" + TOKEN, { waitUntil: "networkidle" });

    lapor(page.url().includes("/verifikasi/?token=" + TOKEN),
        `QR bentuk jalur dialihkan ke bentuk kueri (${page.url()})`);
    lapor(!!diminta && diminta.includes(TOKEN),
        `token diteruskan ke backend apa adanya (${diminta})`);
    const teks = await page.textContent("#hasil");
    lapor(/Contoh Peserta/.test(teks || ""), "hasil verifikasi tergambar dari rantai QR");

    // Alamat berita lewat jalur yang sama. Diuji BERSAMA rantai QR, bukan
    // terpisah: yang berbahaya bukan aturan barunya sendiri, melainkan
    // kemungkinan ia menyerobot jalur sertifikat.
    await page.route("**/localhost:8090/news/**", (r) => r.fulfill({ status: 200,
        contentType: "application/json", body: JSON.stringify(amplop(
            { slug: "penutupan-kkn", judul: "Penutupan KKN", paragraf: ["Isi."], foto_url: [] })) }));
    await page.goto("http://localhost:5174/berita/penutupan-kkn", { waitUntil: "networkidle" });
    lapor(page.url().includes("/berita/?slug=penutupan-kkn"),
        `alamat berita bentuk jalur dialihkan (${page.url()})`);
    lapor(/Penutupan KKN/.test(await page.textContent("#judul") || ""),
        "…dan artikelnya tergambar");

    await ctx.close();
    await new Promise((r) => pages.close(r));
}

// ---------- 10. Berita di halaman depan ----------
const BERITA = [
    { id: "n1", slug: "penutupan-kkn", judul: "Penutupan KKN Angkatan XII",
      ringkasan: "Ditutup di balai desa.", paragraf: ["Satu.", "Dua."],
      foto_url: [], penulis: "LPPM Unfari", terbit: true,
      tanggal_terbit: "2026-08-30T02:00:00Z" },
    { id: "n2", slug: "uji-xss", judul: '<img src=x onerror="window.__XSS=1">',
      ringkasan: "", paragraf: ['<script>window.__XSS=1</script> isi'],
      foto_url: [], terbit: true, tanggal_terbit: "2026-08-20T02:00:00Z",
      tautan_url: "javascript:window.__XSS=1", tautan_label: "Jangan diklik" },
];

{
    const { ctx, page, galat } = await halamanBaru(false);
    await page.route("**/localhost:8090/news**", (r) => r.fulfill({ status: 200,
        contentType: "application/json",
        body: JSON.stringify(amplop(BERITA, { total: 2, page: 1, total_pages: 1 })) }));
    // Lambang kelompok kosong: seksinya tetap tersembunyi, dan itu bukan galat.
    await page.route("**/localhost:8090/kelompok", (r) => r.fulfill({ status: 200,
        contentType: "application/json", body: JSON.stringify(amplop([])) }));
    await page.goto(B + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    lapor(await page.locator("#kelompok").isHidden(), "tanpa lambang, seksi kelompok tersembunyi");

    const kartu = await page.locator("#daftarBerita .pos").count();
    lapor(kartu === 2, `halaman depan menggambar kartu berita (${kartu})`);
    lapor(await page.locator("#beritaKosong").isHidden(), "keadaan kosong disembunyikan");

    const img = await page.locator("#daftarBerita img").count();
    const xss = await page.evaluate(() => window.__XSS === 1);
    lapor(img === 0 && !xss, `judul berita ber-HTML tidak ditafsirkan (img=${img}, xss=${xss})`);
    lapor(/<img src=x/.test(await page.textContent("#daftarBerita") || ""),
        "…dan tampil sebagai teks apa adanya");
    lapor(galat.length === 0, "bagian berita tanpa galat" +
        (galat.length ? "\n    " + galat.join("\n    ") : ""));
    await ctx.close();
}

// ---------- 11. API berita mati: sisa halaman depan tetap utuh ----------
{
    const { ctx, page } = await halamanBaru(false);
    await page.route("**/localhost:8090/news**", (r) => r.abort());
    await page.route("**/localhost:8090/kelompok", (r) => r.abort());
    await page.goto(B + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    lapor(await page.locator("#daftarBerita").isHidden(), "berita gagal: kartunya tidak digambar");
    lapor(await page.locator("#kelompok").isHidden(), "lambang gagal: seksi kelompok tetap tersembunyi");
    lapor(await page.locator("#daftarFaq .acc").count() >= 5, "…dan tanya jawab tetap ada");
    lapor(await page.locator(".hero__content .h1").count() === 1, "…dan hero tetap ada");
    await ctx.close();
}

// ---------- 12. Halaman baca satu berita ----------
{
    const { ctx, page, galat } = await halamanBaru(false);
    await page.route("**/localhost:8090/news/**", (r) => r.fulfill({ status: 200,
        contentType: "application/json", body: JSON.stringify(amplop(BERITA[1])) }));
    await page.goto(B + "/berita/?slug=uji-xss", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const img = await page.locator("#artikel img").count();
    const scr = await page.locator("#isi script").count();
    const xss = await page.evaluate(() => window.__XSS === 1);
    lapor(img === 0 && scr === 0 && !xss,
        `halaman baca tidak menafsirkan HTML (img=${img}, script=${scr}, xss=${xss})`);

    // Skema tautan sudah ditolak server; ini penjaga kedua, untuk data yang
    // sempat tersimpan sebelum penjaga pertama ada.
    const tautan = await page.locator("#tautan").count();
    const terlihat = tautan ? await page.locator("#tautan").isVisible() : false;
    lapor(!terlihat, "tautan javascript: tidak dipasang sebagai href");
    lapor(galat.length === 0, "halaman baca tanpa galat" +
        (galat.length ? "\n    " + galat.join("\n    ") : ""));
    await ctx.close();
}

// ---------- 12b. Daftar berita: saringan tahun, kelompok, kata, dan halaman ----------
//
// Tanpa ?slug=, /berita/ adalah daftar. Tab tahun dan pilihan kelompok
// diisi dari /news/kelompok; kisinya dari /news dengan parameter saringan
// yang HARUS sampai ke server — menyaring di peramban berarti hanya
// menyaring satu halaman.
{
    const { ctx, page, galat } = await halamanBaru(false);
    const KEL = [
        { group_id: "grp-1", tahun_ajaran: "2025-2026", kelompok_no: 1, kelompok: "Kelompok 1", julukan: "Arunika Karsa" },
        { group_id: "grp-9", tahun_ajaran: "2024-2025", kelompok_no: 9, kelompok: "Kelompok 9", julukan: "" },
    ];
    const daftar = Array.from({ length: 30 }, (_, i) => ({
        id: "b" + i, slug: "b" + i, judul: "Berita " + i + (i % 2 ? " Posyandu" : ""), paragraf: ["Isi."], foto: [],
        penulis: "Kelompok 1", terbit: true, tanggal_terbit: "2026-08-" + String(1 + (i % 28)).padStart(2, "0") + "T02:00:00Z",
        group_id: i % 3 ? "grp-1" : "grp-9", tahun_ajaran: i % 3 ? "2025-2026" : "2024-2025",
    }));
    const diminta = [];
    await page.route("**/localhost:8090/**", (r) => {
        const u = new URL(r.request().url()); diminta.push(u.pathname + u.search);
        let isi;
        if (u.pathname === "/news/kelompok") isi = amplop(KEL);
        else if (u.pathname === "/news") {
            const q = u.searchParams; let rows = daftar;
            if (q.get("tahun_ajaran")) rows = rows.filter((n) => n.tahun_ajaran === q.get("tahun_ajaran"));
            if (q.get("group_id")) rows = rows.filter((n) => n.group_id === q.get("group_id"));
            if (q.get("q")) rows = rows.filter((n) => n.judul.includes(q.get("q")));
            const limit = +q.get("limit") || 50, pg = +q.get("page") || 1;
            isi = amplop(rows.slice((pg - 1) * limit, pg * limit), { total: rows.length, page: pg, total_pages: Math.ceil(rows.length / limit) });
        } else isi = amplop([]);
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(isi) });
    });
    await page.goto(B + "/berita/", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    lapor(await page.locator("#daftar").isVisible() && await page.locator("#artikel").isHidden(), "tanpa slug: mode daftar, bukan pesan 'tidak ditemukan'");
    const tab = await page.locator("#tabTahunBerita button").allTextContents();
    lapor(tab.join(",") === "Semua,2025-2026,2024-2025", `tab tahun: Semua lalu terbaru dulu (${tab.join(",")})`);
    lapor(await page.locator("#kisiBerita .pos").count() === 12, `halaman pertama 12 kartu (${await page.locator("#kisiBerita .pos").count()})`);
    lapor(/Halaman 1 dari 3/.test(await page.textContent("#posisiHal") || ""), "penunjuk halaman 1 dari 3");
    await page.click("#halSesudah"); await page.waitForTimeout(300);
    lapor(diminta.some((j) => /\/news\?.*page=2/.test(j)), "Berikutnya meminta page=2 ke server");
    await page.locator("#tabTahunBerita button", { hasText: "2024-2025" }).click(); await page.waitForTimeout(300);
    lapor(diminta.some((j) => /tahun_ajaran=2024-2025/.test(j)), "tab tahun jadi parameter tahun_ajaran");
    const opsi = await page.locator("#pilihKelompok option").allTextContents();
    lapor(opsi.length === 2 && /Kelompok 9/.test(opsi[1]), `pilihan kelompok mengikuti tahun (${opsi.join(" | ")})`);
    await page.selectOption("#pilihKelompok", "grp-9"); await page.waitForTimeout(300);
    lapor(diminta.some((j) => /group_id=grp-9/.test(j)), "pilihan kelompok jadi parameter group_id");
    lapor(/kelompok=grp-9/.test(page.url()) && /tahun=2024-2025/.test(page.url()), `saringan tercermin di alamat (${new URL(page.url()).search})`);
    await page.fill("#cariBerita", "Posyandu"); await page.waitForTimeout(600);
    lapor(diminta.some((j) => /q=Posyandu/.test(j)), "kata pencarian jadi parameter q");
    await page.fill("#cariBerita", "tidak-ada-yang-cocok"); await page.waitForTimeout(600);
    lapor(await page.locator("#daftarKosong").isVisible(), "tanpa hasil: keadaan kosong tampil");
    lapor(galat.length === 0, "daftar berita tanpa galat" + (galat.length ? "\n    " + galat.join("\n    ") : ""));
    await ctx.close();
}

// ---------- 12c. Alamat bersaringan membuka daftar dalam keadaan itu ----------
{
    const { ctx, page } = await halamanBaru(false);
    const diminta = [];
    await page.route("**/localhost:8090/**", (r) => {
        const u = new URL(r.request().url()); diminta.push(u.pathname + u.search);
        const isi = u.pathname === "/news/kelompok"
            ? amplop([{ group_id: "grp-1", tahun_ajaran: "2025-2026", kelompok_no: 1, kelompok: "Kelompok 1", julukan: "Arunika" }])
            : amplop([], { total: 0, page: 1, total_pages: 1 });
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(isi) });
    });
    await page.goto(B + "/berita/?tahun=2025-2026&kelompok=grp-1", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    lapor(diminta.some((j) => /tahun_ajaran=2025-2026/.test(j) && /group_id=grp-1/.test(j)), "saringan dari alamat diteruskan ke server");
    lapor(await page.locator("#pilihKelompok").inputValue() === "grp-1", "pilihan kelompok terisi dari alamat");
    await ctx.close();
}

// ---------- 13. Slug tak dikenal diberi pesan, bukan halaman kosong ----------
{
    const { ctx, page } = await halamanBaru(false);
    await page.route("**/localhost:8090/news/**", (r) => r.fulfill({ status: 404,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", message: "berita tidak ditemukan" }) }));
    await page.goto(B + "/berita/?slug=entah-apa", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    lapor(/tidak ditemukan/i.test(await page.textContent("#memuat") || ""),
        "slug tak dikenal diberi pesan");
    await ctx.close();
}

// ---------- 14. Pilihan penampung bernilai "", bukan teksnya ----------
//
// `el("option", "", teks)` hanya mengisi textContent. Untuk <option> tanpa
// atribut `value`, peramban memakai TEKSNYA sebagai nilai — jadi penampung
// "Pilih kelompok…" bernilai "Pilih kelompok…". Akibatnya `if (!sel.value)`
// tidak pernah benar: keadaan kosong Penilaian tidak pernah tampil, dan
// teks penampung terkirim ke server sebagai group_id.
{
    const { ctx, page } = await halamanBaru(true);
    const dipanggil = [];
    await page.route("**/localhost:8090/**", (route) => {
        const url = route.request().url();
        dipanggil.push(url);
        const isi = /academic-years/.test(url)
            ? { data: ["2025-2026", "2024-2025"] }
            : /groups/.test(url)
                ? { data: [{ id: "g-1", kelompok: "20", lokasi: "Desa Cimekar" }], meta: { total: 1 } }
                : { data: [], meta: { total: 0 } };
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(isi) });
    });
    await page.goto(B + "/penilaian/", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const nilaiPenampung = await page.$eval("#pilihKelompok option", (o) => o.value);
    lapor(nilaiPenampung === "", `penampung <option> bernilai "" (dapat ${JSON.stringify(nilaiPenampung)})`);

    const kosongTampil = await page.locator("#kosong").isVisible();
    lapor(kosongTampil, "keadaan kosong Penilaian tampil sebelum kelompok dipilih");

    lapor(!dipanggil.some((u) => /group_id=./.test(u)),
        "tidak ada panggilan anggota sebelum kelompok dipilih");

    // Uji negatif: setelah kelompok betul dipilih, panggilannya HARUS terjadi.
    // Tanpa ini, "tidak memanggil apa-apa" juga lulus dengan halaman rusak.
    await page.selectOption("#pilihKelompok", "g-1");
    await page.waitForTimeout(300);
    lapor(dipanggil.some((u) => /group_id=g-1/.test(u)),
        "kelompok yang dipilih benar-benar dimuat");
    await ctx.close();
}

// ---------- 15. Tidak ada halaman yang menggulung mendatar di ponsel ----------
//
// Segmen tahun ajaran berisi "Semua" + lima tahun = 516px. Di layar 390px ia
// mendorong SELURUH halaman, bukan menggulung sendiri — dan itu tidak terlihat
// sama sekali dari layar lebar.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
        localStorage.setItem("kkn_token", "token-uji-123");
        localStorage.setItem("kkn_user", JSON.stringify({ name: "Uji", role: 1, role_name: "Admin" }));
    });
    await page.route("**/localhost:8090/**", (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: ["2025-2026", "2024-2025", "2023-2024", "2022-2023", "2021-2022"],
                               meta: { total: 0, page: 1, total_pages: 1 } }) }));

    for (const jalur of ["/data-kkn/", "/kelompok/", "/penilaian/", "/sertifikat/",
                         "/data-induk/", "/pengaturan/", "/kelola-berita/", "/login/"]) {
        // /login/ dilihat tanpa sesi — dengan sesi ia mengalihkan.
        if (jalur === "/login/") await page.evaluate(() => localStorage.clear());
        await page.goto(B + jalur, { waitUntil: "networkidle" });
        await page.waitForTimeout(200);
        const u = await page.evaluate(() => ({
            gulung: document.documentElement.scrollWidth,
            klien: document.documentElement.clientWidth,
        }));
        lapor(u.gulung <= u.klien + 1,
            `${jalur} tidak menggulung mendatar di 390px (${u.gulung} vs ${u.klien})`);
    }
    await ctx.close();
}

// ---------- 16. Kolom pertama tetap terlihat setelah tabel digeser ----------
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
        localStorage.setItem("kkn_token", "token-uji-123");
        localStorage.setItem("kkn_user", JSON.stringify({ name: "Uji", role: 1, role_name: "Admin" }));
    });
    await page.route("**/localhost:8090/**", (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [{ id: "p-1", nim: "21900000", name: "Rizki Ramadhan",
            kelompok: "20", tahun_ajaran: "2025-2026", nilai: 82, huruf: "A", has_cert: true }],
            meta: { total: 1, page: 1, total_pages: 1 } }) }));
    await page.goto(B + "/data-kkn/", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const hasil = await page.evaluate(() => {
        const gulung = document.querySelector(".overflow-auto");
        const nim = document.querySelector("#isiTabel tr td:first-child");
        const sebelum = nim.getBoundingClientRect().left;
        gulung.scrollLeft = 9999;
        const sesudah = nim.getBoundingClientRect().left;
        return { meluber: gulung.scrollWidth > gulung.clientWidth,
                 sebelum: Math.round(sebelum), sesudah: Math.round(sesudah),
                 teks: nim.textContent.trim() };
    });
    // Uji ini hanya berarti kalau tabelnya memang meluber. Kalau tidak,
    // ia lulus tanpa membuktikan apa pun — jadi itu dilaporkan juga.
    lapor(hasil.meluber, `tabel register memang meluber di 390px (prasyarat uji)`);
    lapor(hasil.sesudah >= 0 && hasil.teks === "21900000",
        `NIM tetap terlihat setelah digeser (kiri ${hasil.sebelum} -> ${hasil.sesudah})`);
    await ctx.close();
}

// ---------- 17. Sasaran sentuh 44px, hanya pada penunjuk kasar ----------
{
    const ukur = async (opts) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...opts });
        const page = await ctx.newPage();
        await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
        await page.evaluate(() => {
            localStorage.setItem("kkn_token", "token-uji-123");
            localStorage.setItem("kkn_user", JSON.stringify({ name: "Uji", role: 1, role_name: "Admin" }));
        });
        await page.route("**/localhost:8090/**", (route) => route.fulfill({
            status: 200, contentType: "application/json",
            body: JSON.stringify({ data: ["2025-2026"], meta: { total: 0, page: 1, total_pages: 1 } }) }));
        await page.goto(B + "/data-kkn/", { waitUntil: "networkidle" });
        await page.waitForTimeout(300);
        const r = await page.evaluate(() => {
            const t = (s) => { const e = document.querySelector(s);
                return e ? Math.round(e.getBoundingClientRect().height) : 0; };
            return { kasar: matchMedia("(pointer: coarse)").matches,
                     segmen: t(".segmen > button"), medan: t(".medan"), tombol: t(".tombol-halus") };
        });
        await ctx.close();
        return r;
    };
    const jari = await ukur({ hasTouch: true, isMobile: true });
    const tetikus = await ukur({});
    lapor(jari.kasar && jari.segmen >= 44 && jari.medan >= 44 && jari.tombol >= 44,
        `sasaran sentuh >= 44px di jari (segmen ${jari.segmen}, medan ${jari.medan}, tombol ${jari.tombol})`);
    // Uji negatif: aturannya TIDAK boleh bocor ke tetikus.
    lapor(!tetikus.kasar && tetikus.segmen < 44 && tetikus.tombol < 44,
        `kerapatan tetikus tetap (segmen ${tetikus.segmen}, tombol ${tetikus.tombol})`);
}

// ---------- 18. Sidebar: semua tujuan peran terlihat sekaligus ----------
{
    const lihat = async (peran, viewport) => {
        const ctx = await browser.newContext({ viewport });
        const page = await ctx.newPage();
        await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
        await page.evaluate((r) => {
            localStorage.setItem("kkn_token", "token-uji-123");
            localStorage.setItem("kkn_user", JSON.stringify({ name: "Uji", role: r, role_name: "x" }));
        }, peran);
        await page.route("**/localhost:8090/**", (route) => route.fulfill({
            status: 200, contentType: "application/json",
            body: JSON.stringify({ data: [], meta: { total: 0, page: 1, total_pages: 1 } }) }));
        await page.goto(B + "/data-kkn/", { waitUntil: "networkidle" });
        await page.waitForTimeout(250);
        const r = await page.evaluate(() => {
            const sisi = document.querySelector(".sisi");
            if (!sisi) return { ada: false, label: [] };
            const nav = sisi.querySelector(".sisi__nav");
            const t = [...sisi.querySelectorAll(".sisi__tautan")];
            return {
                ada: true,
                // Diambil dari .sisi__label, bukan textContent seluruh <a>:
                // kalau nanti ada lencana atau hitungan di dalam tautan, ia
                // akan ikut terbaca dan asersinya jadi rapuh.
                label: t.map(a => (a.querySelector(".sisi__label") || a).textContent.trim()),
                bagian: [...sisi.querySelectorAll(".sisi__bagian")].map(e => e.textContent.trim()),
                // semua butir muat tanpa digulung?
                muatSemua: nav.scrollHeight <= nav.clientHeight + 1,
                h1: document.querySelectorAll("h1").length,
            };
        });
        await ctx.close();
        return r;
    };

    const admin = await lihat(1, { width: 390, height: 844 });
    lapor(admin.ada && admin.label.length === 9,
        `admin melihat 9 tujuan di sidebar (${admin.label.length})`);
    lapor(admin.muatSemua,
        "kesembilannya muat tanpa digulung di layar 390px — ini yang gagal pada baris tab lama");
    lapor(admin.h1 === 1, `judul halaman adalah <h1> (${admin.h1})`);

    // Uji negatif yang menentukan: penyaringan peran masih hidup. Tanpa ini,
    // sidebar yang menampilkan SEMUANYA ke semua orang juga lulus uji di atas.
    const dosen = await lihat(4, { width: 1440, height: 900 });
    const dosenBoleh = ["Register", "Penilaian", "Nilai matkul", "Akun saya"];
    lapor(dosen.ada && dosen.label.length === dosenBoleh.length &&
          dosenBoleh.every((x) => dosen.label.includes(x)),
        `dosen hanya melihat tujuannya sendiri (${dosen.label.join(", ")})`);
    lapor(!dosen.label.includes("Sertifikat") && !dosen.label.includes("Pengaturan") &&
          !dosen.label.includes("Data induk"),
        "dosen TIDAK melihat Sertifikat, Pengaturan, atau Data induk");

    // Mahasiswa: dua tujuan sejak Ganti sandi ada. Sebelumnya satu, dan
    // karena itu ia tidak punya sidebar — dan tidak punya cara keluar.
    const mhs = await lihat(3, { width: 1440, height: 900 });
    lapor(mhs.ada && mhs.label.length === 2 && mhs.label.includes("Akun saya"),
        `mahasiswa melihat 2 tujuan termasuk Akun saya (${mhs.label.join(", ")})`);

    // Label bagian STATIS: ia menandai, bukan menavigasi. Kalau ia jadi
    // tautan atau tombol, sidebar berubah jadi menu bersarang tanpa disengaja.
    lapor(admin.bagian.length === 4,
        `admin melihat 4 label bagian (${admin.bagian.join(" · ")})`);
    lapor(mhs.bagian.length === 2,
        `mahasiswa melihat 2 label bagian (${mhs.bagian.join(" · ")})`);
}

// ---------- 19. Setiap peran bisa keluar ----------
{
    for (const [nama, peran] of [["admin", 1], ["pembayaran", 2], ["mahasiswa", 3],
                                 ["dosen", 4], ["validasi LPPM", 5], ["admin fakultas", 6]]) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
        await page.evaluate((r) => {
            localStorage.setItem("kkn_token", "token-uji-123");
            localStorage.setItem("kkn_user", JSON.stringify({ name: "Uji", role: r, role_name: "x" }));
        }, peran);
        await page.route("**/localhost:8090/**", (route) => route.fulfill({
            status: 200, contentType: "application/json",
            body: JSON.stringify({ data: [], meta: { total: 0, page: 1, total_pages: 1 } }) }));
        await page.goto(B + "/data-kkn/", { waitUntil: "networkidle" });
        await page.waitForTimeout(200);
        const n = await page.evaluate(() =>
            [...document.querySelectorAll("button")].filter(b => b.textContent.trim() === "Keluar").length);
        lapor(n === 1, `${nama}: tepat satu tombol Keluar (${n})`);
        await ctx.close();
    }
}

// ---------- 20. Tiap peran mendarat di pekerjaannya ----------
{
    const tujuan = { 1: "/data-kkn/", 2: "/data-kkn/?bayar=0", 3: "/data-kkn/",
                     4: "/penilaian/", 5: "/sertifikat/", 6: "/data-kkn/" };
    for (const [peran, harap] of Object.entries(tujuan)) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        // URUTAN PENTING: rute Playwright dijalankan terakhir-didaftar-duluan.
        // Kalau catch-all didaftarkan SESUDAH /auth/login, ia menelan mock
        // login dan halaman tidak pernah pindah — ujinya gagal menuduh kode.
        // Sudah pernah kejadian; lihat catatan di LEDGER 4 September 2026.
        await page.route("**/localhost:8090/**", (route) => route.fulfill({
            status: 200, contentType: "application/json",
            body: JSON.stringify({ data: [], meta: { total: 0, page: 1, total_pages: 1 } }) }));
        await page.route("**/localhost:8090/auth/login", (route) => route.fulfill({
            status: 200, contentType: "application/json",
            body: JSON.stringify({ status: "ok", data: { token: "t",
                user: { name: "Uji", role: Number(peran), role_name: "x" } } }) }));
        await page.goto(B + "/login/", { waitUntil: "networkidle" });
        await page.fill("#uname", "x");
        await page.fill("#password", "y");
        await page.click("#tombolMasuk");
        await page.waitForTimeout(500);
        const dapat = page.url().replace(B, "");
        lapor(dapat === harap, `peran ${peran} mendarat di ${harap} (${dapat})`);
        await ctx.close();
    }
}

// ---------- 21. ?bayar= benar-benar menyaring ----------
{
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
        localStorage.setItem("kkn_token", "token-uji-123");
        localStorage.setItem("kkn_user", JSON.stringify({ name: "Uji", role: 2, role_name: "Pembayaran" }));
    });
    const diminta = [];
    await page.route("**/localhost:8090/**", (route) => {
        diminta.push(route.request().url());
        route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify({ data: [], meta: { total: 0, page: 1, total_pages: 1 } }) });
    });
    await page.goto(B + "/data-kkn/?bayar=0", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    lapor(diminta.some((u) => /[?&]bayar=0/.test(u)),
        "?bayar=0 diteruskan ke server, bukan ditelan");
    const aktif = await page.$eval('#segmenBayar button[aria-pressed="true"]', (e) => e.textContent);
    lapor(aktif === "Belum bayar", `tombol saringan yang aktif ikut benar (${aktif})`);
    // Uji negatif: nilai yang bukan 0/1/2 tidak boleh diteruskan.
    diminta.length = 0;
    await page.goto(B + "/data-kkn/?bayar=sembarang", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    lapor(!diminta.some((u) => /[?&]bayar=/.test(u)),
        "nilai bayar yang tidak dikenali diabaikan, bukan diteruskan");
    await ctx.close();
}

// ---------- 22. Atribut `hidden` menang atas kelas display ----------
//
// `[hidden]` dan `.flex` sama-sama 0,1,0; yang menang yang belakangan, dan
// utilitas Tailwind selalu sesudah base. Cacat ini sudah pernah ditemukan
// uji di halaman depan lalu kambuh di aplikasi: papan tindakan massal
// Sertifikat tampil terus bertuliskan "0 peserta dipilih".
{
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
        localStorage.setItem("kkn_token", "token-uji-123");
        localStorage.setItem("kkn_user", JSON.stringify({ name: "Uji", role: 1, role_name: "Admin" }));
    });
    await page.route("**/localhost:8090/**", (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { total: 0, page: 1, total_pages: 1 } }) }));
    await page.goto(B + "/sertifikat/", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
        const e = document.getElementById("papanMassal");
        return { hidden: e.hidden, display: getComputedStyle(e).display };
    });
    lapor(r.hidden && r.display === "none",
        `papan massal benar-benar tersembunyi saat kosong (hidden=${r.hidden}, display=${r.display})`);

    // Uji negatif: aturannya tidak boleh menyembunyikan yang TIDAK ber-hidden.
    const tampak = await page.evaluate(() => {
        const e = document.getElementById("papanMassal");
        e.hidden = false;
        return getComputedStyle(e).display;
    });
    lapor(tampak === "flex", `dan tetap tampil begitu hidden dilepas (${tampak})`);
    await ctx.close();
}

await browser.close();
console.log(gagal ? `\n${gagal} GAGAL` : "\nsemua lulus");
process.exit(gagal ? 1 : 0);
