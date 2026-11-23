// Klien ke layanan Python (ml-service): RDKit, model sifat, pustaka PubChem.
const config = require("../config");
const { HttpError } = require("../middleware/errors");

let fetchImpl = (...a) => fetch(...a);
const setFetch = (fn) => {
  fetchImpl = fn;
};

// Batas 90 detik: ml-service di paket gratis perlu sekitar satu menit untuk bangun.
async function call(path, { method = "GET", body, timeout = 90000, raw = false } = {}) {
  let res;
  try {
    res = await fetchImpl(`${config.mlUrl}${path}`, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(config.mlToken ? { "x-service-token": config.mlToken } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw new HttpError(503, "Layanan analisis kimia sedang tidak aktif. Coba lagi sebentar lagi.");
  }
  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail) ? "Data kriteria tidak valid." : data.detail;
    throw new HttpError(res.status === 404 ? 404 : res.status === 400 || res.status === 422 ? 400 : 502, detail || "Layanan analisis kimia gagal.");
  }
  return data;
}

let metaCache = null;
async function meta() {
  if (metaCache && metaCache.until > Date.now()) return metaCache.data;
  const data = await call("/meta");
  metaCache = { data, until: Date.now() + 10 * 60 * 1000 };
  return data;
}

module.exports = { call, meta, setFetch };
