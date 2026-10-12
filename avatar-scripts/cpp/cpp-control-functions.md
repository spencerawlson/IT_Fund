# C++ Control Flow & Functions: do-while, switch, and Pass by Reference — Avatar Tutor Script

**Lesson ID:** cpp-control-functions
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~658 words)

## Spoken script

**[HOOK — 0:00]**
There is a loop in C++ that runs at least once even when its condition is
false from the very start. And there is a switch statement that will happily
slide through three cases when you meant one. Decisions and repetition look
simple — until the details bite. Let's learn the details.

**[WHY IT MATTERS — ~0:25]**
Programs are decisions and repetition, and functions are how you package
logic into reusable, testable units. These are the control structures you
will use in every C++ program you ever write, and the parameter-passing rules
in this lesson decide whether your functions are safe, fast, or quietly
broken. Get pass-by-value versus pass-by-reference wrong and you will either
corrupt your caller's data or copy megabytes you never needed to.

**[SECTION — Decisions and loops — ~0:50]**
The do-while loop is the odd one out: do { ... } while (cond); checks its
condition after the body, so it always executes at least once. Every other
loop — while, for, the range-based for — may execute zero times. Think of
do-while as tasting the soup before reading the recipe: you act first, then
ask whether to continue.

Inside any loop, break exits the innermost loop immediately, while continue
skips to the next iteration. Emergency exit versus skip-ahead — keep them
separate in your head.

Then there is switch. It matches an integral or enumeration value against
case labels with exact equality — no strings, no ranges. And every case
needs its own break;, because without one, execution falls through into the
next case. Picture an elevator that slides past your floor because you forgot
to press stop. Forgetting break is one of the oldest bugs in the language,
and it still catches experienced programmers.

**[SECTION — Functions: the unit of reuse — ~2:35]**
A function declared void returns nothing — you call it for its side effects.
Parameters, by default, are passed by value: the function receives a copy, so
changes to it never reach the caller. It is like handing someone a photocopy
of a document — they can scribble on it all day and your original is
untouched.

To let a function modify the caller's variable, take the parameter by
reference: void f(int& x). Now you have handed over the original document,
not a copy. For large objects you do not want to modify, the idiom is const
T&: pass by const reference. It avoids an expensive copy while promising the
function will not touch the object — reading glasses, not a pen. This is the
default way to pass big read-only parameters in modern C++.

Two more conveniences. Overloading lets two functions share a name as long as
their parameter lists differ, and the compiler picks the best match by the
arguments you pass. And default arguments — int f(int x, int y = 0) — let
callers omit the trailing ones. Finally, a function must be declared before
its first use, by its definition or a forward declaration called a prototype.
That ordering rule is exactly why headers exist. And when you split code
across files, the header is the promise and the .cpp is the delivery —
callers compile against the promise alone, never needing to see how it is
kept.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: expecting switch to accept strings or ranges — it matches
integral and enumeration values exactly, nothing else. Two: forgetting break
in a case and falling through into the next one. Three: passing a large
object by value when const T& would avoid the copy — correct code, but
needlessly slow, and the exam notices the difference.

**[RECAP — ~5:05]**
do-while always runs once; break exits the loop, continue skips to the next
iteration. switch matches integral or enum values exactly, and each case
needs its break. Parameters pass by value by default — the function gets a
copy. Use int& when the function must modify the caller's variable, and
const T& for large read-only parameters. Overloading shares a name across
different parameter lists, defaults let callers omit arguments, and every
function must be declared before its first use.

## On-screen visuals

- HOOK: a do-while loop highlighted running once with a false condition;
  a switch sliding through multiple cases.
- WHY IT MATTERS: "decisions + repetition + functions" as the three building
  blocks of every program.
- SECTION — Decisions and loops: loop comparison table — do-while vs while
  vs for; break vs continue flow arrows; a switch with a missing break
  falling through, then fixed.
- SECTION — Functions: the unit of reuse: photocopy vs original-document
  diagram for pass by value vs reference; const T& shown as read-only;
  overloaded functions with different parameter lists; a default argument
  being omitted by a caller.
- COMMON MISTAKES: three trap cards — switch with a string crossed out, a
  missing break, a large object copied by value.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
