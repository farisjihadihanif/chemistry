const { Schema, model } = require("mongoose");

const MessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    content: { type: String, default: "" },
    // senyawa yang sedang dibahas (opsional)
    smiles: { type: String, default: "" },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } },
);

const ChatSessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    judul: { type: String, default: "Percakapan baru", maxlength: 120 },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = model("ChatSession", ChatSessionSchema);
