import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.unfari.ac.id";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg",".avif":"image/avif" };
const brw = await chromium.launch();
const page = await (await brw.newContext({viewport:{width:1440,height:900}, deviceScaleFactor:2})).newPage();
page.on("pageerror", e => console.log("GALAT:", String(e).slice(0,150)));
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)]||"application/octet-stream" }); }
  catch { await route.fulfill({status:404, body:"x"}); }
});
const slug = process.env.SLUG || "";
await page.goto(ASAL+"/berita/?slug="+slug, { waitUntil:"networkidle" });
await page.waitForTimeout(2500);
console.log("body-bg:", await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
console.log("main-bg:", await page.evaluate(() => getComputedStyle(document.querySelector("main")).backgroundColor));
await page.screenshot({ path: "/tmp/berita-baru.png", fullPage: false });
await brw.close();
