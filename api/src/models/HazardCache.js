const { Schema, model } = require("mongoose");

// Data bahaya GHS dari PubChem, disimpan 30 hari supaya tidak mengambil ulang tiap kali.
const HazardCacheSchema = new Schema({
  cid: { type: Number, required: true, unique: true },
  data: { type: Schema.Types.Mixed, default: null },
  fetchedAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 },
});

module.exports = model("HazardCache", HazardCacheSchema);
