# User manual

## Sign in

Open the application and enter a seeded staff account. Administrators can perform every operation. Librarians can manage books, members and circulation but cannot perform administrator-only deletion.

## Overview

The overview displays catalog size, active members, issued books, overdue loans, reservation count and recorded fines. The current-loan list highlights overdue items.

## Books

Use Books to search by title, ISBN or publisher. Select Add book to create a record. Author IDs must already exist in the authors collection. Available copies cannot exceed total copies.

## Members

Use Members to register, search and edit library members. A member must be active before a book can be issued or reserved.

## Circulation

Select Issue book, choose an available title and an active member, then choose the loan period. The system decreases available stock and creates the loan in one transaction.

Select Return on an active loan. The system calculates the overdue fine at Rs. 10 per day, marks the loan returned, restores stock and fulfils the oldest reservation in one transaction.

Select Renew on an active loan to add 14 days to its current due date. A loan may be renewed at most twice and only through its due date. Renewal is refused if the loan is overdue or any member has an active reservation for that title. The due-date change and renewal counter are saved in one transaction.

## Reservations

Reservations are allowed only when no copy is available. The oldest active request has priority. Staff can cancel an active reservation.

## Reports

Reports contains six MongoDB aggregation results: inventory, popular titles, overdue loans, member activity, monthly circulation and reservation queues. A loan becomes overdue the day after its due date. Use Export overdue CSV to download evidence.

## Common problems

- If transactions fail, confirm MongoDB is running as a replica set.
- If login fails after a new database, run `npm run seed`.
- If port 3000 is busy, change `PORT` in `.env`.
- If the database does not connect, verify `MONGODB_URI` and run `docker compose ps`.
