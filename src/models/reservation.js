import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
  _id: { type: String, match: /^R\d{3,}$/, required: true },
  bookId: { type: String, ref: "Book", required: true },
  memberId: { type: String, ref: "Member", required: true },
  reservationDate: { type: Date, required: true },
  status: { type: String, enum: ["Active", "Fulfilled", "Cancelled"], required: true }
}, { timestamps: true, versionKey: false });

reservationSchema.index({ bookId: 1, status: 1, reservationDate: 1 }, { name: "reservation_queue" });
reservationSchema.index(
  { bookId: 1, memberId: 1 },
  { unique: true, partialFilterExpression: { status: "Active" }, name: "one_active_reservation" }
);
export const Reservation = mongoose.model("Reservation", reservationSchema);
