export const displayName = (u) => u?.namaLengkap || u?.username || "Pengguna";

export function formatDate(d) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`;
  return formatDate(d);
}

// Angka sifat: jumlah digit menyesuaikan besarnya, notasi ilmiah untuk yang sangat kecil.
export function fmtValue(v, key) {
  if (v == null || !Number.isFinite(v)) return "–";
  const a = Math.abs(v);
  if (key === "density") return v.toFixed(3);
  if (a !== 0 && (a < 0.01 || a >= 1e5)) {
    const [m, e] = v.toExponential(1).split("e");
    return `${m} × 10${superscript(Number(e))}`;
  }
  if (a < 10) return v.toFixed(2).replace(/\.?0+$/, (x) => (x.startsWith(".") ? "" : x));
  if (a < 100) return v.toFixed(1);
  return Math.round(v).toLocaleString("id-ID");
}

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const superscript = (n) => String(n).split("").map((c) => SUP[c] ?? c).join("");

// "C2H6O" -> potongan teks dengan angka sebagai subskrip
export function formulaParts(f = "") {
  return String(f)
    .split(/(\d+)/)
    .filter(Boolean)
    .map((p) => ({ text: p, sub: /^\d+$/.test(p) }));
}

export function rangeText(c, unit) {
  const u = unit ? ` ${unit}` : "";
  if (c.min != null && c.max != null) return `${c.min} – ${c.max}${u}`;
  if (c.min != null) return `≥ ${c.min}${u}`;
  return `≤ ${c.max}${u}`;
}
