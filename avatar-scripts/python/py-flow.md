# Control Flow & Functions: Decisions, Loops, and Reusable Logic — Avatar Tutor Script

**Lesson ID:** py-flow
**Track:** Python & Automation
**Estimated runtime:** ~5 minutes (~674 words)

## Spoken script

**[HOOK — 0:00]**
A script that just runs top to bottom is a recipe. A script that decides and
repeats is a tool. Control flow is what turns "check this one log line" into
"check every log line, flag the suspicious ones, and stop when you find the
critical one."

**[WHY IT MATTERS — 0:25]**
Control flow is how a script decides what to do with each log line, retries a
failed request, or stops when it finds what it was looking for. You'll use it
in literally every automation script you ever write: classify failed logins,
walk a directory of files, probe a list of hosts. And functions are how you
package that logic so you write it once and reuse it forever.

**[SECTION — Decisions: if, elif, else and truthiness — 0:50]**
First, a Python quirk with real consequences: blocks are delimited by
indentation, not braces. Four spaces per level is the convention, and mixing
tabs and spaces causes errors — the kind that look invisible. The "else if"
keyword is elif, which you'll type a thousand times.

Now conditions. They don't have to be booleans. Python has a fixed list of
falsy values: False, None, zero, the empty string, and empty collections.
Everything else is truthy. Here's why that's elegant: to check that a list
isn't empty, you just write "if items colon". No length check, no comparison
— the list itself is the condition. That's idiomatic Python.

Two comparisons to keep straight. Double-equals compares values: is this
number equal to that one? The "is" keyword compares identity: is this the exact same object? In practice, you only use "is" for singletons —
write "if result is None colon". For comparing values, use double-equals.

**[SECTION — Loops — 1:55]**
A for loop walks over any iterable: a list, a string, a file, a dictionary.
range of 3 produces 0, 1, 2 — it starts at zero and stops before the end
value, which mirrors how indexing works. A while loop repeats as long as its
condition stays true.

Three control words run your loops. Break leaves the innermost loop
immediately — perfect for "stop at the first critical entry." Continue skips
the rest of the current pass and moves to the next one — "skip blank lines and
keep going." And pass does nothing at all: it's a placeholder for when the
syntax needs a statement but you have nothing to say yet. Think of pass as the
"to be continued" of Python.

**[SECTION — Functions — 2:55]**
Define a function with def, its name, parameters, and an indented body. Return
sends a value back; a function without a return gives back None — remember
our old friend from the basics lesson.

Parameters can have default values, like def greet with name defaulting to
"world". But here is a trap that has bitten experienced programmers: never use
a mutable default like an empty list or dict. The default is created once,
when the function is defined, and shared by every call — so every call appends
to the same list. Instead, default to None and create the list inside the
function. It's three extra lines that save you from a genuinely baffling bug.

The payoff of functions is the lesson's example: one function holds the rule
for classifying failed logins, and a loop applies it to every user. Write the
logic once, reuse it everywhere. That's the whole game.

**[COMMON MISTAKES — 4:00]**
Three traps. One: the mutable default argument. def f with tags equals empty
list shares that list across calls — use None instead. Two: double-equals
versus "is". Use double-equals for values, "is" only for None. Three: range
stops before the end value. range of 3 is 0, 1, 2 — off-by-one errors live
here, so double-check every loop boundary.

**[RECAP — 4:30]**
Decisions run on indentation and elif, with truthiness letting "if items"
replace a length check, and "is" reserved for None. For loops walk iterables,
while loops repeat on a condition, and break, continue, and pass steer them.
Functions package logic with def and return, defaults must never be mutable,
and the habit to build is: one function holds the rule, a loop applies it to
everything. That's control flow — decisions plus repetition plus packaging.

## On-screen visuals

- HOOK: a single log line expanding into a stream of log lines, with some
  flagged and one stopping the scan.
- Decisions SECTION: an if/elif/else ladder with indentation guides, plus a
  truthy/falsy value table.
- Loops SECTION: a for loop walking a list item by item, break and continue
  shown as exit and skip arrows.
- Functions SECTION: the mutable-default trap visualised — one shared list
  growing across calls, then the None-guard fix.
- RECAP: the cheat-sheet terms as a clean summary card.
