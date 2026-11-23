import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Saat development, /api diteruskan ke API Express supaya cookie login bekerja tanpa CORS.
const api = process.env.VITE_DEV_API || "http://localhost:4100";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": api } },
});
