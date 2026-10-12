# Go Control Flow & Functions: One Loop, Multiple Returns, and defer — Avatar Tutor Script

**Lesson ID:** go-control-functions
**Track:** Go Programming
**Estimated runtime:** ~5 minutes (~672 words)

## Spoken script

**[HOOK — 0:00]**
Go has exactly one loop keyword. One. And yet it covers every looping job a
program needs — counting loops, while loops, infinite loops. Less syntax to
learn, fewer ways to be surprised. That is Go's minimalism at work, and it
runs through this entire lesson.

**[WHY IT MATTERS — ~0:25]**
Control flow is where languages accumulate quirks: fall-through switches,
four kinds of loop, hidden gotchas. Go stripped it to the essentials — one
loop, a switch that doesn't fall through, functions that return multiple
values, and defer for cleanup. Small surface, enormous consequences: the
multiple-return alone underpins Go's entire error-handling model.

**[SECTION — One loop, many shapes — ~0:50]**
for is the only loop, and it wears three hats. The classic for i := 0; i <
n; i++ counts. Drop the init and post clauses and for condition { ... }
becomes a while loop. Drop everything and for { ... } loops forever. One
keyword to learn, zero ambiguity about which construct fits — like one blade
that reshapes itself for every cut.

switch is similarly streamlined: cases do not fall through to the next one,
unlike C, so the break you would write defensively elsewhere is unnecessary.
The rare intentional fallthrough uses an explicit fallthrough keyword — the
exception is labelled, not silent. And a switch with no condition at all
reads its cases as boolean expressions, giving you a cleaner if/else-if
chain. When the condition is gone, each case is just a question, asked in
order.

**[SECTION — Functions that say more — ~2:40]**
Go functions may return multiple values — func div(a, b int) (int, error)
— and that single capability shapes the whole language. The second return is
conventionally the error, checked explicitly by every caller. Think of it as
a receipt that always comes with a status stamp: the value and the verdict
travel together, and you cannot accept one without seeing the other.

Parameters can be named in the signature, which pre-initialises them to zero
values and lets a bare return hand back their current state. Variadic
functions — func sum(nums ...int) — accept any number of arguments, received
inside as a slice. And when a function returns something you do not need,
the blank identifier _ discards it visibly: v, _ := f(). Nothing is silently
dropped — the discard is on the record, like a shredder with a log. That
visibility is the point: a future reader sees exactly what was ignored and
can judge whether the choice still holds.

**[SECTION — Defer: cleanup you cannot forget — ~4:00]**
defer schedules a call to run when the surrounding function returns — defer
f.Close() right after opening a file, and the close happens no matter which
return path executes. It is Go's answer to try/finally, minus the nesting.
Set the reminder the moment you borrow the resource, and cleanup becomes
structural instead of a matter of memory.

When several defers stack up, they run last-in, first-out: the most recently
deferred call executes first. That mirrors how nested resources should
unwind — shoes off before socks. Used well, defer makes resource leaks
structurally difficult: the cleanup is declared at the moment of
acquisition, right where a reader can see the pairing. It reads as a promise
made at the top of the function and kept at the bottom — open here, closed
there, no exceptions and no excuses.

**[COMMON MISTAKES — ~4:55]**
Three traps. One: coming from C and expecting switch cases to fall through
— in Go each case breaks automatically; fallthrough must be explicit. Two:
ignoring a return value by simply omitting it — Go won't let you; use the
blank identifier _ so the discard is visible. Three: forgetting that defers
run in reverse order — the last defer declared runs first.

**[RECAP — ~5:15]**
for is the only loop: classic, while-style, and infinite. switch never falls
through by default, and a conditionless switch reads as an if/else-if chain.
Functions return multiple values — conventionally (result, error) — which
underpins Go's error handling. Named parameters start at zero values, ...
makes a function variadic, and _ discards visibly. defer schedules cleanup
at function return, running last-in, first-out. Less syntax, fewer
surprises — that is the Go way.

## On-screen visuals

- HOOK: the single keyword "for" morphing into its three shapes — classic,
  while-style, infinite.
- WHY IT MATTERS: Go's minimal control-flow surface beside a cluttered
  multi-construct language.
- SECTION — One loop, many shapes: the three for forms side by side; a
  switch with no fallthrough vs C's; a conditionless switch as an if/else-if
  chain.
- SECTION — Functions that say more: (int, error) as value plus status
  stamp; a variadic call collecting into a slice; _ visibly discarding a
  return.
- SECTION — Defer: cleanup you cannot forget: defer f.Close() paired with
  the open; stacked defers unwinding in LIFO order.
- COMMON MISTAKES: three trap cards — C-style fallthrough assumed, a
  silently dropped return, defers in the wrong assumed order.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
