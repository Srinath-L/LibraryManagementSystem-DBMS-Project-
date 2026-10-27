import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/index.js";
import { config } from "../config.js";
import { asyncHandler } from "../lib/async-handler.js";
import { AppError } from "../lib/errors.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();
const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

authRouter.post("/login", asyncHandler(async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await User.findOne({ email: input.email, active: true }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = jwt.sign(
    { sub: user.id, name: user.name, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "8h" }
  );
  res.cookie("lms_token", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.cookieSecure,
    maxAge: 8 * 60 * 60 * 1000
  });
  res.json({ status: "success", data: { name: user.name, email: user.email, role: user.role } });
}));

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("lms_token");
  res.json({ status: "success" });
});

authRouter.get("/me", authenticate, (req, res) => {
  res.json({ status: "success", data: req.user });
});
