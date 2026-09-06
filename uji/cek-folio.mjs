import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg",".avif":"image/avif" };
const brw = await chromium.launch();
for (const [w,h,nama] of [[1440,900,"desktop"],[390,844,"ponsel"]]) {
  const page = await (await brw.newContext({viewport:{width:w,height:h}, deviceScaleFactor:2})).newPage();
  const galat=[]; page.on("pageerror", e=>galat.push(String(e).slice(0,120)));
  await page.route(ASAL+"/**", async route => {
    let rel = new URL(route.request().url()).pathname;
    if (rel.endsWith("/")) rel += "index.html";
    try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)]||"application/octet-stream" }); }
    catch { await route.fulfill({status:404, body:"x"}); }
  });
  await page.goto(ASAL+"/"); await page.waitForTimeout(1800);
  const tampak = await page.locator("#folioBab").isVisible();
  await page.locator("#folioBab").click();
  await page.waitForTimeout(400);
  const buka = await page.locator("#daftarBab").isVisible();
  const jml = await page.locator("#daftarBab a").count();
  await page.screenshot({ path: `/tmp/folio-${nama}.png` });
  await page.locator('#daftarBab a[data-ke="tahapan"]').click();
  await page.waitForTimeout(900);
  const lompat = await page.evaluate(() => Math.round(document.getElementById("tahapan").getBoundingClientRect().top));
  const tutup = await page.locator("#daftarBab").isHidden();
  console.log(`${nama.padEnd(8)} tombol=${tampak} daftar=${buka} tautan=${jml} lompat-ke-tahapan=${lompat}px tertutup-lagi=${tutup} galat=${galat.length||"tidak ada"}`);
  await page.close();
}
await brw.close();
