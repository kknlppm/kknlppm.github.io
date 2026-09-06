import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg",".avif":"image/avif" };
const brw = await chromium.launch();
let gagal = 0;
for (const [w,h,nama] of [[1440,900,"desktop"],[390,844,"ponsel"]]) {
  const page = await (await brw.newContext({viewport:{width:w,height:h}, deviceScaleFactor:2})).newPage();
  const galat=[]; page.on("pageerror", e=>galat.push(String(e).slice(0,140)));
  await page.route(ASAL+"/**", async route => {
    let rel = new URL(route.request().url()).pathname;
    if (rel.endsWith("/")) rel += "index.html";
    try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)]||"application/octet-stream" }); }
    catch { await route.fulfill({status:404, body:"x"}); }
  });
  await page.goto(ASAL+"/"); await page.waitForTimeout(1800);
  if (nama === "ponsel") {
    await page.click("#burger"); await page.waitForTimeout(350);
  }
  const n = await page.locator(nama === "ponsel" ? "#menuPonsel a" : ".bilah__tautan a").count();
  const masukTampak = await page.locator(nama === "ponsel" ? ".bilah__ponsel-masuk" : ".bilah__masuk").isVisible();
  await page.locator(nama === "ponsel" ? '#menuPonsel a[href="#tahapan"]' : '.bilah__tautan a[href="#tahapan"]').click();
  await page.waitForTimeout(900);
  const lompat = await page.evaluate(() => Math.round(document.getElementById("tahapan").getBoundingClientRect().top));
  // istilah internal tidak boleh muncul di antarmuka
  const teks = await page.locator("body").innerText();
  const bocor = ["Malam","Subuh","Pagi","Siang","Terang"].filter(k => new RegExp("\\\\b"+k+"\\\\b").test(teks));
  await page.screenshot({ path: `/tmp/bilah-${nama}.png` });
  const ok = n >= 5 && masukTampak && Math.abs(lompat) < 4 && bocor.length === 0 && galat.length === 0;
  if (!ok) gagal++;
  console.log(`${ok?"  ok  ":"GAGAL "} ${nama.padEnd(8)} tautan=${n} masuk=${masukTampak} lompat=${lompat}px istilah-internal=${bocor.join(",")||"tidak ada"} galat=${galat.length||"tidak ada"}`);
  if (galat.length) console.log("   ", [...new Set(galat)].slice(0,3).join("\n    "));
  await page.close();
}
await brw.close();
process.exit(gagal?1:0);
