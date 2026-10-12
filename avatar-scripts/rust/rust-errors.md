# Collections & Error Handling: Errors as Values — Avatar Tutor Script

**Lesson ID:** rust-errors
**Track:** Rust Programming
**Estimated runtime:** ~5 minutes (~688 words)

## Spoken script

**[HOOK — 0:00]**
Most languages handle failure with exceptions — invisible control flow that teleports you up the call stack. Rust has no exceptions. Failures are values: returned, inspected, and handled explicitly, right where they happen. And the `?` operator makes that explicitness cheap instead of noisy.

**[WHY IT MATTERS — ~0:25]**
Day-to-day Rust runs on a small set of collections — `Vec`, `String`, `HashMap` — and an error-handling philosophy with no exceptions. This is the lesson where you learn the containers you will use every day and the honest discipline for failure: return it when the caller could recover, panic only when the program's assumptions are broken. Get this right and your code will read like it was written by someone who has seen production.

**[SECTION — The working collections — ~0:50]**
`Vec<T>` is the growable array you will reach for constantly. `push` adds to it. But here is a detail that matters: prefer `.get(i)` over indexing when the position might not exist. `.get(i)` returns `Option<&T>` — `None` when out of range — while `v[i]` panics on out-of-range. Safe access versus a crash, chosen at the call site.

`String` is an owned, growable UTF-8 string; `&str` is a borrowed slice of one. That is why function parameters usually take `&str` — borrowing is cheaper than cloning, and the owner keeps its data. `HashMap<K, V>` works as you would expect, with reads returning `Option`, because a missing key is absence, and absence is an `Option`.

Iteration runs on the `Iterator` trait, and adaptors like `map`, `filter`, and `collect` compose lazily — a chain of transformations costs no intermediate allocations. Lazy here means the work happens only as the iterator is consumed, which is why long chains stay fast.

One borrow-related subtlety to pocket: `for x in &v` borrows each element by shared reference, leaving `v` usable afterward — but `x` is a reference to each element. If you need to mutate, iterate `&mut v` instead. And as always, the moment you get it wrong, the compiler will tell you exactly how.

**[SECTION — Errors as values, propagated with `?` — ~2:25]**
Fallible operations return `Result`. To extract the success value, you have `.unwrap()`, which panics on `Err` — or on `None` for `Option`. Here is the honest rule: `.unwrap()` is perfect for prototypes and tests, and a code smell in production paths. The honest upgrade is `.expect("config file must exist")`, which panics with your message instead of a generic one. At least the next person knows what you assumed.

The idiomatic middle path is the `?` operator. Place it after a `Result` or `Option`: on failure it returns early with that failure, on success it unwraps the value. A function reading a config file becomes `fs::read_to_string("app.toml")?` — one character collapsing a whole ladder of nested error plumbing. The error propagates to the caller, who decides what to do. That is the whole philosophy: failures travel as values until someone is in a position to handle them.

And `panic!` itself? Reserved for the unrecoverable: violated invariants, programmer bugs, states that should be impossible. Expected, handleable failures — a missing file, a bad response — belong in `Result`, never in a panic. The discipline is simple to state and worth internalising: if the caller could reasonably recover, return it; if the program's assumptions are broken, panic.

**[COMMON MISTAKES — ~4:10]**
Three traps. One: `.unwrap()` in production code paths. Prototypes and tests, fine. Shipped code, use `?` or `.expect()` with a real message. Two: indexing a `Vec` with `v[i]` when the index might be out of range — `.get(i)` returns `Option` and keeps you crash-free. Three: panicking on expected, handleable failures like a missing file or a bad response. Those belong in `Result` — `panic!` is for broken assumptions.

**[RECAP — ~4:35]**
`Vec<T>` is your growable array — `.get(i)` is safe, `v[i]` panics. `String` is owned UTF-8, `&str` is the borrowed slice, and parameters take `&str`. `HashMap` reads return `Option`. Iterator adaptors compose lazily. Errors are values: `?` propagates, `.unwrap()` panics, `.expect()` panics with your message, and `panic!` is reserved for broken assumptions. Next: traits and generics, Rust's answer to abstraction.

## On-screen visuals

- HOOK: an exception teleporting up a call stack versus a `Result` value travelling hand-to-hand between callers.
- Collections: `Vec` with `.get(i)` returning `Some`/`None` beside `v[i]` panicking; `String` versus `&str` ownership diagram; lazy iterator chain with no intermediate allocations.
- Error handling: `read_config` before and after `?` — the nested plumbing collapsing to one character; `.unwrap()` labelled prototypes-only, `.expect()` with a message, `panic!` fenced off for invariants.
- RECAP: the cheat-sheet rows as a clean summary card.
