import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";

export function authenticate(req, _res, next) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.lms_token || bearer;
  if (!token) return next(new AppError("Authentication required", 401));

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new AppError("Session expired or invalid", 401));
  }
}

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError("Insufficient permission", 403));
  }
  next();
};
