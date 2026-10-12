# Tables & Changing Data: DDL, DML, and the WHERE That Saves You — Avatar Tutor Script

**Lesson ID:** sql-ddl-dml
**Track:** SQL & Databases
**Estimated runtime:** ~5 minutes (~649 words)

## Spoken script

**[HOOK — 0:00]**
So far you've been reading data. Now you change it: creating tables,
inserting rows, updating values, and — carefully — deleting them. This is
where SQL gets the power to destroy. The syntax is easy. The discipline is
everything.

**[WHY IT MATTERS — 0:25]**
Reading is safe; writing is not. Every application you use writes to a
database constantly, and every one of those writes can corrupt or destroy
data if done carelessly. Knowing DDL and DML — and the habits that keep them
safe — is what separates someone who can query a database from someone you'd
trust with one.

**[SECTION — Defining structure: DDL — 0:50]**
"CREATE TABLE users" with its column definitions brings a table into
existence — this is Data Definition Language, the part of SQL that shapes the
database itself. You're not touching data here; you're building the container
the data will live in. Get the shape right now and everything downstream is
easier.

"ALTER TABLE" modifies that shape afterwards: add a column, drop a
constraint, change a type. Schemas evolve — new requirements arrive, old
assumptions break — so ALTER is how a living database adapts without being
rebuilt from scratch.

"DROP TABLE" removes the table entirely — structure and data both. Gone. Treat
it with the respect you'd give any irreversible command, because there is no
"undo" waiting to save you outside a transaction.

Then there are constraints — the database enforcing your rules so your
application doesn't have to. NOT NULL forbids missing values. UNIQUE forbids
duplicates. DEFAULT supplies a value when an insert omits the column, like a
created-at timestamp defaulting to now. And CHECK rejects any row violating a
boolean condition — "CHECK price >= 0" means negative prices can never exist,
no matter what the application tries. The lesson's advice is worth framing:
declare constraints generously. Data that cannot be wrong never needs
cleaning. Every rule the database enforces is a bug your application never
has to prevent and a cleanup job nobody ever has to run.

**[SECTION — Changing data: DML, and the WHERE that saves you — 2:40]**
"INSERT INTO users" with a column list and VALUES adds a row. "UPDATE users
SET email" with "WHERE id equals 7" changes one. "DELETE FROM users" with
"WHERE id equals 7" removes one. Notice the pattern: UPDATE and DELETE without
a WHERE clause hit every row in the table. Every single one.

That is not a theoretical risk — the lesson calls it one of the most common
production disasters in the industry. Someone meant to deactivate one user
and deactivated all of them; someone meant to delete test rows and emptied
the table. The defence is a habit, and it's non-negotiable: never execute a
bare UPDATE or DELETE. Always write the WHERE first, before anything else.
Paranoia is the correct attitude here.

Finally, DELETE versus TRUNCATE. DELETE removes selected rows: it's logged,
it's precise, and inside a transaction it's rollback-able. TRUNCATE empties
the entire table far faster — but with no granularity and, in most systems,
no easy undo. Different tools, different jobs: DELETE for precision, TRUNCATE
for wholesale resets. If you need "remove these specific rows," that's
DELETE. If you need "empty this staging table before the nightly load,"
that's TRUNCATE — and you'd better be sure it's the staging table.

**[COMMON MISTAKES — 4:30]**
Three traps. One: the bare UPDATE or DELETE — no WHERE means every row.
Write the WHERE first, always. Two: reaching for TRUNCATE when you meant
DELETE — fast, total, and no easy undo. Three: skipping constraints and
hoping the application gets it right. Declare them generously; data that
cannot be wrong never needs cleaning.

**[RECAP — 5:00]**
DDL shapes the database: CREATE brings tables into existence, ALTER evolves
them, DROP removes them entirely. Constraints — NOT NULL, UNIQUE, DEFAULT,
CHECK — make the database enforce your rules. DML changes the data: INSERT
adds, UPDATE modifies, DELETE removes — and UPDATE and DELETE always take a
WHERE, because without one they hit every row. DELETE is precise, logged, and
rollback-able; TRUNCATE is a fast full-table wipe with no easy undo. Easy
syntax, serious discipline — that's changing data.

## On-screen visuals

- HOOK: a read-only magnifying glass handing off to an editing pen, with a
  warning stripe.
- DDL SECTION: a table blueprint being created, altered with a new column,
  then dropped entirely; four constraint badges — NOT NULL, UNIQUE, DEFAULT,
  CHECK — rejecting bad rows at the gate.
- DML SECTION: INSERT adding a row, UPDATE with a WHERE changing one row
  versus without a WHERE changing all rows highlighted in red; DELETE versus
  TRUNCATE as scalpel versus bulldozer.
- RECAP: the cheat-sheet terms as a clean summary card.
