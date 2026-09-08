// Unduhan ber-token (XLSX, PDF).
//
// Tautan biasa tidak membawa header token, jadi berkasnya diambil sebagai
// blob lalu disodorkan lewat <a download>. Ditulis tangan, bukan lewat
// `getFileWithHeader` jscroot: yang itu menelan galat ke console dan tidak
// membedakan 401 (sesi habis) dari 403/500.

import { tokenKey } from "./config.js";
import { getToken, clear as bersihkanSesi } from "./auth.js";
import { redirect } from "./jscroot/url.js";
import { pesan } from "./ui.js";

export async function unduhDenganToken(url, namaBawaan) {
    const res = await fetch(url, { headers: { [tokenKey]: getToken() }, cache: "no-store" });
    if (res.status === 401) { bersihkanSesi(); redirect("/login/"); return; }
    if (!res.ok) {
        let teks = "Gagal mengunduh (HTTP " + res.status + ").";
        try { const j = await res.json(); if (j && j.message) teks = j.message; } catch (e) { /* bukan JSON */ }
        throw new Error(teks);
    }
    const blob = await res.blob();
    // Nama dari server kalau CORS mengizinkannya terbaca; kalau tidak, bawaan.
    const cd = res.headers.get("Content-Disposition") || "";
    const m = /filename="?([^";]+)"?/.exec(cd);
    const nama = (m && m[1]) || namaBawaan;
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
}

// pasangUnduh menyambungkan satu tombol ke unduhan: tombol dimatikan selama
// berjalan, galat ditampilkan di elemen pesan. `url()` dan `nama()` dipanggil
// saat ditekan supaya mengikuti saringan yang sedang aktif.
export function pasangUnduh(tombol, url, nama, elPesan) {
    if (!tombol) return;
    tombol.addEventListener("click", async function () {
        tombol.disabled = true;
        const label = tombol.textContent;
        tombol.textContent = "Menyiapkan…";
        try {
            await unduhDenganToken(url(), nama());
        } catch (e) {
            pesan(elPesan, e.message || "Gagal mengunduh.", "galat");
        } finally {
            tombol.disabled = false;
            tombol.textContent = label;
        }
    });
}
