import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg",".avif":"image/avif" };
const brw = await chromium.launch();
const page = await (await brw.newContext({viewport:{width:1440,height:900}})).newPage();
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)), contentType: TIPE[path.extname(rel)]||"application/octet-stream" }); }
  catch { await route.fulfill({status:404, body:"x"}); }
});
await page.goto(ASAL+"/"); await page.waitForTimeout(1600);
console.log(await page.evaluate(() => [...document.querySelectorAll(".pita-lanskap")].map(p => {
  const r = p.getBoundingClientRect(); const img = p.querySelector("img"); const ri = img.getBoundingClientRect();
  return `${p.className.split(" ")[1]}  wadah ${Math.round(r.left)}..${Math.round(r.right)} (jendela ${innerWidth})  gambar ${Math.round(ri.left)}..${Math.round(ri.right)} lebar ${Math.round(ri.width)}  natural ${img.naturalWidth}x${img.naturalHeight}`;
}).join("\n")));
await brw.close();
