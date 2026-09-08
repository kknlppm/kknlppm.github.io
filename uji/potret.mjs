// Memotret halaman admin terhadap backend PRODUKSI, berkas frontend LOKAL.
// Untuk menilai tampilan dengan mata, bukan menebak dari kode.
//
//   KKN_UNAME=… KKN_SANDI=… [HAL=pendaftaran,penilaian] [KELUAR=/tmp/potret] node potret.mjs
import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.github.io";
const KELUAR = process.env.KELUAR || "/tmp/potret";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",
  ".png":"image/png",".svg":"image/svg+xml",".jpg":"image/jpeg",".ico":"image/x-icon",".webp":"image/webp" };
await mkdir(KELUAR, { recursive: true });
const brw = await chromium.launch();
const page = await (await brw.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 })).newPage();
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)),
        contentType: TIPE[path.extname(rel)] || "application/octet-stream" }); }
  catch { await route.fulfill({ status:404, body:"x" }); }
});
await page.goto(ASAL+"/login/");
await page.fill("#uname", process.env.KKN_UNAME);
await page.fill("#password", process.env.KKN_SANDI);
await page.click("#tombolMasuk");
await page.waitForURL(u => !/\/login\/?$/.test(new URL(u).pathname), { timeout:20000 });
const HAL = (process.env.HAL || "pendaftaran,pembayaran,saya,data-induk,sertifikat,kelompok,penilaian,kelola-berita,pengaturan,akun").split(",");
for (const h of HAL) {
  await page.goto(ASAL+"/"+h+"/");
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${KELUAR}/${h}.png` });
  console.log("potret", h);
}
if (process.env.HP !== "0") {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const h of HAL.slice(0, 3)) {
    await page.goto(ASAL+"/"+h+"/");
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${KELUAR}/hp-${h}.png` });
    console.log("potret hp", h);
  }
}
await brw.close();
