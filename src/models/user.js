import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "librarian"], default: "librarian" },
  active: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });

export const User = mongoose.model("User", userSchema);
