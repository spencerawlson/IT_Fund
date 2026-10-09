// Reading content for the Rust Programming course, keyed by lesson (deck) id.
// Strings support `inline code` only. Every section is aligned with the lesson's questions in
// src/data/academy/rust.js, so reading first prepares you for the practice.

const code = (...lines) => lines.join('\n');

export default {
  'rust-basics': {
    overview: [
      'Rust is a systems programming language with one headline promise: memory safety without a garbage collector, enforced at compile time. Where C hands you raw power and trusts you not to misuse it, and where Go and Java pay a runtime tax for safety, Rust moves the checks into the compiler — so whole classes of bugs become build errors instead of production incidents.',
      'This lesson covers what Rust is, the Cargo toolchain that is the front door to every Rust project, and the small details — macros, expressions, semicolons — that make the language feel different from day one.',
    ],
    learn: [
      {
        heading: 'Memory safety, enforced before the program ever runs',
        body: [
          'The bugs Rust eliminates are not exotic. Use-after-free, double-free, buffer overflows, data races — these are the memory-safety failures behind a huge share of CVEs in C and C++ codebases, year after year. Rust\u2019s answer is the ownership system: a set of compile-time rules about who owns each piece of memory and how it may be borrowed. The compiler — affectionately called the borrow checker — rejects programs that would violate them, so the binary that finally runs simply cannot contain those bugs.',
          'The payoff is twofold. You get C-like performance with no garbage collector and therefore no GC pauses, which is why Rust shows up in operating systems, game engines, browsers, and databases. And you get it without the traditional systems-programming bargain of \u201Cbe perfect or be exploited.\u201D That combination is also why Rust maps to CISSP Domain 8: choosing a memory-safe language is a software security control.',
        ],
      },
      {
        heading: 'Cargo: the front door',
        body: [
          'You almost never invoke the Rust compiler (`rustc`) directly. Cargo is the build tool, package manager, test runner, and documentation generator in one — the single entry point to the ecosystem. `cargo new <name>` scaffolds a project with `Cargo.toml` (your manifest: name, version, dependencies) and `src/main.rs`. From there the daily verbs are few: `cargo build` compiles, `cargo run` compiles and runs, `cargo test` runs your tests, and `cargo check` type-checks and borrow-checks without producing a binary — the fast feedback loop you will live in.',
          'Dependencies come from crates.io, the community registry, declared in `Cargo.toml` and added with `cargo add <crate>`. `Cargo.lock` pins the exact versions chosen, so builds are reproducible across machines — commit it for applications, leave it out for libraries. That manifest-plus-lockfile discipline is what makes someone else\u2019s machine build exactly what yours built.',
        ],
      },
      {
        heading: 'Macros, expressions, and the humble semicolon',
        body: [
          'Your first Rust program prints with `println!("text")` — and the exclamation mark matters. It marks a macro, not a function: code that expands at compile time and can accept a variable number of arguments and format strings. You will meet more macros (`vec!`, `format!`, `panic!`); the `!` is always the tell.',
          'Rust is expression-oriented: nearly everything evaluates to a value. An `if` returns a value, a block returns the value of its last expression — and that is where the semicolon earns its keep. End a line with `;` and you have a statement, which yields nothing; leave it off the final expression and the block returns that value. Newcomers fight the compiler over stray semicolons for a week, then never think about it again.',
        ],
      },
    ],
    cheatSheet: [
      ['cargo new <name>', 'Scaffold a project (Cargo.toml + src/main.rs)'],
      ['cargo build / run / check / test', 'Compile / compile+run / fast type-check / run tests'],
      ['Cargo.toml', 'Manifest: metadata and dependencies'],
      ['Cargo.lock', 'Pins exact dependency versions for reproducible builds'],
      ['crates.io', 'Community package registry; add with cargo add'],
      ['println!(...)', 'A macro (note the !), not a function'],
      [';', 'Turns an expression into a statement; omit on a block\u2019s final line to return its value'],
    ],
    examples: [
      {
        title: 'Hello, Cargo',
        code: code(
          '// src/main.rs — created by `cargo new hello`',
          'fn main() {',
          '    println!("Hello, world!");',
          '}',
        ),
      },
    ],
  },

  'rust-types': {
    overview: [
      'Rust\u2019s type system is strict, static, and precise — and it starts with a philosophical choice most languages get backwards: variables are immutable unless you explicitly opt out. That single default removes an entire category of \u201Cwho changed my variable?\u201D bugs before you write a line of logic.',
      'This lesson covers bindings and mutability, shadowing, the difference between `let` and `const`, Rust\u2019s numeric types, and why the compiler refuses to guess when you mix them.',
    ],
    learn: [
      {
        heading: 'Immutable until you say otherwise',
        body: [
          '`let x = 5;` creates an immutable binding — try to reassign it and the compiler stops you. Mutability is a deliberate, visible choice: `let mut x = 5;`. Because mutation is always marked at the declaration site, anyone reading the code can see at a glance which variables are allowed to change. It is a small discipline that compounds across a codebase.',
          'Shadowing looks similar but is a different mechanism: `let x = 5;` followed later by `let x = "hello";` declares a brand-new binding that happens to reuse the name. Unlike mutation, shadowing can even change the type — a common idiom is `let input = get_input(); let input: u32 = input.parse()...`. And then there is `const`: always immutable, always needs an explicit type annotation, always a compile-time constant, conventionally written in SCREAMING_CASE. Where `let` is a runtime binding, `const` is a value baked in before the program starts.',
        ],
      },
      {
        heading: 'A precise type system',
        body: [
          'Rust\u2019s integers wear their sizes openly: signed `i8` through `i128`, unsigned `u8` through `u128`, plus `isize`/`usize` sized to the platform pointer. A bare literal like `5` defaults to `i32`. A `char` is not a byte — it is a four-byte Unicode scalar value (a single byte is `u8`). Tuples group a fixed number of possibly-different types, accessed by position (`t.0`, `t.1`). The compiler infers types aggressively, but the language is still statically and strongly typed: every value\u2019s type is known at compile time.',
          'What Rust will not do is guess across types. There are no implicit numeric conversions — `let f: f64 = some_int;` is a compile error, and you convert explicitly with `as` (`x as f64`) or `.into()`. It feels pedantic until the first time it catches a truncation bug that would have silently corrupted data in a looser language.',
        ],
      },
      {
        heading: 'Arithmetic with guardrails',
        body: [
          'Integer overflow is a classic vulnerability class, and Rust treats it as a bug worth surfacing. In debug builds, overflowing arithmetic panics — loudly, immediately, at the exact line. Release builds wrap by default for performance, but the language gives you explicit tools when the behavior matters: `checked_add` returns `Option` (overflow becomes `None`), `wrapping_add` wraps deliberately, and `saturating_add` clamps at the type\u2019s maximum. The rule of thumb: if overflow would be a bug, use the checked variant and handle it.',
        ],
      },
    ],
    cheatSheet: [
      ['let x = 5;', 'Immutable binding by default'],
      ['let mut x = 5;', 'Explicitly mutable binding'],
      ['Shadowing', 'New `let` with the same name; may change type (unlike mutation)'],
      ['const MAX: u32 = 100;', 'Always immutable, typed, compile-time constant'],
      ['i8..i128, u8..u128', 'Sized integers; plain literals default to i32'],
      ['char', '4-byte Unicode scalar value (not a byte)'],
      ['(i32, &str)', 'Tuple: fixed-size group of possibly different types'],
      ['x as f64 / .into()', 'Explicit conversion — Rust never converts implicitly'],
      ['Debug overflow', 'Panics; release wraps; prefer checked_/wrapping_/saturating_'],
    ],
  },

  'rust-control-functions': {
    overview: [
      'In most languages, control flow is plumbing: statements that steer execution and return nothing. In Rust, control flow is made of expressions — `if`, `loop`, and `match` all evaluate to values you can assign, return, and compose. Once that clicks, Rust code reads less like a list of instructions and more like a description of values.',
      'This lesson covers `if` as an expression, the three loop forms, exhaustive `match`, and how functions return values without ceremony.',
    ],
    learn: [
      {
        heading: 'Everything is an expression',
        body: [
          '`let n = if cond { 1 } else { 2 };` is ordinary Rust: the `if` evaluates to a value, and both branches must produce the same type or the compiler complains. A bare block works the same way — `{ let a = 1; a + 2 }` evaluates to `3` — which is why the last line of a function body has no semicolon. Functions themselves follow the same rule: the final expression, semicolon-free, is the return value, with `return` reserved for early exits. The declared return type follows `->`, as in `fn add(a: i32, b: i32) -> i32`.',
          'The distinction that matters is expression versus statement. An expression evaluates to a value; a statement performs an action and yields nothing. Appending `;` converts an expression into a statement — which is exactly why a stray semicolon on a function\u2019s last line changes its return type to `()`, the unit type (Rust\u2019s `void`), and breaks the build. The compiler\u2019s error message will tell you precisely this, the first few times.',
        ],
      },
      {
        heading: 'Loops, and matching that cannot miss a case',
        body: [
          'Rust has three loop forms and no more: `loop` runs forever (or until `break`), `while` runs on a condition, and `for` iterates over ranges and iterators (`for x in 0..5`). Because `loop` is an expression, it can return a value through `break`: `let r = loop { break 10; };`. Ranges deserve a glance: `0..5` covers 0 through 4 (end-exclusive); `0..=5` includes 5.',
          '`match` is Rust\u2019s pattern-matching powerhouse, and it carries a guarantee most switch statements lack: exhaustiveness. Every possible value must be handled — miss a case and it is a compile error, not a runtime surprise. A `_` arm catches everything else, patterns can destructure and bind parts of the value (`Some(x)` binds `x`), and `if let` gives you a concise way to handle a single interesting pattern while ignoring the rest.',
        ],
      },
    ],
    cheatSheet: [
      ['let n = if c { 1 } else { 2 };', 'if is an expression; branches must share a type'],
      ['loop / while / for', 'The three loop forms (for iterates ranges/iterators)'],
      ['break value;', 'Returns a value from a loop (loop is an expression)'],
      ['match', 'Exhaustive pattern matching; use _ as catch-all'],
      ['if let Some(x) = opt', 'Concise single-pattern match'],
      ['0..5 / 0..=5', 'End-exclusive / end-inclusive ranges'],
      ['fn f() -> i32', 'Return type follows ->; final expression (no ;) is the value'],
      ['()', 'The unit type — what a function returns when it returns \u201Cnothing\u201D'],
    ],
    examples: [
      {
        title: 'Expressions doing the work',
        code: code(
          'let n = if ready { 1 } else { 2 };      // if returns a value',
          '',
          'let r = loop {                        // loop returns a value too',
          '    break 10;',
          '};',
          '',
          'let label = match code {              // exhaustive: every case handled',
          '    0 => "zero",',
          '    1..=9 => "digit",',
          '    _ => "other",',
          '};',
        ),
      },
    ],
  },

  'rust-ownership': {
    overview: [
      'Ownership is Rust\u2019s central idea — the mechanism behind the headline promise. Three short rules about who owns each value replace the garbage collector entirely: memory is freed deterministically, the moment its owner goes out of scope, with no runtime pausing your program to clean up.',
      'This lesson covers the three rules, what moves versus what copies, borrowing without taking ownership, and the borrowing contract that makes data races a compile error instead of a production incident.',
    ],
    learn: [
      {
        heading: 'Three rules that replace the garbage collector',
        body: [
          'The rules fit on an index card: each value has exactly one owner; there can only be one owner at a time; when the owner goes out of scope, the value is dropped and its memory freed. That is the entire memory-management strategy. No reference counting in the background, no tracing collector pausing your threads — freeing happens deterministically, at a point the compiler knows, every time.',
          'The consequences show up immediately in everyday code. `let b = a;` where `a` is a `String` does not copy anything: ownership moves to `b`, and using `a` afterward is a compile error. There is no silent aliasing of heap data, no second owner quietly freeing what the first still references. Integers and other small stack-only types are the exception — they implement the `Copy` trait and are cheaply duplicated instead of moved. When you genuinely need two owners of heap data, you say so out loud with `.clone()`: deep copies are explicit in Rust, never accidental.',
        ],
      },
      {
        heading: 'Borrowing: use it without owning it',
        body: [
          'Most functions do not need to own their arguments — they just need to look at them. Borrowing (`&x`) creates a reference: you can read (or, with `&mut x`, modify) the value while the owner keeps it. The borrow checker, the compiler pass enforcing all of this, guarantees the reference can never outlive the data it points to — which is precisely what makes dangling references, the use-after-free bug, impossible in safe Rust.',
          'The borrowing contract has one famous clause: at any moment you may have either any number of immutable references or exactly one mutable reference — never both. That single rule, checked at compile time, is what eliminates data races: if no two threads can hold a mutable reference to the same data simultaneously, they cannot race on it. Lifetimes (the `\'a` annotations you will occasionally see) are the compiler\u2019s way of relating how long references stay valid; most are inferred, and you annotate only when the compiler needs help connecting inputs to outputs.',
        ],
      },
    ],
    cheatSheet: [
      ['One owner; one owner at a time; dropped at end of scope', 'The three ownership rules'],
      ['let b = a; (String)', 'Ownership MOVES; a is unusable afterward'],
      ['Copy trait (e.g. integers)', 'Cheap stack types copy instead of moving'],
      ['&x', 'Immutable borrow: use without taking ownership'],
      ['&mut x', 'Exclusive mutable borrow — only one may exist'],
      ['One &mut XOR many &', 'The borrowing rule that prevents data races'],
      ['Borrow checker', 'Compiler pass enforcing ownership/borrowing/lifetimes'],
      ["'a (lifetime)", 'Compile-time region a reference is valid for'],
      ['.clone()', 'Explicit deep copy of heap data'],
    ],
    examples: [
      {
        title: 'Moves, borrows, and the one-mutable rule',
        code: code(
          'let a = String::from("hi");',
          'let b = a;            // ownership MOVES; `a` is now invalid',
          '// println!("{}", a); // compile error: use of moved value',
          '',
          'fn len(s: &String) -> usize { s.len() }  // borrows; owner keeps it',
          'let n = 5;',
          'let m = n;            // i32 is Copy: cheaply duplicated, no move',
        ),
      },
    ],
  },

  'rust-structs-enums': {
    overview: [
      'Rust has no classes and no null — two omissions that turn out to be features. Data is modelled with structs (named fields, behavior attached via `impl` blocks) and enums that are far richer than their C namesakes: each variant can carry its own data. Absence and failure, the jobs null used to do badly, are handled by the `Option` and `Result` enums, with the compiler forcing you to confront both.',
      'This lesson covers structs and methods, enums with data, `Option` and `Result`, and exhaustive matching as the safe way to handle them all.',
    ],
    learn: [
      {
        heading: 'Structs: data with behavior attached',
        body: [
          'A struct groups named fields; methods live separately in an `impl` block and take `self`, `&self`, or `&mut self` depending on whether they consume, read, or modify the value. Tuple structs (`struct Pair(i32, i32)`) offer positional fields for lightweight wrappers. Common capabilities come from `derive` — `#[derive(Debug, Clone)]` auto-implements debug printing and cloning instead of hand-writing boilerplate. And because there is no null and no implicit default, every field must be initialized: uninitialized memory simply does not exist as a concept you can stumble into.',
        ],
      },
      {
        heading: 'Enums that carry data — and the end of null',
        body: [
          'A Rust enum is a type that is one of several variants, where each variant may hold data: `enum Message { Quit, Move { x: i32, y: i32 }, Write(String) }`. This single mechanism replaces a remarkable amount of machinery from other languages. `Option<T>` — either `Some(T)` or `None` — replaces null: a value that might be absent is visibly marked in its type, and the compiler will not let you use it without handling the `None` case. `Result<T, E>` — `Ok(T)` or `Err(E)` — does the same job for operations that can fail, and is Rust\u2019s primary error type.',
          'Tony Hoare called null his \u201Cbillion-dollar mistake.\u201D Rust designs it out: absence is not a landmine hidden in every reference, it is a value you pattern-match on. The safe way to handle any enum is `match`, which is exhaustive — forget a variant and the build fails. For the common case of caring about exactly one variant, `if let Some(x) = opt` runs its block with `x` bound, skipping the ceremony of a full match.',
        ],
      },
    ],
    cheatSheet: [
      ['impl Point { ... }', 'Methods live in impl blocks; take self / &self / &mut self'],
      ['enum', 'One of several variants, each able to hold data'],
      ['Option<T>: Some / None', 'Replaces null — absence is explicit in the type'],
      ['Result<T, E>: Ok / Err', 'Rust\u2019s primary error-return type'],
      ['match', 'Exhaustive handling; a missed variant is a compile error'],
      ['if let Some(x) = opt', 'Concise single-variant handling'],
      ['#[derive(Debug, Clone)]', 'Auto-implement common traits'],
      ['struct Pair(i32, i32)', 'Tuple struct: positional fields'],
    ],
    examples: [
      {
        title: 'Option instead of null',
        code: code(
          'fn first(v: &Vec<i32>) -> Option<i32> {',
          '    v.get(0).copied()          // None if empty — no null, no panic',
          '}',
          '',
          'match first(&v) {',
          '    Some(x) => println!("got {x}"),',
          '    None    => println!("empty"),',
          '}                               // match is exhaustive: both arms required',
        ),
      },
    ],
  },

  'rust-errors': {
    overview: [
      'Day-to-day Rust runs on a small set of collections — `Vec`, `String`, `HashMap` — and an error-handling philosophy with no exceptions: failures are values, returned and handled explicitly. The `?` operator makes that explicitness cheap instead of noisy.',
      'This lesson covers the working collections, the `?` operator, the honest uses (and abuses) of `unwrap`, and when a panic is actually the right call.',
    ],
    learn: [
      {
        heading: 'The working collections',
        body: [
          '`Vec<T>` is the growable array you will reach for constantly: `push` to add, and prefer `.get(i)` — which returns `Option<&T>` — over indexing when the position might not exist, because `v[i]` panics on out-of-range. `String` is an owned, growable UTF-8 string; `&str` is a borrowed slice of one, which is why function parameters usually take `&str`. `HashMap<K, V>` works as expected, with reads returning `Option`. And iteration runs on the `Iterator` trait: adaptors like `map`, `filter`, and `collect` compose lazily, so a chain of transformations costs no intermediate allocations.',
          'One borrow-related subtlety: `for x in &v` borrows each element by shared reference, leaving `v` usable afterward — but `x` is a reference to each element, and if you need to mutate you iterate `&mut v` instead. The compiler will, as always, tell you the moment you get it wrong.',
        ],
      },
      {
        heading: 'Errors as values, propagated with `?`',
        body: [
          'Fallible operations return `Result`; `.unwrap()` extracts the success value and panics on `Err` (or `None` for `Option`). It is perfect for prototypes and tests, and a code smell in production paths — `.expect("config file must exist")` is the honest upgrade, panicking with your message instead of a generic one. The `?` operator is the idiomatic middle path: placed after a `Result` or `Option`, it returns early with the failure or unwraps the success, collapsing nested error plumbing into a single character.',
          '`panic!` itself is reserved for the unrecoverable: violated invariants, programmer bugs, states that should be impossible. Expected, handleable failures — a missing file, a bad response — belong in `Result`, not in a panic. The discipline is simple to state and worth internalizing: if the caller could reasonably recover, return it; if the program\u2019s assumptions are broken, panic.',
        ],
      },
    ],
    cheatSheet: [
      ['Vec<T>', 'Growable array; .get(i) returns Option (safe), v[i] panics'],
      ['String vs &str', 'Owned growable UTF-8 vs borrowed slice; params take &str'],
      ['HashMap<K, V>', 'Hash map; reads return Option'],
      ['?', 'Early-return on Err/None, else unwrap — clean propagation'],
      ['.unwrap()', 'Extract or panic — prototypes only'],
      ['.expect("msg")', 'Unwrap-or-panic with your diagnostic message'],
      ['panic!', 'Unrecoverable bugs/invariants only — never for expected errors'],
      ['Iterator (map/filter/collect)', 'Lazy, composable iteration'],
    ],
    examples: [
      {
        title: 'The ? operator in action',
        code: code(
          'use std::fs;',
          '',
          'fn read_config() -> Result<String, std::io::Error> {',
          '    let text = fs::read_to_string("app.toml")?;  // Err returns early',
          '    Ok(text.trim().to_string())',
          '}',
        ),
      },
    ],
  },

  'rust-traits-generics': {
    overview: [
      'Rust has no inheritance and no base classes, yet it achieves some of the most powerful abstraction in any systems language. The trick is two mechanisms working together: traits, which define shared behavior a type can implement, and generics, which are monomorphised at compile time — so the abstraction costs nothing at runtime.',
      'This lesson covers traits and default methods, generics with trait bounds, the two dispatch strategies, and what \u201Czero-cost abstraction\u201D actually means.',
    ],
    learn: [
      {
        heading: 'Traits: Rust\u2019s interfaces',
        body: [
          'A trait is a set of method signatures a type can implement — the closest analogue to an interface, without inheritance. `impl Display for Point { ... }` gives `Point` the behavior; a trait can also ship default method implementations that implementors may use or override, cutting repetition. The `derive` attribute you have already seen (`#[derive(Clone, Debug)]`) is traits made convenient: the compiler writes the `impl` for you. Everyday traits like `Default` (a sensible zero value via `::default()`), `PartialEq`/`Eq` (field-by-field `==`), and `Clone` form the vocabulary types use to interoperate.',
        ],
      },
      {
        heading: 'Generics without runtime cost',
        body: [
          'A function like `fn largest<T: PartialOrd>(list: &[T]) -> &T` accepts any type implementing the bound — and the compiler generates a specialized copy for each concrete type used. That monomorphisation is why Rust calls its abstractions zero-cost: generic code, iterator chains, and trait bounds compile down to machine code as fast as hand-written equivalents. You pay for the abstraction in compile time, never at runtime. When bounds get long, a `where` clause (`fn f<T>(x: T) where T: Clone + Debug`) keeps signatures readable.',
        ],
      },
      {
        heading: 'Two kinds of polymorphism',
        body: [
          'Generics and `impl Trait` arguments dispatch statically — the compiler knows exactly which code runs. But sometimes you need runtime flexibility, like a `Vec` holding different concrete types that share behavior. That is what trait objects are for: `Box<dyn Display>` is a heap-allocated value whose concrete type is resolved through a vtable at runtime. Static dispatch is the default and the fast path; `dyn Trait` is the deliberate choice when heterogeneity demands it. Knowing which you are using — and why — is part of writing idiomatic Rust.',
        ],
      },
    ],
    cheatSheet: [
      ['trait', 'Method signatures a type implements — Rust\u2019s interface'],
      ['#[derive(Clone, Debug)]', 'Compiler-written trait impls; skips boilerplate'],
      ['fn f<T: Trait>(x: T)', 'Generic over any T implementing the bound'],
      ['where T: Clone + Debug', 'Readable home for long trait bounds'],
      ['Monomorphisation', 'Generics compiled per concrete type — zero runtime cost'],
      ['dyn Trait / Box<dyn Trait>', 'Runtime polymorphism via vtable (heterogeneous collections)'],
      ['Zero-cost abstraction', 'High-level constructs as fast as hand-written code'],
    ],
    examples: [
      {
        title: 'A trait with a default method',
        code: code(
          'trait Greet {',
          '    fn name(&self) -> &str;',
          '    fn hello(&self) -> String {          // default implementation',
          '        format!("Hello, {}!", self.name())',
          '    }',
          '}',
        ),
      },
    ],
  },

  'rust-concurrency': {
    overview: [
      'Concurrency is where Rust\u2019s ownership model pays its biggest dividend. The same borrowing rules that prevent use-after-free also prevent data races — so an entire class of threading bugs that other languages discover in production becomes a compile error. The Rust community calls this fearless concurrency, and it is not marketing: the compiler genuinely rejects racy programs.',
      'This lesson covers threads and message passing, safe shared state with `Arc<Mutex<T>>`, the `Send`/`Sync` markers, the `unsafe` escape hatch, and why all of this makes Rust a security story.',
    ],
    learn: [
      {
        heading: 'Threads without data races',
        body: [
          'Spawning a thread is one call — `thread::spawn(|| { ... })` — returning a handle you can `join`. Closures passed to threads usually need `move`, transferring ownership of captured variables into the thread so the data is guaranteed to outlive any borrow across the thread boundary. For communication, Rust prefers message passing: `std::sync::mpsc` channels let threads send owned values to each other (`tx.send(v)`, `rx.recv()`), and the motto captures the philosophy — don\u2019t communicate by sharing memory; share memory by communicating.',
        ],
      },
      {
        heading: 'Shared state, when you truly need it',
        body: [
          'Sometimes shared mutable state is the right design, and Rust makes it explicit: `Arc<Mutex<T>>` — atomic reference counting for shared ownership across threads, plus a mutex guarding the data. (`Rc` looks similar but is single-threaded; `Arc` is its thread-safe sibling.) Under the hood, two marker traits do the enforcement: `Send` means ownership of a value may move to another thread, `Sync` means references to it may be shared across threads. Types that are not thread-safe simply do not implement them, and the compiler refuses to let them cross the boundary. Most of the time you never name these traits — you just enjoy the errors they produce when you slip.',
        ],
      },
      {
        heading: 'Escape hatches and guarantees',
        body: [
          'The `unsafe` keyword exists for operations the compiler cannot verify — raw pointers, foreign function interfaces, certain low-level tricks. It does not disable all checks; it narrows them, and the discipline is to keep `unsafe` blocks small, documented, and audited, with safe abstractions built on top. Everything else stays in safe Rust, where memory is freed deterministically: each value is dropped the moment its owner leaves scope, RAII-style, with no collector and no pauses.',
          'Step back and the security case writes itself. Use-after-free, buffer overflows, data races — the memory-safety bug classes behind a huge fraction of C/C++ CVEs — are rejected at compile time. For security-sensitive systems code, that is not a nice-to-have; it is the argument.',
        ],
      },
    ],
    cheatSheet: [
      ['thread::spawn(|| { ... })', 'Spawn a thread; join the handle to wait'],
      ['move closure', 'Transfers ownership of captures into the thread'],
      ['Arc<Mutex<T>>', 'Thread-safe shared mutable state'],
      ['Arc vs Rc', 'Atomic (thread-safe) vs single-threaded reference counting'],
      ['Send / Sync', 'Marker traits: may move / may share across threads'],
      ['std::sync::mpsc', 'Multi-producer, single-consumer channels'],
      ['unsafe', 'For unverifiable ops (raw pointers, FFI) — keep small and audited'],
      ['Drop at end of scope', 'Deterministic freeing (RAII) — no GC, no pauses'],
    ],
    examples: [
      {
        title: 'Share state across threads',
        code: code(
          'use std::sync::{Arc, Mutex};',
          'use std::thread;',
          '',
          'let counter = Arc::new(Mutex::new(0));',
          'let c = Arc::clone(&counter);',
          'thread::spawn(move || {',
          '    *c.lock().unwrap() += 1;   // &mut access, guarded by the mutex',
          '}).join().unwrap();',
        ),
      },
    ],
  },
};
