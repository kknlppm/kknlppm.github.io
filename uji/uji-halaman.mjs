// Halaman kerja: navigasi per peran, kelompok, penilaian, sertifikat, data induk.
//
// Yang diuji bukan "halamannya terbuka", melainkan tindakan yang benar-benar
// MENGUBAH data, dan penolakan yang seharusnya.
import { chromium } from 'playwright';

const FE = 'http://localhost:5173';
const hasil = []; let gagal = 0;
const uji = (n, ok, k = '') => { hasil.push([n, ok, k]); if (!ok) gagal++; };

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
  await page.waitForTimeout(900);
  return { ctx, page, galat };
}
const tautanNav = p => p.$$eval('nav[aria-label="Bagian"] a', a => a.map(x => x.textContent.trim()));

// ── navigasi mengikuti peran ──
{
  const harap = {
    'uji.admin':    ['Register', 'Kelompok', 'Penilaian', 'Sertifikat', 'Data induk', 'Pengaturan'],
    'uji.fakultas': ['Register', 'Kelompok', 'Data induk'],
    'uji.dosen':    ['Register', 'Penilaian'],
    'uji.lppm':     ['Register', 'Sertifikat'],
    'uji.bayar':    [],   // satu tujuan saja -> navigasinya tidak digambar
    'uji.mhs':      [],
  };
  for (const [u, mau] of Object.entries(harap)) {
    const { ctx, page } = await masuk(u);
    const ada = await tautanNav(page);
    uji('nav ' + u, JSON.stringify(ada) === JSON.stringify(mau), ada.join(', ') || '(tidak ada)');
    await ctx.close();
  }
}

// ── admin: kelompok, penilaian, sertifikat, data induk ──
{
  const { ctx, page, galat } = await masuk('uji.admin');
  const tanda = 'UJI-' + Date.now();

  // KELOMPOK: tambah -> muncul -> hapus
  await page.goto(FE + '/kelompok/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('#tombolTambah');
  await page.waitForTimeout(400);
  const fokusDiLaci = await page.evaluate(() =>
    document.getElementById('laci').contains(document.activeElement));
  uji('laci memindahkan fokus ke dalam', fokusDiLaci);

  await page.fill('#fKelompok', tanda);
  await page.fill('#fTahun', '2025-2026');
  await page.fill('#fLokasi', 'Desa Uji');
  await page.click('#tombolSimpan');
  await page.waitForTimeout(1400);
  uji('kelompok tersimpan', (await page.textContent('#isiTabel')).includes(tanda));

  // Escape harus menutup laci.
  await page.click('#tombolTambah');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  uji('Escape menutup laci', await page.$eval('#laci', e => e.hidden));

  // Tolak tahun akademik yang salah bentuk.
  await page.click('#tombolTambah');
  await page.waitForTimeout(300);
  await page.fill('#fKelompok', 'Uji Tahun Salah');
  await page.fill('#fTahun', '2025');
  await page.click('#tombolSimpan');
  await page.waitForTimeout(900);
  const pl = await page.$eval('#pesanLaci', e => ({ tampil: !e.hidden, teks: e.textContent }));
  uji('tahun akademik salah bentuk ditolak', pl.tampil && /2025-2026/.test(pl.teks), pl.teks.slice(0, 40));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Hapus yang barusan dibuat.
  page.on('dialog', d => d.accept());
  const dihapus = await page.evaluate((t) => {
    const tr = [...document.querySelectorAll('#isiTabel tr')].find(r => r.textContent.includes(t));
    if (!tr) return false;
    [...tr.querySelectorAll('button')].find(b => b.textContent === 'Hapus').click();
    return true;
  }, tanda);
  await page.waitForTimeout(1400);
  uji('kelompok terhapus', dihapus && !(await page.textContent('#isiTabel')).includes(tanda));

  // Kelompok yang masih berisi peserta harus DITOLAK.
  await page.evaluate(() => {
    const tr = document.querySelector('#isiTabel tr');
    [...tr.querySelectorAll('button')].find(b => b.textContent === 'Hapus').click();
  });
  await page.waitForTimeout(1200);
  const p1 = await page.$eval('#pesan', e => ({ tampil: !e.hidden, teks: e.textContent }));
  uji('kelompok berisi peserta ditolak', p1.tampil && /masih dipakai/.test(p1.teks), p1.teks.slice(0, 46));

  // PENILAIAN: ubah satu aspek, nilai akhir ikut berubah.
  await page.goto(FE + '/penilaian/', { waitUntil: 'networkidle' });
  await page.selectOption('#pilihTahun', '2021-2022');
  await page.waitForFunction(() => document.querySelectorAll('#pilihKelompok option').length > 1, { timeout: 15000 });
  const kel = await page.$$eval('#pilihKelompok option', o => o.map(x => x.value).filter(Boolean));
  let adaKotak = false;
  for (const v of kel) {
    await page.selectOption('#pilihKelompok', v);
    await page.waitForTimeout(800);
    if (await page.$$eval('#isiTabel .kotak-nilai', e => e.length) > 0) { adaKotak = true; break; }
  }
  uji('penilaian memuat kotak nilai', adaKotak);

  if (adaKotak) {
    const sebelum = await page.$eval('#isiTabel tr td:last-child', e => e.textContent.trim());
    // Nilai baru dihitung dari yang SEKARANG, bukan dipatok.
    // Mengisi angka yang kebetulan sama tidak memicu event change sama
    // sekali — ujinya lolos pada jalan pertama lalu gagal pada jalan kedua,
    // dan sebabnya tidak menunjuk ke mana pun.
    const lama = Number(await page.$eval('#isiTabel tr:first-child .kotak-nilai', e => e.value)) || 0;
    const baru = String(lama === 70 ? 85 : 70);
    await page.fill('#isiTabel tr:first-child .kotak-nilai', baru);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
    const sesudah = await page.$eval('#isiTabel tr td:last-child', e => e.textContent.trim());
    uji('mengubah aspek mengubah nilai akhir', sebelum !== sesudah,
        lama + '->' + baru + ' : ' + sebelum + ' -> ' + sesudah);
    const tersimpan = await page.$eval('#isiTabel tr:first-child .kotak-nilai',
      e => e.classList.contains('tersimpan') || e.classList.contains('menyimpan'));
    uji('kotak menandai tersimpan', tersimpan);

    // Nilai di luar rentang harus ditolak DI SERVER.
    await page.fill('#isiTabel tr:first-child .kotak-nilai', '150');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
    const p2 = await page.$eval('#pesan', e => ({ tampil: !e.hidden, teks: e.textContent }));
    uji('nilai di luar rentang ditolak', p2.tampil && /0.*100/.test(p2.teks), p2.teks.slice(0, 40));
  }

  // SERTIFIKAT
  await page.goto(FE + '/sertifikat/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const barisSiap = await page.$$eval('#isiTabel tr', r => r.length);
  uji('daftar siap terbit terisi', barisSiap > 0, String(barisSiap));
  await page.click('#segmenStatus button[data-status="terbit"]');
  await page.waitForTimeout(1500);
  const adaPdf = await page.$$eval('#isiTabel a', a => a.some(x => x.textContent.includes('PDF')));
  uji('yang sudah terbit menawarkan PDF', adaPdf);

  // DATA INDUK: keempat jenis + tambah/hapus prodi
  await page.goto(FE + '/data-induk/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const jenis = await page.$$eval('#segmenEntitas button', b => b.map(x => x.dataset.entitas));
  uji('admin melihat empat jenis data',
      JSON.stringify(jenis) === JSON.stringify(['programs', 'lecturers', 'courses', 'users']), jenis.join(','));

  await page.click('#tombolTambah');
  await page.waitForTimeout(500);
  await page.fill('#f_prodi', tanda);
  await page.click('#tombolSimpan');
  await page.waitForTimeout(1400);
  uji('program studi tersimpan', (await page.textContent('#isiTabel')).includes(tanda));
  await page.evaluate((t) => {
    const tr = [...document.querySelectorAll('#isiTabel tr')].find(r => r.textContent.includes(t));
    [...tr.querySelectorAll('button')].find(b => b.textContent === 'Hapus').click();
  }, tanda);
  await page.waitForTimeout(1400);
  uji('program studi terhapus', !(await page.textContent('#isiTabel')).includes(tanda));

  uji('tidak ada galat JavaScript', galat.length === 0, galat.join(' | '));
  await ctx.close();
}

// ── Pengaturan: teks sertifikat, admin saja ──
{
  const { ctx, page, galat } = await masuk('uji.admin');
  await page.goto(FE + '/pengaturan/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const judulAsli = await page.inputValue('#JUDUL_KKN');
  uji('pengaturan termuat', judulAsli.length > 0, judulAsli.slice(0, 30));
  uji('tanpa galat JS', galat.length === 0, galat.join(' | '));

  // Pratinjau harus menampilkan teks yang benar-benar akan tercetak.
  const pv = await page.textContent('#pvJudul');
  uji('pratinjau memuat judulnya', pv.trim() === judulAsli.trim(), pv.slice(0, 30));

  // Penghitung karakter, dan batas yang ditegakkan medan itu sendiri.
  await page.fill('#JUDUL_KKN', 'Judul Uji Frontend');
  await page.waitForTimeout(150);
  uji('penghitung ikut berubah',
      (await page.textContent('#hitungJudul')).startsWith('18 / 180'),
      await page.textContent('#hitungJudul'));

  await page.fill('#JUDUL_KKN', 'B'.repeat(250));
  const panjang = (await page.inputValue('#JUDUL_KKN')).length;
  uji('medan menahan di 180 karakter', panjang === 180, String(panjang));

  // Simpan sungguhan, lalu kembalikan.
  await page.fill('#JUDUL_KKN', 'Judul Uji Frontend');
  await page.click('#tombolSimpan');
  await page.waitForTimeout(900);
  const tersimpan = await page.evaluate(async () => {
    const r = await fetch('http://localhost:8090/api/settings', {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('kkn_token') } });
    return (await r.json()).data.JUDUL_KKN;
  });
  uji('tersimpan ke server', tersimpan === 'Judul Uji Frontend', tersimpan);

  await page.fill('#JUDUL_KKN', judulAsli);
  await page.click('#tombolSimpan');
  await page.waitForTimeout(900);
  const pulih = await page.evaluate(async () => {
    const r = await fetch('http://localhost:8090/api/settings', {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('kkn_token') } });
    return (await r.json()).data.JUDUL_KKN;
  });
  uji('dikembalikan seperti semula', pulih === judulAsli, pulih.slice(0, 30));
  await ctx.close();
}

// ── Pengaturan tertutup untuk peran lain ──
{
  const { ctx, page } = await masuk('uji.fakultas');
  const tautan = await tautanNav(page);
  uji('admin fakultas tidak melihat Pengaturan', !tautan.includes('Pengaturan'), tautan.join(','));

  await page.goto(FE + '/pengaturan/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // Layar boleh menyembunyikan tautannya; yang menegakkan tetap server.
  const kode = await page.evaluate(async () => {
    const r = await fetch('http://localhost:8090/api/settings', {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('kkn_token') } });
    return r.status;
  });
  uji('server menolak non-admin di /api/settings', kode === 403, String(kode));
  const pesan = await page.textContent('#pesan');
  uji('halaman mengatakan hanya admin', /admin/i.test(pesan || ''), (pesan || '').slice(0, 40));
  await ctx.close();
}

// ── dosen tidak bisa menyentuh yang bukan haknya ──
{
  const { ctx, page } = await masuk('uji.dosen');
  await page.goto(FE + '/data-induk/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const jenis = await page.$$eval('#segmenEntitas button', b => b.map(x => x.dataset.entitas));
  uji('dosen tidak melihat jenis "users"', !jenis.includes('users'), jenis.join(','));
  // Layar boleh menyembunyikan; yang menegakkan tetap server.
  const kode = await page.evaluate(async () => {
    const r = await fetch('http://localhost:8090/api/users', {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('kkn_token') } });
    return r.status;
  });
  uji('server menolak dosen di /api/users', kode === 403, String(kode));
  await ctx.close();
}

console.log('\n┌─ HALAMAN KERJA ──────────────────────────────────────────────────');
for (const [n, ok, k] of hasil) console.log('│ ' + n.padEnd(40) + (ok ? 'OK   ' : 'GAGAL') + '  ' + k);
console.log('└──────────────────────────────────────────────────────────────────');
console.log(gagal ? '\n✗ ' + gagal + ' gagal' : '\n✓ semua lolos');
await browser.close();
process.exit(gagal ? 1 : 0);
