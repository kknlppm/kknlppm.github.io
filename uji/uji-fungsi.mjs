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
    if (p === "/api/academic-years/aktif") return { status: "ok", data: { tahun_ajaran: "2025-2026" } };
    if (p.startsWith("/api/academic-years")) return { status: "ok", data: ["2025-2026", "2024-2025"] };
    if (p === "/api/groups") return { data: [{ id: "g-1", kelompok: "20", lokasi: "Desa", nama_dosen: "Dosen", nidn: "04", tahun_ajaran: "2025-2026", jumlah_anggota: 6, julukan: "Bhakti Praja", lambang: "/assets/img/logo-unfari.png" }], meta: { total: 1, page: 1, total_pages: 1 } };
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
    for (const jalur of ["/pendaftaran/", "/pembayaran/", "/saya/", "/kelompok/", "/penilaian/", "/sertifikat/",
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
    const { ctx, page, galat } = await buka("/data-induk/?entitas=students");
    const seg = await page.$$("#segmenEntitas button");
    lapor(seg.length === 6, `Data induk punya 6 entitas (${seg.length})`);
    for (let i = 0; i < seg.length; i++) {
        const nama = (await seg[i].textContent()).trim();
        await seg[i].click();
        await page.waitForTimeout(400);
        if (nama === "Peserta") {
            // Buku besar baca-saja: tidak ada Tambah, tidak ada Ubah.
            lapor(await page.locator("#tombolTambah").isHidden() && (await page.locator("#isiTabel button").count()) === 0,
                "Peserta: baca-saja, tanpa Tambah maupun Ubah");
            continue;
        }
        const ubah = page.locator("#isiTabel button", { hasText: "Ubah" }).first();
        if (!(await ubah.count())) { lapor(false, `${nama}: tidak ada baris untuk diubah`); continue; }
        await ubah.click();
        await page.waitForTimeout(300);
        const buka2 = await page.locator("#laci").isVisible();
        const medan = await page.$$eval("#medanForm input, #medanForm select", (e) => e.length);
        lapor(buka2 && medan > 0, `${nama}: laci Ubah terbuka dengan ${medan} medan`);
        if (buka2) { await page.click("#tombolBatal"); await page.waitForTimeout(200); }
    }
    lapor(galat.length === 0, "Data induk: tanpa galat di keenam entitas" +
        (galat.length ? "\n    " + galat[0] : ""));
    await ctx.close();
}

// ---------- 2b. Pengguna: peran mahasiswa/dosen menampilkan tautan datanya ----------
//
// Sampai 8 September 2026 dropdown peran tidak memuat Mahasiswa dan Dosen,
// dan tidak ada halaman lain yang membuat akun keduanya. Kini ada, dengan
// medan tautan yang muncul HANYA untuk peran yang membutuhkannya.
{
    const { ctx, page, tulis, badan } = await buka("/data-induk/?entitas=students");
    await page.locator("#segmenEntitas button", { hasText: "Pengguna" }).click();
    await page.waitForTimeout(400);
    const saring = await page.locator("#segmenSaring button").allTextContents();
    lapor(saring.join(",") === "Staf,Dosen,Mahasiswa", `Pengguna punya saringan Staf/Dosen/Mahasiswa (${saring.join(",")})`);
    await page.locator("#segmenSaring button", { hasText: "Dosen" }).click();
    await page.waitForTimeout(400);
    await page.click("#tombolTambah"); await page.waitForTimeout(300);
    const opsi = await page.locator("#f_role option").allTextContents();
    lapor(["Mahasiswa", "Dosen", "Admin berita"].every((t) => opsi.includes(t)),
        `dropdown peran memuat Mahasiswa, Dosen, Admin berita (${opsi.filter(Boolean).join(", ")})`);
    lapor(await page.locator("#f_nim").isHidden() && await page.locator("#f_ref_id").isHidden(),
        "tanpa peran terpilih, medan NIM dan Dosen tersembunyi");
    await page.selectOption("#f_role", "3"); await page.waitForTimeout(150);
    lapor(await page.locator("#f_nim").isVisible() && await page.locator("#f_ref_id").isHidden(),
        "peran Mahasiswa: medan NIM tampil, Dosen tersembunyi");
    await page.selectOption("#f_role", "4"); await page.waitForTimeout(150);
    lapor(await page.locator("#f_ref_id").isVisible() && await page.locator("#f_nim").isHidden(),
        "peran Dosen: pilihan Dosen tampil, NIM tersembunyi");
    const dosenOpsi = await page.locator("#f_ref_id option").count();
    lapor(dosenOpsi >= 2, `pilihan Dosen terisi dari /api/lecturers (${dosenOpsi} opsi)`);
    await page.selectOption("#f_ref_id", "d-1");
    await page.fill("#f_uname", "dosen.uji");
    await page.fill("#f_password", "sandi-uji-123");
    await page.click("#tombolSimpan"); await page.waitForTimeout(400);
    const kirim = badan[badan.length - 1] || {};
    lapor(tulis.some((x) => x === "POST /api/users") && kirim.role === 4 && kirim.ref_id === "d-1",
        `akun dosen terkirim dengan ref_id (${JSON.stringify({ role: kirim.role, ref_id: kirim.ref_id })})`);
    await ctx.close();
}

// ---------- 2c. Akun lahir bersama datanya: formulir Mahasiswa dan Dosen ----------
{
    const { ctx, page, tulis, badan } = await buka("/data-induk/?entitas=students");
    // Mahasiswa: kolom Akun dan medan sandi akun.
    const kepala = await page.locator("#kepalaTabel th").allTextContents();
    lapor(kepala.includes("Akun"), `daftar Mahasiswa punya kolom Akun (${kepala.join(", ")})`);
    lapor(/belum ada/.test(await page.textContent("#isiTabel") || ""), "mahasiswa tanpa akun ditandai 'belum ada'");
    await page.locator("#isiTabel button", { hasText: "Ubah" }).first().click(); await page.waitForTimeout(300);
    lapor(await page.locator("#f_password").isVisible(), "formulir Mahasiswa punya medan Sandi akun");
    await page.fill("#f_password", "sandi-baru-123");
    await page.click("#tombolSimpan"); await page.waitForTimeout(400);
    const kirimMhs = badan[badan.length - 1] || {};
    lapor(kirimMhs.password === "sandi-baru-123" && kirimMhs.nim, `sandi akun mahasiswa ikut terkirim (nim=${kirimMhs.nim})`);
    // Dosen: nama pengguna + sandi.
    await page.locator("#segmenEntitas button", { hasText: "Dosen" }).click(); await page.waitForTimeout(400);
    await page.locator("#isiTabel button", { hasText: "Ubah" }).first().click(); await page.waitForTimeout(300);
    lapor(await page.locator("#f_uname").isVisible() && await page.locator("#f_password").isVisible(),
        "formulir Dosen punya Nama pengguna akun dan Sandi akun");
    await page.fill("#f_uname", "dosen.baru");
    await page.fill("#f_password", "sandi-dosen-123");
    await page.click("#tombolSimpan"); await page.waitForTimeout(400);
    const kirimDsn = badan[badan.length - 1] || {};
    lapor(tulis.some((x) => x.startsWith("POST /api/lecturers")) && kirimDsn.uname === "dosen.baru" && kirimDsn.password === "sandi-dosen-123",
        `akun dosen ikut terkirim bersama datanya (uname=${kirimDsn.uname})`);
    await ctx.close();
}

// ---------- 2d. Register: Daftarkan peserta ----------
//
// Sampai 8 September 2026 tidak ada jalan mendaftarkan peserta di aplikasi
// baru — angkatan berikutnya tidak bisa dimasukkan. Tombolnya hanya untuk
// admin dan admin fakultas; backend menegakkannya.
{
    const { ctx, page, tulis, badan } = await buka("/pendaftaran/");
    lapor(await page.locator("#tombolDaftar").isVisible(), "admin melihat tombol Daftarkan peserta");
    await page.click("#tombolDaftar"); await page.waitForTimeout(500);
    lapor(await page.locator("#laciDaftar").isVisible(), "laci pendaftaran terbuka");
    const ta = await page.locator("#fTahunDaftar option").allTextContents();
    lapor(ta.includes("2025-2026"), `tahun akademik terisi dari segmen (${ta.join(", ")})`);
    const kel = await page.locator("#fKelompokDaftar option").allTextContents();
    lapor(kel.length >= 2 && /Kelompok 20/.test(kel[1]), `kelompok terisi dari /api/groups?tahun_ajaran (${kel[1] || "-"})`);
    // NIM di Al-Ghifari berhuruf (A1A230001) — yang ditolak di layar hanya
    // yang terlalu pendek atau berspasi, bukan yang berhuruf.
    await page.fill("#fNimDaftar", "ab1"); await page.click("#tombolSimpanDaftar"); await page.waitForTimeout(200);
    lapor(!tulis.some((x) => x === "POST /api/participations"), "NIM terlalu pendek ditahan di layar, tidak terkirim");
    await page.fill("#fNimDaftar", "A1A 230001"); await page.click("#tombolSimpanDaftar"); await page.waitForTimeout(200);
    lapor(!tulis.some((x) => x === "POST /api/participations"), "NIM berspasi di tengah ditahan di layar");
    await page.fill("#fNimDaftar", " a1a230099\t");
    await page.selectOption("#fKelompokDaftar", "g-1");
    await page.fill("#fNamaDaftar", "Peserta Berhuruf Uji");
    await page.click("#tombolSimpanDaftar"); await page.waitForTimeout(500);
    const kirimHuruf = badan[badan.length - 1] || {};
    lapor(kirimHuruf.nim === "A1A230099", `NIM berhuruf dikirim bersih dan huruf besar (${JSON.stringify(kirimHuruf.nim)})`);
    // Pendaftaran yang diterima menutup lacinya; buka lagi untuk kasus berikut.
    if (!(await page.locator("#laciDaftar").isVisible())) { await page.click("#tombolDaftar"); await page.waitForTimeout(500); }
    await page.fill("#fNimDaftar", "234060099");
    await page.selectOption("#fKelompokDaftar", "g-1");
    await page.fill("#fNamaDaftar", "Peserta Baru Uji");
    await page.check("#fKetuaDaftar");
    await page.click("#tombolSimpanDaftar"); await page.waitForTimeout(500);
    const kirim = badan[badan.length - 1] || {};
    lapor(tulis.some((x) => x === "POST /api/participations") && kirim.nim === "234060099" && kirim.group_id === "g-1" && kirim.ketua === true,
        `pendaftaran terkirim ke POST /api/participations (${JSON.stringify({ nim: kirim.nim, group_id: kirim.group_id, ketua: kirim.ketua })})`);
    await ctx.close();
}

// ---------- 2e. Pembayaran TIDAK melihat tombol Daftarkan peserta ----------
{
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
        localStorage.setItem("kkn_token", "token-uji-123");
        localStorage.setItem("kkn_user", JSON.stringify({ id: "u-2", uname: "bayar", name: "Bayar", role: 2, role_name: "pembayaran" }));
    });
    await page.route("**/localhost:8090/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(jawab(route.request().url())) }));
    await page.goto(B + "/pembayaran/", { waitUntil: "networkidle" }); await page.waitForTimeout(300);
    lapor(await page.locator("#segmenBayar button").count() === 4 && await page.locator("#tombolDaftar").count() === 0,
        "petugas pembayaran mendapat meja pembayaran, tanpa tombol Daftarkan peserta");
    const labelSisi = await page.locator(".sisi__label").allTextContents();
    lapor(!labelSisi.includes("Pendaftaran") && labelSisi.includes("Pembayaran"),
        `sidebar pembayaran: Pembayaran ada, Pendaftaran tidak (${labelSisi.filter(Boolean).join(", ")})`);
    await ctx.close();
}

// ---------- 3. Simpan dan hapus benar-benar sampai ke server ----------
//
// Kalau salah satu diam, datanya tampak tersimpan di layar padahal tidak.
{
    // kelompok
    {
        const { ctx, page, tulis, badan } = await buka("/kelompok/");
        // Julukan dan lambang di tabel: dari data, bukan hiasan.
        lapor(/Bhakti Praja/.test(await page.textContent("#isiTabel") || ""), "julukan tampil di tabel kelompok");
        lapor(await page.locator("#isiTabel .ubin-lambang img").count() === 1, "lambang tampil sebagai ubin di tabel");
        await page.click("#tombolTambah"); await page.waitForTimeout(300);
        // Kelompok baru belum punya id: unggah lambang dimatikan dengan
        // penjelasan, bukan disembunyikan.
        lapor(/Simpan kelompoknya dulu/.test(await page.textContent("#ketLambang") || ""),
            "kelompok baru: unggah lambang menunggu kelompoknya tersimpan");
        await page.fill("#fKelompok", "99");
        // Tahun akademik dipilih dari daftar resmi, bukan diketik; bawaannya
        // tahun aktif dari /api/academic-years/aktif.
        const opsiTahun = await page.locator("#fTahun option").allTextContents();
        lapor(opsiTahun.join(",") === "2025-2026,2024-2025", `tahun akademik di formulir Kelompok berupa pilihan dari daftar resmi (${opsiTahun.join(",")})`);
        lapor(await page.inputValue("#fTahun") === "2025-2026", "bawaan tahun akademik = tahun aktif");
        await page.selectOption("#fTahun", "2025-2026");
        await page.fill("#fJulukan", "Uji Julukan");
        await page.click("#tombolSimpan"); await page.waitForTimeout(400);
        lapor(tulis.some((x) => x === "POST /api/groups"), `kelompok Simpan → ${tulis[0] || "TIDAK MENGIRIM"}`);
        lapor(badan.some((b) => b && b.julukan === "Uji Julukan"), "julukan ikut terkirim saat menyimpan");
        tulis.length = 0;
        // Ubah kelompok yang sudah ada: julukan terisi, pratinjau lambang
        // tampil, dan tombol lepas tersedia.
        await page.locator("#isiTabel button", { hasText: "Ubah" }).first().click();
        await page.waitForTimeout(300);
        lapor(await page.inputValue("#fJulukan") === "Bhakti Praja", "laci Ubah memuat julukan");
        lapor(await page.locator("#lambangPratinjau").isVisible() && await page.locator("#tombolLepasLambang").isVisible(),
            "laci Ubah menampilkan pratinjau lambang dan tombol lepas");
        await page.click("#tombolLepasLambang"); await page.waitForTimeout(400);
        lapor(tulis.some((x) => x === "DELETE /api/groups/g-1/lambang"), `lepas lambang → ${tulis[0] || "TIDAK MENGIRIM"}`);
        await page.click("#tombolBatal"); await page.waitForTimeout(200);
        tulis.length = 0;
        await page.locator("#isiTabel button", { hasText: "Hapus" }).first().click();
        await page.waitForTimeout(400);
        lapor(tulis.some((x) => x.startsWith("DELETE /api/groups/")), `kelompok Hapus → ${tulis[0] || "TIDAK MENGIRIM"}`);
        await ctx.close();
    }
    // data induk, kelima entitas yang bisa ditulis (Peserta baca-saja dilewati)
    {
        const { ctx, page, tulis } = await buka("/data-induk/?entitas=students");
        const harap = { Mahasiswa: "/api/students", "Program studi": "/api/programs", Dosen: "/api/lecturers",
                        "Mata kuliah": "/api/courses", Pengguna: "/api/users" };
        const seg = await page.$$("#segmenEntitas button");
        for (let i = 0; i < seg.length; i++) {
            const nama = (await seg[i].textContent()).trim();
            if (!harap[nama]) continue;
            await seg[i].click(); await page.waitForTimeout(350);
            tulis.length = 0;
            await page.click("#tombolTambah"); await page.waitForTimeout(300);
            for (const inp of await page.$$("#medanForm input")) {
                const t = await inp.getAttribute("type");
                await inp.fill(t === "number" ? "1" : t === "email" ? "a@b.c"
                    : t === "password" ? "ujilokal123" : "Uji").catch(() => {});
            }
            await page.click("#tombolSimpan"); await page.waitForTimeout(400);
            lapor(tulis.some((x) => x.includes(harap[nama])), `data induk ${nama} Simpan → ${tulis[0] || "TIDAK MENGIRIM"}`);
            const b2 = await page.$("#tombolBatal");
            if (b2 && await page.locator("#laci").isVisible().catch(() => false)) await b2.click().catch(() => {});
            await page.waitForTimeout(200);
        }
        await ctx.close();
    }
    // pengaturan dan akun
    {
        const { ctx, page, tulis, badan } = await buka("/pengaturan/");
        await page.fill("#KOTA", "BANDUNG");
        await page.click("#tombolSimpan"); await page.waitForTimeout(400);
        lapor(tulis.some((x) => x === "POST /api/settings"), `pengaturan Simpan → ${tulis[0] || "TIDAK MENGIRIM"}`);
        // Tahun akademik: daftar resmi hanya admin. Select tahun aktif diisi
        // dari daftar, tahun aktif tidak punya tombol Hapus, bentuk yang
        // salah ditahan di layar, dan yang benar dikirim ke POST
        // /api/academic-years; Hapus memanggil DELETE /api/academic-years/:tahun.
        const opsiTA = await page.locator("#TA option").allTextContents();
        lapor(opsiTA.includes("2025-2026") && opsiTA.includes("2024-2025"), `select tahun aktif diisi dari daftar resmi (${opsiTA.join(",")})`);
        const baris = await page.locator("#daftarTahunAkademik li").allTextContents();
        lapor(baris.length === 2 && /2025-2026\s*aktif/.test(baris[0]) && /2024-2025\s*Hapus/.test(baris[1]),
            `daftar tahun: aktif ditandai, yang lain bisa dihapus (${baris.map((b) => b.replace(/\s+/g, " ").trim()).join(" | ")})`);
        tulis.length = 0; badan.length = 0;
        await page.fill("#fTahunBaru", "2026-2028"); await page.click("#tombolTambahTahun"); await page.waitForTimeout(200);
        lapor(!tulis.length && /2026-2027/.test(await page.textContent("#pesan") || ""), "tahun tidak berurutan ditahan di layar dengan pesan bentuknya");
        await page.fill("#fTahunBaru", "2026-2027"); await page.click("#tombolTambahTahun"); await page.waitForTimeout(400);
        lapor(tulis[0] === "POST /api/academic-years" && badan[0] && badan[0].tahun_ajaran === "2026-2027",
            `tahun baru dikirim ke POST /api/academic-years (${JSON.stringify(badan[0])})`);
        tulis.length = 0;
        await page.locator("#daftarTahunAkademik button", { hasText: "Hapus" }).first().click(); await page.waitForTimeout(400);
        lapor(tulis[0] === "DELETE /api/academic-years/2024-2025", `Hapus memanggil DELETE /api/academic-years/:tahun (${tulis[0] || "TIDAK MENGIRIM"})`);
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
    const { ctx, page } = await buka("/pendaftaran/");
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

// ---------- 8. Menu mengikuti pekerjaan (8 September 2026) ----------
//
// Register dibubarkan: Pendaftaran mendaftarkan dan membatalkan, Pembayaran
// mengubah status bayar, Data induk › Peserta adalah buku besar baca-saja,
// KKN saya milik mahasiswa, dan Akun saya bisa mengubah kontak sendiri.
{
    // Data induk › Peserta: baca-saja, tersaring NIM dari tautan Riwayat KKN.
    const { ctx, page } = await buka("/data-induk/?entitas=peserta&nim=21900001");
    lapor(await page.locator("#tombolTambah").isHidden(), "tab Peserta tidak punya tombol Tambah");
    const kepala = await page.locator("#kepalaTabel th").allTextContents();
    lapor(kepala[0] === "NIM" && kepala.includes("Sertifikat") && !kepala.includes("Tindakan"),
        `tab Peserta memuat kolom buku besar tanpa Tindakan (${kepala.join(", ")})`);
    lapor(await page.locator("#isiTabel button").count() === 0, "tab Peserta tanpa tombol Ubah/Hapus");
    lapor(await page.inputValue("#cari") === "21900001", "?nim= mengisi kotak cari");
    const saring = await page.locator("#segmenSaring button").allTextContents();
    lapor(saring[0] === "Semua" && saring.includes("2025-2026"), `saringan tahun akademik terpasang (${saring.join(", ")})`);
    await page.locator("#segmenEntitas button", { hasText: "Mahasiswa" }).click(); await page.waitForTimeout(400);
    const riwayat = await page.locator("#isiTabel a", { hasText: "Riwayat KKN" }).first().getAttribute("href");
    lapor(riwayat === "/data-induk/?entitas=peserta&nim=21900001", `tab Mahasiswa menaut ke riwayat KKN (${riwayat})`);
    lapor(await page.locator("#tombolTambah").isVisible(), "tab Mahasiswa mengembalikan tombol Tambah");
    await ctx.close();
}
{
    // Pendaftaran: Batalkan memanggil DELETE /api/participations/:id.
    const { ctx, page, tulis } = await buka("/pendaftaran/");
    const kepala = await page.locator("#kepalaTabel th").allTextContents();
    lapor(kepala.includes("Tindakan"), `Pendaftaran punya kolom Tindakan (${kepala.join(", ")})`);
    await page.locator("#isiTabel button", { hasText: "Batalkan" }).first().click(); await page.waitForTimeout(400);
    lapor(tulis[0] === "DELETE /api/participations/p-0", `Batalkan → ${tulis[0] || "TIDAK MENGIRIM"}`);
    await ctx.close();
}
{
    // KKN saya sebagai mahasiswa: satu kartu per keikutsertaan, sertifikat
    // yang terbit punya tombol lihat.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const tulis = [], badan = [];
    await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
        localStorage.setItem("kkn_token", "token-uji-123");
        localStorage.setItem("kkn_user", JSON.stringify({ id: "u-3", uname: "21900000", name: "Nama 0", role: 3, role_name: "mahasiswa" }));
    });
    await page.route("**/localhost:8090/**", (route) => {
        const q = route.request();
        const p = new URL(q.url()).pathname;
        if (q.method() !== "GET") {
            tulis.push(q.method() + " " + p);
            const b = q.postData(); if (b && b.startsWith("{")) { try { badan.push(JSON.parse(b)); } catch (e) {} }
        }
        if (p === "/auth/me") return route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify({ status: "ok", data: { id: "u-3", uname: "21900000", name: "Nama 0", role: 3, role_name: "mahasiswa",
                profil: { jenis: "mahasiswa", nim: "21900000", email: "a@b.c", phone: "08", kelas: "A", domisili: "Bandung" } } }) });
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(jawab(q.url())) });
    });
    await page.goto(B + "/saya/", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    lapor(await page.locator("#daftarKkn .kartu-kkn").count() === PESERTA.length, `KKN saya menggambar ${PESERTA.length} kartu keikutsertaan`);
    lapor(await page.locator("#daftarKkn a", { hasText: "Lihat sertifikat" }).count() === 3, "sertifikat yang terbit punya tombol lihat");
    lapor(await page.locator("#kosong").isHidden(), "keadaan kosong tersembunyi saat ada kartu");
    lapor(/21900000/.test(await page.textContent("#identitas") || ""), "identitas memuat NIM");
    // Akun saya: kontak bisa diubah sendiri → POST /auth/profil.
    await page.goto(B + "/akun/", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    lapor(await page.locator("#bagianKontak").isVisible() && await page.inputValue("#kEmail") === "a@b.c", "Akun saya menampilkan kontak yang tersimpan");
    await page.fill("#kEmail", "baru@b.c"); await page.click("#tombolKontak"); await page.waitForTimeout(400);
    lapor(tulis.includes("POST /auth/profil") && badan.some((b) => b.email === "baru@b.c" && b.kelas === "A"),
        `kontak dikirim ke POST /auth/profil (${JSON.stringify(badan[0] || {})})`);
    await ctx.close();
}

// ---------- 9. Impor dan ekspor XLSX ----------
//
// Impor dua langkah: Periksa mengirim berkas tanpa terapkan, laporannya
// digambar per baris, Terapkan mengirim ulang dengan ?terapkan=1. Ekspor:
// tombol Unduh XLSX meminta /api/export/... dengan header token dan saringan
// yang sedang tampil.
{
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on("dialog", (d) => d.accept());
    const diminta = [];
    await page.goto(B + "/404.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
        localStorage.setItem("kkn_token", "token-uji-123");
        localStorage.setItem("kkn_user", JSON.stringify({ id: "u-1", uname: "admin", name: "Admin", role: 1, role_name: "Admin" }));
    });
    await page.route("**/localhost:8090/**", (route) => {
        const q = route.request(); const u = new URL(q.url()); const p = u.pathname;
        diminta.push({ m: q.method(), p, cari: u.search, login: q.headers()["login"] });
        if (p === "/api/participations/import") {
            const terapkan = u.searchParams.get("terapkan") === "1";
            return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", data: {
                tahun_ajaran: "2025-2026", terapkan, total: 3, siap: terapkan ? 0 : 2, sudah: 0, galat: 1, terdaftar: terapkan ? 2 : 0, gagal: 0,
                baris: [
                    { no: 2, nim: "A1A230099", nama: "Peserta Impor", kelompok: "20", status: terapkan ? "terdaftar" : "siap", pesan: terapkan ? "akun dibuat, sandi awal NIM" : "mahasiswa baru akan dibuat", mahasiswa_baru: true },
                    { no: 3, nim: "21900001", nama: "Mhs", kelompok: "20", status: terapkan ? "terdaftar" : "siap", pesan: "", mahasiswa_baru: false },
                    { no: 4, nim: "ABC", nama: "Salah", kelompok: "99", status: "galat", pesan: "NIM harus 6 sampai 20 huruf atau angka, tanpa spasi", mahasiswa_baru: false },
                ] } }) });
        }
        if (p.startsWith("/api/export/") || p.endsWith("/import/template")) {
            return route.fulfill({ status: 200, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers: { "Content-Disposition": 'attachment; filename="uji.xlsx"' }, body: "PK" });
        }
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(jawab(q.url())) });
    });
    await page.goto(B + "/pendaftaran/", { waitUntil: "networkidle" }); await page.waitForTimeout(500);
    await page.click("#tombolImpor"); await page.waitForTimeout(300);
    lapor(await page.locator("#laciImpor").isVisible(), "laci impor terbuka");
    await page.click("#tombolPeriksaImpor"); await page.waitForTimeout(200);
    lapor(/Pilih berkas/.test(await page.textContent("#pesanLaciImpor") || ""), "Periksa tanpa berkas ditahan di layar");
    await page.setInputFiles("#fBerkasImpor", { name: "daftar.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("PK-uji") });
    await page.click("#tombolPeriksaImpor"); await page.waitForTimeout(500);
    const periksa = diminta.find((d) => d.p === "/api/participations/import" && !/terapkan=1/.test(d.cari));
    lapor(!!periksa && periksa.m === "POST" && /tahun_ajaran=2025-2026/.test(periksa.cari) && periksa.login === "token-uji-123",
        `Periksa mengirim POST /api/participations/import tanpa terapkan, ber-token (${periksa ? periksa.cari : "-"})`);
    const baris = await page.locator("#isiLaporanImpor tr").count();
    const statusTeks = await page.locator("#isiLaporanImpor .tanda").allTextContents();
    lapor(baris === 3 && statusTeks.join(",") === "siap,siap,galat", `laporan per baris digambar (${baris} baris: ${statusTeks.join(",")})`);
    lapor(/2 siap/.test(await page.textContent("#ringkasImpor") || "") && (await page.textContent("#tombolTerapkanImpor") || "").includes("2"),
        "ringkasan menyebut 2 siap dan tombol Terapkan menyebut jumlahnya");
    await page.click("#tombolTerapkanImpor"); await page.waitForTimeout(500);
    const terapkan = diminta.find((d) => d.p === "/api/participations/import" && /terapkan=1/.test(d.cari));
    lapor(!!terapkan, "Terapkan mengirim ulang dengan ?terapkan=1");
    lapor(/2 terdaftar/.test(await page.textContent("#ringkasImpor") || "") && await page.locator("#tombolTerapkanImpor").isHidden(),
        "sesudah diterapkan: ringkasan terdaftar, tombol Terapkan hilang");
    await page.click("#tombolTemplat"); await page.waitForTimeout(400);
    lapor(diminta.some((d) => d.p.endsWith("/import/template") && d.login === "token-uji-123"), "Unduh templat meminta /import/template ber-token");
    await page.click("#tombolBatalImpor"); await page.waitForTimeout(300);
    await page.click("#tombolUnduh"); await page.waitForTimeout(400);
    const ekspor = diminta.find((d) => d.p === "/api/export/participations");
    lapor(!!ekspor && /tahun_ajaran=2025-2026/.test(ekspor.cari) && ekspor.login === "token-uji-123",
        `Pendaftaran Unduh XLSX meminta /api/export/participations dengan tahun (${ekspor ? ekspor.cari : "-"})`);

    // Pembayaran: saringan bayar ikut; Data induk: per entitas; Kelompok; Penilaian per kelompok.
    diminta.length = 0;
    await page.goto(B + "/pembayaran/", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    await page.click("#tombolUnduh"); await page.waitForTimeout(400);
    lapor(diminta.some((d) => d.p === "/api/export/participations" && /bayar=0/.test(d.cari)), "Pembayaran Unduh XLSX membawa bayar=0");
    diminta.length = 0;
    await page.goto(B + "/data-induk/?entitas=students", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    await page.click("#tombolUnduh"); await page.waitForTimeout(400);
    lapor(diminta.some((d) => d.p === "/api/export/students"), "Data induk › Mahasiswa mengunduh /api/export/students");
    await page.locator("#segmenEntitas button", { hasText: "Dosen" }).click(); await page.waitForTimeout(300);
    await page.click("#tombolUnduh"); await page.waitForTimeout(400);
    lapor(diminta.some((d) => d.p === "/api/export/lecturers"), "Data induk › Dosen mengunduh /api/export/lecturers");
    await page.locator("#segmenEntitas button", { hasText: "Program studi" }).click(); await page.waitForTimeout(300);
    lapor(await page.locator("#tombolUnduh").isHidden(), "entitas tanpa ekspor menyembunyikan tombol Unduh");
    diminta.length = 0;
    await page.goto(B + "/kelompok/", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    await page.click("#tombolUnduh"); await page.waitForTimeout(400);
    lapor(diminta.some((d) => d.p === "/api/export/groups"), "Kelompok mengunduh /api/export/groups");
    diminta.length = 0;
    await page.goto(B + "/penilaian/", { waitUntil: "networkidle" }); await page.waitForTimeout(400);
    lapor(await page.locator("#tombolUnduh").isDisabled(), "Penilaian: Unduh mati sebelum kelompok dipilih");
    await page.selectOption("#pilihKelompok", "g-1"); await page.waitForTimeout(400);
    await page.click("#tombolUnduh"); await page.waitForTimeout(400);
    lapor(diminta.some((d) => d.p === "/api/export/participations" && /group_id=g-1/.test(d.cari)), "Penilaian mengunduh nilai kelompok yang dipilih");
    await ctx.close();
}

await browser.close();
console.log(gagal ? `\n${gagal} GAGAL` : "\nsemua lulus");
process.exit(gagal ? 1 : 0);
