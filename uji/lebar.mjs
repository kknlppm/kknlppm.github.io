import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".jpg":"image/jpeg",".avif":"image/avif" };
const brw = await chromium.launch();
const ctx = await brw.newContext({ viewport:{width:1366,height:768} });
const page = await ctx.newPage();
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
for (const w of [1024, 1180, 1280, 1366, 1440]) {
  await page.setViewportSize({ width: w, height: 800 });
  await page.goto(ASAL+"/data-induk/?entitas=peserta");
  await page.waitForFunction(() => document.querySelectorAll("#isiTabel tr").length > 1, null, {timeout:25000});
  const m = await page.evaluate(() => {
    const th = [...document.querySelectorAll("thead th")];
    const nama = th.find(t => t.textContent.trim() === "Nama");
    const cs = getComputedStyle(nama);
    return Math.round(nama.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
  });
  const ok = m >= 140;
  if (!ok) gagal++;
  console.log(`${ok ? "  ok  " : "GAGAL "} ${String(w).padStart(4)}px  kolom Nama ${String(m).padStart(4)}px teks (min 140)`);
}
await brw.close();
process.exit(gagal ? 1 : 0);
