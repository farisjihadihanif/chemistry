const os = require("os");
const path = require("path");
const fs = require("fs");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "chem-test-"));
process.env.JWT_SECRET = "test-secret-yang-cukup-panjang-123";
process.env.GEMINI_API_KEY = "test-key";
process.env.AUTH_RATE_LIMIT = "10000";
process.env.CLIENT_DIST = path.join(tmp, "no-dist");
process.env.ML_SERVICE_URL = process.env.ML_TEST_URL || "http://ml.test";

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const bcrypt = require("bcryptjs");

let mongod;
async function start() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  return require("../src/app").createApp();
}
async function stop() {
  await mongoose.disconnect();
  await mongod?.stop();
  fs.rmSync(tmp, { recursive: true, force: true });
}
async function reset() {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
}

async function makeUser(app, username = "faris", role = "user") {
  const User = require("../src/models/User");
  await User.create({ username, email: `${username}@lab.id`, namaLengkap: username, password: await bcrypt.hash("rahasia123", 4), role });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ identifier: username, password: "rahasia123" }).expect(200);
  return agent;
}

// ml-service tiruan
const META = {
  targets: {
    boiling_point: { label: "Titik didih", unit: "°C", log: false },
    viscosity: { label: "Viskositas", unit: "mPa·s", log: true },
    flash_point: { label: "Titik nyala", unit: "°C", log: false },
  },
  computed: { mw: { label: "Massa molekul", unit: "g/mol" } },
  groups: [{ id: "ester", label: "Ester" }, { id: "halogen", label: "Halogen" }],
  presets: [{ id: "pelarut", name: "Pelarut serbaguna", criteria: {} }],
  compounds: 3,
};
const ETHANOL = { cid: 702, name: "Ethanol", formula: "C2H6O", smiles: "CCO", groups: ["alkohol"], properties: { boiling_point: { value: 78.3, source: "eksperimen" }, mw: { value: 46.07, source: "struktur" } }, score: 100, fit: { boiling_point: 1 }, origin: "pustaka", in_library: true };
const NOVEL = { cid: null, name: "", formula: "C3H8O", smiles: "CCCO", groups: ["alkohol"], properties: { boiling_point: { value: 95, source: "prediksi", low: 90, high: 100 } }, score: 92, fit: { boiling_point: 1 }, origin: "turunan", rule: "Rantai diperpanjang satu karbon", parent: { cid: 702, name: "Ethanol" }, novelty: "terdaftar", pubchem_cid: 1031 };

function fakeMl(calls = []) {
  return async (url, opts = {}) => {
    const u = new URL(url);
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ path: u.pathname, body });
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
    if (u.pathname === "/meta") return json(META);
    if (u.pathname === "/discover") return json({ criteria: body.criteria, known: [ETHANOL], novel: body.novel_limit ? [NOVEL] : [], matched: 1 });
    if (u.pathname === "/analyze") return body.smiles === "XX" ? json({ detail: "SMILES tidak valid" }, 400) : json({ ...ETHANOL, similar: [] });
    if (u.pathname === "/search") return json({ items: [ETHANOL] });
    if (u.pathname === "/structure.svg") return new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } });
    return json({ detail: "tidak ada" }, 404);
  };
}

module.exports = { start, stop, reset, makeUser, request, fakeMl, META, ETHANOL, NOVEL };
