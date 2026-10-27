import test from "node:test";
import assert from "node:assert/strict";
import { addDays, calculateFine, isOverdue, renewalDecision } from "../src/lib/circulation.js";

test("fine is zero when returned on the due date", () => {
  assert.deepEqual(calculateFine("2026-09-10", "2026-09-10"), { overdueDays: 0, fine: 0 });
});

test("fine is ten rupees for each overdue day", () => {
  assert.deepEqual(calculateFine("2026-09-10", "2026-09-15"), { overdueDays: 5, fine: 50 });
});

test("early return never produces a negative fine", () => {
  assert.deepEqual(calculateFine("2026-09-10", "2026-09-01"), { overdueDays: 0, fine: 0 });
});

test("addDays preserves the expected UTC interval", () => {
  assert.equal(addDays("2026-09-10T00:00:00Z", 14).toISOString(), "2026-09-24T00:00:00.000Z");
});

test("renewal is allowed through the due date when no member is waiting", () => {
  assert.deepEqual(renewalDecision({ status: "Issued", dueDate: "2026-09-10", renewals: 0 }, false, "2026-09-10T18:00:00Z"), { allowed: true, reason: null });
});

test("a loan is not marked overdue until the day after its due date", () => {
  assert.equal(isOverdue("2026-09-10", "2026-09-10T23:59:00Z"), false);
  assert.equal(isOverdue("2026-09-10", "2026-09-11T00:00:00Z"), true);
});

test("renewal is blocked after the due date, at the limit, and when a reservation exists", () => {
  const loan = { status: "Issued", dueDate: "2026-09-10", renewals: 1 };
  assert.equal(renewalDecision(loan, false, "2026-09-11").reason, "Overdue loans cannot be renewed");
  assert.equal(renewalDecision({ ...loan, renewals: 2 }, false, "2026-09-10").reason, "Maximum renewals reached");
  assert.equal(renewalDecision(loan, true, "2026-09-10").reason, "Another member is waiting for this book");
});
