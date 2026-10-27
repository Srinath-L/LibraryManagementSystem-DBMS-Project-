export class AppError extends Error {
  constructor(message, status = 500, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") { super(message, 404); }
}

export class ConflictError extends AppError {
  constructor(message) { super(message, 409); }
}

export class ValidationError extends AppError {
  constructor(message, details) { super(message, 400, details); }
}
