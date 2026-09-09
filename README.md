# KKN LPPM UNFARI — frontend

Situs statis untuk GitHub Pages. Memanggil backend
[`kkn-gocroot`](../kkn-gocroot) lewat JSON.

**Belum di-deploy.** Seluruh pekerjaan berlangsung di lokal; aplikasi live
di `kknlppm.unfari.ac.id` tidak disentuh.

## Menjalankan di lokal

    npm install
    npm run build          # kompilasi Tailwind ke assets/css/app.css
    npm run watch:css      # atau: bangun ulang otomatis saat menyunting

    python3 -m http.server 5173     # sajikan dari folder ini

Backend harus hidup lebih dulu di `http://localhost:8090` — lihat
`../kkn-gocroot/uji/README.md`.

## Sistem visual

Diturunkan dari sertifikat KKN yang sudah tercetak, bukan dari pustaka
komponen. Tidak memakai DaisyUI atau sejenisnya — yang dibutuhkan cuma
sedikit, dan pustaka bawaan membuat setiap aplikasi tampak sama.

| | |
|---|---|
| Warna | `#1074BA` diambil dari batang biru di kaki sertifikat. Dasar halaman kertas dingin bersemu biru, bukan krem. |
| Huruf | **Archivo** dipakai untuk dua peran lewat sumbu LEBARNYA — melebar untuk judul, normal untuk teks. **Azeret Mono** untuk NIM, nomor sertifikat, tahun akademik, dan nilai: semuanya kode berformat tetap di dunia nyata. |
| Tanda tangan | **Deret lima batang nilai.** Nilai KKN selalu terdiri tepat lima komponen H·S·L·QP·QL; tingginya sebanding dengan skor. |
| Hiasan | Satu garis biru 3px di puncak halaman — kutipan dari kaki sertifikat. Tidak ada yang lain. |

### Kenapa deret lima batang

Ia menjawab pertanyaan yang benar-benar dihadapi dosen di akhir semester:
**siapa yang belum lengkap dinilai.** 346 keikutsertaan tercatat tanpa satu
pun komponen terisi, dan pada daftar 1.778 baris itu tidak terlihat tanpa
membuka satu per satu.

Skalanya dipetakan dari **45**, bukan dari 0. Hampir seluruh nilai jatuh di
rentang 75-95; pada skala 0-100 kelima batangnya tampak sama tinggi dan
deretnya berubah jadi hiasan.

### Warna teks diukur, bukan dikira

Nilai pertama yang saya pakai (`#9AAAB9`) menghasilkan kontras **2,38**
terhadap putih — jauh di bawah ambang 4,5 untuk teks kecil, dan eyebrow di
sini berukuran 11px. Palet sekarang diukur:

    tinta        17,4 di kartu · 15,0 di latar
    tinta-redup   6,8 di kartu ·  5,9 di latar
    tinta-samar   5,0 di kartu ·  4,3 di latar   -> hanya dipakai di atas kartu
    biru          5,0 di kartu ·  4,3 di latar

`uji/uji-mutu.mjs` mengukur kontras TERBURUK di seluruh register setiap kali
dijalankan, terhadap latar belakang elemen yang sebenarnya — bukan terhadap
body, yang memberi angka salah untuk sel yang duduk di atas kartu putih.

## Aturan yang tidak boleh dilanggar

Token PASETO disimpan di `localStorage`, bukan cookie HttpOnly — cookie tidak
bisa lintas-origin antara Pages dan Cloud Functions. **Konsekuensinya satu
celah XSS berarti sesi tercuri.** Karena itu:

1. **Jangan pernah `innerHTML` untuk data dari basis data.** Pakai
   `textContent`. Nama mahasiswa dan judul KKN adalah masukan pengguna.
   Perkakas di `assets/js/ui.js` sudah menegakkan ini; pakai itu.
   Dari jscroot: **`setInnerText`, jangan `setInner`** — `setInner`,
   `insertHTML`, `renderHTML`, dan `replaceTag` semuanya menulis lewat
   `innerHTML`. Berlaku penuh untuk berita: judul, ringkasan, dan paragrafnya
   diketik admin, dan halaman depan satu origin dengan aplikasi ini.
2. Tidak ada `eval`, `new Function`, atau URL `javascript:`.
3. Pustaka pihak ketiga di-*vendor*, bukan dari CDN. jscroot tidak ada di
   npm, jadi `assets/js/jscroot/` di-commit apa adanya — jangan menggantinya
   dengan impor jsDelivr seperti contoh kanonik jscroot, karena CDN yang
   tersusupi bisa membaca token di localStorage.
4. Kelas Tailwind yang dirakit dinamis di JS harus di-*safelist* di
   `tailwind.config.js`, atau warnanya hilang dari `app.css`.

## Repo dan penerbitan

Repo ini **PUBLIK** dan bernama `kknlppm/kknlppm.github.io`. Keduanya wajib:
GitHub Pages pada paket free tidak melayani repo privat, dan nama
`<org>.github.io` membuatnya tersaji di akar `https://kknlppm.github.io/`.
Di subpath, seluruh path absolut di situs ini (`/assets/…`, `/login/`) patah.

Yang rahasia ada di `kkn-gocroot` — repo terpisah yang tetap privat.
Tidak boleh ada rahasia apa pun di sini.

`CNAME` berisi `kknlppm.unfari.ac.id` sejak 9 September 2026; riwayat pemindahannya di `CATATAN-CNAME.md`.

## Susunan

| | |
|---|---|
| `index.html` | **Halaman depan publik — GELAP.** Tampil untuk semua, termasuk yang sudah punya sesi |
| `assets/css/beranda.css` | Gaya halaman depan. **Bukan Tailwind, bukan hasil build — ditulis tangan dan di-commit** |
| `assets/js/beranda.js` | Perilaku halaman depan. Satu-satunya panggilan API-nya `GET /news`, publik |
| `assets/img/` | Latar halaman depan: bentang bukit dan gurun dari Fora, dipakai apa adanya. Keluaran program, bukan foto — lihat `SUMBER.md` |
| `login/` | Halaman masuk |
| `pendaftaran/` | Pendaftaran peserta ke kelompok pada tahun akademik aktif; batalkan pendaftaran; akun lahir bersama (sandi awal NIM); impor XLSX dua langkah dan unduh XLSX |
| `pembayaran/` | Meja pembayaran — saringan status bayar (bawaan belum bayar), laci ubah status |
| `saya/` | KKN saya (mahasiswa) — kartu tiap keikutsertaan: kelompok, bayar, nilai, sertifikat |
| `data-kkn/` | Alamat Register lama — hanya mengalihkan menurut peran (buku besar ada di Data induk › Peserta) |
| `kelompok/` | Kelompok KKN — tambah, ubah, hapus; pembimbing hanya dari dosen DPL |
| `penilaian/` | Penilaian lima aspek per kelompok, tersimpan saat pindah kotak |
| `sertifikat/` | Menerbitkan sertifikat dan membuka PDF-nya |
| `data-induk/` | Buku besar peserta (baca-saja), mahasiswa, program studi, dosen, mata kuliah, pengguna |
| `verifikasi/` | Verifikasi publik, tanpa login. **Sengaja tidak ditautkan dari mana pun** — halaman ini tidak punya medan isian token, jadi ia hanya berarti kalau dibuka lewat pindai QR |
| `berita/` | **Halaman baca satu berita — GELAP, publik.** `/berita/?slug=…`; bentuk `/berita/<slug>` dialihkan `404.html` |
| `kelola-berita/` | Menulis dan menerbitkan berita. **Admin saja**, dan itu ditegakkan backend |
| `assets/js/jscroot/` | **Pustaka jscroot v0.2.8, di-*vendor*.** Jangan disunting — lihat `VERSI.md` di dalamnya |
| `assets/js/config.js` | Peta `backend` (titik-ujung) dan `id`, bergaya jscroot `skeleton`. Tidak boleh memuat rahasia apa pun |
| `assets/js/auth.js` | Sesi localStorage, penjaga halaman, dan `tokenHeader()` yang disodorkan ke panggilan jscroot |
| `assets/js/ui.js` | Pembuat elemen yang selalu memakai `textContent`, plus `sehat()` |
| `assets/js/nav.js` | Kepala halaman dan navigasi yang mengikuti peran |
| `assets/js/laci.js` | Laci formulir: fokus dipindah masuk, Escape menutup, Tab terjebak di dalam |
| `assets/js/peserta.js` | Mesin tabel keikutsertaan bersama: Pendaftaran, Pembayaran, Data induk › Peserta |
| `assets/js/unduh.js` | Unduhan ber-token (XLSX, PDF) lewat blob; tombol Unduh XLSX di enam daftar |

**Halaman depan dan halaman baca berita berdiri di luar semua ini.** Keduanya
gelap, memakai `beranda.css` sendiri, dan tidak memuat `app.css`. Keduanya
memanggil API — tapi hanya rute publik `/news`, tidak pernah rute ber-token. Token gelapnya sengaja tidak masuk `tailwind.config.js`, dan
`index.html` + `beranda.js` dikecualikan dari pemindaian Tailwind — kalau tidak,
kelas yang hanya dipakai halaman depan ikut menumpuk di `app.css`.

Aturan `textContent` tetap berlaku penuh di sana: halaman depan satu origin
dengan aplikasi yang memegang token, jadi `beranda.js` membangun accordion dan
paragraf lewat `createElement`, bukan `innerHTML` seperti templat asalnya.

Halaman aplikasi memanggil `getJSON`/`postJSON`/`deleteJSON` jscroot langsung,
dengan `...tokenHeader()` di akhir. **Setiap fungsi jawaban harus mulai dengan
`sehat(hasil, elPesan)`** — jscroot tidak menangani 401 maupun galat jaringan
sendiri, jadi tanpa itu sesi yang habis tampak sebagai halaman kosong tanpa
sebab. `uji/uji-jscroot.mjs` menjaganya.

Penjaga di frontend adalah **kenyamanan, bukan keamanan** — yang menegakkan
izin adalah backend. Ia hanya supaya pengguna tidak melihat kerangka halaman
lebih dulu lalu ditolak API beberapa saat kemudian.

## Hasil build tidak di-commit

`assets/css/app.css` ada di `.gitignore`; GitHub Actions membangunnya ulang
setiap deploy.
