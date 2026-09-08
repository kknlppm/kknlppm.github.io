// Lantai mutu: tanggap sampai ponsel, fokus papan ketik terlihat, gerak
// dihormati, kontras cukup. Diuji, bukan diklaim.
import { chromium } from 'playwright';
const FE = 'http://localhost:5173';
const hasil = []; let gagal = 0;
const uji = (n, ok, k='') => { hasil.push([n, ok, k]); if (!ok) gagal++; };
const b = await chromium.launch();

async function masuk(ctx) {
  const p = await ctx.newPage();
  await p.goto(FE + '/login/', { waitUntil: 'networkidle' });
  await p.fill('#uname', 'uji.admin'); await p.fill('#password', 'ujilokal123');
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }).catch(()=>{}), p.click('#tombolMasuk')]);
  await p.waitForTimeout(1400);
  return p;
}

// ── ponsel 390px ──
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await masuk(ctx);
  const geser = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  uji('390px: badan halaman tidak menggeser mendatar', !geser);
  const tabelMuat = await p.evaluate(() => !!document.querySelector('#isiTabel tr td'));
  uji('390px: register tetap terisi', tabelMuat);
  // Kolom sekunder harus tersembunyi di layar sempit.
  const tampak = await p.evaluate(() =>
    [...document.querySelectorAll('.register thead th')].filter(t => t.offsetParent !== null).length);
  uji('390px: kolom dipangkas', tampak < 9, tampak + ' dari 9');
  await p.screenshot({ path: '/tmp/kkn-ponsel.png' });
  await ctx.close();
}

// ── Pengaturan di ponsel: dua kolom harus melipat ──
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await masuk(ctx);
  await p.goto(FE + '/pengaturan/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const geser = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  uji('390px: pengaturan tidak menggeser mendatar', !geser);
  // Pratinjau duduk di kolom kedua pada layar lebar; di ponsel ia harus
  // turun ke bawah formulir, bukan berdesakan di sampingnya.
  const menumpuk = await p.evaluate(() => {
    const form = document.querySelector('#formPengaturan > div');
    const sisi = document.querySelector('#formPengaturan > aside');
    if (!form || !sisi) return false;
    return sisi.getBoundingClientRect().top >= form.getBoundingClientRect().bottom - 1;
  });
  uji('390px: pratinjau turun ke bawah formulir', menumpuk);
  await ctx.close();
}

// ── fokus papan ketik ──
{
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto(FE + '/login/', { waitUntil: 'networkidle' });
  const adaGaris = await p.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const g = getComputedStyle(el);
    return g.outlineStyle !== 'none' && parseFloat(g.outlineWidth) >= 2;
  });
  uji('fokus papan ketik terlihat', adaGaris);

  // Seluruh form harus bisa diisi tanpa tetikus. #uname sudah ter-autofocus,
  // jadi pengetikan langsung dimulai dari sana.
  await p.evaluate(() => document.getElementById('uname').focus());
  await p.keyboard.type('uji.admin');
  await p.keyboard.press('Tab');
  await p.keyboard.type('ujilokal123');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1800);
  uji('masuk sepenuhnya lewat papan ketik', p.url().includes('/pendaftaran'), p.url().replace(FE, ''));
  await ctx.close();
}

// ── gerak dihormati ──
{
  const ctx = await b.newContext({ reducedMotion: 'reduce' });
  const p = await masuk(ctx);
  const beranimasi = await p.evaluate(() => {
    const i = document.querySelector('#isiTabel .deret-nilai i');
    return i ? getComputedStyle(i).animationName : 'none';
  });
  uji('prefers-reduced-motion dihormati', beranimasi === 'none', beranimasi);
  await ctx.close();
}

// ── kontras teks utama ──
{
  const ctx = await b.newContext();
  const p = await masuk(ctx);
  const kontras = await p.evaluate(() => {
    function lum(c) {
      const [r,g,bl] = c.match(/\d+/g).slice(0,3).map(Number).map(v => {
        v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
      });
      return 0.2126*r + 0.7152*g + 0.0722*bl;
    }
    // Latar belakang diambil dari leluhur terdekat yang benar-benar
    // berwarna — bukan dari body. Sel tabel duduk di atas kartu putih,
    // dan mengukurnya terhadap latar halaman memberi angka yang salah.
    function latarNyata(el) {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      }
      return 'rgb(255,255,255)';
    }
    let terburuk = 99;
    document.querySelectorAll('#isiTabel td, .register thead th, #ringkasan, #posisiHalaman')
      .forEach(el => {
        if (!el.textContent.trim()) return;
        const g = getComputedStyle(el);
        const l1 = lum(g.color), l2 = lum(latarNyata(el));
        const k = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
        if (k < terburuk) terburuk = k;
      });
    return Math.round(terburuk * 10) / 10;
  });
  uji('kontras terburuk di register >= 4.5', kontras >= 4.5, String(kontras));
  await ctx.close();
}

console.log('\n┌─ LANTAI MUTU ────────────────────────────────────────────');
for (const [n, ok, k] of hasil) console.log('│ ' + n.padEnd(40) + (ok ? 'OK' : 'GAGAL') + '  ' + k);
console.log('└──────────────────────────────────────────────────────────');
console.log(gagal ? '✗ ' + gagal + ' gagal' : '✓ semua lolos');
await b.close();
process.exit(gagal ? 1 : 0);
