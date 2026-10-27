import { Router } from "express";
import { Book, Loan, Member, Reservation } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";

export const analyticsRouter = Router();

analyticsRouter.get("/dashboard", asyncHandler(async (_req, res) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [books, members, activeLoans, overdue, activeReservations, fines] = await Promise.all([
    Book.countDocuments(),
    Member.countDocuments({ active: true }),
    Loan.countDocuments({ status: "Issued" }),
    Loan.countDocuments({ status: "Issued", dueDate: { $lt: today } }),
    Reservation.countDocuments({ status: "Active" }),
    Loan.aggregate([{ $group: { _id: null, total: { $sum: "$fine" } } }])
  ]);
  res.json({
    status: "success",
    data: { books, members, activeLoans, overdue, activeReservations, fines: fines[0]?.total || 0 }
  });
}));

analyticsRouter.get("/reports", asyncHandler(async (_req, res) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [inventory, popularBooks, overdueLoans, memberActivity, monthlyCirculation, reservationQueues] = await Promise.all([
    Book.aggregate([
      { $group: { _id: "$category", titles: { $sum: 1 }, totalCopies: { $sum: "$copies.total" }, availableCopies: { $sum: "$copies.available" } } },
      { $set: { issuedCopies: { $subtract: ["$totalCopies", "$availableCopies"] } } },
      { $sort: { totalCopies: -1, _id: 1 } }
    ]),
    Loan.aggregate([
      { $group: { _id: "$bookId", borrowCount: { $sum: 1 } } },
      { $sort: { borrowCount: -1 } },
      { $limit: 8 },
      { $lookup: { from: "books", localField: "_id", foreignField: "_id", as: "book" } },
      { $project: { _id: 0, bookId: "$_id", title: { $first: "$book.title" }, borrowCount: 1 } }
    ]),
    Loan.aggregate([
      { $match: { status: "Issued", dueDate: { $lt: today } } },
      { $set: { overdueDays: { $dateDiff: { startDate: "$dueDate", endDate: today, unit: "day" } } } },
      { $set: { calculatedFine: { $multiply: ["$overdueDays", 10] } } },
      { $lookup: { from: "books", localField: "bookId", foreignField: "_id", as: "book" } },
      { $lookup: { from: "members", localField: "memberId", foreignField: "_id", as: "member" } },
      { $project: { _id: 1, bookId: 1, memberId: 1, title: { $first: "$book.title" }, memberName: { $first: "$member.name" }, dueDate: 1, overdueDays: 1, calculatedFine: 1 } },
      { $sort: { overdueDays: -1 } }
    ]),
    Loan.aggregate([
      { $group: { _id: "$memberId", totalLoans: { $sum: 1 }, activeLoans: { $sum: { $cond: [{ $eq: ["$status", "Issued"] }, 1, 0] } }, totalFine: { $sum: "$fine" } } },
      { $sort: { totalLoans: -1 } },
      { $limit: 10 },
      { $lookup: { from: "members", localField: "_id", foreignField: "_id", as: "member" } },
      { $project: { _id: 0, memberId: "$_id", name: { $first: "$member.name" }, totalLoans: 1, activeLoans: 1, totalFine: 1 } }
    ]),
    Loan.aggregate([
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$issueDate" } }, loans: { $sum: 1 }, returns: { $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]),
    Reservation.aggregate([
      { $match: { status: "Active" } },
      { $sort: { reservationDate: 1 } },
      { $group: { _id: "$bookId", queueLength: { $sum: 1 }, nextMember: { $first: "$memberId" }, oldestRequest: { $first: "$reservationDate" } } },
      { $lookup: { from: "books", localField: "_id", foreignField: "_id", as: "book" } },
      { $project: { _id: 0, bookId: "$_id", title: { $first: "$book.title" }, queueLength: 1, nextMember: 1, oldestRequest: 1 } },
      { $sort: { queueLength: -1, oldestRequest: 1 } }
    ])
  ]);
  res.json({ status: "success", data: { inventory, popularBooks, overdueLoans, memberActivity, monthlyCirculation, reservationQueues } });
}));

analyticsRouter.get("/export/overdue.csv", asyncHandler(async (_req, res) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rows = await Loan.find({ status: "Issued", dueDate: { $lt: today } }).sort({ dueDate: 1 }).lean();
  const csv = ["loan_id,book_id,member_id,due_date", ...rows.map((r) => `${r._id},${r.bookId},${r.memberId},${r.dueDate.toISOString()}`)].join("\n");
  res.type("text/csv").attachment("overdue-loans.csv").send(csv);
}));
