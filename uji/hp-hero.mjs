import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg" };
const brw = await chromium.launch();
const page = await (await brw.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2})).newPage();
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)]||"application/octet-stream" }); }
  catch { await route.fulfill({status:404, body:"x"}); }
});
await page.goto(ASAL+"/");
await page.waitForTimeout(1500);
for (const [y, nama] of [[0,"hp-0"],[420,"hp-420"]]) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/lapis5/${nama}.png` });
  const z = await page.evaluate(() => {
    const j = document.querySelector(".judul-halaman"), d = document.querySelector(".adegan--depan");
    return { judul: getComputedStyle(j).zIndex, depan: getComputedStyle(d).zIndex,
             badanLuber: document.body.scrollWidth > window.innerWidth };
  });
  console.log(nama, "z judul", z.judul, "> z adegan depan", z.depan, z.judul > z.depan ? "OK" : "GAGAL", "| badan meluber:", z.badanLuber);
}
await brw.close();
