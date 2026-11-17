const { Schema, model } = require("mongoose");

// Satu sesi penemuan: kriteria yang diminta + hasil saat itu (disimpan apa adanya untuk riwayat).
const DiscoverySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    judul: { type: String, required: true, trim: true, maxlength: 200 },
    mode: { type: String, enum: ["form", "kalimat"], required: true },
    prompt: { type: String, default: "", maxlength: 2000 },
    preset: { type: String, default: "" },
    criteria: { type: Schema.Types.Mixed, default: {} },
    includeGroups: [String],
    excludeGroups: [String],
    known: { type: [Schema.Types.Mixed], default: [] },
    novel: { type: [Schema.Types.Mixed], default: [] },
    matched: { type: Number, default: 0 },
    ringkasan: { type: String, default: "" },
    aiDipakai: { type: Boolean, default: false },
  },
  { timestamps: true },
);
DiscoverySchema.index({ user: 1, createdAt: -1 });

module.exports = model("Discovery", DiscoverySchema);
