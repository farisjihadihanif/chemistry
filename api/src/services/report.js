// Laporan Excel hasil penemuan: lembar Ringkasan (kebutuhan, kriteria, kesimpulan) dan lembar Hasil (tabel rapi).
const ExcelJS = require("exceljs");

const COBALT = "FF1D4E89";
const PALE = "FFDFE8F4";
const GREY = "FF5E6C78";
const WEIGHT = { 1: "Biasa", 2: "Penting", 3: "Sangat penting" };
const NOVELTY = { belum_terdaftar: "Struktur baru", terdaftar: "Sudah dikenal, sifat diperkirakan", tidak_dicek: "Belum dicek" };

const label = (meta, k) => meta.targets[k] || meta.computed[k] || { label: k, unit: "" };
const head = (meta, k) => {
  const l = label(meta, k);
  return l.unit ? `${l.label} (${l.unit})` : l.label;
};
function range(c, unit) {
  const u = unit ? ` ${unit}` : "";
  if (c.min != null && c.max != null) return `${c.min} – ${c.max}${u}`;
  if (c.min != null) return `≥ ${c.min}${u}`;
  return `≤ ${c.max}${u}`;
}
function numFmt(meta, k) {
  if (meta.targets[k]?.log) return "0.00E+00";
  if (k === "density") return "0.000";
  if (["hbd", "hba", "rot_bonds"].includes(k)) return "0";
  return "0.0";
}
function origin(c) {
  if (c.origin === "pustaka" || c.in_library) return "Senyawa dikenal";
  if (c.origin === "gemini") return "Rancangan otomatis";
  return `Turunan ${c.parent?.name || "senyawa induk"}: ${String(c.rule || "").toLowerCase()}`;
}

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COBALT } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: COBALT } } };
  });
  row.height = 32;
}

async function discoveryWorkbook(d, meta, user) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Chemistry";
  wb.created = new Date();

  // ---------- Ringkasan ----------
  const s = wb.addWorksheet("Ringkasan", { views: [{ showGridLines: false }] });
  s.columns = [{ width: 30 }, { width: 28 }, { width: 18 }, { width: 40 }];
  s.addRow(["Laporan Penemuan Senyawa"]).font = { bold: true, size: 16, color: { argb: COBALT } };
  s.addRow([d.judul]).font = { bold: true, size: 13 };
  s.addRow([]);
  const info = [
    ["Tanggal", new Date(d.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })],
    ["Disusun untuk", `${user.namaLengkap || user.username}${user.institusi ? ` · ${user.institusi}` : ""}`],
    ["Cara pencarian", d.mode === "kalimat" ? "Dari kalimat kebutuhan" : "Dari kriteria sifat"],
  ];
  if (d.prompt) info.push(["Kebutuhan", d.prompt]);
  for (const [k, v] of info) {
    const r = s.addRow([k, v]);
    r.getCell(1).font = { color: { argb: GREY } };
    s.mergeCells(r.number, 2, r.number, 4);
    r.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }
  s.addRow([]);
  s.addRow(["Kriteria"]).font = { bold: true, size: 12 };
  styleHeader(s.addRow(["Sifat", "Rentang target", "Kepentingan"]));
  for (const [k, c] of Object.entries(d.criteria)) {
    s.addRow([label(meta, k).label, range(c, label(meta, k).unit), WEIGHT[c.weight] || "Biasa"]);
  }
  const groups = Object.fromEntries(meta.groups.map((g) => [g.id, g.label.toLowerCase()]));
  if (d.includeGroups?.length) s.addRow(["Harus memiliki gugus", d.includeGroups.map((g) => groups[g] || g).join(", ")]);
  if (d.excludeGroups?.length) s.addRow(["Tanpa gugus", d.excludeGroups.map((g) => groups[g] || g).join(", ")]);
  s.addRow([]);
  s.addRow(["Hasil"]).font = { bold: true, size: 12 };
  s.addRow(["Senyawa yang memenuhi semua kriteria", d.matched]);
  s.addRow(["Senyawa dikenal dalam laporan", d.known.length]);
  s.addRow(["Kandidat senyawa baru", d.novel.length]);
  if (d.ringkasan) {
    s.addRow([]);
    s.addRow(["Kesimpulan"]).font = { bold: true, size: 12 };
    const r = s.addRow([d.ringkasan]);
    s.mergeCells(r.number, 1, r.number, 4);
    r.getCell(1).alignment = { wrapText: true, vertical: "top" };
    r.height = Math.min(200, 18 * Math.ceil(d.ringkasan.length / 95));
  }
  s.addRow([]);
  const note = s.addRow(["Catatan: nilai perkiraan perlu dikonfirmasi lewat uji laboratorium sebelum dipakai untuk keputusan produksi atau keselamatan."]);
  s.mergeCells(note.number, 1, note.number, 4);
  note.getCell(1).font = { italic: true, color: { argb: GREY } };
  note.getCell(1).alignment = { wrapText: true };
  note.height = 30;

  // ---------- Hasil ----------
  const h = wb.addWorksheet("Hasil", { views: [{ state: "frozen", xSplit: 3, ySplit: 3 }] });
  const crit = Object.keys(d.criteria);
  const rest = [...Object.keys(meta.targets), ...Object.keys(meta.computed)].filter((k) => !crit.includes(k));
  const props = [...crit, ...rest];
  const cols = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama senyawa", key: "nama", width: 30 },
    { header: "Skor (0–100)", key: "skor", width: 11 },
    { header: "Jenis", key: "jenis", width: 16 },
    { header: "Rumus", key: "rumus", width: 13 },
    ...props.map((k) => ({ header: head(meta, k), key: k, width: Math.max(12, head(meta, k).length * 0.9) })),
    { header: "Alasan", key: "alasan", width: 70 },
    { header: "Asal kandidat", key: "asal", width: 36 },
    { header: "Status struktur", key: "status", width: 22 },
    { header: "Kesulitan sintesis (1–10)", key: "sa", width: 14 },
    { header: "SMILES", key: "smiles", width: 40 },
  ];
  h.columns = cols.map(({ key, width }) => ({ key, width }));
  const title = h.addRow([`Hasil: ${d.judul}`]);
  title.font = { bold: true, size: 13, color: { argb: COBALT } };
  const legend = h.addRow(["Angka tegak = data eksperimen. Angka miring abu-abu = nilai perkiraan. Kolom berwarna = kriteria pencarian."]);
  legend.font = { italic: true, color: { argb: GREY } };
  const hr = h.addRow(cols.map((c) => c.header));
  styleHeader(hr);
  crit.forEach((k) => {
    const cell = hr.getCell(cols.findIndex((c) => c.key === k) + 1);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF163B67" } };
  });

  const all = [...d.known.map((c) => ({ ...c, _jenis: "Senyawa dikenal" })), ...d.novel.map((c) => ({ ...c, _jenis: "Kandidat baru" }))];
  all.forEach((c, i) => {
    const row = { no: i + 1, nama: c.name || "Kandidat tanpa nama", skor: Math.round(c.score), jenis: c._jenis, rumus: c.formula, alasan: c.alasan || "", smiles: c.smiles };
    if (c._jenis === "Kandidat baru") {
      row.asal = origin(c);
      row.status = NOVELTY[c.novelty] || "";
      row.sa = c.synth_score ?? "";
    }
    for (const k of props) {
      const p = c.properties?.[k];
      if (p && Number.isFinite(p.value)) row[k] = Number(p.value.toPrecision(6));
    }
    const r = h.addRow(row);
    r.alignment = { vertical: "top" };
    r.getCell("alasan").alignment = { wrapText: true, vertical: "top" };
    r.height = Math.min(90, Math.max(18, 15 * Math.ceil((c.alasan || "").length / 85)));
    for (const k of props) {
      const cell = r.getCell(k);
      cell.numFmt = numFmt(meta, k);
      if (c.properties?.[k]?.source === "prediksi") cell.font = { italic: true, color: { argb: GREY } };
      if (crit.includes(k)) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE } };
    }
    if (i === d.known.length - 1 && d.novel.length) r.eachCell((cell) => (cell.border = { bottom: { style: "medium", color: { argb: COBALT } } }));
  });
  h.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: cols.length } };
  return wb;
}

// Versi JSON yang rapi: kunci berbahasa Indonesia, satuan jelas, angka dibulatkan.
function round(v, k, meta) {
  if (!Number.isFinite(v)) return null;
  if (meta.targets[k]?.log) return Number(v.toPrecision(3));
  if (k === "density") return Math.round(v * 1000) / 1000;
  if (["hbd", "hba", "rot_bonds"].includes(k)) return Math.round(v);
  return Math.round(v * 10) / 10;
}

function discoveryJson(d, meta, user) {
  const groups = Object.fromEntries(meta.groups.map((g) => [g.id, g.label]));
  const props = [...Object.keys(meta.targets), ...Object.keys(meta.computed)];
  const item = (c, i, novel) => ({
    peringkat: i + 1,
    nama: c.name || "Kandidat tanpa nama",
    rumus: c.formula,
    smiles: c.smiles,
    skor: Math.round(c.score),
    gugus: (c.groups || []).map((g) => groups[g] || g),
    sifat: Object.fromEntries(
      props
        .filter((k) => c.properties?.[k])
        .map((k) => {
          const p = c.properties[k];
          const out = { nilai: round(p.value, k, meta), satuan: label(meta, k).unit || null, jenis: p.source === "eksperimen" ? "eksperimen" : p.source === "prediksi" ? "perkiraan" : "dihitung dari struktur" };
          if (p.source === "prediksi" && p.low != null) out.rentangPerkiraan = [round(p.low, k, meta), round(p.high, k, meta)];
          return [label(meta, k).label, out];
        }),
    ),
    kecocokanPerKriteria: Object.fromEntries(Object.entries(c.fit || {}).map(([k, f]) => [label(meta, k).label, `${Math.round(f * 100)}%`])),
    alasan: c.alasan || "",
    ...(novel ? { asal: origin(c), statusStruktur: NOVELTY[c.novelty] || null, kesulitanSintesis: c.synth_score ?? null } : {}),
  });
  return {
    laporan: "Laporan Penemuan Senyawa",
    judul: d.judul,
    tanggal: new Date(d.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }) + " WIB",
    disusunUntuk: user.namaLengkap || user.username,
    caraPencarian: d.mode === "kalimat" ? "Dari kalimat kebutuhan" : "Dari kriteria sifat",
    ...(d.prompt ? { kebutuhan: d.prompt } : {}),
    kriteria: Object.entries(d.criteria).map(([k, c]) => ({ sifat: label(meta, k).label, satuan: label(meta, k).unit || null, minimum: c.min ?? null, maksimum: c.max ?? null, kepentingan: WEIGHT[c.weight] || "Biasa" })),
    gugusWajib: (d.includeGroups || []).map((g) => groups[g] || g),
    gugusDihindari: (d.excludeGroups || []).map((g) => groups[g] || g),
    jumlahMemenuhiSemuaKriteria: d.matched,
    kesimpulan: d.ringkasan || "",
    senyawaDikenal: d.known.map((c, i) => item(c, i, false)),
    kandidatBaru: d.novel.map((c, i) => item(c, i, true)),
    catatan: "Nilai berjenis perkiraan perlu dikonfirmasi lewat uji laboratorium.",
  };
}

module.exports = { discoveryWorkbook, discoveryJson };
