# Library Management System

BCSE302P Database Systems Lab project by L Srinath (24BDS0265) and Sugash K (24BCE2565).

This repository contains the complete MongoDB project for all three reviews. It includes a responsive staff interface, protected REST API, database seed with more than 100 records, CRUD workflows, transactions, indexes, validation and six aggregation reports. Loan renewal is transactional, limited to two renewals and blocked for overdue loans or titles with active reservations.

## Rubric coverage

| Requirement | Implementation |
|---|---|
| At least 5 collections | authors, books, members, loans, reservations and users |
| 100+ documents | 137 seeded documents |
| CRUD operations | Books, members, loans and reservations |
| 5 aggregation queries | Six reports in `src/routes/analytics.js` |
| 2 indexes | Search, availability, active-loan and reservation indexes |
| Basic authentication | JWT cookie login with admin and librarian roles |
| Transactions | Issue, return and renewal workflows use MongoDB transactions |
| Loan renewal policy | Transactional renewal; maximum twice; blocked when overdue or queued |
| Responsive UI | Desktop, tablet and mobile layouts in `public/` |
| Documentation | Review 2 report, complete Review 3 report, user manual, slides and demo guide |

## Review 3 submission

The complete Review 3 report is in [`docs/Library_Management_System_Review_3_Report.pdf`](docs/Library_Management_System_Review_3_Report.pdf). It includes Chapters 1-8, IEEE-style references, the database schema/seed/query appendices, diagrams, screenshots and user manual. The full source code is included in this project archive. No public GitHub or Google Drive URL has been configured; upload this archive to the faculty-approved repository if an external URL is required.

## Fastest setup with Docker

1. Open Docker Desktop.
2. In this folder, run:

```bash
docker compose up -d --build
docker compose exec app npm run seed
```

3. Open `http://localhost:3000`.
4. Sign in with `admin@library.edu` and `admin123`.

The Docker configuration runs MongoDB as a single-node replica set so transaction demonstrations work.

## Local setup

Requirements: Node.js 20+, MongoDB 6+ configured as a replica set, and npm.

```bash
cp .env.example .env
npm install
npm run seed
npm start
```

## Useful commands

```bash
npm test          # unit tests for fine and due-date logic
npm run check     # JavaScript syntax checks
npm run seed      # reset and reload demonstration data
npm run dev       # development server with Node watch mode
```

## Seeded data and login

| Collection | Records |
|---|---:|
| authors | 20 |
| books | 40 |
| members | 30 |
| loans | 30 |
| reservations | 15 |
| users | 2 |
| **Total** | **137** |

- Administrator: `admin@library.edu` / `admin123`
- Librarian: `librarian@library.edu` / `admin123`

Change the demonstration password and `JWT_SECRET` before deploying outside the classroom.

## Project structure

```text
public/              responsive user interface
src/models/          MongoDB collections and indexes
src/routes/          authentication, CRUD, circulation and analytics
src/middleware/      authentication and error handling
src/scripts/seed.js  137-record seed and database validation
test/                automated unit tests
docs/                reports, user manual, demo script and viva guide
```

## Demonstration order

1. Sign in and show the dashboard counts.
2. Add, search and update a book.
3. Register a member.
4. Issue and return a book, then explain the transaction.
5. Reserve a book with zero available copies.
6. Show the six live reports and export the overdue CSV.
7. Show indexes and validators in MongoDB Compass.

See `docs/DEMO_SCRIPT.md` for a timed demonstration and `docs/RUBRIC_CHECKLIST.md` before submission.
