import { Router } from "express";
import { z } from "zod";
import { Member, Loan } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { authorize } from "../middleware/auth.js";

export const membersRouter = Router();
const memberInput = z.object({
  _id: z.string().regex(/^M\d{3}$/),
  name: z.string().min(2).max(100),
  department: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\d{10}$/),
  membershipType: z.enum(["Student", "Faculty"]),
  active: z.boolean().default(true)
});

membersRouter.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { department: { $regex: escaped, $options: "i" } }
    ];
  }
  const data = await Member.find(filter).sort({ name: 1 }).limit(100).lean();
  res.json({ status: "success", data });
}));

membersRouter.get("/:id", asyncHandler(async (req, res) => {
  const [member, loans] = await Promise.all([
    Member.findById(req.params.id).lean(),
    Loan.find({ memberId: req.params.id }).sort({ issueDate: -1 }).limit(25).lean()
  ]);
  if (!member) throw new NotFoundError("Member not found");
  res.json({ status: "success", data: { ...member, loans } });
}));

membersRouter.post("/", authorize("admin", "librarian"), asyncHandler(async (req, res) => {
  const member = await Member.create(memberInput.parse(req.body));
  res.status(201).json({ status: "success", data: member });
}));

membersRouter.patch("/:id", authorize("admin", "librarian"), asyncHandler(async (req, res) => {
  const current = await Member.findById(req.params.id).lean();
  if (!current) throw new NotFoundError("Member not found");
  const member = await Member.findByIdAndUpdate(
    req.params.id,
    memberInput.parse({ ...current, ...req.body, _id: req.params.id }),
    { new: true, runValidators: true }
  );
  res.json({ status: "success", data: member });
}));

membersRouter.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  const activeLoans = await Loan.countDocuments({ memberId: req.params.id, status: "Issued" });
  if (activeLoans) throw new ValidationError("Return all books before deleting this member");
  const member = await Member.findByIdAndDelete(req.params.id);
  if (!member) throw new NotFoundError("Member not found");
  res.status(204).send();
}));
