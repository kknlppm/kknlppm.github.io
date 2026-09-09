// Sapuan setiap halaman sebagai admin terhadap backend PRODUKSI.
// Read-only: tidak menyimpan, tidak menghapus, tidak menerbitkan apa pun.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const AKAR = path.resolve(import.meta.dirname, "..");
const ASAL = "https://kknlppm.unfari.ac.id";
const TIPE = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",
  ".png":"image/png",".svg":"image/svg+xml",".jpg":"image/jpeg",".ico":"image/x-icon",".webp":"image/webp" };
const brw = await chromium.launch();
const page = await (await brw.newContext()).newPage();
await page.route(ASAL+"/**", async route => {
  let rel = new URL(route.request().url()).pathname;
  if (rel.endsWith("/")) rel += "index.html";
  try { await route.fulfill({ body: await readFile(path.join(AKAR, rel)),
        contentType: TIPE[path.extname(rel)] || "application/octet-stream" }); }
  catch { await route.fulfill({ status:404, body:"x" }); }
});
await page.goto(ASAL+"/login/");
await page.fill("#uname", process.env.KKN_UNAME); await page.fill("#password", process.env.KKN_SANDI);
await page.click("#tombolMasuk");
await page.waitForURL(u => !/\/login\/?$/.test(new URL(u).pathname), { timeout:20000 });

const HAL = ["pendaftaran","pembayaran","saya","data-induk","kelompok","penilaian","nilai-matkul","sertifikat","kelola-berita","pengaturan","akun","berita"];
let buruk = 0;
for (const h of HAL) {
  const galat = [], apiGagal = [];
  const onErr = e => galat.push(String(e).slice(0,120));
  const onRes = r => { if (r.url().includes("cloudfunctions") && r.status() >= 400) apiGagal.push(r.status()+" "+r.url().replace(/.*kkn-gocroot/,"").split("?")[0]); };
  page.on("pageerror", onErr); page.on("response", onRes);
  await page.goto(ASAL+"/"+h+"/");
  await page.waitForTimeout(3500);
  const isiAda = await page.evaluate(() => {
    const t = document.querySelectorAll("#isiTabel tr, .kartu, form, select, input").length;
    const p = document.getElementById("pesan");
    return { unsur: t, pesan: p && !p.hidden ? p.textContent.trim().slice(0,80) : "" };
  });
  page.off("pageerror", onErr); page.off("response", onRes);
  const ok = galat.length === 0 && apiGagal.length === 0 && isiAda.unsur > 0 && !isiAda.pesan;
  if (!ok) buruk++;
  console.log(`${ok ? "  ok  " : "PERIKSA"} /${h}/  unsur=${isiAda.unsur}` +
    (isiAda.pesan ? `  pesan="${isiAda.pesan}"` : "") +
    (apiGagal.length ? `  API=${apiGagal.join(", ")}` : "") +
    (galat.length ? `  GALAT=${galat.join(" | ")}` : ""));
}
await brw.close();
console.log(buruk ? `\n${buruk} halaman perlu diperiksa` : "\nsemua halaman bersih");
process.exit(buruk ? 1 : 0);
