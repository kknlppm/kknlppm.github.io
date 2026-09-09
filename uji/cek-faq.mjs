import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.unfari.ac.id";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg",".avif":"image/avif" };
const brw = await chromium.launch();
const page = await (await brw.newContext({viewport:{width:1440,height:900}})).newPage();
const galat=[]; page.on("pageerror", e=>galat.push(String(e).slice(0,140)));
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)]||"application/octet-stream" }); }
  catch { await route.fulfill({status:404, body:"x"}); }
});
await page.goto(ASAL+"/"); await page.waitForTimeout(1800);
const t0 = await page.locator(".acc__a").first().evaluate(e => Math.round(e.getBoundingClientRect().height));
await page.locator(".acc__q").first().click();
await page.waitForTimeout(600);
const t1 = await page.locator(".acc__a").first().evaluate(e => Math.round(e.getBoundingClientRect().height));
const aria = await page.locator(".acc__q").first().getAttribute("aria-expanded");
await page.locator(".acc__q").nth(1).click();
await page.waitForTimeout(600);
const t2 = await page.locator(".acc__a").first().evaluate(e => Math.round(e.getBoundingClientRect().height));
const ok = t0 === 0 && t1 > 40 && aria === "true" && t2 === 0 && !galat.length;
console.log(`${ok?"  ok  ":"GAGAL "} tanya jawab: tutup=${t0}px buka=${t1}px aria=${aria} tutup-lagi=${t2}px galat=${galat.length||"tidak ada"}`);
await brw.close();
process.exit(ok?0:1);
