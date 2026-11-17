const { Schema, model } = require("mongoose");

// Senyawa yang disimpan pengguna. key = CID PubChem atau SMILES (untuk kandidat baru).
const FavoriteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    key: { type: String, required: true },
    compound: { type: Schema.Types.Mixed, required: true },
    catatan: { type: String, default: "", maxlength: 2000 },
    tags: { type: [String], default: [] },
    discovery: { type: Schema.Types.ObjectId, ref: "Discovery" },
  },
  { timestamps: true },
);
FavoriteSchema.index({ user: 1, key: 1 }, { unique: true });

module.exports = model("Favorite", FavoriteSchema);
