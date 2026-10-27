import mongoose from "mongoose";

const authorSchema = new mongoose.Schema({
  _id: { type: String, match: /^A\d{3}$/, required: true },
  name: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true }
}, { versionKey: false });

authorSchema.index({ name: 1 });
export const Author = mongoose.model("Author", authorSchema);
