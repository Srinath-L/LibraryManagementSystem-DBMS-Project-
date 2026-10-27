import { Router } from "express";
import { z } from "zod";
import { Book } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { authorize } from "../middleware/auth.js";

export const booksRouter = Router();

const bookInput = z.object({
  _id: z.string().regex(/^B\d{3}$/),
  isbn: z.string().min(10).max(20),
  title: z.string().min(2).max(180),
  authors: z.array(z.string().regex(/^A\d{3}$/)).min(1),
  category: z.string().min(2).max(60),
  publisher: z.string().min(2).max(100),
  edition: z.coerce.number().int().min(1).max(30),
  year: z.coerce.number().int().min(1900).max(2100),
  copies: z.object({
    total: z.coerce.number().int().min(0),
    available: z.coerce.number().int().min(0)
  })
}).refine((value) => value.copies.available <= value.copies.total, {
  message: "Available copies cannot exceed total copies",
  path: ["copies", "available"]
});

booksRouter.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.available === "true") filter["copies.available"] = { $gt: 0 };
  if (req.query.search) {
    const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { isbn: { $regex: escaped, $options: "i" } },
      { publisher: { $regex: escaped, $options: "i" } }
    ];
  }
  const [data, total] = await Promise.all([
    Book.find(filter).sort({ title: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Book.countDocuments(filter)
  ]);
  res.json({ status: "success", data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

booksRouter.get("/:id", asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).lean();
  if (!book) throw new NotFoundError("Book not found");
  res.json({ status: "success", data: book });
}));

booksRouter.post("/", authorize("admin", "librarian"), asyncHandler(async (req, res) => {
  const input = bookInput.parse(req.body);
  const book = await Book.create(input);
  res.status(201).json({ status: "success", data: book });
}));

booksRouter.patch("/:id", authorize("admin", "librarian"), asyncHandler(async (req, res) => {
  const current = await Book.findById(req.params.id).lean();
  if (!current) throw new NotFoundError("Book not found");
  const input = bookInput.parse({ ...current, ...req.body, _id: req.params.id });
  if (input.copies.total < current.copies.total - current.copies.available) {
    throw new ValidationError("Total copies cannot be lower than the number currently issued");
  }
  const book = await Book.findByIdAndUpdate(req.params.id, input, { new: true, runValidators: true });
  res.json({ status: "success", data: book });
}));

booksRouter.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  const book = await Book.findOneAndDelete({ _id: req.params.id, "copies.available": { $eq: 0 } });
  if (!book) throw new ValidationError("Only an administrator can delete a zero-stock catalog record");
  res.status(204).send();
}));
