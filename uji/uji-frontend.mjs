// Kriteria Tahap C: halaman statis memanggil API dan menampilkan datanya,
// paginasi cocok, cakupan dibatasi peran, dan tidak ada innerHTML untuk data
// dari basis data.
import { chromium } from 'playwright';

const FE = 'http://localhost:5173';
const hasil = [];
let gagal = 0;
const uji = (nama, ok, ket = '') => { hasil.push([nama, ok, ket]); if (!ok) gagal++; };

const browser = await chromium.launch();

async function masuk(uname) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const galat = [];
  page.on('pageerror', e => galat.push(e.message));
  await page.goto(FE + '/login/', { waitUntil: 'networkidle' });
  await page.fill('#uname', uname);
  await page.fill('#password', 'ujilokal123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
    page.click('#tombolMasuk'),
  ]);
  return { ctx, page, galat };
}

// ── admin ──
{
  const { ctx, page, galat } = await masuk('uji.admin');
  uji('login admin -> /data-kkn/', page.url().includes('/data-kkn'), page.url().replace(FE, ''));
  await page.waitForTimeout(1500);

  const ringkas = await page.textContent('#ringkasan');
  uji('ringkasan menampilkan 1.778 peserta', /1\.778/.test(ringkas), ringkas);
  // Judul halaman harus menyebut sistemnya, bukan sekadar "Dashboard".
  uji('judul halaman menyebut Register KKN',
      (await page.textContent('h1, .judul-halaman')).includes('Register KKN'));

  const baris = await page.locator('#isiTabel tr').count();
  uji('tabel terisi 50 baris', baris === 50, String(baris));

  const posisi = await page.textContent('#posisiHalaman');
  uji('paginasi 36 halaman', /dari 36$/.test(posisi.trim()), posisi.trim());

  // Halaman berikutnya
  await page.click('#berikutnya');
  await page.waitForTimeout(1200);
  const posisi2 = await page.textContent('#posisiHalaman');
  uji('tombol berikutnya bekerja', /Halaman 2 /.test(posisi2), posisi2.trim());

  // Saringan tahun akademik. Tahun akademiknya cuma lima, jadi ditampilkan
  // sebagai segmen — bukan disembunyikan di dalam dropdown.
  await page.click('#segmenTahun button[data-nilai="2025-2026"]');
  await page.waitForTimeout(1500);
  const ringkas2 = await page.textContent('#ringkasan');
  uji('saringan tahun 2025-2026 -> 397', /^397/.test(ringkas2), ringkas2);
  uji('segmen terpilih ditandai aria-pressed', 'true' ===
      await page.getAttribute('#segmenTahun button[data-nilai="2025-2026"]', 'aria-pressed'));

  // Deret lima batang nilai — elemen tanda tangan halaman ini.
  const deret = await page.evaluate(() => {
    const d = document.querySelectorAll('#isiTabel .deret-nilai');
    if (!d.length) return null;
    const pertama = d[0].querySelectorAll('i');
    return {
      jumlahDeret: d.length,
      batangPerDeret: pertama.length,
      // Baris tanpa nilai harus menunjukkan lima batang KOSONG, bukan hilang.
      adaKosong: [...d].some(x => x.querySelectorAll('i[data-kosong="1"]').length === 5),
      adaTerisi: [...d].some(x => x.querySelectorAll('i:not([data-kosong])').length === 5),
    };
  });
  uji('setiap baris punya deret nilai', deret && deret.jumlahDeret > 0, String(deret && deret.jumlahDeret));
  uji('deretnya tepat lima batang', deret && deret.batangPerDeret === 5, String(deret && deret.batangPerDeret));
  uji('yang belum dinilai tampak kosong', !!(deret && deret.adaKosong));
  uji('yang sudah dinilai tampak terisi', !!(deret && deret.adaTerisi));

  uji('tidak ada galat JavaScript', galat.length === 0, galat.join(' | '));
  await ctx.close();
}

// ── mahasiswa: hanya dirinya ──
{
  const { ctx, page } = await masuk('uji.mhs');
  await page.waitForTimeout(1500);
  const ringkas = await page.textContent('#ringkasan');
  uji('mahasiswa melihat 11 keikutsertaan', /^11 /.test(ringkas), ringkas);
  const nim = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('#isiTabel tr td:first-child')].map(t => t.textContent))]);
  uji('mahasiswa hanya melihat 1 NIM', nim.length === 1, nim.join(','));
  await ctx.close();
}

// ── dosen: hanya bimbingannya ──
{
  const { ctx, page } = await masuk('uji.dosen');
  await page.waitForTimeout(1500);
  const ringkas = await page.textContent('#ringkasan');
  uji('dosen melihat 62 peserta bimbingan', /^62 /.test(ringkas), ringkas);
  await ctx.close();
}

// ── halaman terlindungi tanpa sesi ──
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(FE + '/data-kkn/', { waitUntil: 'networkidle' });
  uji('tanpa sesi dilempar ke /login/', page.url().includes('/login'), page.url().replace(FE, ''));
  await ctx.close();
}

// ── XSS: nama mahasiswa tidak boleh jadi HTML ──
{
  const { ctx, page } = await masuk('uji.admin');
  await page.waitForTimeout(1500);
  const bocor = await page.evaluate(() => {
    // Sisipkan nama berbahaya lewat jalur yang sama dengan data asli.
    const tbody = document.getElementById('isiTabel');
    const jahat = '<img src=x onerror="window.__XSS=1">';
    const tr = document.createElement('tr');
    tr.appendChild(UI.sel(jahat));
    tbody.appendChild(tr);
    return { adaImg: !!tbody.querySelector('img'), teks: tr.querySelector('td').textContent };
  });
  uji('UI.sel tidak menafsirkan HTML', !bocor.adaImg && bocor.teks.includes('<img'), bocor.teks.slice(0, 32));
  await ctx.close();
}

console.log('\n┌─ TAHAP C — IRISAN VERTIKAL ────────────────────────────────────');
for (const [n, ok, k] of hasil) console.log('│ ' + n.padEnd(38) + (ok ? 'OK   ' : 'GAGAL') + '  ' + k);
console.log('└────────────────────────────────────────────────────────────────');
console.log(gagal ? `\n✗ ${gagal} gagal` : '\n✓ semua lolos');
await browser.close();
process.exit(gagal ? 1 : 0);
