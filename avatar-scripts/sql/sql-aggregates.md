# Aggregates & Grouping: From Rows to Meaning — Avatar Tutor Script

**Lesson ID:** sql-aggregates
**Track:** SQL & Databases
**Estimated runtime:** ~4 minutes (~609 words)

## Spoken script

**[HOOK — 0:00]**
Individual rows answer "what happened." Aggregates answer "what does it mean."
COUNT, SUM, and AVG collapse thousands of rows into the single numbers that
drive dashboards, reports, and decisions. This is the lesson where data
becomes intelligence.

**[WHY IT MATTERS — 0:25]**
Nobody reads ten thousand rows. They read the total, the average, the count
per region — the numbers that fit in a headline and the metrics that fit on a
dashboard. Aggregates are how raw events become those metrics, and metrics
are what managers, dashboards, and incident reports run on. If SELECT is
asking questions, aggregates are getting answers you can act on.

**[SECTION — The aggregate functions — 0:50]**
COUNT star counts rows — every row, no questions asked. COUNT of a column
counts non-null values in that column. The difference matters exactly when
nulls are present: if a hundred orders have no discount code, COUNT star says
a hundred and COUNT of discount code says zero. Same table, different answers
— so choose deliberately.

SUM totals a numeric column, AVG averages it, MIN and MAX take the extremes.
Note the elegant one: MAX of a date is the latest date, MIN is the earliest.
Dates sort, so extremes become recency. And every aggregate except COUNT star
ignores NULLs — usually what you want, since unknown values shouldn't drag
your average down, but worth knowing explicitly rather than discovering by
accident.

Then there's COUNT DISTINCT of a column: it counts unique non-null values.
"How many different countries ordered" rather than "how many orders." It's one
of those functions you reach for constantly once you know it exists — the
answer to every "how many distinct" question, in one call. Without it you'd
be deduplicating in your head or in application code; with it, the database
does the thinking.

**[SECTION — Grouping, and the WHERE/HAVING divide — 2:30]**
GROUP BY collapses rows into groups so aggregates compute per group: total
sales per region, average order value per month. Think of it as sorting the
rows into buckets, then running the aggregate separately inside each bucket.
One query, a whole breakdown.

But grouped queries have a strict rule: the SELECT list may contain only the
grouping columns and aggregates. Why? Because asking for a bare non-grouped
column is meaningless — the database has collapsed many rows into one, so it
can't know which row's value you mean. Strict SQL calls it an error, and it's
right to.

Now the divide that trips everyone once: WHERE filters rows before grouping;
HAVING filters groups after aggregation. "Regions with total sales over
1000" is "GROUP BY region HAVING SUM of sales greater than 1000." You cannot
put an aggregate in WHERE — because at the moment WHERE runs, the groups
don't exist yet. There's nothing to sum. The mental model: WHERE narrows the
raw material going in; HAVING judges the finished groups coming out. Raw
material versus finished product — different stages, different clauses. Get
this divide straight and a whole family of errors disappears.

**[COMMON MISTAKES — 4:15]**
Three traps. One: COUNT star versus COUNT of a column — they differ exactly
when nulls are present. Two: putting an aggregate in WHERE. Aggregates live
in HAVING; WHERE runs before groups exist. Three: selecting a bare
non-grouped column in a grouped query — the database can't know which row
you mean.

**[RECAP — 4:45]**
COUNT star counts rows, COUNT of a column counts non-nulls, COUNT DISTINCT
counts unique values; SUM, AVG, MIN, MAX collapse a column — MAX of a date is
the latest — and all but COUNT star ignore NULLs. GROUP BY sorts rows into
buckets for per-group aggregates, and the SELECT list holds only grouping
columns and aggregates. WHERE filters rows before grouping; HAVING filters
groups after. Raw material in, finished groups out — that's the divide, and
that's aggregates: rows to meaning.

## On-screen visuals

- HOOK: thousands of rows collapsing into a single dashboard number.
- Aggregates SECTION: COUNT star versus COUNT of a column on a table with
  nulls, showing the different answers; MIN/MAX on a date column resolving
  to earliest/latest.
- Grouping SECTION: rows sorting into region buckets with SUM computed per
  bucket; a pipeline diagram — WHERE sieving rows, GROUP BY bucketing,
  HAVING judging the finished groups; an aggregate in WHERE flagged as an
  error.
- RECAP: the cheat-sheet terms as a clean summary card.
