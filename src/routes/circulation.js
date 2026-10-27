import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Book, Loan, Member, Reservation } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../lib/errors.js";
import { addDays, calculateFine, renewalDecision } from "../lib/circulation.js";

export const circulationRouter = Router();
const issueInput = z.object({
  bookId: z.string().regex(/^B\d{3}$/),
  memberId: z.string().regex(/^M\d{3}$/),
  loanDays: z.coerce.number().int().min(1).max(60).default(14)
});

async function nextId(model, prefix, session) {
  const query = model.findOne({}, { _id: 1 }).sort({ _id: -1 });
  if (session) query.session(session);
  const latest = await query.lean();
  const number = latest ? Number(String(latest._id).slice(1)) + 1 : 1;
  return `${prefix}${String(number).padStart(3, "0")}`;
}

circulationRouter.get("/loans", asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const data = await Loan.aggregate([
    { $match: filter },
    { $sort: { issueDate: -1 } },
    { $limit: 100 },
    { $lookup: { from: "books", localField: "bookId", foreignField: "_id", as: "book" } },
    { $lookup: { from: "members", localField: "memberId", foreignField: "_id", as: "member" } },
    { $set: { book: { $first: "$book" }, member: { $first: "$member" } } },
    { $project: { _id: 1, bookId: 1, memberId: 1, title: "$book.title", memberName: "$member.name", issueDate: 1, dueDate: 1, returnDate: 1, status: 1, fine: 1, renewals: 1 } }
  ]);
  res.json({ status: "success", data });
}));

circulationRouter.post("/issue", asyncHandler(async (req, res) => {
  const input = issueInput.parse(req.body);
  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const [book, member, duplicate] = await Promise.all([
        Book.findById(input.bookId).session(session),
        Member.findById(input.memberId).session(session),
        Loan.findOne({ bookId: input.bookId, memberId: input.memberId, status: "Issued" }).session(session)
      ]);
      if (!book) throw new NotFoundError("Book not found");
      if (!member) throw new NotFoundError("Member not found");
      if (!member.active) throw new ValidationError("Member account is inactive");
      if (duplicate) throw new ConflictError("This member already has an active loan for this book");
      if (book.copies.available < 1) throw new ConflictError("No copy is currently available");

      const issueDate = new Date();
      const loanId = await nextId(Loan, "L", session);
      [created] = await Loan.create([{
        _id: loanId,
        bookId: book._id,
        memberId: member._id,
        issueDate,
        dueDate: addDays(issueDate, input.loanDays),
        returnDate: null,
        status: "Issued",
        fine: 0,
        issuedBy: req.user.sub
      }], { session });
      await Book.updateOne({ _id: book._id, "copies.available": { $gt: 0 } }, { $inc: { "copies.available": -1 } }, { session });
    });
  } catch (error) {
    if (error?.errorLabels?.includes("TransientTransactionError")) {
      throw new AppError("Transaction conflict. Please retry the issue operation", 409);
    }
    throw error;
  } finally {
    await session.endSession();
  }
  res.status(201).json({ status: "success", data: created });
}));

circulationRouter.post("/return/:loanId", asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const loan = await Loan.findOne({ _id: req.params.loanId, status: "Issued" }).session(session);
      if (!loan) throw new NotFoundError("Active loan not found");
      const returnedAt = new Date();
      const { overdueDays, fine } = calculateFine(loan.dueDate, returnedAt);

      await Loan.updateOne(
        { _id: loan._id, status: "Issued" },
        { $set: { status: "Returned", returnDate: returnedAt, fine } },
        { session }
      );
      await Book.updateOne(
        { _id: loan.bookId, $expr: { $lt: ["$copies.available", "$copies.total"] } },
        { $inc: { "copies.available": 1 } },
        { session }
      );
      const nextReservation = await Reservation.findOne({ bookId: loan.bookId, status: "Active" })
        .sort({ reservationDate: 1 })
        .session(session);
      if (nextReservation) {
        await Reservation.updateOne({ _id: nextReservation._id }, { $set: { status: "Fulfilled" } }, { session });
      }
      result = { loanId: loan._id, returnedAt, overdueDays, fine, fulfilledReservation: nextReservation?._id || null };
    });
  } finally {
    await session.endSession();
  }
  res.json({ status: "success", data: result });
}));

circulationRouter.post("/renew/:loanId", asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const loan = await Loan.findById(req.params.loanId).session(session);
      if (!loan) throw new NotFoundError("Loan not found");
      const hasActiveReservation = Boolean(await Reservation.exists({ bookId: loan.bookId, status: "Active" }).session(session));
      const decision = renewalDecision(loan, hasActiveReservation);
      if (!decision.allowed) throw new ValidationError(decision.reason);
      loan.dueDate = addDays(loan.dueDate, 14);
      loan.renewals = (loan.renewals || 0) + 1;
      await loan.save({ session });
      result = { loanId: loan._id, dueDate: loan.dueDate, renewals: loan.renewals, maximumRenewals: 2 };
    });
  } finally {
    await session.endSession();
  }
  res.json({ status: "success", data: result });
}));

circulationRouter.get("/reservations", asyncHandler(async (_req, res) => {
  const data = await Reservation.aggregate([
    { $sort: { reservationDate: 1 } },
    { $lookup: { from: "books", localField: "bookId", foreignField: "_id", as: "book" } },
    { $lookup: { from: "members", localField: "memberId", foreignField: "_id", as: "member" } },
    { $project: { _id: 1, bookId: 1, memberId: 1, title: { $first: "$book.title" }, memberName: { $first: "$member.name" }, reservationDate: 1, status: 1 } }
  ]);
  res.json({ status: "success", data });
}));

circulationRouter.post("/reserve", asyncHandler(async (req, res) => {
  const input = issueInput.pick({ bookId: true, memberId: true }).parse(req.body);
  const [book, member] = await Promise.all([Book.findById(input.bookId), Member.findById(input.memberId)]);
  if (!book) throw new NotFoundError("Book not found");
  if (!member || !member.active) throw new ValidationError("An active member is required");
  if (book.copies.available > 0) throw new ValidationError("This book is available and should be issued instead");
  const id = await nextId(Reservation, "R");
  const reservation = await Reservation.create({
    _id: id,
    bookId: input.bookId,
    memberId: input.memberId,
    reservationDate: new Date(),
    status: "Active"
  });
  res.status(201).json({ status: "success", data: reservation });
}));

circulationRouter.patch("/reservations/:id/cancel", asyncHandler(async (req, res) => {
  const reservation = await Reservation.findOneAndUpdate(
    { _id: req.params.id, status: "Active" },
    { $set: { status: "Cancelled" } },
    { new: true }
  );
  if (!reservation) throw new NotFoundError("Active reservation not found");
  res.json({ status: "success", data: reservation });
}));
