// Kontras teks hero diukur dari PIKSEL YANG BENAR-BENAR TERGAMBAR.
//
// Latar hero sekarang render 3D, bukan warna token, jadi getComputedStyle
// tidak tahu apa-apa soal apa yang ada di belakang sebuah baris. Caranya:
// potret dengan blok teksnya disembunyikan, lalu baca piksel paling TERANG di
// kotak tempat tiap baris duduk. Yang paling terang yang menentukan, karena
// satu titik terang di bawah huruf sudah cukup membuatnya hilang.
//
// Elemen yang punya latar legap sendiri (tombol) diukur terhadap latarnya
// sendiri. Tanpa itu ia terbaca 1,55:1 padahal sebenarnya 8,71:1, dan angka
// yang salah arah lebih berbahaya daripada tidak ada angka.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const TIPE = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
    ".jpg": "image/jpeg", ".avif": "image/avif", ".webp": "image/webp" };

const L = (r, g, b) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const rasio = (a, b) => {
    const l1 = L(...a), l2 = L(...b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const SEL = [
    [".judul-halaman__baris", "eyebrow"],
    [".judul-besar", "judul (baris 1)"],
    [".judul-besar .redup", "judul (redup)"],
    [".judul-halaman .badan.utama", "lead"],
    [".aksi", "tombol"],
];

const brw = await chromium.launch();
const page = await (await brw.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.route(ASAL + "/**", async (route) => {
    let rel = new URL(route.request().url()).pathname;
    if (rel.endsWith("/")) rel += "index.html";
    try {
        await route.fulfill({ body: await readFile(path.join(AKAR, rel)),
            contentType: TIPE[path.extname(rel)] || "application/octet-stream" });
    } catch { await route.fulfill({ status: 404, body: "x" }); }
});
await page.goto(ASAL + "/");
await page.waitForTimeout(2000);

let gagal = 0;
for (const posisi of [0, 380]) {
    await page.evaluate((y) => window.scrollTo(0, y), posisi);
    await page.waitForTimeout(600);

    const kotak = await page.evaluate((sel) => sel.map(([s, n]) => {
        const e = document.querySelector(s);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const bg = cs.backgroundColor;
        const legap = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) && !/, 0\.\d+\)$/.test(bg);
        return {
            n, x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height),
            warna: cs.color, px: parseFloat(cs.fontSize), tebal: parseInt(cs.fontWeight) || 400,
            latarSendiri: legap ? (bg.match(/\d+/g) || []).slice(0, 3).map(Number) : null,
        };
    }).filter(Boolean), SEL);

    await page.evaluate(() => { document.querySelector(".judul-halaman").style.visibility = "hidden"; });
    await page.waitForTimeout(250);
    const buf = await page.screenshot();
    await page.evaluate(() => { document.querySelector(".judul-halaman").style.visibility = ""; });

    const png = PNG.sync.read(buf);
    console.log(`\n── gulir ${posisi}px ──`);

    for (const k of kotak) {
        if (k.y < 0 || k.y + k.h > png.height || k.h < 2) { console.log(`  lewat  ${k.n} (di luar layar)`); continue; }
        let terang = [0, 0, 0], lmax = -1;
        for (let y = Math.max(0, k.y); y < Math.min(png.height, k.y + k.h); y += 2)
            for (let x = Math.max(0, k.x); x < Math.min(png.width, k.x + k.w); x += 2) {
                const i = (png.width * y + x) << 2;
                const l = L(png.data[i], png.data[i + 1], png.data[i + 2]);
                if (l > lmax) { lmax = l; terang = [png.data[i], png.data[i + 1], png.data[i + 2]]; }
            }
        if (k.latarSendiri) terang = k.latarSendiri;
        const fg = (k.warna.match(/\d+/g) || [255, 255, 255]).slice(0, 3).map(Number);
        const r = rasio(fg, terang);
        const besar = k.px >= 24 || (k.px >= 18.66 && k.tebal >= 700);
        const min = besar ? 3 : 4.5;
        const ok = r >= min;
        if (!ok) gagal++;
        console.log(`${ok ? "  ok  " : "GAGAL "} ${r.toFixed(2).padStart(6)}:1  ${k.n.padEnd(16)}` +
            ` latar rgb(${terang})  ${besar ? "besar" : "biasa"} min ${min}`);
    }
}

await brw.close();
console.log(gagal ? `\n${gagal} baris di bawah ambang` : "\nsemua baris hero lolos WCAG AA");
process.exit(gagal ? 1 : 0);
