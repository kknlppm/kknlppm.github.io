// Penyimpanan sesi dan penjaga halaman.
//
// jscroot menyediakan `cookie.js` untuk ini, dan contoh kanoniknya memakai
// cookie. Di sini tidak bisa: frontend ada di GitHub Pages, backend di
// *.run.app — domainnya berbeda, jadi cookie apa pun jadi cookie pihak ketiga,
// dan peramban sedang menghapus dukungan itu. Token disimpan di localStorage
// dan disodorkan ke jscroot lewat argumen `tokenkey`/`tokenvalue`, yang memang
// disediakan `api.js` untuk itu.
//
// KONSEKUENSINYA NYATA: satu celah XSS di halaman mana pun berarti token
// tercuri. Karena itu berlaku aturan keras di seluruh frontend ini:
//
//   - Untuk data yang berasal dari basis data pakai `setInnerText`,
//     JANGAN `setInner` — `setInner` menulis lewat innerHTML. Nama mahasiswa
//     dan judul KKN adalah masukan pengguna.
//   - Tidak ada eval, tidak ada new Function, tidak ada URL javascript:.
//   - Pustaka pihak ketiga di-vendor (assets/js/jscroot/), bukan dari CDN.

import { redirect } from "./jscroot/url.js";
import { postJSON } from "./jscroot/api.js";
import { backend, tokenKey, PERAN } from "./config.js";

const KUNCI_TOKEN = "kkn_token";
const KUNCI_USER = "kkn_user";

export function getToken() {
    try { return localStorage.getItem(KUNCI_TOKEN); } catch (e) { return null; }
}

export function setSession(token, user) {
    try {
        if (token) localStorage.setItem(KUNCI_TOKEN, token);
        if (user) localStorage.setItem(KUNCI_USER, JSON.stringify(user));
    } catch (e) { /* mode penyamaran: sesi hanya bertahan selama halaman terbuka */ }
}

export function getUser() {
    try {
        const mentah = localStorage.getItem(KUNCI_USER);
        return mentah ? JSON.parse(mentah) : null;
    } catch (e) { return null; }
}

export function clear() {
    try {
        localStorage.removeItem(KUNCI_TOKEN);
        localStorage.removeItem(KUNCI_USER);
    } catch (e) { /* diabaikan */ }
}

export function isLoggedIn() { return !!getToken(); }

// tokenHeader memberi pasangan argumen yang diminta jscroot `api.js`.
// Dipakai begini:  getJSON(backend.kkn.groups, fn, ...tokenHeader());
export function tokenHeader() { return [tokenKey, getToken()]; }

// requireLogin dipakai di awal halaman terlindungi.
//
// Ini KENYAMANAN, bukan keamanan. Yang menegakkan izin adalah backend;
// penjaga di sini hanya supaya pengguna tidak melihat kerangka halaman lebih
// dulu lalu ditolak API beberapa saat kemudian.
export function requireLogin() {
    if (!isLoggedIn()) {
        redirect("/login/");
        return false;
    }
    return true;
}

export function requireGuest() {
    if (isLoggedIn()) {
        redirect(tujuanSetelahMasuk());
        return false;
    }
    return true;
}

// tujuanSetelahMasuk menentukan halaman tujuan sesudah masuk, sesuai peran.
// Meniru switch di Auth.php aplikasi lama.
//
// Namanya dulu `landing()`. Diganti saat halaman depan publik lahir di `/` —
// dua hal berbeda tidak boleh memakai kata yang sama di repo yang sama.
// Tiap peran mendarat di PEKERJAANNYA, bukan di daftar peserta.
//
// Sampai 5 September 2026 semua orang dikirim ke /data-kkn/. Dosen hanya
// punya dua tab dan pekerjaannya di Penilaian; validasi LPPM juga dua tab dan
// pekerjaannya di Sertifikat — keduanya mendarat satu klik meleset setiap
// kali masuk. Petugas pembayaran dikirim ke "/data-kkn/?bayar=1", dan `bayar`
// tidak pernah dibaca halaman itu: ia mendarat di daftar 1.706 orang tanpa
// penyaring apa pun.
export function tujuanSetelahMasuk() {
    const u = getUser() || {};
    switch (u.role) {
        // ?bayar=0 = "belum bayar", persis pekerjaan yang menunggunya.
        case PERAN.PEMBAYARAN: return "/data-kkn/?bayar=0";
        case PERAN.DOSEN: return "/penilaian/";
        case PERAN.VALIDASI_LPPM: return "/sertifikat/";
        case PERAN.MAHASISWA: return "/data-kkn/";
        // Satu-satunya pekerjaannya; /data-kkn/ akan menolaknya dengan 403.
        case PERAN.ADMIN_BERITA: return "/kelola-berita/";
        default: return "/data-kkn/";
    }
}

export function logout() {
    // Sesi dibuang lebih dulu, tanpa menunggu jawaban server. postJSON
    // bergaya callback dan menelan galat jaringan ke console — kalau
    // pembersihan digantungkan pada callback-nya, backend yang sedang mati
    // membuat tombol Keluar tidak melakukan apa-apa.
    const [kunci, nilai] = tokenHeader();
    postJSON(backend.auth.logout, {}, function () { /* sebisanya */ }, kunci, nilai);
    clear();
    redirect("/login/");
}
