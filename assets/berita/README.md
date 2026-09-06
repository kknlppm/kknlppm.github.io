# Foto berita

Taruh foto berita di sini. Alamatnya lalu ditempel ke formulir berita di
`/kelola-berita/`.

## Cara biasa: unggah dari halaman admin

Buka **Kelola berita → Tulis berita**, tekan **Pilih foto dari komputer**.
Backend meng-commit berkasnya ke folder ini dan langsung menampilkan
pratinjaunya. Fotonya tayang di halaman depan sekitar setengah menit kemudian,
setelah GitHub Actions selesai menerbitkan.

Kalau tombolnya menjawab "unggah foto belum dikonfigurasi", `FOTO_REPO_TOKEN`
belum dipasang di backend — pakai cara manual di bawah.

## Cara manual, tanpa menyentuh baris perintah

1. Buka repo ini di GitHub, masuk ke folder `assets/berita/`
2. **Add file → Upload files**, seret fotonya, lalu **Commit changes**
3. Tunggu ±30 detik sampai GitHub Actions selesai menerbitkan
4. Alamat fotonya menjadi `/assets/berita/<nama-berkas>`
5. Tempel alamat itu di formulir berita, tekan **Tambah**

Formulir akan memuat alamatnya sebagai gambar sungguhan sebelum menerimanya,
jadi salah ketik ketahuan saat itu juga — bukan oleh pengunjung minggu depan.

## Aturan

- **Kecilkan dulu.** Lebar 1600px sudah lebih dari cukup untuk halaman depan.
  Foto langsung dari kamera ponsel bisa 6 MB dan memperlambat halaman untuk
  pengunjung yang memakai kuota.
- **JPG, PNG, WebP, atau AVIF.** Boleh disusun per bulan
  (`2026/09/pembekalan.jpg`) supaya tidak menumpuk jadi satu folder besar.
- **Nama berkas tanpa spasi.** Pakai `pembekalan-kkn-2026.jpg`, bukan
  `Foto Pembekalan (1).jpg`.
- **Jangan menghapus foto yang masih dipakai berita.** Halaman depan akan
  menampilkan gambar rusak, dan tidak ada yang memberi tahu Anda.

## Mengapa di sini, bukan di Cloud Storage atau Google Drive

Kuota gratis 5 GB Cloud Storage hanya berlaku di region Amerika; backend kita
di `asia-southeast2`, jadi bucket di sana ditagih.

Google Drive **tidak bisa dipakai**, dan ini sudah diuji: berkas publik di
Drive membalas `200 image/jpeg` untuk `curl`, tapi Chrome menolaknya dengan
`net::ERR_BLOCKED_BY_ORB` — Drive tidak menyatakan gambarnya boleh dibaca
situs lain. Jebakannya: di tab Drive Anda sendiri gambarnya muncul, jadi
tautannya tampak benar.

Repo ini publik dan dilayani GitHub Pages: gratis, ber-CDN, dan pasti bisa
disematkan karena ini situs yang sama. Batasnya 1 GB untuk seluruh situs dan
100 GB lalu lintas per bulan.
