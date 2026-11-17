const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const ml = require("../src/services/ml");
const gemini = require("../src/services/gemini");
const mail = require("../src/services/mail");
const config = require("../src/config");
const hazards = require("../src/services/hazards");

let app;
let mlCalls;
before(async () => (app = await h.start()));
after(h.stop);
beforeEach(async () => {
  await h.reset();
  mlCalls = [];
  ml.setFetch(h.fakeMl(mlCalls));
});

const geminiReply = (obj) => async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === "string" ? obj : JSON.stringify(obj) }] } }] }), { status: 200 });

test("daftar, masuk (token untuk mobile), keluar", async () => {
  const agent = h.request.agent(app);
  const r = await agent.post("/api/auth/register").send({ username: "peneliti", email: "p@lab.id", password: "rahasia123", namaLengkap: "Peneliti", institusi: "Lab A" }).expect(201);
  assert.ok(r.body.token);
  assert.equal(r.body.user.institusi, "Lab A");
  // token Bearer (aplikasi mobile)
  const me = await h.request(app).get("/api/auth/me").set("Authorization", `Bearer ${r.body.token}`);
  assert.equal(me.body.user.username, "peneliti");
  await agent.post("/api/auth/logout").expect(200);
  assert.equal((await agent.get("/api/auth/me")).body.user, null);
  await h.request(app).post("/api/auth/login").send({ identifier: "peneliti", password: "salah12345" }).expect(401);
});

test("penemuan mode form: kriteria divalidasi, hasil + alasan cadangan tanpa AI", async () => {
  const prev = config.geminiApiKey;
  config.geminiApiKey = "";
  try {
    const u = await h.makeUser(app);
    await u.post("/api/discoveries").send({ mode: "form", criteria: {} }).expect(400);
    await u.post("/api/discoveries").send({ mode: "form", criteria: { boiling_point: { min: 200, max: 100 } } }).expect(400);
    await u.post("/api/discoveries").send({ mode: "form", criteria: { boiling_point: { min: "abc" } } }).expect(400);
    const r = await u.post("/api/discoveries").send({ mode: "form", preset: "pelarut", criteria: { boiling_point: { min: 60, max: 160, weight: 5 }, bogus: { min: 1 } }, excludeGroups: ["halogen", "palsu"] }).expect(201);
    const d = r.body.discovery;
    assert.equal(d.judul, "Pelarut serbaguna");
    assert.deepEqual(d.criteria, { boiling_point: { min: 60, max: 160, weight: 3 } });
    assert.deepEqual(d.excludeGroups, ["halogen"]);
    assert.equal(d.known[0].name, "Ethanol");
    assert.match(d.known[0].alasan, /Memenuhi kriteria titik didih/);
    assert.equal(d.known[0].alasanSumber, "data");
    assert.match(d.novel[0].alasan, /perkiraan model/);
    assert.equal(d.aiDipakai, false);
    // riwayat
    const list = (await u.get("/api/discoveries").expect(200)).body;
    assert.equal(list.total, 1);
    assert.equal(list.items[0].top[0].name, "Ethanol");
    // ekspor
    const csv = await u.get(`/api/discoveries/${d._id}/export?format=csv`).expect(200);
    assert.match(csv.headers["content-type"], /text\/csv/);
    assert.match(csv.text, /dikenal,100,Ethanol,702,C2H6O,CCO/);
    assert.match(csv.text, /kandidat_baru,92,,1031/);
    const js = await u.get(`/api/discoveries/${d._id}/export?format=json`).expect(200);
    assert.equal(js.body.senyawaDikenal.length, 1);
    // milik orang lain tidak bisa dibuka
    const other = await h.makeUser(app, "lain");
    await other.get(`/api/discoveries/${d._id}`).expect(404);
    await u.delete(`/api/discoveries/${d._id}`).expect(200);
  } finally {
    config.geminiApiKey = prev;
  }
});

test("penemuan mode kalimat: Gemini mengubah kalimat jadi kriteria, usulan & alasan AI", async () => {
  const replies = [
    { judul: "Pelarut cat ramah", kriteria: [{ sifat: "boiling_point", min: 100, max: 200, bobot: 2 }, { sifat: "sihir", min: 1 }], hindari_gugus: ["halogen"], catatan: "Diasumsikan pada tekanan normal." },
    { kandidat: [{ smiles: "CCCCO", alasan: "alkohol rantai lebih panjang" }] },
    { ringkasan: "Alkohol rantai pendek mendominasi.", alasan: [{ id: "k0", teks: "Etanol mendidih 78 °C." }, { id: "n0", teks: "Propanol diperkirakan 95 °C." }] },
  ];
  gemini.setFetch(async () => geminiReply(replies.shift())());
  const u = await h.makeUser(app);
  const r = await u.post("/api/discoveries").send({ mode: "kalimat", prompt: "Saya butuh pelarut untuk cat yang tidak terlalu cepat menguap dan tanpa halogen" }).expect(201);
  const d = r.body.discovery;
  assert.equal(d.judul, "Pelarut cat ramah");
  assert.deepEqual(d.criteria, { boiling_point: { min: 100, max: 200, weight: 2 } });
  assert.deepEqual(d.excludeGroups, ["halogen"]);
  assert.equal(d.known[0].alasan, "Etanol mendidih 78 °C.");
  assert.equal(d.known[0].alasanSumber, "ai");
  assert.match(d.ringkasan, /tekanan normal.*Alkohol rantai pendek/);
  const discoverCalls = mlCalls.filter((c) => c.path === "/discover");
  assert.equal(discoverCalls.length, 2);
  assert.deepEqual(discoverCalls[1].body.extra, [{ smiles: "CCCCO", note: "alkohol rantai lebih panjang" }]);
  gemini.setFetch((...a) => fetch(...a));
});

test("kalimat yang tidak bisa jadi kriteria -> pesan jelas, kuota tidak terpakai", async () => {
  gemini.setFetch(geminiReply({ judul: "x", kriteria: [] }));
  const u = await h.makeUser(app);
  const r = await u.post("/api/discoveries").send({ mode: "kalimat", prompt: "tolong carikan sesuatu yang bagus ya" }).expect(422);
  assert.match(r.body.message, /belum bisa diubah jadi kriteria/);
  assert.equal((await u.get("/api/users/me/summary")).body.quota.used, 0);
  gemini.setFetch((...a) => fetch(...a));
});

test("favorit: simpan dari hasil (tidak dobel), catatan & tag, hapus", async () => {
  const u = await h.makeUser(app);
  await u.post("/api/favorites").send({ compound: h.ETHANOL }).expect(201);
  await u.post("/api/favorites").send({ compound: h.ETHANOL }).expect(201);
  await u.post("/api/favorites").send({ compound: h.NOVEL }).expect(201);
  const list = (await u.get("/api/favorites")).body;
  assert.equal(list.total, 2);
  assert.deepEqual((await u.get("/api/favorites/keys")).body.keys.sort(), ["cid:702", "smi:CCCO"]);
  const eth = list.items.find((f) => f.key === "cid:702");
  await u.patch(`/api/favorites/${eth._id}`).send({ catatan: "uji di lab minggu depan", tags: ["Pelarut", "pelarut", "uji"] }).expect(200);
  assert.equal((await u.get("/api/favorites?q=uji")).body.total, 1);
  await u.post("/api/favorites/remove").send({ compound: h.NOVEL }).expect(200);
  assert.equal((await u.get("/api/favorites")).body.total, 1);
});

test("kalkulator & pencarian diteruskan ke ml-service; SVG struktur publik", async () => {
  await h.request(app).post("/api/compounds/analyze").send({ smiles: "CCO" }).expect(401);
  const u = await h.makeUser(app);
  assert.equal((await u.post("/api/compounds/analyze").send({ smiles: "CCO" }).expect(200)).body.compound.name, "Ethanol");
  const bad = await u.post("/api/compounds/analyze").send({ smiles: "XX" }).expect(400);
  assert.match(bad.body.message, /tidak valid/);
  assert.equal((await h.request(app).get("/api/compounds/search?q=eth")).body.items.length, 1);
  const svg = await h.request(app).get("/api/structure.svg?smiles=CCO").expect(200);
  assert.match(svg.headers["content-type"], /svg/);
});

test("ml-service mati -> 503 dengan pesan jelas", async () => {
  ml.setFetch(async () => {
    throw new Error("ECONNREFUSED");
  });
  const r = await h.request(app).get("/api/compounds/search?q=eth").expect(503);
  assert.match(r.body.message, /ml-service/);
});

test("asisten kimia: data senyawa ikut dikirim, sesi tersimpan", async () => {
  let sent;
  gemini.setFetch(async (url, opts) => {
    sent = JSON.parse(opts.body);
    return geminiReply("Etanol mendidih pada 78 °C.")();
  });
  const u = await h.makeUser(app);
  const r = await u.post("/api/chat").send({ message: "Berapa titik didihnya?", smiles: "CCO" }).expect(200);
  assert.match(sent.contents.at(-1).parts[0].text, /Ethanol.*boiling_point: 78/s);
  const s = (await u.get(`/api/chat/${r.body.sessionId}`)).body.session;
  assert.equal(s.messages.length, 2);
  assert.equal((await u.get("/api/chat")).body.items.length, 1);
  gemini.setFetch((...a) => fetch(...a));
});

test("batas AI harian", async () => {
  const prev = config.aiDailyLimit;
  config.aiDailyLimit = 1;
  gemini.setFetch(geminiReply("Jawaban."));
  try {
    const u = await h.makeUser(app);
    await u.post("/api/chat").send({ message: "satu" }).expect(200);
    await new Promise((r) => setTimeout(r, 50));
    const r = await u.post("/api/chat").send({ message: "dua" }).expect(429);
    assert.match(r.body.message, /Batas harian/);
    const admin = await h.makeUser(app, "admin", "admin");
    await admin.post("/api/chat").send({ message: "a" }).expect(200);
    await admin.post("/api/chat").send({ message: "b" }).expect(200);
  } finally {
    config.aiDailyLimit = prev;
    gemini.setFetch((...a) => fetch(...a));
  }
});

test("admin: statistik, nonaktifkan akun (langsung keluar), peran, hapus", async () => {
  const admin = await h.makeUser(app, "admin", "admin");
  const u = await h.makeUser(app, "budi");
  await u.get("/api/admin/stats").expect(403);
  const stats = (await admin.get("/api/admin/stats").expect(200)).body;
  assert.equal(stats.users, 2);
  const list = (await admin.get("/api/admin/users?q=budi")).body;
  assert.equal(list.total, 1);
  const id = list.items[0]._id;
  await admin.patch(`/api/admin/users/${id}`).send({ aktif: false }).expect(200);
  assert.equal((await u.get("/api/auth/me")).body.user, null);
  await h.request(app).post("/api/auth/login").send({ identifier: "budi", password: "rahasia123" }).expect(403);
  // admin terakhir tidak bisa diturunkan / dinonaktifkan
  const me = (await admin.get("/api/auth/me")).body.user;
  await admin.patch(`/api/admin/users/${me._id}`).send({ role: "user" }).expect(400);
  await admin.patch(`/api/admin/users/${me._id}`).send({ aktif: false }).expect(400);
  await admin.patch(`/api/admin/users/${id}`).send({ aktif: true, role: "admin" }).expect(200);
  await admin.patch(`/api/admin/users/${id}`).send({ role: "user" }).expect(200);
  await admin.delete(`/api/admin/users/${id}`).expect(200);
  assert.equal((await admin.get("/api/admin/users")).body.total, 1);
});

test("lupa password: email berisi link, token sekali pakai", async () => {
  const sent = [];
  mail.setSender(async (m) => sent.push(m));
  config.smtp.user = "tes@gmail.com";
  config.smtp.pass = "x";
  try {
    await h.makeUser(app, "lupa");
    await h.request(app).post("/api/auth/forgot").send({ email: "lupa@lab.id" }).expect(200);
    const token = /token=([a-f0-9]{64})/.exec(sent[0].text)[1];
    await h.request(app).post("/api/auth/reset").send({ token, password: "passwordbaru1" }).expect(200);
    await h.request(app).post("/api/auth/reset").send({ token, password: "passwordbaru2" }).expect(400);
    await h.request(app).post("/api/auth/login").send({ identifier: "lupa", password: "passwordbaru1" }).expect(200);
  } finally {
    config.smtp.user = "";
    config.smtp.pass = "";
  }
});

test("data bahaya GHS dari PubChem diurai & disimpan", async () => {
  const sample = { Record: { Section: [{ TOCHeading: "Safety", Section: [{ TOCHeading: "GHS Classification", Information: [
    { Name: "Pictogram(s)", Value: { StringWithMarkup: [{ String: " ", Markup: [{ URL: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg", Extra: "Flammable" }] }] } },
    { Name: "Signal", Value: { StringWithMarkup: [{ String: "Danger" }] } },
    { Name: "GHS Hazard Statements", Value: { StringWithMarkup: [{ String: "H225: Highly Flammable liquid and vapor [Danger Flammable liquids]" }] } },
  ] }] }] } };
  let n = 0;
  hazards.setFetch(async () => {
    n++;
    return new Response(JSON.stringify(sample), { status: 200 });
  });
  const r = (await h.request(app).get("/api/compounds/702/hazards").expect(200)).body.hazards;
  assert.deepEqual(r.pictograms, [{ code: "GHS02", label: "Mudah menyala" }]);
  assert.equal(r.signal, "Bahaya");
  assert.deepEqual(r.statements, [{ code: "H225", text: "Highly Flammable liquid and vapor" }]);
  await h.request(app).get("/api/compounds/702/hazards").expect(200);
  assert.equal(n, 1);
});
