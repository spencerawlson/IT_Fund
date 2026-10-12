# Variables, Types & Mutability: Immutability by Default — Avatar Tutor Script

**Lesson ID:** rust-types
**Track:** Rust Programming
**Estimated runtime:** ~6 minutes (~779 words)

## Spoken script

**[HOOK — 0:00]**
Most languages get one thing backwards: their variables can change unless you ask them not to. Rust flips it. In Rust, variables cannot change unless you explicitly say so — and that one default removes an entire category of "who changed my variable?" bugs before you write a single line of logic.

**[WHY IT MATTERS — ~0:25]**
Rust's type system is strict, static, and precise, and every decision in this lesson compounds. Immutability by default makes intent visible. Precise numeric types and no implicit conversions catch truncation bugs at compile time. And the overflow rules turn a classic vulnerability class into a loud, immediate failure instead of silent corruption. Write this lesson's rules into your fingers and the borrow checker will feel like a colleague, not an adversary.

**[SECTION — Immutable until you say otherwise — ~0:50]**
`let x = 5;` creates an immutable binding. Try to reassign it and the compiler stops you, full stop. If you want change, you opt in, visibly: `let mut x = 5;`. Because mutation is always marked at the declaration site, anyone reading the code can see at a glance which variables are allowed to change. It is a small discipline, but it compounds across a codebase — nobody has to wonder.

Now, shadowing looks similar but is a different mechanism entirely. Write `let x = 5;` and later `let x = "hello";` and you have not mutated anything — you have declared a brand-new binding that happens to reuse the name. The difference matters: unlike mutation, shadowing can even change the type. A classic idiom is reading input as text, then shadowing it as a number: `let input = get_input();` followed by `let input: u32 = input.parse()...`. Same name, new variable, new type. The compiler is fine with it.

Then there is `const`, which is stricter still. A `const` is always immutable, always carries an explicit type annotation, and is always a compile-time constant — conventionally written in SCREAMING_CASE, like `const MAX: u32 = 100;`. Where `let` creates a runtime binding, `const` is a value baked in before the program starts.

**[SECTION — A precise type system — ~2:15]**
Rust's integers wear their sizes openly: signed `i8` through `i128`, unsigned `u8` through `u128`, plus `isize` and `usize` sized to the platform pointer. A bare literal like `5` defaults to `i32`. The compiler infers types aggressively, but the language stays statically and strongly typed — every value's type is known at compile time.

Two surprises for newcomers. First, a `char` is not a byte. It is a four-byte Unicode scalar value. A single byte is `u8` — different thing entirely. Second, tuples: a tuple groups a fixed number of possibly different types, accessed by position, so `t.0` and `t.1` reach the first and second elements.

But here is the part that feels pedantic until it saves you: Rust will not guess across types. There are no implicit numeric conversions. `let f: f64 = some_int;` is a compile error, and you convert explicitly — `x as f64` or `.into()`. In a looser language, that assignment would silently truncate or wrap your data. Rust makes you say it out loud, and the truncation bug never ships.

**[SECTION — Arithmetic with guardrails — ~3:35]**
Integer overflow is a classic vulnerability class, and Rust treats it as a bug worth surfacing. In debug builds, overflowing arithmetic panics — loudly, immediately, at the exact line. Release builds wrap by default for performance, so the language hands you explicit tools for when the behaviour matters: `checked_add` returns an `Option`, turning overflow into `None`; `wrapping_add` wraps deliberately; `saturating_add` clamps at the type's maximum. The rule of thumb is simple: if overflow would be a bug, use the checked variant and handle it.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: confusing shadowing with mutation. Shadowing is a new `let` that can change the type; mutation changes the value of the same variable. Two: assuming `const` is just an unchangeable `let` — it is a compile-time constant with a mandatory type annotation. Three: forgetting that release builds wrap on overflow while debug builds panic. When overflow must never be silent, reach for the `checked_` variants.

**[RECAP — ~4:55]**
Bindings are immutable unless you write `mut`. Shadowing re-declares a name and can change its type; `const` is a compile-time constant with an explicit type. Integers are precisely sized, literals default to `i32`, a `char` is four bytes of Unicode, and Rust never converts between types implicitly — you say it out loud with `as` or `.into()`. Overflow panics in debug builds, so use the checked, wrapping, or saturating variants when the behaviour matters. Next: control flow that returns values.

## On-screen visuals

- HOOK: `let x = 5;` with a lock icon; a mutation attempt bouncing off the compiler.
- Immutability: side-by-side — `let mut` flagged at the declaration site versus shadowing re-declaring the same name with a new type.
- Type system: integer size ladder from `i8` to `i128`; `char` shown as a four-byte Unicode scalar; tuple with positional access.
- Overflow: debug build panicking at the exact line versus release wrapping, with `checked_`/`wrapping_`/`saturating_` as the three explicit choices.
- RECAP: the cheat-sheet rows as a clean summary card.
