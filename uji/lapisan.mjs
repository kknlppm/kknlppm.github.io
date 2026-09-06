// Kriteria penerimaan hero-depth.md #1: lapisan bergerak dengan laju yang
// TERLIHAT berbeda. Beberapa div yang bergerak bersama adalah satu bidang.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg" };
const brw = await chromium.launch();
const page = await (await brw.newContext({viewport:{width:1440,height:900}})).newPage();
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)]||"application/octet-stream" }); }
  catch { await route.fulfill({status:404, body:"x"}); }
});
await page.goto(ASAL+"/");
await page.waitForTimeout(1500);

const SEL = [[".lapis--jauh","punggung jauh"],[".adegan__kabut--belakang","kabut belakang"],
  [".lapis--tengah","punggung tengah"],[".judul-besar","JUDUL"],
  [".lapis--dekat","punggung dekat"],[".adegan__kabut--depan","kabut depan"],
  [".adegan__cahaya","cahaya fajar"]];
const baca = () => page.evaluate((sel) => Object.fromEntries(sel.map(([s,n]) => {
  const e = document.querySelector(s); return [n, e ? e.getBoundingClientRect().top : null]; })), SEL);

const a = await baca();
await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(700);
const b = await baca();
console.log("Perpindahan setelah gulir 500px (relatif viewport):\n");
const laju = [];
for (const [,n] of SEL) {
  if (a[n] == null) { console.log(`  ${n}: TIDAK ADA`); continue; }
  const d = b[n] - a[n];
  laju.push([n, d]);
  console.log(`  ${n.padEnd(18)} ${d >= 0 ? "+" : ""}${d.toFixed(1)}px`);
}
const nilai = laju.map(([,d]) => d);
const unik = new Set(nilai.map(v => v.toFixed(0)));
console.log(`\n${unik.size} laju berbeda dari ${nilai.length} bidang`);
const rentang = Math.max(...nilai) - Math.min(...nilai);
console.log(`rentang ${rentang.toFixed(1)}px`);
console.log(unik.size >= 4 && rentang > 60 ? "LULUS: bidangnya bergerak sendiri-sendiri" : "GAGAL: terlalu seragam, ini satu bidang");
await brw.close();
