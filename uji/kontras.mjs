// Kontras diukur pada halaman TERKOMPOSIT, bukan dari token: lembar malam
// menutupi ground bab dengan warna bab sebelumnya, jadi warna yang
// sesungguhnya di belakang sebuah baris bukan yang tertulis di CSS-nya.
import { chromium } from "playwright";
const brw = await chromium.launch();
const page = await (await brw.newContext({ viewport:{width:1440,height:900} })).newPage();
await page.goto("http://localhost:4500/", { waitUntil:"networkidle" });
await page.waitForTimeout(1500);

const hasil = await page.evaluate(async () => {
  const L = (r,g,b) => { const f = (c)=>{c/=255; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4);};
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const rasio = (a,b) => { const l1=L(...a), l2=L(...b); return ((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)); };
  // color-mix() computed-nya BUKAN rgb(): ia oklab()/color(srgb ...), dan
  // regex angka di atasnya menghasilkan rasio miliaran yang terbaca lolos.
  // Kanvas dipakai supaya peramban sendiri yang menyelesaikan warnanya,
  // sekaligus mengomposit alfa di atas ground yang benar.
  const k = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  k.canvas.width = k.canvas.height = 1;
  const urai = (warna, atas) => {
    k.clearRect(0, 0, 1, 1);
    if (atas) { k.fillStyle = "rgb(" + atas.join(",") + ")"; k.fillRect(0, 0, 1, 1); }
    k.fillStyle = "#000";
    k.fillStyle = warna;
    if (k.fillStyle === "#000" && !/^#000|rgb\(0, 0, 0\)|black/.test(warna)) return null;
    k.fillRect(0, 0, 1, 1);
    const d = k.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  // Ground efektif: kumpulkan setiap latar dari elemen ke atas sampai
  // ketemu yang legap, lalu komposit dari yang paling belakang. Mengomposit
  // satu lapis tembus di atas PUTIH memberi ground yang salah, dan rasionya
  // ikut salah — itu yang membuat dua baris terbaca 2,23:1 padahal bukan.
  const ground = (el) => {
    const lapis = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) {
        lapis.push(bg);
        // legap? uji dengan mengomposit di atas dua dasar yang berlawanan
        const a = urai(bg, [0, 0, 0]);
        const b = urai(bg, [255, 255, 255]);
        if (a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) break;
      }
      n = n.parentElement;
    }
    let dasar = [255, 255, 255];
    for (let i = lapis.length - 1; i >= 0; i--) {
      const w = urai(lapis[i], dasar);
      if (w) dasar = w;
    }
    return dasar;
  };

  const sasaran = [
    [".judul-halaman__baris","eyebrow halaman judul"],
    [".judul-besar","judul besar"],
    [".judul-besar .redup","judul besar (redup)"],
    [".judul-halaman .badan.utama","lead"],
    [".bab--malam .prosa-lanjut .badan","prosa bab I"],
    [".bab--subuh .judul-bab","judul bab II"],
    [".bab--subuh .tahap h3","judul tahap"],
    [".bab--subuh .tahap .badan","badan tahap"],
    [".bab--subuh .medan-dicatat","medan dicatat"],
    [".bab--pagi .judul-bab","judul bab III"],
    [".bab--pagi .kerja .badan","badan bab III"],
    [".bab--pagi .rantai","rantai rajah"],
    [".bab--pagi .rajah__ket","keterangan rajah"],
    [".puncak__kalimat","kalimat puncak"],
    [".puncak__kalimat b","puncak (aksen)"],
    [".puncak__sumber","sumber puncak"],
    [".bab--siang .judul-bab","judul berita"],
    [".bab--siang .badan","badan berita"],
    [".berita-kosong","keadaan kosong berita"],
    [".bab--terang .judul-bab","judul bab V"],
    [".acc__q","pertanyaan FAQ"],
    [".kolofon__ajakan","ajakan kolofon"],
    [".kolofon__ajakan a","tautan masuk"],
    [".kolofon__data h4","kepala kolofon"],
    [".kolofon__bawah","kaki kolofon"],
    [".aksi","tombol masuk (teks)"],
  ];
  const out = [];
  for (const [sel, nama] of sasaran) {
    const el = document.querySelector(sel);
    if (!el) { out.push([nama, null, "TIDAK ADA"]); continue; }
    const cs = getComputedStyle(el);
    const bg = ground(el);
    const fg = urai(cs.color, bg);          // alfa dikomposit di atas groundnya
    if (!fg) { out.push([nama, null, "WARNA TAK TERBACA"]); continue; }
    const px = parseFloat(cs.fontSize);
    const tebal = parseInt(cs.fontWeight) || 400;
    const besar = px >= 24 || (px >= 18.66 && tebal >= 700);
    out.push([nama, +rasio(fg,bg).toFixed(2), besar ? "besar (min 3.0)" : "biasa (min 4.5)"]);
  }
  return out;
});
let gagal = 0;
for (const [nama, r, jenis] of hasil) {
  if (r == null) { console.log(`  ??    ${nama}  ${jenis}`); continue; }
  const min = jenis.startsWith("besar") ? 3.0 : 4.5;
  const ok = r >= min;
  if (!ok) gagal++;
  console.log(`${ok ? "  ok  " : "GAGAL "} ${String(r).padStart(6)}:1  ${nama.padEnd(28)} ${jenis}`);
}
console.log(gagal ? `\n${gagal} baris di bawah ambang` : "\nsemua lolos WCAG AA");
await brw.close();
process.exit(gagal ? 1 : 0);
