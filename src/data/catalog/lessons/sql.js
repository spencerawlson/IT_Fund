// Reading content for the SQL Databases course, keyed by lesson (deck) id.
// Strings support `inline code` only. Aligned with src/data/academy/sql.js.

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'sql-basics': {
    overview: [
      'Nearly every application you have ever used stores its data in a relational database, and SQL — the Structured Query Language — is how you talk to it. It is one of the highest-leverage skills in technology: the same few dozen keywords query bank ledgers, hospital records, and social networks alike.',
      'This lesson covers how relational data is organized into tables of rows and columns, SQL\'s declarative nature, reading data with `SELECT`, primary keys, the meaning of `NULL`, and what a primary key guarantees.',
    ],
    learn: [
      {
        heading: 'Tables, rows, and the declarative mindset',
        body: [
          'A relational database organizes data into tables: each row is one record, each column is one attribute of that record. A `users` table might have columns for id, name, and email; each row is one user. The system managing all of this — PostgreSQL, MySQL, SQL Server — is the RDBMS, the relational database management system.',
          'SQL is declarative: you describe what you want, not how to fetch it. `SELECT name FROM users;` says "give me the names" — the query planner decides whether to scan the table, use an index, or parallelize. This is the opposite of imperative code, and it is why the same query can run fast or slow depending on schema design, which later lessons address.',
          'The read statement is `SELECT`, the table is named by `FROM`: `SELECT * FROM users;` returns every column of every row. The `*` means "all columns" — convenient for exploration, but avoid it in production queries, where naming columns explicitly protects you from schema changes and wasted bandwidth. Statements conventionally end with a semicolon.',
        ],
      },
      {
        heading: 'Keys, NULL, and identity',
        body: [
          'A primary key is the column — or set of columns — that uniquely identifies each row. It must be unique and never null: no two users share an id, and no user lacks one. Other tables reference it through foreign keys, which is how relationships between tables are enforced rather than merely hoped for.',
          '`NULL` is SQL\'s most misunderstood value. It does not mean zero, and it does not mean an empty string — it means unknown or missing. Because of that, `NULL = NULL` is not true; it is unknown. To test for missing values you must write `WHERE col IS NULL`, never `= NULL`. Internalize this early and an entire category of "why is my query wrong" evaporates.',
        ],
      },
      {
        heading: 'Data types and constraints',
        body: [
          'Every column has a type, and choosing it well prevents whole classes of bugs. Use integer types for counts and identifiers, `DECIMAL(10,2)` or `NUMERIC` for money (never floating point, which cannot store 0.10 exactly), `VARCHAR(n)` or `TEXT` for strings, `DATE` and `TIMESTAMP` for time, and `BOOLEAN` where the database supports it. Store dates as dates, not as text, so sorting and date arithmetic work.',
          'Constraints let the database enforce rules no matter which application writes the data. `PRIMARY KEY` identifies each row, `FOREIGN KEY` ensures a referenced row exists, `NOT NULL` requires a value, `UNIQUE` prevents duplicates such as two accounts with one email, and `CHECK (price >= 0)` rejects impossible values. Exact type names and behaviours vary between PostgreSQL, MySQL, SQL Server and SQLite, so check your database\'s documentation.',
        ],
      },
    ],
    examples: [
      {
        title: 'Create, insert and query',
        code: 'CREATE TABLE customers (\n  id    INTEGER PRIMARY KEY,\n  name  TEXT NOT NULL,\n  city  TEXT\n);\nINSERT INTO customers (id, name, city) VALUES (1, \'Ana\', \'Lisbon\'), (2, \'Ben\', \'Leeds\');\nSELECT name FROM customers WHERE city = \'Lisbon\';\n-- Ana',
        explanation: 'Tables have typed columns and a primary key that uniquely identifies each row.',
      },
    ],
    cheatSheet: [
      ['SQL', 'Structured Query Language — the standard language for relational databases.'],
      ['Table', 'Rows (records) × columns (fields); one row = one record.'],
      ['Declarative', 'Describe WHAT you want; the planner decides HOW to fetch it.'],
      ['SELECT ... FROM ...', 'Read data: `SELECT name FROM users;`.'],
      ['SELECT *', 'All columns — fine for exploring, avoid in production.'],
      ['Primary key', 'Uniquely identifies each row; must be unique and not null.'],
      ['NULL', 'Unknown/missing — not zero, not empty string; test with `IS NULL`.'],
      ['RDBMS', 'Relational Database Management System, e.g. PostgreSQL, MySQL.'],
      [';', 'Statement terminator in most clients.'],
    ],
  },
  'sql-select': {
    overview: [
      'Reading data is the first 90% of SQL. The `SELECT` statement plus a handful of clauses — `WHERE`, `ORDER BY`, `LIMIT`, `DISTINCT` — answers an enormous range of real questions, from "which users signed up today" to "what are our top ten products."',
      'This lesson covers filtering rows with `WHERE`, sorting with `ORDER BY`, deduplicating with `DISTINCT`, limiting results, pattern matching with `LIKE`, testing for `NULL`, ranges with `BETWEEN`, column aliases, and combining conditions with `AND`/`OR`/`NOT`.',
    ],
    learn: [
      {
        heading: 'Filtering and shaping the result',
        body: [
          '`WHERE` is how you filter rows: `WHERE age >= 18` keeps only adults. Combine conditions with `AND`, `OR`, and `NOT`, using parentheses to control precedence exactly as in arithmetic. `WHERE id IN (1, 2, 3)` is shorthand for a chain of `OR` comparisons — "id equals any of these."',
          'Text gets pattern matching through `LIKE`, with `%` matching any sequence and `_` matching a single character: `WHERE name LIKE \'A%\'` finds names starting with A. Numeric ranges use `BETWEEN 10 AND 20`, which is inclusive of both endpoints — a detail worth memorizing because off-by-one errors love to hide here.',
          'Missing values need their own syntax: `WHERE col IS NULL` (or `IS NOT NULL`). Writing `WHERE col = NULL` silently returns nothing, because comparing anything to unknown yields unknown. This is the single most common beginner mistake in SQL, and now you will never make it.',
        ],
      },
      {
        heading: 'Ordering, deduplicating, and presenting',
        body: [
          '`ORDER BY column DESC` sorts results descending; ascending (`ASC`) is the default. Sorting is usually paired with `LIMIT n` — "the ten most recent orders" is `ORDER BY created_at DESC LIMIT 10`. (SQL Server spells it `TOP n` instead of `LIMIT`.)',
          '`DISTINCT` removes duplicate rows from the result: `SELECT DISTINCT country FROM users` lists each country once. And when a column name is ugly or a computed value needs a label, alias it: `SELECT price AS cost` renames the column in the output. Aliases also name computed columns, which matters the moment you start doing arithmetic in `SELECT`.',
        ],
      },
      {
        heading: 'Pattern matching, ranges and NULL-safe filters',
        body: [
          'Beyond equality, a few operators cover most filters. `BETWEEN 10 AND 20` is inclusive of both ends. `IN (\'UK\', \'IE\', \'FR\')` replaces a chain of ORs. `LIKE \'Ana%\'` matches values starting with \'Ana\', `%` standing for any run of characters and `_` for exactly one; a leading wildcard such as `LIKE \'%son\'` usually prevents the database from using an index. Case sensitivity of LIKE depends on the database and collation.',
          'NULL needs its own care. `WHERE discount <> 10` silently excludes rows where discount is NULL, because comparisons with NULL are unknown, not true. Write `WHERE discount <> 10 OR discount IS NULL` when you mean to include them, or use `COALESCE(discount, 0)` to substitute a default. `CASE WHEN total > 100 THEN \'large\' ELSE \'small\' END` derives labels in the select list.',
        ],
      },
    ],
    examples: [
      {
        title: 'Filter, sort and limit',
        code: 'SELECT name, total\nFROM orders\nWHERE status = \'paid\'\n  AND created_at >= \'2026-01-01\'\n  AND coupon IS NULL          -- not \'= NULL\'\nORDER BY total DESC\nLIMIT 5;',
        explanation: 'NULL is never equal to anything, including NULL, so use IS NULL. Clauses are written SELECT-FROM-WHERE-ORDER BY but evaluated FROM first.',
      },
    ],
    cheatSheet: [
      ['WHERE', 'Filters rows: `WHERE age >= 18`.'],
      ['ORDER BY col DESC', 'Sorts descending; `ASC` is the default.'],
      ['DISTINCT', 'Removes duplicate rows from the result.'],
      ['LIMIT n', 'Caps rows returned (`TOP n` in SQL Server); pair with `ORDER BY`.'],
      ['LIKE', 'Pattern match: `%` = any sequence, `_` = one character.'],
      ['IN (1, 2, 3)', 'Matches any value in the list.'],
      ['IS NULL / IS NOT NULL', 'The only correct way to test for missing values.'],
      ['BETWEEN 10 AND 20', 'Inclusive range — both endpoints count.'],
      ['AS', 'Column alias: `SELECT price AS cost`.'],
      ['AND / OR / NOT', 'Combine conditions; parentheses control precedence.'],
    ],
  },
  'sql-aggregates': {
    overview: [
      'Individual rows answer "what happened"; aggregates answer "what does it mean." `COUNT`, `SUM`, and `AVG` collapse thousands of rows into the single numbers that drive dashboards, reports, and decisions.',
      'This lesson covers the aggregate functions, `GROUP BY` for per-group computation, and the crucial `WHERE` vs `HAVING` distinction — the line between filtering rows and filtering groups.',
    ],
    learn: [
      {
        heading: 'The aggregate functions',
        body: [
          '`COUNT(*)` counts rows; `COUNT(col)` counts non-null values in that column — the difference matters exactly when nulls are present. `SUM(col)` totals a numeric column, `AVG(col)` averages it, `MIN` and `MAX` take the extremes (so `MAX(date)` is the latest date). Every aggregate except `COUNT(*)` ignores `NULL`s, which is usually what you want but worth knowing explicitly.',
          '`COUNT(DISTINCT col)` counts unique non-null values — "how many different countries ordered" rather than "how many orders." It is one of those functions you reach for constantly once you know it exists.',
        ],
      },
      {
        heading: 'Grouping, and the WHERE/HAVING divide',
        body: [
          '`GROUP BY` collapses rows into groups so aggregates compute per group: total sales per region, average order value per month. In a grouped query, the `SELECT` list may contain only the grouping columns and aggregates — asking for a bare non-grouped column is an error in strict SQL, because the database cannot know which row\'s value you mean.',
          'Here is the divide that trips everyone once: `WHERE` filters rows before grouping; `HAVING` filters groups after aggregation. "Regions with total sales over 1000" is `GROUP BY region HAVING SUM(sales) > 1000` — you cannot put an aggregate in `WHERE`, because at the moment `WHERE` runs, the groups do not exist yet. `WHERE` narrows the raw material; `HAVING` judges the finished groups.',
        ],
      },
      {
        heading: 'Common grouping mistakes',
        body: [
          'Every column in the select list must either appear in `GROUP BY` or be inside an aggregate. `SELECT customer_id, city, COUNT(*) FROM orders GROUP BY customer_id` is an error in PostgreSQL and SQL Server because `city` has no single value per group; MySQL may accept it and return an arbitrary city, which hides the bug. Group by every non-aggregated column, or aggregate it.',
          'Watch for NULL and duplicates. `COUNT(*)` counts rows, `COUNT(email)` counts non-NULL emails, and `AVG(rating)` ignores NULL ratings rather than treating them as zero. Joining before aggregating can multiply rows, so a customer with three orders and two addresses produces six joined rows and inflated sums. Aggregate in a subquery or CTE first, then join the totals.',
        ],
      },
    ],
    examples: [
      {
        title: 'GROUP BY with HAVING',
        code: 'SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent\nFROM orders\nWHERE status = \'paid\'          -- filters rows before grouping\nGROUP BY customer_id\nHAVING SUM(total) > 1000       -- filters groups after\nORDER BY spent DESC;',
        explanation: 'WHERE cannot use aggregates because it runs before grouping; HAVING runs after and can.',
      },
    ],
    cheatSheet: [
      ['COUNT(*) / COUNT(col)', 'Rows vs non-null values in a column.'],
      ['SUM / AVG / MIN / MAX', 'Total, average, extremes; all ignore NULLs.'],
      ['COUNT(DISTINCT col)', 'Unique non-null values.'],
      ['GROUP BY', 'Collapses rows into groups for per-group aggregates.'],
      ['WHERE', 'Filters rows BEFORE grouping.'],
      ['HAVING', 'Filters groups AFTER aggregation (this is where aggregates go).'],
      ['Grouped SELECT rule', 'Only grouping columns and aggregates allowed in the select list.'],
    ],
  },
  'sql-joins': {
    overview: [
      'Real databases spread data across many tables — customers in one, orders in another — and joins are how you reassemble it. If `SELECT` is the first 90% of SQL, joins are most of the remaining 10%.',
      'This lesson covers `INNER JOIN`, `LEFT JOIN` (and finding unmatched rows with it), join conditions, self joins, the dreaded accidental `CROSS JOIN`, `FULL OUTER JOIN`, and the foreign keys that make joins trustworthy.',
    ],
    learn: [
      {
        heading: 'The join family',
        body: [
          'An `INNER JOIN` returns only rows with a match in both tables — the intersection. A `LEFT JOIN` (short for left outer join) returns every row from the left table plus matches from the right, with `NULL`s where no match exists. That null behavior is a feature: `LEFT JOIN orders ... WHERE orders.id IS NULL` finds customers with no orders, one of the most useful query patterns in existence.',
          'The join condition in `ON` states how the tables relate — usually a foreign key to a primary key, like `ON orders.customer_id = customers.id`. Omit it and you get a `CROSS JOIN`: every row paired with every row, the Cartesian product. Occasionally intentional, usually a missing `ON`. A `FULL OUTER JOIN` returns everything from both sides, matched where possible — left plus right plus the intersection.',
          'A table can even join to itself — a self join, with aliases to tell the two roles apart. Employees joined to employees on `e.manager_id = m.id` pairs each person with their manager. And when two tables share a column name like `id`, qualify it (`u.id`) so the database — and the next reader — knows which one you mean. You can chain as many joins as the relationships require.',
        ],
      },
      {
        heading: 'What makes joins trustworthy',
        body: [
          'A join is only as reliable as the relationship it follows. That relationship is enforced by a foreign key: a column in one table that references the primary key of another, with the database guaranteeing every reference points somewhere real. This is referential integrity, and it is what separates a database from a pile of spreadsheets.',
          'Without foreign keys, joins still run — SQL will happily join on any condition — but nothing stops orphaned rows or dangling references from silently corrupting your results. Design the keys first; the joins then take care of themselves.',
        ],
      },
      {
        heading: 'Other join types and set thinking',
        body: [
          '`RIGHT JOIN` is a LEFT JOIN written the other way round, and most people rewrite it as a LEFT JOIN for readability. `FULL OUTER JOIN` keeps unmatched rows from both sides, which is useful for reconciling two lists: rows with NULL on one side exist in only one list. `CROSS JOIN` pairs every row with every other row; it is occasionally useful for generating combinations, and accidentally created by a missing ON condition.',
          'To find rows with no match, use a LEFT JOIN and test the right side for NULL, or `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`. Avoid `NOT IN` with a subquery that can return NULL: if any value is NULL, `NOT IN` returns no rows at all. Always join on the full key, and check row counts before and after joining.',
        ],
      },
    ],
    examples: [
      {
        title: 'INNER vs LEFT JOIN',
        code: '-- customers: Ana(1), Ben(2), Cy(3); orders exist for 1 and 2 only\nSELECT c.name, o.id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id;\n-- Ana 101 | Ben 102 | Cy NULL\n\n-- customers with no orders:\n... LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;   -- Cy',
        explanation: 'INNER JOIN keeps only matches; LEFT JOIN keeps every left row and fills NULLs, which makes \'find the missing ones\' queries easy.',
      },
    ],
    cheatSheet: [
      ['INNER JOIN', 'Only rows matching in BOTH tables.'],
      ['LEFT JOIN', 'All left rows + matches; NULLs where none — use `IS NULL` to find unmatched.'],
      ['ON', 'The join condition, usually foreign key = primary key.'],
      ['Self join', 'A table joined to itself via aliases (e.g. employee → manager).'],
      ['CROSS JOIN', 'Cartesian product — every row × every row; usually a missing `ON`.'],
      ['FULL OUTER JOIN', 'All rows from both tables, matched where possible.'],
      ['u.id', 'Qualify ambiguous columns with table aliases.'],
      ['Foreign key', 'References another table\'s primary key; enforces referential integrity.'],
      ['Chained joins', 'Multiple `JOIN ... ON` clauses in one query.'],
    ],
  },
  'sql-ddl-dml': {
    overview: [
      'So far you have been reading data. Now you change it: creating tables, inserting rows, updating values, and — carefully — deleting them. This is where SQL gets the power to destroy, so the discipline matters as much as the syntax.',
      'This lesson covers DDL (`CREATE`/`ALTER`/`DROP TABLE`), DML (`INSERT`/`UPDATE`/`DELETE`), constraints (`NOT NULL`, `UNIQUE`, `DEFAULT`, `CHECK`), and the difference between `DELETE` and `TRUNCATE`.',
    ],
    learn: [
      {
        heading: 'Defining structure: DDL',
        body: [
          '`CREATE TABLE users (id INT PRIMARY KEY, name TEXT NOT NULL, ...)` brings a table into existence — this is Data Definition Language, the part of SQL that shapes the database itself. `ALTER TABLE` modifies that shape afterward: add a column, drop a constraint, change a type. `DROP TABLE` removes the table entirely, structure and data both.',
          'Constraints are the database enforcing your rules so your application does not have to. `NOT NULL` forbids missing values; `UNIQUE` forbids duplicates; `DEFAULT` supplies a value when an insert omits the column (like `created_at TIMESTAMP DEFAULT now()`); `CHECK (price >= 0)` rejects any row violating a boolean condition. Declare constraints generously — data that cannot be wrong never needs cleaning.',
        ],
      },
      {
        heading: 'Changing data: DML, and the WHERE that saves you',
        body: [
          '`INSERT INTO users (name, email) VALUES (\'Ada\', \'ada@x.io\')` adds a row. `UPDATE users SET email = \'new@x.io\' WHERE id = 7` changes one. `DELETE FROM users WHERE id = 7` removes one. Notice the pattern: `UPDATE` and `DELETE` without a `WHERE` clause hit every row in the table. That is not a theoretical risk — it is one of the most common production disasters in the industry, and the defence is a habit: never execute a bare `UPDATE` or `DELETE`; always write the `WHERE` first.',
          '`DELETE` removes selected rows and is logged and rollback-able inside a transaction. `TRUNCATE` empties the entire table far faster but with no granularity and, in most systems, no easy undo. Different tools, different jobs: `DELETE` for precision, `TRUNCATE` for wholesale resets.',
        ],
      },
      {
        heading: 'Changing schemas safely',
        body: [
          '`ALTER TABLE` changes a live table: `ALTER TABLE customers ADD COLUMN phone VARCHAR(30);` is usually quick, but adding a NOT NULL column with a computed default, changing a type, or adding an index on a large table can lock it or rewrite it entirely. Check how your database handles each operation, and run large changes in a maintenance window or with online tools such as `CREATE INDEX CONCURRENTLY` in PostgreSQL.',
          'Keep schema changes in version-controlled migration files (Flyway, Liquibase, Alembic, Rails migrations), applied in order to every environment, so development, test and production never drift. Make changes backward compatible in steps: add the new column, deploy code that writes both, backfill, switch reads, and only then drop the old column. `UPSERT` (`INSERT ... ON CONFLICT` in PostgreSQL, `MERGE` in SQL Server) handles insert-or-update in one statement.',
        ],
      },
    ],
    examples: [
      {
        title: 'Safe UPDATE',
        code: 'BEGIN;\nSELECT id, price FROM products WHERE category = \'cables\';   -- check what will change\nUPDATE products SET price = price * 1.05 WHERE category = \'cables\';\n-- 42 rows updated (matches the SELECT)\nCOMMIT;   -- or ROLLBACK if the count is wrong',
        explanation: 'An UPDATE or DELETE without WHERE changes every row. Previewing with SELECT inside a transaction lets you check the count before committing.',
      },
    ],
    cheatSheet: [
      ['DDL', 'Data Definition: `CREATE` / `ALTER` / `DROP TABLE`.'],
      ['DML', 'Data Manipulation: `INSERT` / `UPDATE` / `DELETE`.'],
      ['NOT NULL / UNIQUE', 'Forbid missing values / forbid duplicates.'],
      ['DEFAULT', 'Value used when an INSERT omits the column.'],
      ['CHECK (cond)', 'Rejects rows violating a boolean condition.'],
      ['UPDATE/DELETE + WHERE', 'Always scope with `WHERE` — bare statements hit every row.'],
      ['DELETE vs TRUNCATE', '`DELETE`: selective, logged, rollback-able. `TRUNCATE`: fast full-table wipe.'],
    ],
  },
  'sql-subqueries': {
    overview: [
      'Some questions cannot be answered in a single flat query: "customers whose orders exceed the average," "products never purchased." Subqueries — queries nested inside queries — and CTEs let you build the answer in composable layers.',
      'This lesson covers scalar and `IN` subqueries, `EXISTS`, correlated subqueries, common table expressions (`WITH`), and the set operators `UNION`, `INTERSECT`, and `EXCEPT`.',
    ],
    learn: [
      {
        heading: 'Queries inside queries',
        body: [
          'A subquery is a complete query nested inside another — in `WHERE`, `FROM`, or even `SELECT`. `WHERE x IN (SELECT id FROM ...)` keeps rows whose value appears in the inner result. `EXISTS (SELECT ...)` tests only whether the inner query returns anything at all, which is often faster and clearer than `IN` for "is there at least one" questions.',
          'A scalar subquery returns exactly one row and one column — a single value usable anywhere a value is expected. A correlated subquery goes further: it references a column from the outer query and is re-evaluated for each outer row. Powerful, expressive — and potentially slow, since the inner query runs once per row. Reach for it deliberately, not by default.',
        ],
      },
      {
        heading: 'CTEs and set operators',
        body: [
          'A common table expression — `WITH monthly AS (SELECT ...)` — names a temporary result you can reference in the main query, like a variable for result sets. CTEs turn a tangled nested query into readable, named steps, and recursive CTEs can even walk hierarchies like org charts. They exist for the reader as much as for the machine.',
          'Set operators combine whole result sets: `UNION` stacks two queries\' rows and removes duplicates (`UNION ALL` keeps them and runs faster), `INTERSECT` returns rows present in both, `EXCEPT` returns rows in the first but not the second. The contract: both queries must return the same number of columns with compatible types, and the column names come from the first query.',
        ],
      },
      {
        heading: 'Recursive CTEs and choosing the right tool',
        body: [
          'A recursive CTE walks hierarchies such as an org chart or a category tree. It has an anchor query that selects the starting rows and a recursive part that joins back to the CTE: `WITH RECURSIVE chain AS (SELECT id, manager_id, name FROM staff WHERE id = 42 UNION ALL SELECT s.id, s.manager_id, s.name FROM staff s JOIN chain c ON s.id = c.manager_id) SELECT * FROM chain;` lists an employee and every manager above them. Recursion stops when the recursive part returns no rows.',
          'Subqueries, CTEs and joins can often express the same question. Prefer a join when you need columns from both tables, `EXISTS` when you only need to know whether a match exists, and a CTE when naming an intermediate step makes the query easier to read. Check performance with `EXPLAIN` rather than assuming one form is faster.',
        ],
      },
    ],
    examples: [
      {
        title: 'Subquery and CTE',
        code: '-- customers who spent more than average\nWITH spend AS (\n  SELECT customer_id, SUM(total) AS spent\n  FROM orders GROUP BY customer_id\n)\nSELECT customer_id, spent\nFROM spend\nWHERE spent > (SELECT AVG(spent) FROM spend);',
        explanation: 'A CTE names an intermediate result so the query reads top to bottom; the scalar subquery computes the average once for comparison.',
      },
    ],
    cheatSheet: [
      ['Subquery', 'A query nested inside another; feeds `WHERE`, `FROM`, or `SELECT`.'],
      ['IN (SELECT ...)', 'Keeps rows matching any value from the inner query.'],
      ['EXISTS', 'True if the subquery returns at least one row.'],
      ['Correlated subquery', 'References the outer query; re-evaluated per outer row — powerful but slow.'],
      ['CTE (`WITH x AS (...)`)', 'Named temporary result; breaks complex queries into readable steps.'],
      ['UNION / UNION ALL', 'Stacks result sets; `ALL` keeps duplicates and is faster.'],
      ['INTERSECT / EXCEPT', 'Rows in both / rows in first but not second.'],
      ['Set operator rule', 'Same column count and compatible types; names from the first query.'],
      ['Scalar subquery', 'One row, one column — usable anywhere a value goes.'],
    ],
  },
  'sql-indexes-norm': {
    overview: [
      'A query that returns in milliseconds on a thousand rows can take minutes on ten million. The difference is almost always indexing — and behind indexing stands schema design: normalization, the discipline of storing each fact exactly once.',
      'This lesson covers how indexes work and what they cost, full table scans, normal forms through 3NF, why you normalize, when to deliberately denormalize, composite indexes, and reading execution plans with `EXPLAIN`.',
    ],
    learn: [
      {
        heading: 'Indexes: the book-index analogy, made real',
        body: [
          'An index is a data structure — usually a B-tree — that lets the database find rows by column value without scanning the whole table, exactly like a book index lets you find a topic without reading every page. The trade-off is fundamental: indexes make reads faster but writes slower, because every `INSERT` and `UPDATE` must maintain each index, and they consume storage. Index the columns you filter and join on; do not index everything.',
          'Without a usable index, the database falls back to a full table scan — reading every row to answer the query. On small tables that is fine; on large ones it is the performance cliff. A composite index on `(a, b)` serves queries filtering on `a`, or on `a` and `b` together (the left-most prefix rule) — but not queries on `b` alone. When a query is slow, `EXPLAIN` (or `EXPLAIN ANALYZE`) shows the planner\'s actual execution plan: which scans, which joins, which indexes were used, and at what cost. It is the first tool you reach for, every time.',
        ],
      },
      {
        heading: 'Normalization: one fact, one place',
        body: [
          'Normalization is the discipline of eliminating redundancy. First Normal Form demands atomic values — no arrays or repeating groups stuffed into a single cell, one value per column per row. Third Normal Form goes further, removing transitive dependencies: every non-key attribute must depend on the key, the whole key, and nothing but the key. The payoff is integrity — one fact stored in one place cannot contradict itself, and updates cannot leave stale copies behind.',
          'But normalization optimizes for correctness, not speed, and reporting queries that join a dozen tables pay for it. Deliberate denormalization — accepting some redundancy to avoid joins — is a legitimate performance technique, common in analytics. The rule: normalize by default for integrity, denormalize by measurement when reads demand it. Never denormalize by guess.',
        ],
      },
      {
        heading: 'Composite indexes and when to denormalise',
        body: [
          'An index on several columns is used from the left. An index on `(customer_id, created_at)` serves `WHERE customer_id = 42` and `WHERE customer_id = 42 AND created_at > \'2026-01-01\'`, but not `WHERE created_at > \'2026-01-01\'` alone. Put the column used for equality first and the range column second. An index that contains every column a query needs (a covering index) lets the database answer without reading the table.',
          'Normalisation to third normal form is the right default for transactional systems. Reporting and analytics systems often denormalise on purpose, for example a star schema with a wide fact table and dimension tables, or a stored order total, because reads vastly outnumber writes. Denormalise deliberately, and keep the copies consistent with triggers, scheduled jobs or materialised views.',
        ],
      },
    ],
    examples: [
      {
        title: 'See an index change the plan',
        code: 'EXPLAIN SELECT * FROM orders WHERE customer_id = 42;\n-- Seq Scan on orders  (cost=0.00..18334.00 rows=10)\nCREATE INDEX idx_orders_customer ON orders (customer_id);\nEXPLAIN SELECT * FROM orders WHERE customer_id = 42;\n-- Index Scan using idx_orders_customer on orders  (cost=0.42..12.60 rows=10)',
        explanation: 'Without an index the database reads every row; with it, it jumps to the matches. Indexes speed reads but slow writes, so add them for real query patterns.',
      },
    ],
    cheatSheet: [
      ['Index', 'B-tree structure speeding lookups on indexed columns — like a book index.'],
      ['Index trade-off', 'Faster reads; slower writes and more storage.'],
      ['Full table scan', 'Reading every row — the performance cliff on big tables.'],
      ['1NF', 'Atomic values: one value per column per row, no repeating groups.'],
      ['3NF', 'No transitive dependencies: non-key attributes depend only on the key.'],
      ['Normalize', 'Eliminate redundancy; one fact in one place; prevents update anomalies.'],
      ['Denormalize', 'Accept redundancy for read speed — by measurement, never by guess.'],
      ['Composite index (a, b)', 'Serves filters on `a` or `a`+`b`; not `b` alone (left-most prefix).'],
      ['EXPLAIN', 'Shows the query plan — scans, joins, index usage, cost. First diagnostic tool.'],
      ['Primary vs foreign key', 'PK uniquely identifies rows in its table; FK references another table\'s PK.'],
    ],
  },
  'sql-transactions-security': {
    overview: [
      'Databases do not just store data — they guarantee it. Transactions make multi-step changes atomic, views shape what different users may see, and a disciplined security posture keeps attackers from turning your database into their playground.',
      'This lesson covers transactions and ACID, `COMMIT` and `ROLLBACK`, views, window functions, SQL injection and its defences, least-privilege accounts, isolation levels, and password storage.',
    ],
    learn: [
      {
        heading: 'Transactions: all or nothing',
        body: [
          'A transaction groups statements into a single unit: either all of them commit, or none do. Transferring money — debit one account, credit another — must never complete halfway, and transactions are the mechanism that guarantees it. `BEGIN` opens one, `COMMIT` makes its changes permanent, `ROLLBACK` undoes everything since the last commit.',
          'The guarantees have a name: ACID. Atomicity (all or nothing), Consistency (the database moves between valid states), Isolation (concurrent transactions do not corrupt each other), Durability (committed data survives crashes). Isolation deserves a closer look: concurrent transactions can produce dirty reads, non-repeatable reads, and phantom reads unless the isolation level prevents them — higher isolation means fewer anomalies but less concurrency, a trade-off you tune deliberately.',
        ],
      },
      {
        heading: 'Views, windows, and the security posture',
        body: [
          'A view is a saved `SELECT` you query like a table — it usually stores no data itself. Views simplify complex queries and, crucially, can restrict which columns different users see: the reporting team gets the view without the salary column. Window functions like `ROW_NUMBER() OVER (...)` compute across rows related to the current row without collapsing them, unlike `GROUP BY` — ranking, running totals, and moving averages without losing detail.',
          'Then the adversary. SQL injection — smuggling malicious SQL through unsanitized input — remains a top web vulnerability decades after it was understood. The defence is non-negotiable: parameterized queries (prepared statements), where the driver sends data separately from the SQL so input can never become code. Complement it with least-privilege database accounts — a reporting user that can only read, an app user that cannot `DROP` — so a compromise is contained. And passwords are never stored as text: store a salted hash with bcrypt or argon2, because any breach that exposes reversible passwords has already lost.',
        ],
      },
      {
        heading: 'Isolation levels and preventing SQL injection',
        body: [
          'Isolation levels decide what concurrent transactions can see. Read committed, the default in PostgreSQL and SQL Server, prevents dirty reads but allows a row to change between two reads in the same transaction. Repeatable read prevents that, and serializable makes concurrent transactions behave as if they ran one at a time, at the cost of more conflicts that the application must retry. Choose the weakest level that keeps your data correct.',
          'SQL injection happens when user input is concatenated into query text. The fix is parameterised queries in every language, for example `cursor.execute("SELECT * FROM users WHERE email = %s", (email,))`, never string formatting. Back it up with least-privilege database accounts for each application, no administrative accounts in application connection strings, and input validation as a second layer.',
        ],
      },
    ],
    examples: [
      {
        title: 'Atomic transfer with least-privilege user',
        code: 'BEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\nCOMMIT;   -- both or neither\n\nCREATE ROLE app_rw LOGIN PASSWORD \'...\';\nGRANT SELECT, INSERT, UPDATE ON accounts TO app_rw;   -- no DROP, no DELETE',
        explanation: 'The transaction makes the transfer atomic; the application account gets only the privileges it needs, limiting the damage of SQL injection.',
      },
    ],
    cheatSheet: [
      ['Transaction', 'Statements succeeding or failing as one unit: `BEGIN` … `COMMIT` / `ROLLBACK`.'],
      ['ACID', 'Atomicity, Consistency, Isolation, Durability.'],
      ['ROLLBACK', 'Undoes all uncommitted changes in the current transaction.'],
      ['View', 'Saved `SELECT` queried like a table; simplifies queries, restricts columns.'],
      ['Window function', 'Computes across related rows WITHOUT collapsing them (unlike `GROUP BY`).'],
      ['SQL injection', 'Malicious SQL via unsanitized input — a top OWASP risk.'],
      ['Parameterised queries', 'The primary defence: data sent separately from SQL, never concatenated.'],
      ['Least privilege', 'Grant only needed rights; limits blast radius of compromise.'],
      ['Isolation levels', 'Prevent dirty/non-repeatable/phantom reads; higher = safer but slower.'],
      ['Password storage', 'Salted hash (bcrypt/argon2) — never plaintext, never reversible encoding.'],
    ],
  },
};
