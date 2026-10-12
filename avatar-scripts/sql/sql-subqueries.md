# Subqueries & CTEs: Queries Inside Queries — Avatar Tutor Script

**Lesson ID:** sql-subqueries
**Track:** SQL & Databases
**Estimated runtime:** ~5 minutes (~703 words)

## Spoken script

**[HOOK — 0:00]**
Some questions can't be answered in a single flat query: "customers whose
orders exceed the average," "products never purchased." For those, you build
the answer in layers — queries inside queries. This is where SQL starts to
feel like a real programming language.

**[WHY IT MATTERS — 0:25]**
Real questions are composite. "Above average" needs the average computed
first; "never purchased" needs the purchased list built first. Subqueries and
CTEs let you compose those steps instead of running three separate queries
and stitching results together by hand. And readability matters: the person
maintaining your query at 2 AM will thank you for named, layered steps over a
tangled nest.

**[SECTION — Queries inside queries — 0:50]**
A subquery is a complete query nested inside another — in WHERE, in FROM, or
even in SELECT. The inner query runs first and feeds its result to the
outer one. "WHERE x IN (SELECT id FROM ...)" keeps rows whose value appears
in the inner result: "show me customers whose id appears in the list of ids
that ordered this month." The inner query builds the list; the outer query
filters by it.

"EXISTS (SELECT ...)" tests only whether the inner query returns anything at
all. For "is there at least one" questions, it's often faster and clearer
than IN — because the database can stop looking the moment it finds a single
match instead of building the whole list. "Is there at least one overdue
order for this customer?" That's EXISTS.

A scalar subquery returns exactly one row and one column — a single value,
usable anywhere a value is expected. "WHERE total greater than (SELECT AVG of
total FROM orders)" compares each row against the average: the inner query
produces one number, the outer query uses it like any literal.

Then the correlated subquery: it references a column from the outer query
and is re-evaluated for each outer row. Powerful and expressive — you can ask
row-by-row questions like "orders above this customer's own average." But
here's the cost: the inner query runs once per row. On a million rows, that's
a million inner queries. Reach for it deliberately, not by default — and when
a query is mysteriously slow, a correlated subquery is a prime suspect.

**[SECTION — CTEs and set operators — 2:50]**
A common table expression — "WITH monthly AS (SELECT ...)" — names a
temporary result you can reference in the main query. Think of it as a
variable for result sets: compute once, name it, use it. CTEs turn a tangled
nested query into readable, named steps — "first compute monthly totals,
then filter, then rank" — and recursive CTEs can even walk hierarchies like
org charts. They exist for the reader as much as for the machine: the
database would manage without them, but the human wouldn't.

Then set operators, which combine whole result sets. UNION stacks two
queries' rows and removes duplicates; UNION ALL keeps the duplicates and runs
faster — because deduplication is work, skipping it saves time. So if you
know there are no duplicates, or you want them, ALL is the faster choice.
INTERSECT returns rows present in both queries; EXCEPT returns rows in the
first but not the second — "customers who bought last year except those who
bought this year," churn analysis in one statement.

The contract for all of them: both queries must return the same number of
columns with compatible types, and the column names come from the first
query. Break the contract and the database refuses — which is actually
helpful, because it catches the mistake at write time instead of silently
misaligning your data.

**[COMMON MISTAKES — 4:30]**
Three traps. One: the correlated subquery on a big table — elegant, and a
million inner queries slow. Use it deliberately. Two: UNION when you meant
UNION ALL — the deduplication costs time you didn't need to spend. Three:
set operators with mismatched columns — same count, compatible types, names
from the first query.

**[RECAP — 5:00]**
Subqueries nest complete queries inside WHERE, FROM, or SELECT: IN filters by
an inner list, EXISTS asks "is there at least one," scalar subqueries produce
single values, and correlated subqueries reference the outer query —
powerful, but re-evaluated per row. CTEs name temporary results with WITH,
turning tangles into readable steps. UNION stacks, UNION ALL stacks faster,
INTERSECT finds common rows, EXCEPT finds the difference — with matching
columns throughout. Build answers in layers: that's composable SQL.

## On-screen visuals

- HOOK: a flat query failing to answer "above average", then layering into
  an inner and outer query that succeeds.
- Subqueries SECTION: an inner query feeding a list into an outer WHERE;
  EXISTS stopping at the first match versus IN building the whole list; a
  correlated subquery re-running per outer row with a cost warning.
- CTEs SECTION: a nested tangle unfolding into named WITH steps; UNION,
  INTERSECT, and EXCEPT shown as set diagrams on two result sets.
- RECAP: the cheat-sheet terms as a clean summary card.
