// Pasang tema sebelum halaman tampil supaya tidak berkedip.
try {
  var t = localStorage.getItem("theme");
  if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.classList.add("dark");
} catch {
  /* penyimpanan diblokir: pakai tema terang */
}
