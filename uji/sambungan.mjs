// Memotret SAMBUNGAN: layar terakhir halaman depan, lalu halaman masuk.
// Di situlah beda keduanya paling terasa, karena terjadi dalam satu klik.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.unfari.ac.id";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg",".webp":"image/webp" };
const brw = await chromium.launch();
const page = await (await brw.newContext({viewport:{width:1440,height:900}, deviceScaleFactor:2})).newPage();
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)]||"application/octet-stream" }); }
  catch { await route.fulfill({status:404, body:"x"}); }
});
await page.goto(ASAL+"/");
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
await page.screenshot({ path: "/tmp/sambung-1-depan.png" });
await page.goto(ASAL+"/login/");
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/sambung-2-masuk.png" });
console.log(await page.evaluate(() => {
  const b = getComputedStyle(document.body);
  const kartu = document.querySelector("form")?.closest("div");
  return "login  body-bg=" + b.backgroundColor + "  font=" + b.fontFamily.split(",")[0] +
    (kartu ? "\n       kartu radius=" + getComputedStyle(kartu).borderRadius + " shadow=" + getComputedStyle(kartu).boxShadow.slice(0,60) : "");
}));
await brw.close();
