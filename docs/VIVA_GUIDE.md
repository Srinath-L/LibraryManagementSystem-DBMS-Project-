# Viva guide

## Why MongoDB?

Book metadata varies by edition and publisher, and author IDs fit naturally in an array. Loans and reservations remain separate because their history can grow without limit. MongoDB supports flexible documents, indexes, aggregation and transactions in one system.

## Why not embed loans in members?

An embedded loan history would grow indefinitely and make member documents expensive to update. Separate loan documents also support reporting across all members.

## How is consistency protected?

Mongoose validation checks application input. MongoDB JSON Schema validators protect the database directly. Unique and partial indexes prevent duplicate ISBNs, duplicate active loans and duplicate active reservations.

## Where are transactions used?

Issue and return operations change more than one collection. Transactions ensure the loan, copy count and reservation state commit together or roll back together.

## Which indexes are important?

The text index supports catalog search. Compound loan indexes support member history and active-loan queries. The reservation index retrieves the oldest active request for a book.

## What analytics are implemented?

The reports cover inventory, popularity, overdue fines, member activity, monthly circulation and reservation queues. They use `$group`, `$lookup`, `$dateDiff`, `$cond`, `$sort`, `$limit` and computed fields.

## How is the application secured?

Passwords use bcrypt hashes. Login creates a signed JWT stored in an HTTP-only cookie. Authorization middleware checks admin and librarian roles. Helmet sets secure headers and rate limiting reduces abuse.

## What would be added in production?

Use managed MongoDB backups, TLS, a secret manager, email notifications, refresh-token rotation, audit logs and automated integration tests in CI.
