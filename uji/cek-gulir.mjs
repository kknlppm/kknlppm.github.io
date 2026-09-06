// Cacatnya: begitu toolbar membungkus, HALAMAN ikut bergulir di samping
// tabelnya. Diuji di lebar yang membuat toolbar membungkus.
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
await page.goto(ASAL+"/login/");
await page.fill("#uname", process.env.KKN_UNAME); await page.fill("#password", process.env.KKN_SANDI);
await page.click("#tombolMasuk");
await page.waitForURL(u => !/\/login\/?$/.test(new URL(u).pathname), {timeout:20000});
let gagal = 0;
for (const [w,h] of [[1024,760],[820,900],[1440,700]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const hal of ["data-kkn","sertifikat","data-induk"]) {
    await page.goto(ASAL+"/"+hal+"/");
    await page.waitForFunction(() => document.querySelectorAll("#isiTabel tr").length > 1, null, {timeout:25000});
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({
      halamanGulir: document.documentElement.scrollHeight - window.innerHeight,
      kepalaSelaras: (() => {
        const k = document.querySelector(".kepala__isi"), u = document.querySelector("main");
        if (!k || !u) return true;
        return Math.abs(k.getBoundingClientRect().left - u.getBoundingClientRect().left) < 2;
      })(),
    }));
    const ok = m.halamanGulir <= 4 && m.kepalaSelaras;
    if (!ok) gagal++;
    console.log(`${ok?"  ok  ":"GAGAL "} ${String(w)}x${h} /${hal}/  gulir-halaman ${m.halamanGulir}px  kepala-selaras ${m.kepalaSelaras}`);
  }
}
await brw.close();
process.exit(gagal?1:0);
