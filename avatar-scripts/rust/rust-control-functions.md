# Control Flow & Functions: Expressions All the Way Down — Avatar Tutor Script

**Lesson ID:** rust-control-functions
**Track:** Rust Programming
**Estimated runtime:** ~5 minutes (~686 words)

## Spoken script

**[HOOK — 0:00]**
In most languages, control flow is plumbing — `if` and `loop` steer execution and return nothing. In Rust, control flow is made of expressions. An `if` evaluates to a value. A `loop` can hand you back a result. Once that clicks, Rust code stops reading like a list of instructions and starts reading like a description of values.

**[WHY IT MATTERS — ~0:25]**
This is the lesson where Rust's expression-oriented style pays off. Assigning an `if` result to a variable is not a trick — it is the normal way to write Rust. And `match` is the language's pattern-matching powerhouse, with a guarantee that most switch statements cannot offer: exhaustiveness. The compiler will not let you forget a case. Learn these habits now, because every idiom in the track builds on them.

**[SECTION — Everything is an expression — ~0:50]**
`let n = if cond { 1 } else { 2 };` is ordinary Rust. The `if` evaluates to a value, and both branches must produce the same type — otherwise the compiler complains. A bare block works the same way: `{ let a = 1; a + 2 }` evaluates to `3`.

Functions follow the same rule. The final expression, written without a semicolon, is the return value. So `fn add(a: i32, b: i32) -> i32` — with the declared return type after `->` — ends with just `a + b`, no semicolon, no fanfare. `return` still exists, but it is reserved for early exits.

Now, the distinction that matters: expression versus statement. An expression evaluates to a value; a statement performs an action and yields nothing. Appending `;` converts an expression into a statement — which is exactly why a stray semicolon on a function's last line changes its return type to `()`, the unit type, Rust's version of void. And then the build breaks. Here is the comforting part: the compiler's error message will tell you precisely this, the first few times. After that, your fingers learn.

**[SECTION — Loops, and matching that cannot miss a case — ~2:10]**
Rust has three loop forms and no more. `loop` runs forever, or until `break`. `while` runs on a condition. `for` iterates over ranges and iterators — `for x in 0..5` is the idiom you will see everywhere. And because `loop` is an expression, it can return a value through `break`: `let r = loop { break 10; };`.

Ranges deserve a glance. `0..5` covers 0 through 4 — the end is exclusive. `0..=5` includes 5. That single `=` is the whole difference, so read ranges carefully.

Then there is `match`, Rust's pattern-matching powerhouse. It carries a guarantee most switch statements lack: exhaustiveness. Every possible value must be handled. Miss a case and it is a compile error, not a runtime surprise. A `_` arm catches everything else. Patterns can destructure and bind parts of the value — `Some(x)` binds `x` for use inside the arm. And when you only care about one pattern, `if let Some(x) = opt` handles it concisely and ignores the rest.

Why does exhaustiveness matter? Because programs change. Someone adds a variant to an enum six months from now, and the compiler immediately points at every `match` that needs updating. The bug of the forgotten case simply cannot ship.

**[COMMON MISTAKES — ~4:10]**
Three traps. One: the stray semicolon on a function's final expression. It turns the return value into `()`, and the compiler will lecture you. Two: the `if` branches must share a type — `{ 1 } else { "two" }` will not compile. Three: assuming `0..5` includes 5. It does not. End-exclusive unless you see `=`.

**[RECAP — ~4:35]**
`if`, `loop`, and `match` are expressions — they evaluate to values you can assign and return. Functions return their final semicolon-free expression; `return` is for early exits. Three loop forms: `loop`, `while`, `for`, with `break` able to carry a value out. Ranges are end-exclusive unless you write `..=`. And `match` is exhaustive — every case handled, `_` as the catch-all, `if let` for the single interesting pattern. Next: ownership, the heart of the whole language.

## On-screen visuals

- HOOK: `let n = if cond { 1 } else { 2 };` — the `if` block flowing into the variable.
- Expressions: side-by-side — an expression evaluating to a value versus the same line with `;` becoming a statement that yields `()`.
- Loops: the three forms in a column — `loop`/`break 10` returning a value, `while`, `for x in 0..5`; ranges `0..5` vs `0..=5` on a number line.
- Match: a pattern tree with every arm covered and the `_` catch-all; an enum gaining a variant and the compiler flagging the outdated `match`.
- RECAP: the cheat-sheet rows as a clean summary card.
