const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    namaLengkap: { type: String, default: "", trim: true, maxlength: 100 },
    institusi: { type: String, default: "", trim: true, maxlength: 150 },
    // Dinonaktifkan admin: tidak bisa masuk, data tetap ada.
    aktif: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

UserSchema.methods.toPublic = function toPublic() {
  return { _id: this._id, username: this.username, namaLengkap: this.namaLengkap, institusi: this.institusi, role: this.role, createdAt: this.createdAt };
};
UserSchema.methods.toSelf = function toSelf() {
  return { ...this.toPublic(), email: this.email };
};

module.exports = model("User", UserSchema);
