import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  _id: { type: String, match: /^M\d{3}$/, required: true },
  name: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  membershipType: { type: String, enum: ["Student", "Faculty"], required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });

memberSchema.index({ name: 1, department: 1 });
export const Member = mongoose.model("Member", memberSchema);
