export function calculateFine(dueDate, returnedAt = new Date(), dailyRate = 10) {
  const due = new Date(dueDate);
  const returned = new Date(returnedAt);
  const overdueMs = returned.setUTCHours(0, 0, 0, 0) - due.setUTCHours(0, 0, 0, 0);
  const overdueDays = Math.max(0, Math.floor(overdueMs / 86400000));
  return { overdueDays, fine: overdueDays * dailyRate };
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * 86400000);
}

export function startOfUtcDay(date = new Date()) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

export function isOverdue(dueDate, today = new Date()) {
  return startOfUtcDay(dueDate) < startOfUtcDay(today);
}

export function renewalDecision(loan, hasActiveReservation, today = new Date(), maximumRenewals = 2) {
  if (loan.status !== "Issued") return { allowed: false, reason: "Only active loans can be renewed" };
  if ((loan.renewals || 0) >= maximumRenewals) return { allowed: false, reason: "Maximum renewals reached" };
  if (isOverdue(loan.dueDate, today)) return { allowed: false, reason: "Overdue loans cannot be renewed" };
  if (hasActiveReservation) return { allowed: false, reason: "Another member is waiting for this book" };
  return { allowed: true, reason: null };
}
