# Transactions, Views & Security: ACID and Injection Defence — Avatar Tutor Script

**Lesson ID:** sql-transactions-security
**Track:** SQL & Databases
**Estimated runtime:** ~5 minutes (~708 words)

## Spoken script

**[HOOK — 0:00]**
Databases don't just store data — they guarantee it. Money moving between
accounts must never complete halfway. Attackers must never turn your database
into their playground. This lesson is about the guarantees: transactions,
views, and a security posture that actually holds.

**[WHY IT MATTERS — 0:25]**
Half-finished writes corrupt data silently. SQL injection remains a top web
vulnerability decades after it was understood. And a compromised database
account with too many privileges turns a small breach into a total one. The
ideas in this lesson — atomicity, least privilege, parameterised queries —
are the difference between a database you trust and one you merely hope
about.

**[SECTION — Transactions: all or nothing — 0:50]**
A transaction groups statements into a single unit: either all of them
commit, or none do. Transferring money — debit one account, credit another —
must never complete halfway. Imagine the debit succeeds and the credit
fails: money vanished into thin air. Transactions are the mechanism that
guarantees it can't happen. BEGIN opens one, COMMIT makes its changes
permanent, ROLLBACK undoes everything since the last commit. Changed your
mind, or something failed midway? ROLLBACK and it's as if the transaction
never happened.

The guarantees have a name: ACID. Atomicity — all or nothing. Consistency —
the database moves between valid states, never landing in a broken one.
Isolation — concurrent transactions don't corrupt each other. Durability —
committed data survives crashes; once COMMIT returns, the data is safe even
if the power dies a second later.

Isolation deserves a closer look, because it's where the real world gets
tricky. Concurrent transactions can produce dirty reads, non-repeatable
reads, and phantom reads — one transaction seeing another's uncommitted or
shifting data — unless the isolation level prevents them. Higher isolation
means fewer anomalies but less concurrency: transactions queue up instead of
interleaving. It's a trade-off you tune deliberately, choosing how much
correctness you're willing to pay for in throughput.

**[SECTION — Views, windows, and the security posture — 2:50]**
A view is a saved SELECT you query like a table — and it usually stores no
data itself. Two uses. First, simplicity: wrap a gnarly twelve-join query in
a view and everyone queries the view instead. Second, and crucially,
security: views can restrict which columns different users see. The reporting
team gets the view without the salary column — they literally cannot select
what the view doesn't expose. That's access control expressed as a query.

Window functions like ROW NUMBER OVER compute across rows related to the
current row — without collapsing them. That's the key difference from GROUP
BY: GROUP BY reduces many rows to one, but a window function keeps every row
and adds the computed value alongside. Ranking, running totals, moving
averages — all without losing detail. When you want the aggregate and the
rows, windows are the answer.

Then the adversary. SQL injection — smuggling malicious SQL through
unsanitised input — remains a top web vulnerability decades after it was
understood. The defence is non-negotiable: parameterised queries, also called
prepared statements, where the driver sends data separately from the SQL so
input can never become code. Not "sanitise carefully" — structurally
impossible. Complement it with least-privilege database accounts: a reporting
user that can only read, an app user that cannot DROP. If an account is
compromised, least privilege contains the blast radius — the attacker gets
only what that account could do, nothing more.

And passwords are never stored as text. Store a salted hash with bcrypt or
argon2 — because any breach that exposes reversible passwords has already
lost. Hashing is one-way: even with the database in hand, the attacker can't
read the passwords back. Plaintext storage turns a breach into a credential
catastrophe; salted hashes turn it into a contained incident.

**[COMMON MISTAKES — 4:45]**
Three traps. One: multi-step writes without a transaction — halfway is the
most dangerous state. Two: building SQL by concatenating input — injection;
parameterise, always. Three: over-privileged database accounts — grant only
what's needed, so a compromise stays contained. And never store passwords as
text: salted hash, bcrypt or argon2.

**[RECAP — 5:10]**
Transactions make multi-step changes atomic: BEGIN, COMMIT, ROLLBACK — all
or nothing, guaranteed by ACID, with isolation levels trading anomalies
against concurrency. Views simplify complex queries and restrict visible
columns; window functions compute across rows without collapsing them, unlike
GROUP BY. Against injection: parameterised queries, always. Against
compromise: least-privilege accounts. And passwords live as salted hashes,
never text. Guarantees, not hopes — that's the whole lesson.

## On-screen visuals

- HOOK: a money transfer splitting into debit and credit, fusing back
  together atomically; a shield over the database against an injection
  attempt.
- Transactions SECTION: the debit/credit pair wrapped in BEGIN/COMMIT,
  then a failed transfer rolling back cleanly; ACID as four labelled
  guarantees; concurrent transactions interleaving safely under isolation.
- Views/windows SECTION: a view as a window showing only permitted columns,
  salary hidden; GROUP BY collapsing rows versus a window function keeping
  rows and adding a rank column.
- Security posture SECTION: an injected quote neutralised by a
  parameterised query; a least-privilege account's small blast radius versus
  an admin account's total one; plaintext passwords versus salted hashes.
- RECAP: the cheat-sheet terms as a clean summary card.
