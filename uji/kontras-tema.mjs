// Kontras WCAG AA di KEDUA tema, diukur pada halaman terkomposit.
//
// Palet gelap tidak diturunkan dengan rumus dari palet terang; ia diukur di
// sini, dan yang gagal diubah di input.css, bukan di uji ini. Berjalan tanpa
// server: berkas lokal disajikan di origin produksi lewat page.route, dan API
// dijawab mock secukupnya supaya tabel, penanda status, dan tombol tergambar.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";

const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const API = "https://asia-southeast2-kkn-unfari.cloudfunctions.net";
const TIPE = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png",
    ".svg": "image/svg+xml", ".ico": "image/x-icon", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif" };

const PESERTA = Array.from({ length: 4 }, (_, i) => ({
    id: "p-" + i, nim: "2190000" + i, name: "Nama " + i, prodi: "Farmasi", kelompok: "20", tahun_ajaran: "2025-2026",
    judul_kkn: "", ketua: false, status_bayar: i % 3, ket: "", nilai_h: 80, nilai_s: 80, nilai_l: 80, nilai_qp: 80, nilai_ql: 80,
    nilai: i % 2 ? 0 : 88, huruf: i % 2 ? "" : "A", has_cert: i === 0,
}));
function jawab(p) {
    const meta = (n) => ({ total: n, page: 1, total_pages: 1 });
    if (p === "/auth/me") return { status: "ok", data: { id: "u-1", uname: "admin", name: "Admin", role: 1, role_name: "admin" } };
    if (p === "/api/settings") return { status: "ok", data: { pengaturan: { KOTA: "BANDUNG", JUDUL_KKN: "Judul", NAMA_KEGIATAN: "KKN", TA: "2025-2026", NAMA_REKTOR: "R", NIK_NIP_REKTOR: "1", NAMA_LPPM: "L", NIK_NIP_LPPM: "2" }, ttd: { rektor: { sumber: "bawaan" }, lppm: { sumber: "unggahan", oleh: "admin", updated_at: "2026-09-07T01:00:00Z", lebar: 300, tinggi: 208, ukuran: 43233 } } } };
    if (p === "/api/academic-years") return { data: ["2025-2026", "2024-2025"], meta: meta(2) };
    if (p === "/api/groups") return { data: [{ id: "g-1", kelompok: "20", lokasi: "Desa", nama_dosen: "Dosen", nidn: "", tahun_ajaran: "2025-2026", jumlah_anggota: 10, jumlah_dinilai: 4 }, { id: "g-2", kelompok: "21", lokasi: "Desa", nama_dosen: "", nidn: "", tahun_ajaran: "2025-2026", jumlah_anggota: 9, jumlah_dinilai: 9 }], meta: meta(2) };
    if (p === "/api/participations") return { data: PESERTA, meta: meta(4) };
    if (p === "/api/news") return { data: [{ id: "n-1", slug: "s", judul: "Berita", status: "terbit", terbit: true }, { id: "n-2", slug: "t", judul: "Draf", status: "draf" }], meta: meta(2) };
    return { status: "ok", data: {}, meta: meta(0) };
}

// [halaman, [selektor, nama, jenis]] — jenis: "teks" (4.5 / 3 besar) atau
// "batas" (3:1, border terhadap latar kendalinya).
const SASARAN = {
    "/login/": [
        [".eyebrow", "eyebrow masuk"], ["h1.judul-halaman", "judul masuk"], ["p.text-tinta-redup", "keterangan"],
        ["label.text-sm", "label medan"], [".medan", "isi medan", "teks"], [".medan", "batas medan", "batas"],
        [".tombol-utama", "tombol masuk"], ["a.text-bata", "tautan verifikasi"], ["p.text-xs.text-tinta-redup", "catatan kaki"],
    ],
    "/data-induk/?entitas=peserta": [
        [".sisi__tautan", "tautan sidebar"], ['.sisi__tautan[aria-current="page"]', "sidebar aktif"], [".sisi__bagian", "judul bagian sidebar"],
        [".sisi__tema-tombol", "sakelar tema"], ['.sisi__tema-tombol[aria-pressed="true"]', "sakelar tema aktif"],
        [".kepala .judul-halaman", "judul halaman"], [".kepala .eyebrow", "eyebrow halaman"],
        [".segmen > button", "segmen"], ['.segmen > button[aria-pressed="true"]', "segmen aktif"], [".segmen", "batas segmen", "batas"],
        ["#ringkasan", "cacah"], [".register thead th", "kepala tabel"], [".register tbody td", "sel tabel"], [".kode", "kode"],
        [".tanda.is-belum", "penanda belum"], [".tanda.is-kosong", "penanda kosong"], [".huruf-mutu", "huruf mutu"],
        ["#posisiHalaman", "posisi halaman"], [".tombol-halus", "tombol halus"], [".tombol-halus", "batas tombol halus", "batas"],
    ],
    "/kelompok/": [[".tautan-aksi", "tautan ubah"], [".tautan-aksi--bahaya", "tautan hapus"], [".tombol-utama", "tombol utama"], [".tanda.is-belum", "belum ada DPL"]],
    "/kelola-berita/": [[".tanda.is-sah", "penanda terbit"], [".tanda.is-kosong", "penanda draf"]],
    "/penilaian/": [[".kartu-kelompok .font-medium", "nama kelompok"], [".kartu-kelompok .text-tinta-redup", "lokasi kartu"], [".kartu-kelompok .text-tinta-samar", "dosen kartu"], ["select.medan", "dropdown", "teks"]],
    "/pengaturan/": [[".kertas-cetak .text-bata", "pratinjau: judul (kertas)"], [".kertas-cetak .text-tinta-samar", "pratinjau: label (kertas)"], ['[data-peran="keterangan"]', "keterangan ttd"], [".tanda.is-sah", "status unggahan"], ["textarea.medan", "isi textarea", "teks"], ["textarea.medan", "batas textarea", "batas"]],
};

const brw = await chromium.launch();
let gagal = 0;
for (const tema of ["terang", "gelap"]) {
    const ctx = await brw.newContext({ viewport: { width: 1440, height: 900 } });
    // Token dipasang untuk semua halaman KECUALI masuk: halaman masuk
    // mengalihkan pengguna yang sudah bersesi, dan yang terukur jadi
    // halaman lain.
    await ctx.addInitScript((t) => {
        localStorage.setItem("kkn_tema", t);
        if (!/\/login\//.test(location.pathname)) {
            localStorage.setItem("kkn_token", "token-uji");
            localStorage.setItem("kkn_user", JSON.stringify({ id: "u-1", uname: "admin", name: "Admin", role: 1, role_name: "admin" }));
        } else {
            localStorage.removeItem("kkn_token"); localStorage.removeItem("kkn_user");
        }
    }, tema);
    const page = await ctx.newPage();
    await page.route(ASAL + "/**", async (route) => {
        let rel = new URL(route.request().url()).pathname;
        if (rel.endsWith("/")) rel += "index.html";
        try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)] || "application/octet-stream" }); }
        catch { await route.fulfill({ status: 404, body: "x" }); }
    });
    await page.route(API + "/**", (route) => {
        const p = new URL(route.request().url()).pathname.replace(/^\/kkn-gocroot/, "");
        if (/\/settings\/ttd\//.test(p)) return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") });
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(jawab(p)) });
    });

    console.log(`\n══ tema ${tema} ══`);
    for (const [hal, daftar] of Object.entries(SASARAN)) {
        await page.goto(ASAL + hal, { waitUntil: "networkidle" });
        await page.waitForTimeout(700);
        const t = await page.evaluate(() => document.documentElement.dataset.tema);
        if (t !== tema) { console.log(`GAGAL  ${hal}: data-tema=${t}`); gagal++; continue; }

        const hasil = await page.evaluate((daftar) => {
            const L = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
            const rasio = (a, b) => { const l1 = L(...a), l2 = L(...b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
            const k = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); k.canvas.width = k.canvas.height = 1;
            const urai = (w, atas) => { k.clearRect(0, 0, 1, 1); if (atas) { k.fillStyle = "rgb(" + atas.join(",") + ")"; k.fillRect(0, 0, 1, 1); } k.fillStyle = w; k.fillRect(0, 0, 1, 1); const d = k.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
            const legap = (bg) => { const a = urai(bg, [0, 0, 0]), b = urai(bg, [255, 255, 255]); return a.join() === b.join(); };
            const ground = (el, lewati) => {
                const lapis = []; let n = lewati ? el.parentElement : el;
                while (n && n !== document.documentElement) {
                    const bg = getComputedStyle(n).backgroundColor;
                    if (bg && !/rgba\(0, 0, 0, 0\)/.test(bg)) { lapis.push(bg); if (legap(bg)) break; }
                    n = n.parentElement;
                }
                let dasar = urai(getComputedStyle(document.body).backgroundColor || "#fff");
                for (let i = lapis.length - 1; i >= 0; i--) dasar = urai(lapis[i], dasar);
                return dasar;
            };
            return daftar.map(([sel, nama, jenis]) => {
                const el = document.querySelector(sel);
                if (!el) return [nama, null, "TIDAK ADA"];
                const cs = getComputedStyle(el);
                if (jenis === "batas") {
                    const bg = ground(el, true);                 // latar DI SEKITAR kendalinya
                    const b = urai(cs.borderTopColor, bg);
                    return [nama, +rasio(b, bg).toFixed(2), "batas (min 3.0)"];
                }
                const bg = ground(el);
                const fg = urai(cs.color, bg);
                const px = parseFloat(cs.fontSize), tebal = parseInt(cs.fontWeight) || 400;
                const besar = px >= 24 || (px >= 18.66 && tebal >= 700);
                return [nama, +rasio(fg, bg).toFixed(2), besar ? "besar (min 3.0)" : "biasa (min 4.5)"];
            });
        }, daftar);

        for (const [nama, r, jenis] of hasil) {
            if (r == null) { console.log(`  ??    ${hal.padEnd(16)} ${nama}  ${jenis}`); continue; }
            const min = jenis.startsWith("biasa") ? 4.5 : 3.0;
            const ok = r >= min; if (!ok) gagal++;
            console.log(`${ok ? "  ok  " : "GAGAL "} ${String(r).padStart(6)}:1  ${hal.padEnd(16)} ${nama.padEnd(28)} ${jenis}`);
        }
    }
    await ctx.close();
}
await brw.close();
console.log(gagal ? `\n${gagal} baris di bawah ambang` : "\nsemua lolos WCAG AA di kedua tema");
process.exit(gagal ? 1 : 0);
