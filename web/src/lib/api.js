// Pemanggil API. Cookie login ikut terkirim (credentials: include).
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body, { signal } = {}) {
  const opts = { method, credentials: "include", signal, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, opts);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, "Tidak bisa terhubung ke server. Periksa koneksi internetmu.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (!data) throw new ApiError(res.status, "Server API tidak merespons. Pastikan API dan ml-service sedang jalan.");
    throw new ApiError(res.status, data.message || `Terjadi kesalahan (${res.status}).`);
  }
  return data;
}

export const api = {
  get: (p, o) => request("GET", p, undefined, o),
  post: (p, b, o) => request("POST", p, b, o),
  put: (p, b, o) => request("PUT", p, b, o),
  patch: (p, b, o) => request("PATCH", p, b, o),
  del: (p, b, o) => request("DELETE", p, b, o),
};

export const structureUrl = (smiles, { w = 320, h = 240, dark = false } = {}) =>
  `${BASE}/api/structure.svg?${new URLSearchParams({ smiles, w: String(w), h: String(h), ...(dark ? { dark: "1" } : {}) })}`;

export const exportUrl = (id, format) => `${BASE}/api/discoveries/${id}/export?format=${format}`;
