const { Schema, model } = require("mongoose");

// Foto profil (sudah dipotong persegi & dikecilkan di perangkat), disimpan langsung di database.
const AvatarSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    mime: { type: String, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

module.exports = model("Avatar", AvatarSchema);
