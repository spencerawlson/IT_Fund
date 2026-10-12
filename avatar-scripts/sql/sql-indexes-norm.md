# Indexes & Normalization: Speed and the One-Fact-One-Place Rule — Avatar Tutor Script

**Lesson ID:** sql-indexes-norm
**Track:** SQL & Databases
**Estimated runtime:** ~5 minutes (~718 words)

## Spoken script

**[HOOK — 0:00]**
A query that returns in milliseconds on a thousand rows can take minutes on
ten million. The difference is almost always indexing. And behind indexing
stands schema design — the discipline of storing each fact exactly once.
This lesson is about why databases get slow, and how good design keeps them
fast.

**[WHY IT MATTERS — 0:25]**
Everything works on small data. Then the table grows, the dashboard crawls,
and someone asks why the query that was instant last year now takes all
morning. Almost always, the answer is a missing index or a sloppy
schema. These two ideas — indexes for speed, normalisation for integrity —
are the core of database performance and design.

**[SECTION — Indexes: the book-index analogy, made real — 0:50]**
An index is a data structure — usually a B-tree — that lets the database find
rows by column value without scanning the whole table. Exactly like a book
index lets you find a topic without reading every page. Instead of reading a
million rows, the database walks the index and jumps straight to the ones it
needs. That's the whole magic: skipping work.

But the trade-off is fundamental, so memorise it: indexes make reads faster
but writes slower, because every INSERT and UPDATE must maintain each index —
and indexes consume storage too. An index isn't free; it's a bet that you
read far more than you write. So index the columns you filter and join on,
and don't index everything. A table with twenty indexes is a table that
dreads every insert.

Without a usable index, the database falls back to a full table scan —
reading every single row to answer the query. On small tables that's fine;
on large ones it's the performance cliff. When someone says "the database is
slow," translate it as "something is scanning."

A composite index on (a, b) serves queries filtering on a, or on a and b
together — the left-most prefix rule — but not queries on b alone. Think of
a phone book sorted by last name, then first: great for finding a surname,
useless for finding everyone named Dave. Column order in the index matters.

And when a query is slow, EXPLAIN — or EXPLAIN ANALYZE — shows the planner's
actual execution plan: which scans, which joins, which indexes were used, and
at what cost. It is the first tool you reach for, every time. Don't guess
why it's slow. Ask the planner.

**[SECTION — Normalization: one fact, one place — 2:50]**
Normalisation is the discipline of eliminating redundancy. First Normal Form
demands atomic values — no arrays or repeating groups stuffed into a single
cell; one value per column per row. If you're tempted to store "phone1,
phone2, phone3" as columns, 1NF is telling you to make a phone-numbers table
instead.

Third Normal Form goes further, removing transitive dependencies: every
non-key attribute must depend on the key, the whole key, and nothing but the
key. In plain terms: don't store the customer's city in the orders table when
it already lives in the customers table. The payoff is integrity — one fact
stored in one place cannot contradict itself, and updates can't leave stale
copies behind. Change the city once, and it's changed everywhere, because
there's only one copy.

But normalisation optimises for correctness, not speed — and reporting
queries that join a dozen tables pay for it in join cost. Deliberate
denormalisation — accepting some redundancy to avoid joins — is a legitimate
performance technique, common in analytics. The rule, and it's a good one:
normalise by default for integrity, denormalise by measurement when reads
demand it. Never denormalise by guess. Measure first, then decide the joins
are worth the redundancy.

**[COMMON MISTAKES — 4:30]**
Three traps. One: indexing everything — every index taxes every write, so
index what you filter and join on. Two: denormalising by guess instead of
measurement — normalise by default. Three: a composite index on (a, b)
helping queries on b alone — the left-most prefix rule says no.

**[RECAP — 5:00]**
Indexes are B-trees that skip the full table scan — faster reads, slower
writes, more storage — so index what you filter and join on. Composite
indexes obey the left-most prefix rule, and EXPLAIN is always your first
diagnostic. Normalisation stores each fact once: 1NF wants atomic values,
3NF wants every attribute depending on the key, the whole key, and nothing
but the key. Denormalisation trades redundancy for read speed — legitimate,
but only by measurement, never by guess. Speed and integrity: that's the
whole lesson.

## On-screen visuals

- HOOK: the same query — milliseconds on a small table, minutes on a huge
  one — with an index closing the gap.
- Indexes SECTION: a B-tree lookup jumping to rows versus a full table scan
  reading every row; the read-faster/write-slower trade-off as a balance
  scale; a phone book illustrating the left-most prefix rule; an EXPLAIN
  plan highlighting scans and index usage.
- Normalisation SECTION: a denormalised table with duplicated cities
  collapsing into customers and orders tables; one fact, one place, with an
  update propagating from the single copy; the "measure first" rule before
  denormalising.
- RECAP: the cheat-sheet terms as a clean summary card.
