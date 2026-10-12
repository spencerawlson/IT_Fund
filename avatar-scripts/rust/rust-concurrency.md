# Fearless Concurrency & Safety: Threads Without Data Races — Avatar Tutor Script

**Lesson ID:** rust-concurrency
**Track:** Rust Programming
**Estimated runtime:** ~5 minutes (~695 words)

## Spoken script

**[HOOK — 0:00]**
Concurrency bugs are the worst kind of bug. They hide through every test, appear only under load, and vanish when you add logging. Now imagine a compiler that simply refuses to build a program with a data race. That is not marketing — Rust calls it fearless concurrency, and the borrow checker genuinely rejects racy programs.

**[WHY IT MATTERS — ~0:25]**
Concurrency is where Rust's ownership model pays its biggest dividend. The same borrowing rules that prevent use-after-free also prevent data races — an entire class of threading bugs that other languages discover in production becomes a compile error. And step back and the security case writes itself: memory-safety bug classes behind a huge fraction of C and C++ CVEs — use-after-free, buffer overflows, data races — are rejected at compile time. For security-sensitive systems code, that is not a nice-to-have. It is the argument.

**[SECTION — Threads without data races — ~0:50]**
Spawning a thread is one call: `thread::spawn(|| { ... })`, which returns a handle you can `join` to wait for it. Closures passed to threads usually need the `move` keyword, transferring ownership of captured variables into the thread — so the data is guaranteed to outlive any borrow across the thread boundary. Ownership, again, doing the safety work.

For communication, Rust prefers message passing. `std::sync::mpsc` channels — multi-producer, single-consumer — let threads send owned values to each other: `tx.send(v)` on one side, `rx.recv()` on the other. And the motto captures the philosophy: don't communicate by sharing memory; share memory by communicating. Values move between threads with ownership, so there is never a moment where two threads own the same data.

**[SECTION — Shared state, when you truly need it — ~2:10]**
Sometimes shared mutable state is the right design, and Rust makes it explicit: `Arc<Mutex<T>>`. `Arc` is atomic reference counting for shared ownership across threads — `Rc` looks similar but is single-threaded; `Arc` is its thread-safe sibling. The `Mutex` guards the data, and each thread clones the `Arc`, locks the mutex, and gets exclusive `&mut` access. The pattern is a mouthful to say and completely safe to use.

Under the hood, two marker traits do the enforcement. `Send` means ownership of a value may move to another thread. `Sync` means references to it may be shared across threads. Types that are not thread-safe simply do not implement them, and the compiler refuses to let them cross the boundary. Most of the time you never name these traits — you just enjoy the errors they produce when you slip.

**[SECTION — Escape hatches and guarantees — ~3:30]**
The `unsafe` keyword exists for operations the compiler cannot verify: raw pointers, foreign function interfaces, certain low-level tricks. Here is what `unsafe` does not do — it does not disable all checks. It narrows them. And the discipline is to keep `unsafe` blocks small, documented, and audited, with safe abstractions built on top. The dangerous code is fenced off, labelled, and reviewed — not sprinkled through the codebase.

Everything else stays in safe Rust, where memory is freed deterministically: each value is dropped the moment its owner leaves scope, RAII-style, with no collector and no pauses. Threads, channels, shared state — all of it rides on the same three ownership rules from the start of this track.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: using `Rc` across threads. `Rc` is single-threaded — you need `Arc`, the atomic sibling. Two: treating `unsafe` as "checks off". It narrows verification to specific operations; the discipline is small, documented, audited blocks with safe wrappers. Three: forgetting `move` on thread closures. The thread must own its captures, or the borrow checker will not let them cross the boundary.

**[RECAP — ~5:00]**
Threads spawn with `thread::spawn` and usually take `move` closures; channels (`mpsc`) pass owned values between threads — share memory by communicating. `Arc<Mutex<T>>` is thread-safe shared mutable state, enforced by the `Send` and `Sync` marker traits. `unsafe` is the narrow escape hatch for unverifiable operations, kept small and audited. And the guarantee holds throughout: values drop deterministically at end of scope, with no garbage collector. That is fearless concurrency — and the end of this track's core arc.

## On-screen visuals

- HOOK: a data race hiding through tests and striking under load, then the compiler rejecting the same program.
- Threads: `thread::spawn` with a `move` closure carrying ownership across the boundary; `mpsc` channel with values flowing sender to receiver.
- Shared state: `Arc<Mutex<T>>` diagram — clones of the `Arc`, one thread holding the locked `&mut` guard; `Arc` versus `Rc` labelled thread-safe and single-threaded; `Send`/`Sync` as gatekeepers.
- Unsafe: a fenced-off `unsafe` block, small and labelled, with a safe abstraction built on top.
- RECAP: the cheat-sheet rows as a clean summary card.
