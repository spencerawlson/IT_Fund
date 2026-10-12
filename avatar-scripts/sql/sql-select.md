# Filtering & Sorting: WHERE, ORDER BY, and the Art of the Question — Avatar Tutor Script

**Lesson ID:** sql-select
**Track:** SQL & Databases
**Estimated runtime:** ~5 minutes (~654 words)

## Spoken script

**[HOOK — 0:00]**
Reading data is the first ninety percent of SQL. And here's the promise:
SELECT plus a handful of clauses — WHERE, ORDER BY, LIMIT, DISTINCT — answers
an enormous range of real questions, from "which users signed up today" to
"what are our top ten products." Five clauses, endless questions.

**[WHY IT MATTERS — 0:25]**
Every investigation starts with reading: which hosts talked to that
suspicious IP, which accounts failed to log in, what changed overnight. The
clauses in this lesson are the vocabulary of asking. Master them and you can
interrogate any database with precision instead of dumping whole tables and
squinting.

**[SECTION — Filtering and shaping the result — 0:50]**
WHERE is how you filter rows: "WHERE age >= 18" keeps only adults. It's the
sieve everything pours through. Combine conditions with AND, OR, and NOT,
using parentheses to control precedence exactly as in arithmetic — because
"adults from Canada or admins" means something very different with and
without parentheses. And "WHERE id IN (1, 2, 3)" is shorthand for a chain of
OR comparisons: "id equals any of these." Once your list of values grows past
two or three, IN is dramatically more readable than a tower of ORs.

Text gets pattern matching through LIKE. The percent sign matches any
sequence, the underscore matches a single character: "WHERE name LIKE 'A%'"
finds names starting with A. Think of percent as "anything, any length" and
underscore as "exactly one mystery character."

Numeric ranges use BETWEEN 10 AND 20 — and here's the detail worth
memorising: it's inclusive of both endpoints. Off-by-one errors love to hide
here, in date ranges especially. "Is the end date included?" With BETWEEN,
yes. Always.

And missing values need their own syntax: "WHERE col IS NULL" — or IS NOT
NULL. Writing "WHERE col equals NULL" silently returns nothing, because
comparing anything to unknown yields unknown. The lesson calls this the
single most common beginner mistake in SQL, and now you'll never make it. When
a query returns mysteriously empty results, check for a NULL comparison
first — it's the usual suspect.

**[SECTION — Ordering, deduplicating, and presenting — 2:40]**
"ORDER BY column DESC" sorts results descending; ascending is the default, so
you only name it when you need to be explicit. Sorting is usually paired with
LIMIT n — "the ten most recent orders" is "ORDER BY created_at DESC LIMIT 10".
Newest first, then take ten. And note the dialect quirk: SQL Server spells it
TOP n instead of LIMIT. Same idea, different keyword — one of those
differences worth knowing when you switch systems.

DISTINCT removes duplicate rows from the result: "SELECT DISTINCT country
FROM users" lists each country once. Why does that matter? Because raw tables
repeat values constantly, and most "how many different" questions need the
deduplicated answer, not the raw count. You'll meet COUNT DISTINCT in the
aggregates lesson as its natural partner.

Finally, presentation. When a column name is ugly or a computed value needs a
label, alias it: "SELECT price AS cost" renames the column in the output.
Aliases also name computed columns — the moment you start doing arithmetic in
SELECT, like price times quantity, the output column needs a name or you get
something unreadable. AS is a tiny keyword that makes results human-friendly,
and future you, reading the query next month, will be grateful.

**[COMMON MISTAKES — 4:20]**
Three traps. One: "equals NULL" instead of IS NULL — the silent empty
result. Two: forgetting that BETWEEN includes both endpoints — your date
range just gained an extra day. Three: AND/OR without parentheses. Precedence
will not guess your intent; parenthesise it.

**[RECAP — 4:50]**
WHERE filters rows, with AND, OR, NOT, and parentheses controlling the logic;
IN is shorthand for a chain of ORs. LIKE patterns use percent for any
sequence and underscore for one character; BETWEEN is inclusive on both ends;
NULL is tested only with IS NULL. ORDER BY sorts — DESC for descending, ASC
the default — usually paired with LIMIT, or TOP in SQL Server. DISTINCT
deduplicates, and AS aliases columns into readable names. Five clauses,
endless questions — that's the art of asking.

## On-screen visuals

- HOOK: five clause chips — WHERE, ORDER BY, LIMIT, DISTINCT, LIKE —
  assembling into questions like "top ten products".
- Filtering SECTION: a table pouring through a WHERE sieve; LIKE patterns
  lighting up matches with % and _ highlighted; a BETWEEN range on a number
  line with both endpoints filled in; "equals NULL" returning empty versus
  "IS NULL" returning rows.
- Ordering SECTION: rows sorting newest-first then LIMIT slicing the top
  ten; DISTINCT collapsing duplicate countries to one each; an aliased
  computed column getting a readable name.
- RECAP: the cheat-sheet terms as a clean summary card.
