# CNAME terpasang sejak 9 September 2026

`kknlppm.unfari.ac.id` kini menunjuk ke GitHub Pages (A 185.199.108-111.153,
diganti pemilik di Zone Editor cPanel daxa pada 9 September 2026) dan berkas
`CNAME` berisi nama itu. Aplikasi lama di Hostinger (46.202.138.194) sudah
dalam pemeliharaan sejak 7 September dan tidak lagi dituju DNS.

Catatan di bawah adalah keadaan SEBELUM pindah, disimpan sebagai riwayat.

---

# CNAME sengaja belum dipasang

`kknlppm.unfari.ac.id` **masih melayani aplikasi KKN yang lama dan hidup**
(`46.202.138.194`, halaman "LOGIN KKN LPPM UNFARI"). Mengarahkan DNS-nya ke
GitHub Pages berarti mematikan produksi — aturan keselamatan nomor 1.

Karena itu berkas `CNAME` disimpan sebagai `CNAME.saat-pindah` dan TIDAK ikut
terbit. Selama ia tidak ada, situs ini terbit di alamat bawaan GitHub dan bisa
diuji berdampingan dengan aplikasi lama yang tetap jalan.

## Saat benar-benar pindah

Urutannya penting:

1. Pastikan seluruh data sudah termigrasi dan diverifikasi terhadap MariaDB
2. `git mv CNAME.saat-pindah CNAME` lalu push
3. Baru arahkan DNS `kknlppm.unfari.ac.id` ke GitHub Pages
   (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153)
4. Tunggu sertifikat HTTPS GitHub terbit sebelum mengumumkan

Membalik urutan 2 dan 3 membuat situsnya tidak terjangkau di antaranya.

## Yang TIDAK berubah saat pindah

`BASE_URL` backend sudah diisi `https://kknlppm.unfari.ac.id` sejak awal —
alamat itu dicetak ke QR sertifikat dan tidak boleh berubah. Jadi QR yang
terbit sebelum pindah pun akan bekerja setelah pindah.
