import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
}

export function errorHandler(error, req, res, _next) {
  let status = error.status || 500;
  let message = error.message || "Internal server error";
  let details = error.details;

  if (error instanceof ZodError) {
    status = 400;
    message = "Validation failed";
    details = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
  } else if (error?.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(error.keyPattern || {}).join(", ")}`;
  } else if (error?.name === "ValidationError") {
    status = 400;
  }

  req.log?.error({ error, status }, message);
  res.status(status).json({ status: "error", message, ...(details && { details }) });
}
