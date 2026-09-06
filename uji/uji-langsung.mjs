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

cek("tidak ada galat skrip di seluruh alur", galat.length === 0, galat.join(" | ").slice(0, 200));

await brw.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
