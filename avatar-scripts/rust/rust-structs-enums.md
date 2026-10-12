# Structs, Enums & Matching: The End of Null — Avatar Tutor Script

**Lesson ID:** rust-structs-enums
**Track:** Rust Programming
**Estimated runtime:** ~5 minutes (~727 words)

## Spoken script

**[HOOK — 0:00]**
Tony Hoare, the computer scientist who invented null, called it his billion-dollar mistake. Rust agrees so strongly that it simply does not have null — and it has no classes either. Two omissions that turn out to be features. What replaces them is a pair of tools, structs and enums, plus one radical idea: absence is a value you pattern-match on, not a landmine hidden in every reference.

**[WHY IT MATTERS — ~0:25]**
This lesson changes how you model data. Structs group named fields with behaviour attached through `impl` blocks. Enums in Rust are far richer than their C namesakes — each variant can carry its own data. And the two jobs null used to do badly, representing absence and representing failure, are handled by the `Option` and `Result` enums, with the compiler forcing you to confront both. Null pointer crashes simply cannot happen here.

**[SECTION — Structs: data with behavior attached — ~0:50]**
A struct groups named fields — straightforward. The behaviour lives separately, in an `impl` block, where methods take `self`, `&self`, or `&mut self` depending on whether they consume the value, read it, or modify it. That split keeps data and behaviour visibly separate, and it reads well: the struct says what the thing is, the `impl` says what it does.

Two conveniences. Tuple structs, like `struct Pair(i32, i32)`, offer positional fields for lightweight wrappers — no field names, just positions. And common capabilities come from `derive`: `#[derive(Debug, Clone)]` auto-implements debug printing and cloning instead of you hand-writing the boilerplate. The compiler writes the `impl` for you.

And here is the quiet guarantee: because there is no null and no implicit default, every field must be initialised. Uninitialised memory simply does not exist as a concept you can stumble into. You cannot forget to set a field — the build will not let you.

**[SECTION — Enums that carry data — and the end of null — ~2:20]**
A Rust enum is a type that is one of several variants, where each variant may hold data: `enum Message { Quit, Move { x: i32, y: i32 }, Write(String) }`. One variant is a bare label, another carries named fields, another carries a `String`. This single mechanism replaces a remarkable amount of machinery from other languages — tagged unions, class hierarchies, special sentinel values.

Now the two stars. `Option<T>` is either `Some(T)` or `None`, and it replaces null: a value that might be absent is visibly marked in its type, and the compiler will not let you use it without handling the `None` case. `Result<T, E>` — `Ok(T)` or `Err(E)` — does the same job for operations that can fail, and it is Rust's primary error type.

Why is this better than null? Because absence is no longer a landmine. In a nullable language, any reference might secretly be nothing, and you find out at runtime. In Rust, a value that might be absent wears it in its type, like a warning label, and the compiler enforces the handling.

The safe way to handle any enum is `match`, and it is exhaustive — forget a variant and the build fails. For the common case of caring about exactly one variant, `if let Some(x) = opt` runs its block with `x` bound, skipping the ceremony of a full match. A function like `first` on a vector returns `Option<i32>` — `None` if empty, no null, no panic — and the caller decides what to do.

**[COMMON MISTAKES — ~4:10]**
Three traps. One: treating `Option` like a nullable reference and trying to use the value directly. You must unwrap it through `match`, `if let`, or a combinator — the compiler insists. Two: reaching for `match` when `if let` is cleaner. Full matches for many variants, `if let` for the one interesting case. Three: writing `impl` boilerplate by hand when `derive` exists. `#[derive(Debug, Clone)]` is there for a reason.

**[RECAP — ~4:35]**
Structs group named fields; behaviour attaches in `impl` blocks with `self`, `&self`, or `&mut self`. Tuple structs give you positional fields; `derive` writes trait implementations for you. Enums are one-of-several variants that can each carry data. `Option<T>` replaces null and `Result<T, E>` is the primary error type — absence and failure are values, marked in the type, handled exhaustively by `match` or concisely by `if let`. Next: the working collections, and errors as values.

## On-screen visuals

- HOOK: Hoare's "billion-dollar mistake" quote beside a null reference detonating at runtime.
- Structs: struct definition with named fields, `impl` block beside it showing `self` / `&self` / `&mut self`; `#[derive(Debug, Clone)]` expanding into compiler-written code.
- Enums: `enum Message` with three differently-shaped variants; `Option` and `Result` as two-branch diagrams — `Some`/`None`, `Ok`/`Err`.
- Matching: a `match` on `Option` with both arms covered; the `if let` shortcut beside the full match.
- RECAP: the cheat-sheet rows as a clean summary card.
