# Concurrency & Performance: The GIL and Doing Things Faster — Avatar Tutor Script

**Lesson ID:** py-concurrency
**Track:** Python & Automation
**Estimated runtime:** ~6 minutes (~791 words)

## Spoken script

**[HOOK — 0:00]**
Scanning a slash-16, pulling data from five hundred APIs, or hashing a disk
image all hit the same wall: doing things one at a time is slow. Concurrency
can fix that — but only if you pick the right tool for the kind of work. Pick
wrong, and your "optimisation" does nothing at all.

**[WHY IT MATTERS — 0:25]**
Security work is full of embarrassingly parallel jobs: probe these hosts,
fetch these URLs, hash these files. The difference between serial and
concurrent can be hours versus minutes. But Python has a famous quirk — the
GIL — that decides which concurrency tool actually helps. Understand the
quirk, and you'll reach for the right tool every time.

**[SECTION — The GIL and the two kinds of work — 0:50]**
CPython has a Global Interpreter Lock: only one thread runs Python bytecode
at a time. Newer versions offer an experimental free-threaded build without
it, but the default build still has the GIL — so assume it's there.

Here's the distinction that makes everything click. There are two kinds of
work. I/O-bound work — network requests, disk reads, database calls — spends
most of its time waiting. And threads release the GIL while waiting. So for
I/O-bound work, threads or asyncio speed things up beautifully: while one
thread waits on the network, another runs.

CPU-bound work — hashing, compression, number crunching — is different. It
never waits, so it never releases the GIL, and threads just take turns on one
core. For CPU-bound work you need multiprocessing or a process pool: separate
processes, each with its own interpreter and its own GIL, so they genuinely
use multiple cores. Ask first: is my work waiting, or computing? The answer
chooses the tool.

**[SECTION — Threads, processes and asyncio in practice — 2:00]**
The concurrent dot futures module gives you both pools with the same simple
interface: ThreadPoolExecutor for threads, ProcessPoolExecutor for processes,
each with submit and map. Start with these before reaching for lower-level
modules — they handle the plumbing, including collecting results.

Then there's asyncio: many tasks on one thread, driven by an event loop.
Inside an async def, await suspends that coroutine until the awaited operation
finishes, and the loop runs other tasks meanwhile. It scales to thousands of
concurrent connections — beautiful for I/O-heavy work. The catch? Every
library in the path must be async-aware. One blocking call and the whole loop
stalls. So asyncio is powerful but demanding; the executors are the friendlier
starting point.

**[SECTION — Race conditions — 3:05]**
A race condition is when the outcome depends on the unpredictable timing of
concurrent access to shared state. The classic: two threads both read a
counter, both add one, both write it back — and you've lost an increment.
The result changes run to run, which makes these bugs miserable to reproduce.

You can protect shared state with a threading lock. But the better fix, when
you can manage it, is to avoid sharing at all: have workers return their
results and combine them at the end. The lesson's URL checker does exactly
this — each worker returns its status, the main thread collects them, and no
lock is needed. No shared state, no race.

**[SECTION — Measure, then optimise — 3:55]**
Before changing anything, profile. Running python -m cProfile with the
cumtime sort shows where time actually goes — and it's almost never where you
guess. Optimising the wrong function is wasted effort; profiling tells you
which function deserves it.

And here's the delightful secret: the fix is often a data structure, not
concurrency at all. Checking membership in a list is linear — the list gets
ten times bigger, the check gets ten times slower. Checking membership in a
set is constant on average. Converting a list to a set can turn minutes into
milliseconds, with one line of code.

Two more tools. Functools dot lru cache memoises a pure function's results,
so repeated calls with the same arguments return instantly. And for big
inputs, stream with generators: iterating over a file object reads it line by
line, so a huge log never has to fit in memory.

**[COMMON MISTAKES — 4:55]**
Three traps. One: threads for CPU-bound work. The GIL means threads don't
parallelise computation — use processes. Two: optimising before profiling.
Measure first, or you'll speed up the wrong thing. Three: shared mutable
state between workers. Return results and combine them instead of locking.

**[RECAP — 5:20]**
The GIL lets one thread run Python bytecode at a time, so classify your work:
I/O-bound means waiting — use threads or asyncio; CPU-bound means computing —
use processes. ThreadPoolExecutor and ProcessPoolExecutor share one friendly
interface; asyncio scales to thousands of connections but demands async-aware
libraries. Race conditions come from shared state — prefer returning results
over locking. And always measure first: cProfile finds the hotspot, a set
instead of a list or lru cache often fixes it, and generators stream data
that won't fit in memory. That's concurrency — the right tool for the kind of
work.

## On-screen visuals

- HOOK: a serial scan crawling host by host versus a concurrent scan
  finishing in a fraction of the time.
- GIL SECTION: one lock with threads queuing for bytecode execution; a
  waiting I/O thread releasing the lock while another runs; processes each
  with their own lock on separate cores.
- Executors/asyncio SECTION: a thread pool and a process pool with the same
  submit/map interface; an event loop juggling coroutines, one blocking call
  stalling it.
- Race conditions SECTION: two threads interleaving read-add-write on a
  counter and losing an increment; the fix — workers returning results for
  the main thread to combine.
- Measure SECTION: a cProfile table highlighting the hotspot; a linear list
  scan versus a constant-time set lookup.
- RECAP: the cheat-sheet terms as a clean summary card.
