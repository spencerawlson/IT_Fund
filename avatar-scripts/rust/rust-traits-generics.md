# Traits & Generics: Zero-Cost Abstraction — Avatar Tutor Script

**Lesson ID:** rust-traits-generics
**Track:** Rust Programming
**Estimated runtime:** ~5 minutes (~710 words)

## Spoken script

**[HOOK — 0:00]**
Rust has no inheritance and no base classes. And yet it achieves some of the most powerful abstraction in any systems language. How? Two mechanisms working together: traits, which define shared behaviour a type can implement, and generics, which the compiler specialises per type — so the abstraction costs nothing at runtime.

**[WHY IT MATTERS — ~0:25]**
Abstraction usually comes with a price: virtual calls, boxing, runtime overhead. Rust's trick is that you pay at compile time instead. Generics are monomorphised — a specialised copy of the code is generated for each concrete type used — so generic code and iterator chains compile down to machine code as fast as hand-written equivalents. Traits give you interfaces without inheritance. Together they are why Rust calls its abstractions zero-cost.

**[SECTION — Traits: Rust’s interfaces — ~0:50]**
A trait is a set of method signatures a type can implement — the closest analogue to an interface, minus inheritance. `impl Display for Point { ... }` gives `Point` the behaviour. A trait can also ship default method implementations, which implementors may use or override, cutting repetition: declare the signature, provide a default body, and types pick it up or replace it.

The `derive` attribute you have already seen is traits made convenient. `#[derive(Clone, Debug)]` is the compiler writing the `impl` for you — no boilerplate.

Everyday traits form the vocabulary types use to interoperate. `Default` provides a sensible zero value through `::default()`. `PartialEq` and `Eq` give field-by-field `==`. `Clone` gives explicit duplication. Learn these names, because they appear in trait bounds everywhere.

**[SECTION — Generics without runtime cost — ~2:10]**
Consider `fn largest<T: PartialOrd>(list: &[T]) -> &T`: one function that accepts any type implementing the `PartialOrd` bound — anything comparable. The compiler generates a specialised copy for each concrete type actually used. That monomorphisation is why Rust calls its abstractions zero-cost: you pay for the abstraction in compile time, never at runtime. The machine code is as fast as if you had hand-written a version per type.

When bounds get long, signatures get unreadable — so a `where` clause gives them a home: `fn f<T>(x: T) where T: Clone + Debug` reads far better than cramming every bound into the angle brackets. Same meaning, kinder to the reader.

Notice the philosophy: nothing is hidden. The compiler does more work, your program does the same work as the hand-written version. That is what "zero-cost" actually means — not free, but paid by the compiler instead of the CPU.

**[SECTION — Two kinds of polymorphism — ~3:30]**
Generics and `impl Trait` arguments dispatch statically: the compiler knows exactly which code runs for each type. That is the default, and the fast path.

But sometimes you need runtime flexibility — a `Vec` holding different concrete types that share behaviour, where the types are not all known at compile time. That is what trait objects are for. `Box<dyn Display>` is a heap-allocated value whose concrete type is resolved through a vtable at runtime. The `dyn` keyword is the tell: dynamic dispatch.

So there are two kinds of polymorphism, and the rule is simple: static dispatch is the default and the fast path; `dyn Trait` is the deliberate choice when heterogeneity demands it. Knowing which you are using — and why — is part of writing idiomatic Rust. Reach for generics when the types are known at compile time; reach for `dyn` when they genuinely are not.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: thinking "zero-cost abstraction" means free. It is not free — you pay in compile time. It means zero *runtime* cost. Two: reaching for `Box<dyn Trait>` by default. Static generics are the fast path; use `dyn` only when you need types mixed at runtime. Three: cramming long bounds into the signature instead of using a `where` clause. Your readers will thank you.

**[RECAP — ~5:05]**
Traits are Rust's interfaces — method signatures a type implements, with optional defaults and `derive` writing the boilerplate. Generics take trait bounds like `T: PartialOrd` and are monomorphised per concrete type: zero runtime cost, paid at compile time, with `where` clauses keeping long bounds readable. Two dispatch strategies: static for generics, `dyn Trait` through a vtable when the types must mix at runtime. Next: concurrency without data races.

## On-screen visuals

- HOOK: an inheritance tree crossed out beside trait and generic mechanisms snapping together.
- Traits: `impl Display for Point` wiring behaviour to a type; a trait with a default method that implementors use or override; `#[derive(Clone, Debug)]` expanding into compiler-written code.
- Generics: one generic function splitting into specialised per-type copies at compile time — the monomorphisation payoff labelled "paid at compile time, free at runtime".
- Polymorphism: static dispatch with the call target known versus `Box<dyn Display>` resolving through a vtable.
- RECAP: the cheat-sheet rows as a clean summary card.
