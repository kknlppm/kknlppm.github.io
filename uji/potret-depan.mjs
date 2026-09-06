// Memotret halaman depan: berkas LOKAL disajikan di origin kknlppm.github.io
// supaya panggilan berita ke backend produksi lolos CORS.
import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const KELUAR = process.env.KELUAR || "/tmp/depan";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",
  ".png":"image/png",".svg":"image/svg+xml",".jpg":"image/jpeg",".ico":"image/x-icon",".webp":"image/webp" };
await mkdir(KELUAR, { recursive: true });
const brw = await chromium.launch();
const page = await (await brw.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 })).newPage();
const galat = [];
page.on("pageerror", e => galat.push(String(e).slice(0,160)));
page.on("console", m => { if (m.type()==="error") galat.push("console: "+m.text().slice(0,140)); });
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)),
        contentType: TIPE[path.extname(rel)] || "application/octet-stream" }); }
  catch { await route.fulfill({ status:404, body:"x" }); }
});
await page.goto(ASAL+"/", { waitUntil:"networkidle" });
await page.waitForTimeout(2500);
const H = await page.evaluate(() => document.body.scrollHeight);
const vh = 900;
console.log(`tinggi ${H}px = ${(H/vh).toFixed(1)} layar`);
console.log(await page.evaluate(() => [...document.querySelectorAll(".bab")]
  .map(b => `  ${b.dataset.bab.padEnd(7)} ${Math.round(b.getBoundingClientRect().height)}px  ground ${getComputedStyle(b).backgroundColor}`).join("\n")));
const n = Math.min(12, Math.ceil(H/vh));
for (let i = 0; i < n; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i*vh);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${KELUAR}/l${String(i).padStart(2,"0")}.png` });
}
await page.setViewportSize({ width:390, height:844 });
await page.evaluate(() => window.scrollTo(0,0));
await page.waitForTimeout(1000);
await page.screenshot({ path: `${KELUAR}/hp-0.png` });
console.log("galat:", galat.length ? galat.join("\n  ") : "tidak ada");
await brw.close();
