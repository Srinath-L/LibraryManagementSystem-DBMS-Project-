import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  _id: { type: String, match: /^B\d{3}$/, required: true },
  isbn: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  authors: [{ type: String, ref: "Author", required: true }],
  category: { type: String, required: true, trim: true },
  publisher: { type: String, required: true, trim: true },
  edition: { type: Number, min: 1, default: 1 },
  year: { type: Number, min: 1900, max: 2100 },
  copies: {
    total: { type: Number, min: 0, required: true },
    available: { type: Number, min: 0, required: true }
  }
}, { timestamps: true, versionKey: false });

bookSchema.index({ title: "text", publisher: "text", isbn: "text" }, { name: "book_search" });
bookSchema.index({ category: 1, "copies.available": 1 }, { name: "category_availability" });
export const Book = mongoose.model("Book", bookSchema);
