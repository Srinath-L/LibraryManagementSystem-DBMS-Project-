# API reference

All routes except login and health require the `lms_token` cookie or a Bearer token.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Staff login |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/books` | Search and list books |
| POST | `/api/books` | Create book |
| PATCH | `/api/books/:id` | Update book |
| DELETE | `/api/books/:id` | Admin-only deletion |
| GET | `/api/members` | Search and list members |
| POST | `/api/members` | Register member |
| PATCH | `/api/members/:id` | Update member |
| DELETE | `/api/members/:id` | Admin-only deletion |
| GET | `/api/circulation/loans` | Loan history |
| POST | `/api/circulation/issue` | Atomic issue workflow |
| POST | `/api/circulation/return/:loanId` | Atomic return workflow |
| GET | `/api/circulation/reservations` | Reservation queue |
| POST | `/api/circulation/reserve` | Create reservation |
| PATCH | `/api/circulation/reservations/:id/cancel` | Cancel reservation |
| GET | `/api/analytics/dashboard` | Summary counts |
| GET | `/api/analytics/reports` | Six aggregation reports |
| GET | `/api/analytics/export/overdue.csv` | CSV export |
