// Uji terhadap backend PRODUKSI dengan berkas frontend LOKAL.
//
// Berkasnya disajikan di https://kknlppm.github.io lewat page.route, bukan di
// localhost: FRONTEND_ORIGIN hanya mengizinkan origin itu, jadi memuat dari
// localhost membuat setiap panggilan API kandas di CORS — bukan karena
// kodenya salah.
//
// Jalankan:  KKN_UNAME=… KKN_SANDI=… node uji-langsung.mjs
// Kredensial TIDAK ditulis di berkas ini.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";

const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const UNAME = process.env.KKN_UNAME, SANDI = process.env.KKN_SANDI;
if (!UNAME || !SANDI) { console.error("Perlu KKN_UNAME dan KKN_SANDI."); process.exit(2); }

const TIPE = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
    ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webp": "image/webp" };

let lulus = 0, gagal = 0;
const cek = (nama, ok, ket = "") => {
    console.log(`${ok ? "  ok  " : "GAGAL "} ${nama}${ket ? "  — " + ket : ""}`);
    ok ? lulus++ : gagal++;
};

const brw = await chromium.launch();
const page = await (await brw.newContext()).newPage();
const galat = [];
page.on("pageerror", (e) => galat.push(String(e).slice(0, 140)));

await page.route(ASAL + "/**", async (route) => {
    let rel = new URL(route.request().url()).pathname;
    if (rel.endsWith("/")) rel += "index.html";
    try {
        const isi = await readFile(path.join(AKAR, rel));
        await route.fulfill({ body: isi, contentType: TIPE[path.extname(rel)] || "application/octet-stream" });
    } catch { await route.fulfill({ status: 404, body: "tidak ada" }); }
});

const posisi = () => page.locator("#posisiHalaman").textContent().then((t) => t.trim());

// muat() mengosongkan tabel SEBELUM jaringan menjawab, jadi "baris pertama
// berubah" terpenuhi seketika dan menidurkan ujinya terlalu cepat. Yang
// menandai halaman baru sudah tiba adalah teks posisinya berubah DAN tabelnya
// terisi lagi.
async function keHalaman(n) {
    await page.click("#berikutnya");
    await page.waitForFunction((n) => {
        const p = document.getElementById("posisiHalaman");
        const ada = document.querySelectorAll("#isiTabel tr").length;
        return ada > 0 && p && p.textContent.startsWith("Halaman " + n + " ");
    }, n, { timeout: 25000 });
}

async function muatSelesai() {
    await page.waitForFunction(() => document.querySelectorAll("#isiTabel tr").length > 0, null, { timeout: 25000 });
}

// ── masuk ──
await page.goto(ASAL + "/login/");
await page.fill("#uname", UNAME);
await page.fill("#password", SANDI);
await page.click("#tombolMasuk");
await page.waitForURL((u) => !/\/login\/?$/.test(new URL(u).pathname), { timeout: 20000 }).catch(() => {});
cek("masuk sebagai admin", !/\/login\/?$/.test(new URL(page.url()).pathname), page.url().replace(ASAL, ""));

// ── data induk: 1.706 mahasiswa, dulu berhenti di 200 ──
await page.goto(ASAL + "/data-induk/");
await page.waitForFunction(() => document.querySelectorAll("#isiTabel tr").length > 1, null, { timeout: 25000 });
cek("data-induk halaman 1 penuh 200 baris", (await page.locator("#isiTabel tr").count()) === 200);
cek("ringkasan menyebut total sebenarnya", /^1\.\d{3} mahasiswa$/.test((await page.locator("#ringkasan").textContent()).trim()),
    (await page.locator("#ringkasan").textContent()).trim());
cek("kontrol halaman muncul", await page.locator("#kakiHalaman").isVisible());
cek("posisi halaman 1 benar", /^Halaman 1 dari \d+$/.test(await posisi()), await posisi());
cek("Sebelumnya mati di halaman 1", await page.locator("#sebelumnya").isDisabled());

await keHalaman(2).catch(() => {});
cek("data-induk pindah ke halaman 2", /Halaman 2 dari/.test(await posisi()), await posisi());
cek("Sebelumnya hidup di halaman 2", !(await page.locator("#sebelumnya").isDisabled()));

// mencari harus mengembalikan ke halaman 1
await page.fill("#cari", "budi");
await page.waitForTimeout(2000);
const kakiCari = await page.locator("#kakiHalaman").isVisible();
cek("mencari kembali ke halaman 1", !kakiCari || /Halaman 1 dari/.test(await posisi()),
    kakiCari ? await posisi() : "hasil muat satu halaman");

// prodi cuma 9 baris — kaki harus hilang
await page.fill("#cari", "");
await page.waitForTimeout(1200);
await page.click('#segmenEntitas button[data-entitas="programs"]');
await page.waitForTimeout(2000);
cek("prodi (9 baris) tanpa kontrol halaman", !(await page.locator("#kakiHalaman").isVisible()));

// ── sertifikat: 1.310 siap terbit, dulu berhenti di 100 ──
await page.goto(ASAL + "/sertifikat/");
await page.waitForFunction(() => document.querySelectorAll("#isiTabel tr").length > 1, null, { timeout: 25000 });
const ringkasSert = (await page.locator("#ringkasan").textContent()).trim();
cek("sertifikat: ringkasan menyebut ribuan peserta", /^\d\.\d{3} peserta$/.test(ringkasSert), ringkasSert);
cek("sertifikat: kontrol halaman muncul", await page.locator("#kakiHalaman").isVisible(), await posisi());
await keHalaman(2).catch(() => {});
cek("sertifikat: halaman 2 terjangkau", /Halaman 2 dari/.test(await posisi()), await posisi());

// ganti status harus kembali ke halaman 1
await page.click('#segmenStatus button[data-status="terbit"]');
await page.waitForTimeout(1000);
await muatSelesai();
const kakiTerbit = await page.locator("#kakiHalaman").isVisible();
cek("sertifikat: ganti status kembali ke halaman 1", !kakiTerbit || /Halaman 1 dari/.test(await posisi()),
    kakiTerbit ? await posisi() : "139 terbit muat satu halaman");

// ── kelompok: 202, dulu berhenti di 200 ──
await page.goto(ASAL + "/kelompok/");
await page.waitForFunction(() => document.querySelectorAll("#isiTabel tr").length > 1, null, { timeout: 25000 });
const ringkasKel = (await page.locator("#ringkasan").textContent()).trim();
cek("kelompok: ringkasan menyebut 202", /^202 kelompok$/.test(ringkasKel), ringkasKel);
cek("kelompok: kontrol halaman muncul (202 > 200)", await page.locator("#kakiHalaman").isVisible(), await posisi());
await keHalaman(2).catch(() => {});
const barisSisa = await page.locator("#isiTabel tr").count();
cek("kelompok: dua sisa terjangkau di halaman 2", barisSisa === 2, barisSisa + " baris");

// ── register: tabel harus MUAT, bukan mendorong kolom keluar layar ──
//
// Dulu "Judul KKN" mengambil 352px meski 98% barisnya kosong, dan itu
// mendorong Nilai dan Sertifikat keluar layar di 1440px. Lebar kolom sekarang
// dipatok; uji ini yang menjaga supaya tidak kembali.
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(ASAL + "/data-induk/?entitas=peserta");
await page.waitForFunction(() => document.querySelectorAll("#isiTabel tr").length > 1, null, { timeout: 25000 });
const tabel = await page.evaluate(() => {
    const t = document.querySelector("table");
    const tinggi = Array.from(document.querySelectorAll("#isiTabel tr"))
        .map((r) => r.getBoundingClientRect().height).filter((h) => h > 0);
    const judul = Array.from(document.querySelectorAll("thead th")).map((th) => th.textContent.trim());
    return { lebar: Math.round(t.scrollWidth), ruang: Math.round(t.parentElement.clientWidth),
             tertinggi: Math.round(Math.max(...tinggi)), judul };
});
cek("register muat tanpa mendorong kolom keluar", tabel.lebar <= tabel.ruang,
    `tabel ${tabel.lebar}px di ruang ${tabel.ruang}px`);
cek("kolom Nilai dan Sertifikat ikut tampil",
    tabel.judul.includes("Nilai") && tabel.judul.includes("Sertifikat"), tabel.judul.join(" · "));
cek("baris tidak membungkus jadi dua baris", tabel.tertinggi <= 48, `tertinggi ${tabel.tertinggi}px`);

// ── penilaian: kelompok terlihat, bukan tersembunyi di dropdown ──
await page.goto(ASAL + "/penilaian/");
await page.waitForFunction(() => document.querySelectorAll("#petakKelompok button").length > 0,
    null, { timeout: 25000 }).catch(() => {});
const jmlKartu = await page.locator("#petakKelompok button").count();
cek("penilaian menampilkan kelompok sebagai kartu", jmlKartu >= 20, jmlKartu + " kartu");
cek("tabel penilaian belum terbuka", await page.locator("#wadahTabel").isHidden());

const judulKartu = (await page.locator("#petakKelompok button").first().textContent()).trim().slice(0, 20);
await page.locator("#petakKelompok button").first().click();
await page.waitForFunction(() => document.querySelectorAll("#isiTabel tr").length > 0,
    null, { timeout: 25000 }).catch(() => {});
cek("menekan kartu membuka penilaiannya", await page.locator("#wadahTabel").isVisible(), judulKartu);
cek("petak kartu menyingkir", await page.locator("#kosong").isHidden());
const anggota = await page.locator("#isiTabel tr").count();
cek("anggota kelompok termuat", anggota > 0, anggota + " anggota");
cek("dropdown ikut menunjuk kelompok yang sama",
    (await page.locator("#pilihKelompok").inputValue()) !== "");

// ── pengaturan: tanda tangan ──
// Pratinjaunya diambil dengan token, jadi kalau autentikasi pada rute gambar
// rusak, yang tampil "belum ada" tanpa galat apa pun di konsol.
await page.goto(ASAL + "/pengaturan/", { waitUntil: "networkidle" });
await page.waitForFunction(() => {
    const g = [...document.querySelectorAll('[data-peran="gambar"]')];
    return g.length === 2 && g.every((i) => !i.hidden && i.naturalWidth > 0);
}, null, { timeout: 15000 }).catch(() => {});
const ttd = await page.evaluate(() => [...document.querySelectorAll("[data-ttd]")].map((b) => {
    const img = b.querySelector('[data-peran="gambar"]');
    return {
        nama: b.dataset.ttd, tampil: !img.hidden && img.naturalWidth > 0,
        status: b.querySelector('[data-peran="status"]').textContent.trim(),
        ganti: !!b.querySelector('[data-peran="ganti"]'),
        bawaanSesuai: b.querySelector('[data-peran="bawaan"]').hidden === (b.querySelector('[data-peran="status"]').textContent.trim() !== "unggahan"),
    };
}));
cek("pengaturan: kedua pratinjau tanda tangan tampil", ttd.length === 2 && ttd.every((t) => t.tampil), ttd.map((t) => t.nama + "=" + t.status).join(", "));
cek("pengaturan: status, tombol ganti, dan tombol bawaan konsisten", ttd.every((t) => ["bawaan", "unggahan"].includes(t.status) && t.ganti && t.bawaanSesuai));

cek("tidak ada galat skrip di seluruh alur", galat.length === 0, galat.join(" | ").slice(0, 200));

await brw.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
