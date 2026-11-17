// Teks kriteria & penjelasan cadangan (dipakai bila Gemini tidak aktif / gagal).
function fmt(v, key, meta) {
  const t = meta.targets[key];
  if (t?.log) return v < 0.01 ? v.toExponential(1) : v < 10 ? v.toFixed(2) : v.toFixed(0);
  if (key === "density") return v.toFixed(3);
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
}

const label = (key, meta) => meta.targets[key] || meta.computed[key] || { label: key, unit: "" };

function criteriaText(criteria, meta, include = [], exclude = []) {
  const gl = Object.fromEntries(meta.groups.map((g) => [g.id, g.label.toLowerCase()]));
  const lines = Object.entries(criteria).map(([k, c]) => {
    const l = label(k, meta);
    const u = l.unit ? ` ${l.unit}` : "";
    const range = c.min != null && c.max != null ? `${c.min}–${c.max}${u}` : c.min != null ? `≥ ${c.min}${u}` : `≤ ${c.max}${u}`;
    return `- ${l.label}: ${range}${c.weight >= 2 ? (c.weight >= 3 ? " (sangat penting)" : " (penting)") : ""}`;
  });
  if (include.length) lines.push(`- Harus memiliki gugus: ${include.map((g) => gl[g] || g).join(", ")}`);
  if (exclude.length) lines.push(`- Tanpa gugus: ${exclude.map((g) => gl[g] || g).join(", ")}`);
  return lines.join("\n");
}

function propertySummary(c, criteria, meta) {
  return Object.keys(criteria)
    .map((k) => {
      const p = c.properties?.[k];
      if (!p) return null;
      const l = label(k, meta);
      const tag = p.source === "eksperimen" ? "E" : p.source === "prediksi" ? "P" : "S";
      return `${l.label} ${fmt(p.value, k, meta)}${l.unit ? ` ${l.unit}` : ""} [${tag}]`;
    })
    .filter(Boolean)
    .join("; ");
}

// Penjelasan berbasis data tanpa AI: kriteria mana yang terpenuhi dan mana yang belum.
function fallbackReason(c, criteria, meta) {
  const ok = [];
  const miss = [];
  for (const k of Object.keys(criteria)) {
    const f = c.fit?.[k];
    if (f == null) continue;
    (f >= 1 ? ok : miss).push(label(k, meta).label.toLowerCase());
  }
  const pred = Object.keys(criteria).filter((k) => c.properties?.[k]?.source === "prediksi").map((k) => label(k, meta).label.toLowerCase());
  const parts = [];
  if (ok.length) parts.push(`Memenuhi kriteria ${ok.join(", ")}.`);
  if (miss.length) parts.push(`Belum pas untuk ${miss.join(", ")}.`);
  if (pred.length) parts.push(`Nilai ${pred.join(", ")} masih perkiraan model, perlu diuji.`);
  if (c.origin === "turunan" && c.rule) parts.push(`Dibuat dari ${c.parent?.name || "senyawa induk"} dengan modifikasi: ${c.rule.toLowerCase()}.`);
  return parts.join(" ");
}

module.exports = { criteriaText, propertySummary, fallbackReason, label };
