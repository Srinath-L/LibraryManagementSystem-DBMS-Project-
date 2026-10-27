# Demonstration script

## Before the review

```bash
docker compose up -d --build
docker compose exec app npm run seed
docker compose ps
```

Open `http://localhost:3000` and MongoDB Compass. Connect Compass to `mongodb://localhost:27017/?replicaSet=rs0`.

## Seven-minute demonstration

### 0:00 - Database implementation

- Show the six collections in Compass.
- Show the 137 total documents.
- Open the `books` validator and the ISBN/search indexes.

### 1:00 - Authentication

- Sign in as the administrator.
- Explain the HTTP-only JWT cookie and role checks.

### 1:40 - CRUD

- Add book B041.
- Search for it by title.
- Update its copy count.
- Explain why deletion is restricted when records are operationally active.

### 3:00 - Core workflow

- Register member M031.
- Issue an available book to M031.
- Renew it and show the due date and renewal count change. Explain the two-renewal cap and reservation/overdue rules.
- Return the loan and show the fine result.
- Explain that issue, return and renewal changes are committed as transactions.

### 4:30 - Reservation

- Open a zero-stock book.
- Reserve it for an active member.
- Show the ordered reservation queue.

### 5:20 - Analytics

- Show inventory by category.
- Show overdue loans and calculated fines.
- Show popular books, member activity, monthly circulation and queues.
- Export the overdue CSV.

### 6:30 - Close

- Show mobile responsiveness by narrowing the browser.
- Open `docs/RUBRIC_CHECKLIST.md` and summarize coverage.
