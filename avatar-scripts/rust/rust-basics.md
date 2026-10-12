# Basics & Cargo: Memory Safety and the Toolchain — Avatar Tutor Script

**Lesson ID:** rust-basics
**Track:** Rust Programming
**Estimated runtime:** ~6 minutes (~795 words)

## Spoken script

**[HOOK — 0:00]**
Imagine a bug that survives a decade of testing and then detonates at three in the morning. A use-after-free. A buffer overflow. In C and C++ codebases, memory-safety failures like these sit behind a huge share of real-world CVEs, year after year. Rust exists to delete that entire class of bug.

**[WHY IT MATTERS — ~0:25]**
Rust's headline promise is memory safety without a garbage collector, enforced at compile time. That is not just a performance story — it is a security story. Choosing a memory-safe language is a genuine software security control, the kind CISSP Domain 8 cares about. And before any of the clever language parts, you need the workshop: Cargo, the toolchain that builds, tests, and ships every Rust project. Get these daily verbs into your fingers now and the whole track goes faster.

**[SECTION — Memory safety, enforced before the program ever runs — ~0:50]**
Here is the deal. In C, the compiler trusts you. It hands you raw pointers and says, be perfect or be exploited. In Java or Go, the runtime watches you — a garbage collector cleans up your memory, and you pay a runtime tax plus those occasional GC pauses. Rust picks a third option: it moves the checks into the compiler.

The ownership system is a set of compile-time rules about who owns each piece of memory and how it may be borrowed, and the borrow checker — the compiler pass with the fearsome name — simply rejects programs that break the rules. The binary that finally runs cannot contain those bugs, because it was never allowed to be built with them.

And the payoff is twofold. First, C-like performance: no garbage collector, no pauses, which is why Rust turns up in operating systems, game engines, browsers, and databases — places where a pause is unacceptable. Second, you get that speed without the old systems-programming bargain of perfection-or-exploitation. Fast and safe. That is the promise, and everything in this track is the mechanism that delivers it.

**[SECTION — Cargo: the front door — ~2:10]**
You will almost never invoke the Rust compiler directly. `rustc` exists, but Cargo is the front door to every Rust project. Think of it as four tools wearing one hat: build tool, package manager, test runner, and documentation generator.

The daily verbs are few, and you should learn them today. `cargo new <name>` scaffolds a project — a `Cargo.toml` manifest plus `src/main.rs`. `cargo build` compiles. `cargo run` compiles and runs. `cargo test` runs your tests. And `cargo check` is the one you will live in: it type-checks and borrow-checks without producing a binary, so feedback arrives in seconds rather than minutes.

Dependencies come from crates.io, the community registry. You declare them in `Cargo.toml` — the manifest holding your project's name, version, and dependencies — and add them with `cargo add <crate>`. Then `Cargo.lock` pins the exact versions chosen, so someone else's machine builds exactly what yours built. The discipline matters: commit the lockfile for applications, leave it out for libraries. Manifest plus lockfile is how reproducible builds actually happen.

**[SECTION — Macros, expressions, and the humble semicolon — ~3:30]**
Your first Rust program prints with `println!("text")`, and that exclamation mark is doing real work. It marks a macro, not a function — code that expands at compile time and can accept a variable number of arguments or format strings. `vec!`, `format!`, `panic!` — the `!` is always the tell.

Rust is expression-oriented, which means nearly everything evaluates to a value. An `if` returns a value. A block returns the value of its last expression. And that is where the semicolon earns its keep: end a line with `;` and you have a statement, which yields nothing. Leave it off the final expression and the block returns that value. Every newcomer fights the compiler over stray semicolons for about a week — and then never thinks about it again.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: reaching for `rustc` directly when Cargo does everything — treat Cargo as the only front door. Two: the `Cargo.lock` question. Commit it for applications; leave it out for libraries. Memorise that split. Three: calling `println!` a function in an interview or on a quiz. The `!` means macro, and that is the whole tell.

**[RECAP — ~4:55]**
Rust trades compiler checks for runtime cost: the ownership rules and the borrow checker kill memory-safety bugs before the program ever runs, which makes the language a genuine security control. Cargo is your front door — new, build, run, check, test — with `Cargo.toml` declaring dependencies from crates.io and `Cargo.lock` pinning them for reproducibility. And in Rust, everything is an expression until a semicolon turns it into a statement. That is the foundation. Next, we make variables.

## On-screen visuals

- HOOK: CVE-style timeline of memory bugs persisting in C/C++ codebases.
- Memory safety: three-column comparison — C (trusts you), Java/Go (runtime tax), Rust (compiler checks).
- Cargo: terminal showing the daily verbs — new, build, run, check, test — with Cargo.toml and Cargo.lock highlighted.
- Macros: `println!("text")` with the `!` circled; expression versus statement with a semicolon toggling the returned value.
- RECAP: the cheat-sheet rows as a clean summary card.
