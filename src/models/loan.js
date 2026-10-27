import mongoose from "mongoose";

const loanSchema = new mongoose.Schema({
  _id: { type: String, match: /^L\d{3,}$/, required: true },
  bookId: { type: String, ref: "Book", required: true },
  memberId: { type: String, ref: "Member", required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date, default: null },
  status: { type: String, enum: ["Issued", "Returned"], required: true },
  fine: { type: Number, min: 0, default: 0 },
  renewals: { type: Number, min: 0, max: 2, default: 0 },
  issuedBy: { type: String, ref: "User", required: true }
}, { timestamps: true, versionKey: false });

loanSchema.index({ memberId: 1, status: 1, dueDate: 1 }, { name: "member_active_loans" });
loanSchema.index({ bookId: 1, status: 1 }, { name: "book_loan_history" });
loanSchema.index(
  { bookId: 1, memberId: 1 },
  { unique: true, partialFilterExpression: { status: "Issued" }, name: "one_active_copy_per_member" }
);
export const Loan = mongoose.model("Loan", loanSchema);
