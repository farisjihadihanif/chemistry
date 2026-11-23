const { test, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");

const SECRET_URL = "mongodb://penyusup:rahasia-sekali@127.0.0.1:1/x?serverSelectionTimeoutMS=300";
process.env.JWT_SECRET = "";
process.env.MONGO_URL = "";
process.env.ADMIN_EMAIL = "admin@lab.id";
process.env.ADMIN_PASSWORD = "rahasia123";
process.env.CLIENT_DIST = "tidak-ada";
const config = require("../src/config");
const handler = require("../api/index.js");
const server = http.createServer(handler);
let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test("503 hanya menyebut nama variabel yang kosong", async () => {
  const r = await request(server).get("/api/health").expect(503);
  assert.match(r.body.reason, /MONGO_URL, JWT_SECRET/);
});

test("503 saat MongoDB tidak bisa dihubungi tidak membocorkan alamat", async () => {
  config.jwtSecret = "test-secret-yang-cukup-panjang-123";
  config.mongoUrl = SECRET_URL;
  const oldConnect = mongoose.connect;
  mongoose.connect = (url, opts) => oldConnect.call(mongoose, url, { ...opts, serverSelectionTimeoutMS: 300 });
  const r = await request(server).get("/api/health").expect(503);
  mongoose.connect = oldConnect;
  assert.match(r.body.reason, /MongooseServerSelectionError/);
  assert.doesNotMatch(r.text, /rahasia-sekali|penyusup|127\.0\.0\.1/);
  config.mongoUrl = "bukan-url-rahasia";
  const p = await request(server).get("/api/health").expect(503);
  assert.match(p.body.reason, /MongoParseError/);
  assert.doesNotMatch(p.text, /bukan-url-rahasia/);
  await mongoose.disconnect();
});

test("pulih setelah gagal; koneksi dan seeding sekali saja untuk permintaan bersamaan", async () => {
  config.mongoUrl = mongod.getUri();
  let n = 0;
  const oldConnect = mongoose.connect;
  mongoose.connect = (...a) => (n++, oldConnect.apply(mongoose, a));
  const rs = await Promise.all([1, 2, 3].map(() => request(server).get("/api/health")));
  await request(server).get("/api/health").expect(200);
  mongoose.connect = oldConnect;
  assert.deepEqual(rs.map((r) => r.status), [200, 200, 200]);
  assert.equal(n, 1);
  assert.equal(await mongoose.model("User").countDocuments({ role: "admin" }), 1);
  await request(server).post("/api/auth/login").send({ identifier: "admin@lab.id", password: "rahasia123" }).expect(200);
  await request(server).get("/api/tidak-ada").expect(404);
});
