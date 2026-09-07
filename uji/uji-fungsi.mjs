// Uji cakupan fungsional.
//
// Berbeda tujuan dari uji-jscroot.mjs, yang menjaga bahaya-bahaya TERTENTU.
// Berkas ini menjawab pertanyaan yang lebih tumpul: apakah setiap kendali di
// setiap halaman benar-benar berbuat sesuatu?
//
// Lahir 5 September 2026 karena pemilik menemukan tombol "Ubah" di Data induk
// tidak berbuat apa-apa, dan seluruh rangkaian uji yang ada lolos. Sebabnya:
// parameter `isiOpsi(opsi)` menutupi helper `opsi` yang diimpor, jadi
// `opsi(...)` memanggil sebuah larik. Untuk medan berpilihan tetap
// lemparannya serentak, sehingga laci.buka() tidak pernah dijalankan.
//
// Pelajarannya: uji yang menjaga bahaya tidak menggantikan uji yang menekan
// tombol. Dua-duanya perlu.
//
// Backend TIDAK perlu hidup: jawabannya dipalsukan lewat page.route.
//
// Menjalankan:  python3 -m http.server 5173  (dari akar kkn-frontend)
//               node uji-fungsi.mjs

import { chromium } from "playwright";

const B = "http://localhost:5173";
const browser = await chromium.launch();
let gagal = 0;
const lapor = (ok, teks) => { if (!ok) gagal++; console.log((ok ? "✓ " : "✗ ") + teks); };

const PESERTA = Array.from({ length: 6 }, (_, i) => ({
    id: "p-" + i, nim: "2190000" + i, name: "Nama " + i, prodi: "Farmasi",
    kelompok: "20", tahun_ajaran: "2025-2026", judul_kkn: "Judul", ketua: false,
    status_bayar: i % 3, ket: "", nilai_h: 80, nilai_s: 80, nilai_l: 80,
    nilai_qp: 80, nilai_ql: 80, nilai: 80, huruf: "A", has_cert: i % 2 === 0,
}));

function jawab(url) {
    const p = new URL(url).pathname;
    if (p.endsWith("/issue")) return { status: "ok", data: { no_sertifikat: "041/X" } };
    if (p === "/auth/me") return { status: "ok", data: { id: "u-1", uname: "admin", name: "Admin", role: 1, role_name: "Admin" } };
    if (p === "/api/settings") return { status: "ok", data: { pengaturan: { KOTA: "BANDUNG", JUDUL_KKN: "J" }, ttd: { rektor: { sumber: "bawaan" }, lppm: { sumber: "unggahan", oleh: "admin", updated_at: "2026-09-07T01:00:00Z", lebar: 300, tinggi: 208, ukuran: 43233 } } } };
    if (p === "/api/academic-years") return { data: ["2025-2026"], meta: { total: 1, page: 1, total_pages: 1 } };
    if (p === "/api/groups") return { data: [{ id: "g-1", kelompok: "20", lokasi: "Desa", nama_dosen: "Dosen", nidn: "04", tahun_ajaran: "2025-2026", jumlah_anggota: 6 }], meta: { total: 1, page: 1, total_pages: 1 } };
    if (p === "/api/participations") return { data: PESERTA, meta: { total: PESERTA.length, page: 1, total_pages: 1 } };
    if (p === "/api/students") return { data: [{ id: "s-1", nim: "21900001", name: "Mhs", kelas: "A", email: "a@b.c" }], meta: { total: 1, page: 1, total_pages: 1 } };
    if (p === "/api/programs") return { data: [{ id: "pr-1", prodi: "Farmasi", fakultas_id: 1 }], meta: { total: 1, page: 1, total_pages: 1 } };
    if (p === "/api/lecturers") return { data: [{ id: "d-1", name: "Dosen", nidn: "04", email: "d@b.c", status_dpl: true }], meta: { total: 1, page: 1, total_pages: 1 } };
    if (p === "/api/courses") return { data: [{ id: "c-1", matkul: "MK", semester: 5, sks: "2" }], meta: { total: 1, page: 1, total_pages: 1 } };
    if (p === "/api/users") return { data: [{ id: "u-1", uname: "admin", name: "Admin", role: 1, role_name: "Admin", active: true }], meta: { total: 1, page: 1, total_pages: 1 } };
    if (p === "/api/news") return { data: [{ id: "n-1", slug: "s", judul: "Berita", status: "draf" }], meta: { total: 1, page: 1, total_pages: 1 } };
    if (p === "/api/grades/course/list") return { data: [{ id: "cg-1", nim: "21900001", name: "Mhs", nilai_h: 0, nilai_tl: 0, nilai_uts: 0, nilai_uas: 0, nilai: 0 }], meta: { total: 1, page: 1, total_pages: 1 } };
    return { status: "ok", data: {}, meta: { total: 0, page: 1, total_pages: 1 } };
}

async function buka(jalur) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const galat = [], tulis = [], badan = [];
    page.on("pageerror", (e) => galat.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") galat.push("console: " + m.text()); });
    page.on("dialog", (d) => d.accept());
    await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
        localStorage.setItem("kkn_token", "token-uji-123");
        localStorage.setItem("kkn_user", JSON.stringify({ id: "u-1", uname: "admin", name: "Admin", role: 1, role_name: "Admin" }));
    });
    await page.route("**/localhost:8090/**", (route) => {
        const q = route.request();
        if (q.method() !== "GET") {
            tulis.push(q.method() + " " + new URL(q.url()).pathname);
            // Badan kiriman disimpan supaya uji bisa memeriksa APA yang
            // dikirim, bukan sekadar bahwa sesuatu terkirim.
            const b = q.postData();
            if (b && b.startsWith("{")) { try { badan.push(JSON.parse(b)); } catch (e) { /* multipart */ } }
        }
        // Unggah membalas DUA alamat berbeda: jalur situs dan pratinjau raw.
        if (/news\/image/.test(q.url())) {
            return route.fulfill({ status: 200, contentType: "application/json",
                body: JSON.stringify({ status: "ok", data: {
                    foto: "/assets/berita/2026/09/abc.png",
                    pratinjau: B + "/assets/img/logo-unfari.png" } }) });
        }
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(jawab(q.url())) });
    });
    await page.goto(B + jalur, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    return { ctx, page, galat, tulis, badan };
}

// ---------- 1. Setiap kendali bereaksi tanpa melempar ----------
{
    let ditekan = 0;
    for (const jalur of ["/data-kkn/", "/kelompok/", "/penilaian/", "/sertifikat/",
                         "/data-induk/", "/kelola-berita/", "/pengaturan/",
                         "/nilai-matkul/", "/akun/"]) {
        const { ctx, page, galat } = await buka(jalur);
        // Select yang mengendalikan isi halaman diisi dulu, supaya barisnya ada.
        for (const sel of await page.$$("select")) {
            const o = await sel.$$eval("option", (e) => e.map((x) => x.value).filter(Boolean));
            if (o.length) { await sel.selectOption(o[0]).catch(() => {}); await page.waitForTimeout(300); }
        }
        // HANYA di dalam main dan laci: tautan sidebar berpindah halaman dan
        // membatalkan sisa sapuan.
        const kendali = await page.$$("main button:not([disabled]), #laci button:not([disabled]), #papanMassal button:not([disabled])");
        for (const k of kendali) {
            await k.click({ timeout: 2500 }).catch(() => {});
            await page.waitForTimeout(120);
            ditekan++;
            const batal = await page.$("#tombolBatal");
            if (batal && await page.locator("#laci").isVisible().catch(() => false)) {
                await batal.click().catch(() => {});
                await page.waitForTimeout(150);
            }
        }
        lapor(galat.length === 0, `${jalur} — ${kendali.length} kendali ditekan tanpa galat` +
            (galat.length ? "\n    " + galat.slice(0, 3).join("\n    ") : ""));
        await ctx.close();
    }
    // Ambangnya menjaga sapuannya benar-benar berjalan; kalau data tiruan
    // menyusut dan tombol per baris ikut hilang, uji ini yang memberi tahu.
    lapor(ditekan > 40, `${ditekan} kendali ditekan seluruhnya`);
}

// ---------- 2. Laci Data induk terbuka untuk SETIAP entitas ----------
//
// Inilah yang lolos sebelumnya. Untuk entitas berpilihan tetap (Pengguna),
// lemparan terjadi serentak dan laci.buka() tidak pernah dijalankan.
{
    const { ctx, page, galat } = await buka("/data-induk/");
    const seg = await page.$$("#segmenEntitas button");
    lapor(seg.length === 5, `Data induk punya 5 entitas (${seg.length})`);
    for (let i = 0; i < seg.length; i++) {
        const nama = (await seg[i].textContent()).trim();
        await seg[i].click();
        await page.waitForTimeout(400);
        const ubah = page.locator("#isiTabel button", { hasText: "Ubah" }).first();
        if (!(await ubah.count())) { lapor(false, `${nama}: tidak ada baris untuk diubah`); continue; }
        await ubah.click();
        await page.waitForTimeout(300);
        const buka2 = await page.locator("#laci").isVisible();
        const medan = await page.$$eval("#medanForm input, #medanForm select", (e) => e.length);
        lapor(buka2 && medan > 0, `${nama}: laci Ubah terbuka dengan ${medan} medan`);
        if (buka2) { await page.click("#tombolBatal"); await page.waitForTimeout(200); }
    }
    lapor(galat.length === 0, "Data induk: tanpa galat di kelima entitas" +
        (galat.length ? "\n    " + galat[0] : ""));
    await ctx.close();
}

// ---------- 3. Simpan dan hapus benar-benar sampai ke server ----------
//
// Kalau salah satu diam, datanya tampak tersimpan di layar padahal tidak.
{
    // kelompok
    {
        const { ctx, page, tulis } = await buka("/kelompok/");
        await page.click("#tombolTambah"); await page.waitForTimeout(300);
        await page.fill("#fKelompok", "99");
        await page.fill("#fTahun", "2025-2026");
        await page.click("#tombolSimpan"); await page.waitForTimeout(400);
        lapor(tulis.some((x) => x === "POST /api/groups"), `kelompok Simpan → ${tulis[0] || "TIDAK MENGIRIM"}`);
        tulis.length = 0;
        await page.locator("#isiTabel button", { hasText: "Hapus" }).first().click();
        await page.waitForTimeout(400);
        lapor(tulis.some((x) => x.startsWith("DELETE /api/groups/")), `kelompok Hapus → ${tulis[0] || "TIDAK MENGIRIM"}`);
        await ctx.close();
    }
    // data induk, kelima entitas
    {
        const { ctx, page, tulis } = await buka("/data-induk/");
        const harap = ["/api/students", "/api/programs", "/api/lecturers", "/api/courses", "/api/users"];
        const seg = await page.$$("#segmenEntitas button");
        for (let i = 0; i < seg.length; i++) {
            const nama = (await seg[i].textContent()).trim();
            await seg[i].click(); await page.waitForTimeout(350);
            tulis.length = 0;
            await page.click("#tombolTambah"); await page.waitForTimeout(300);
            for (const inp of await page.$$("#medanForm input")) {
                const t = await inp.getAttribute("type");
                await inp.fill(t === "number" ? "1" : t === "email" ? "a@b.c"
                    : t === "password" ? "ujilokal123" : "Uji").catch(() => {});
            }
            await page.click("#tombolSimpan"); await page.waitForTimeout(400);
            lapor(tulis.some((x) => x.includes(harap[i])), `data induk ${nama} Simpan → ${tulis[0] || "TIDAK MENGIRIM"}`);
            const b2 = await page.$("#tombolBatal");
            if (b2 && await page.locator("#laci").isVisible().catch(() => false)) await b2.click().catch(() => {});
            await page.waitForTimeout(200);
        }
        await ctx.close();
    }
    // pengaturan dan akun
    {
        const { ctx, page, tulis } = await buka("/pengaturan/");
        await page.fill("#KOTA", "BANDUNG");
        await page.click("#tombolSimpan"); await page.waitForTimeout(400);
        lapor(tulis.some((x) => x === "POST /api/settings"), `pengaturan Simpan → ${tulis[0] || "TIDAK MENGIRIM"}`);
        await ctx.close();
    }
    {
        const { ctx, page, tulis } = await buka("/akun/");
        await page.fill("#lama", "ujilokal123");
        await page.fill("#baru", "sandibarupanjang");
        await page.fill("#ulang", "sandibarupanjang");
        await page.click("#tombolSimpan"); await page.waitForTimeout(400);
        lapor(tulis.some((x) => x === "POST /auth/password"), `akun Simpan sandi → ${tulis[0] || "TIDAK MENGIRIM"}`);
        await ctx.close();
    }
}

// ---------- 4. Halaman penilaian: kotak nilai, bukan tombol ----------
//
// Penilaian dan Nilai matkul tidak punya satu pun <button> di dalam main, jadi
// sapuan di atas melewatinya sama sekali. Interaksinya ada di kotak angka.
{
    for (const [jalur, pilih, jalurSimpan, jumlah] of [
        ["/penilaian/", "#pilihKelompok", "/api/grades/kkn", 5],
        ["/nilai-matkul/", "#pilihMatkul", "/api/grades/course", 4],
    ]) {
        const { ctx, page, galat, tulis } = await buka(jalur);
        const o = await page.$$eval(pilih + " option", (e) => e.map((x) => x.value).filter(Boolean));
        lapor(o.length > 0, `${jalur} menawarkan pilihan (${o.length})`);
        if (o.length) {
            await page.selectOption(pilih, o[0]);
            await page.waitForTimeout(500);
            // Per BARIS, bukan seluruh tabel — kalau tidak, asersinya berubah
            // tiap kali jumlah baris di data tiruan berubah.
            const perBaris = await page.$$eval("#isiTabel tr:first-child .kotak-nilai", (e) => e.length);
            lapor(perBaris === jumlah, `${jalur} menggambar ${jumlah} kotak per baris (${perBaris})`);
            const kotak = await page.$$("#isiTabel tr:first-child .kotak-nilai");
            for (let i = 0; i < kotak.length; i++) await kotak[i].fill(String(80 + i));
            // Keluar dari barisnya: penilaian KKN menyimpan per BARIS.
            await page.click("h1");
            await page.waitForTimeout(600);
            lapor(tulis.some((x) => x.includes(jalurSimpan)),
                `${jalur} mengirim nilai → ${tulis[0] || "TIDAK MENGIRIM"}`);
        }
        lapor(galat.length === 0, `${jalur} tanpa galat` + (galat.length ? "\n    " + galat[0] : ""));
        await ctx.close();
    }
}

// ---------- 5. Medan foto berita: alamat, bukan berkas ----------
//
// Sejak 6 September 2026 aplikasi tidak menginangkan foto. Yang dijaga di
// sini adalah pemeriksa di peramban: ia HARUS benar-benar memuat alamatnya
// sebagai gambar. Pemeriksaan di server tidak cukup — alamat foto publik di
// Google Drive membalas 200 image/jpeg untuk permintaan biasa, tapi peramban
// menolaknya (ERR_BLOCKED_BY_ORB). Uji ini sengaja TIDAK menyentuh Drive
// supaya tidak bergantung jaringan; yang dibuktikan mekanismenya.
{
    const { ctx, page, galat, tulis, badan } = await buka("/kelola-berita/");
    const tulisBtn = (await page.$$("main button"))[0];
    await tulisBtn.click();
    await page.waitForTimeout(300);

    const ket = () => page.textContent("#ketFoto");
    const jumlahFoto = () => page.$$eval("#daftarFoto img", (e) => e.length);

    // Medan alamat tinggal di dalam <details> yang tertutup — jalan utamanya
    // unggah berkas, menempel alamat itu jalan kedua. Dibuka dulu.
    await page.click("#laci summary");
    await page.waitForTimeout(200);
    async function coba(alamat) {
        await page.fill("#fFotoURL", alamat);
        await page.click("#tombolTambahFoto");
        await page.waitForFunction(() => !document.getElementById("tombolTambahFoto").disabled,
            { timeout: 20000 });
        await page.waitForTimeout(200);
        return { n: await jumlahFoto(), ket: (await ket()).trim() };
    }

    let r = await coba("bukan-alamat");
    lapor(r.n === 0 && /diawali/.test(r.ket), `bentuk salah ditolak — "${r.ket.slice(0, 44)}"`);

    r = await coba("http://inang.example/f.jpg");
    lapor(r.n === 0, "http biasa ditolak (isi campuran di halaman https)");

    // Alamat berbentuk benar tapi TIDAK bisa dimuat — inti pemeriksanya.
    // Port 1 tidak pernah melayani apa pun, jadi ini tidak keluar jaringan.
    r = await coba("https://localhost:1/tidak-ada.jpg");
    lapor(r.n === 0 && /tidak bisa ditampilkan/.test(r.ket),
        "alamat berbentuk benar tapi tak bisa dimuat DITOLAK — ini yang menangkap tautan Drive");

    // Berkas sungguhan di repo diterima.
    r = await coba("/assets/berita/README.md");
    lapor(r.n === 0, "berkas bukan gambar di folder yang benar tetap ditolak");

    r = await coba("/assets/img/logo-unfari.png");
    lapor(r.n === 0 && /diawali/.test(r.ket),
        "gambar sungguhan DI LUAR /assets/berita/ ditolak");

    // Gagal memuat gambar SELALU menulis galat ke konsol — dan itu justru
    // yang diuji di atas. Yang disaring hanya kegagalan sumber daya; galat
    // skrip apa pun tetap membuat uji ini merah.
    const galatNyata = galat.filter((g) => !/Failed to load resource|ERR_UNSAFE_PORT|ERR_CONNECTION/.test(g));
    // ── unggah berkas ──
    //
    // Yang dijaga adalah pemisahan dua alamat: jalur situs DISIMPAN, alamat
    // raw hanya DITAMPILKAN. Menyimpan alamat raw akan membekukan nama repo
    // dan cabangnya ke dalam dokumen berita — dan halaman depan akan memuat
    // fotonya dari githubusercontent, bukan dari situsnya sendiri.
    await page.setInputFiles("#fFoto", "../assets/img/logo-unfari.png");
    await page.waitForTimeout(700);
    const nFoto = await jumlahFoto();
    lapor(nFoto === 1, `unggah berkas menambah satu foto (${nFoto})`);
    const src = await page.$eval("#daftarFoto img", (e) => e.getAttribute("src"));
    lapor(/logo-unfari/.test(src), `pratinjau memakai alamat dari server (${src.slice(-24)})`);

    await page.fill("#fJudul", "Berita Uji");
    tulis.length = 0;
    await page.click("#tombolSimpan");
    await page.waitForTimeout(400);
    const kirimTerakhir = badan[badan.length - 1] || {};
    lapor(Array.isArray(kirimTerakhir.foto) && kirimTerakhir.foto[0] === "/assets/berita/2026/09/abc.png",
        `yang DISIMPAN jalur situs, bukan alamat pratinjau (${JSON.stringify(kirimTerakhir.foto)})`);

    // ── pemisahan paragraf ──
    //
    // Laci sudah tertutup oleh Simpan di bagian sebelumnya — dibuka lagi.
    if (!(await page.locator("#laci").isVisible().catch(() => false))) {
        await (await page.$$("main button"))[0].click();
        await page.waitForTimeout(300);
    }
    //
    // Dulu hanya BARIS KOSONG yang memisahkan paragraf, jadi orang yang
    // menulis dengan satu Enter per paragraf — kebiasaan dari Word —
    // menghasilkan satu paragraf raksasa yang ditolak server dengan
    // "maksimal 4000 karakter". Pesannya benar dan sama sekali tidak menolong.
    await page.fill("#fIsi", "Paragraf satu.\nParagraf dua.\nParagraf tiga.");
    await page.waitForTimeout(200);
    let hit = await page.textContent("#hitungIsi");
    lapor(/^3 paragraf/.test(hit), `satu Enter memisahkan paragraf (${hit})`);

    await page.fill("#fIsi", "Satu.\n\nDua.\n\nTiga.");
    await page.waitForTimeout(200);
    hit = await page.textContent("#hitungIsi");
    lapor(/^3 paragraf/.test(hit), `baris kosong memberi hasil sama (${hit})`);

    // Batas diberitahukan SAMBIL mengetik, bukan sesudah menekan Simpan.
    await page.fill("#fIsi", "A".repeat(4100));
    await page.waitForTimeout(250);
    const merah = await page.$eval("#hitungIsi", (e) => e.className.includes("text-galat"));
    lapor(merah, "paragraf kelewat panjang ditandai SEBELUM disimpan");

    await page.fill("#fIsi", "Paragraf satu.\nParagraf dua.");
    await page.fill("#fJudul", "Berita Uji Paragraf");
    badan.length = 0;
    await page.click("#tombolSimpan");
    await page.waitForTimeout(400);
    const kirimP = (badan[badan.length - 1] || {}).paragraf;
    lapor(Array.isArray(kirimP) && kirimP.length === 2,
        `yang dikirim sudah terpisah (${JSON.stringify(kirimP)})`);

    lapor(galatNyata.length === 0, "kelola berita: tanpa galat skrip" +
        (galatNyata.length ? "\n    " + galatNyata[0] : ""));
    await ctx.close();
}

// tema: pilihan bertahan lintas halaman, dan "sistem" menghapus simpanannya
{
    const { ctx, page } = await buka("/data-kkn/");
    await page.click('.sisi__tema-tombol[data-tema="gelap"]'); await page.waitForTimeout(150);
    const t1 = await page.evaluate(() => document.documentElement.dataset.tema + "/" + localStorage.getItem("kkn_tema"));
    await page.goto(B + "/kelompok/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
    const t2 = await page.evaluate(() => document.documentElement.dataset.tema);
    const aktif = await page.evaluate(() => (document.querySelector('.sisi__tema-tombol[aria-pressed="true"]') || {}).dataset?.tema);
    await page.click('.sisi__tema-tombol[data-tema="sistem"]'); await page.waitForTimeout(150);
    const t3 = await page.evaluate(() => localStorage.getItem("kkn_tema"));
    lapor(t1 === "gelap/gelap" && t2 === "gelap" && aktif === "gelap" && t3 === null,
        `tema bertahan lintas halaman (${t1} → ${t2}, aktif=${aktif}, sistem→${t3})`);
    await ctx.close();
}

await browser.close();
console.log(gagal ? `\n${gagal} GAGAL` : "\nsemua lulus");
process.exit(gagal ? 1 : 0);
