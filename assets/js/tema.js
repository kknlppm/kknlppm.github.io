// Tema tampilan aplikasi: ikut sistem, terang, atau gelap.
//
// BUKAN modul, dan dimuat di <head> SEBELUM app.css: skrip klasik di head
// berjalan sebelum gambar pertama, jadi halaman yang dipilih gelap tidak
// pernah berkedip putih dulu. Modul ES ditunda sampai dokumen selesai
// diurai, dan itu sudah terlambat.
//
// Pilihannya disimpan di localStorage `kkn_tema`; "sistem" berarti tidak
// disimpan sama sekali dan mengikuti prefers-color-scheme, termasuk saat
// sistemnya berganti di tengah sesi. CSS hanya membaca satu hal:
// atribut data-tema="gelap" di <html>. Halaman yang TIDAK memuat skrip ini
// (verifikasi sertifikat) tetap terang, karena itu bawaan tokennya.
(function () {
    var KUNCI = "kkn_tema";
    var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function pilihan() {
        try {
            var t = localStorage.getItem(KUNCI);
            return t === "terang" || t === "gelap" ? t : "sistem";
        } catch (e) { return "sistem"; }
    }
    function efektif(p) {
        if (p === "sistem") return media && media.matches ? "gelap" : "terang";
        return p;
    }
    function terapkan() {
        document.documentElement.setAttribute("data-tema", efektif(pilihan()));
    }
    function umumkan() {
        if (typeof CustomEvent !== "function") return;
        document.dispatchEvent(new CustomEvent("kkn:tema", {
            detail: { pilihan: pilihan(), efektif: efektif(pilihan()) },
        }));
    }
    function setel(p) {
        try {
            if (p === "terang" || p === "gelap") localStorage.setItem(KUNCI, p);
            else localStorage.removeItem(KUNCI);
        } catch (e) { /* penyimpanan ditolak: tema tetap berlaku untuk halaman ini */ }
        terapkan();
        umumkan();
    }

    if (media && media.addEventListener) {
        media.addEventListener("change", function () {
            if (pilihan() === "sistem") { terapkan(); umumkan(); }
        });
    }
    terapkan();

    window.kknTema = {
        pilihan: pilihan,
        efektif: function () { return efektif(pilihan()); },
        setel: setel,
    };
})();
