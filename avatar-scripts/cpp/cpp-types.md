# C++ Types, Variables & Operators: The 7 / 2 Trap and Safe Casts — Avatar Tutor Script

**Lesson ID:** cpp-types
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~659 words)

## Spoken script

**[HOOK — 0:00]**
What is seven divided by two? In C++ the answer is three. Not three point
five. Three. If that surprises you, good — this lesson is built from
surprises like that one, and every one of them is a trap the language sets
for beginners. By the end, you will see them coming.

**[WHY IT MATTERS — ~0:25]**
C++ is statically typed: every variable has a fixed type decided at compile
time. That is not bureaucracy — it is the compiler catching a whole class of
bugs before your program ever runs. A type mismatch that would be a
mysterious crash at two in the morning in a dynamic language is a red
underline at two in the afternoon here. Understand the types, and the
compiler becomes your assistant instead of your adversary.

**[SECTION — The fundamental types — ~0:50]**
The workhorses are int for whole numbers — commonly four bytes, though
sizeof(int) tells you the actual size on your platform — double for decimals,
char for a single byte or character, and bool for true or false. Watch the
quotes: 'a' in single quotes is one character, while "a" in double quotes is
a null-terminated array of characters. Same letter, completely different
beasts. The exam loves that distinction, so file it away.

Now, mark anything that should not change as const. const int x = 5; makes x
read-only, and the compiler will reject any accidental reassignment. Think of
const as cheap insurance: it converts a mistake you would discover at
runtime — corrupted state, a mysterious wrong value — into a compile-time
error, which is always the better trade.

Then there is auto. auto x = 3.0; deduces the type from the initialiser, so x
is a double. The key insight: the variable is still statically typed. auto
just saves you from writing the type out loud. It does not make C++ dynamic,
and nothing does. So why bother with auto at all? Because it keeps code
robust when types change — rename a function's return type and every auto
variable follows silently, instead of each explicit declaration needing an
update. Deduction is a tool for maintainability, not laziness.

**[SECTION — Operators, division, and the traps — ~2:35]**
Two traps catch every beginner, so let's defuse them now. First, 7 / 2 is 3,
not 3.5. When both operands are integers, C++ does integer division and
truncates the remainder — picture splitting seven cookies between two people
and dropping the leftover on the floor. Write 7.0 / 2 when you want the
decimal answer.

Second, = assigns while == compares. Writing if (x = 5) assigns five to x
and is always true — the condition never had a chance. It is a classic bug,
and compilers now warn about it, which tells you how often it happens.

A darker trap: signed integer overflow is undefined behaviour in C++. Not
"wraps around," not "throws an exception" — literally anything goes. Unsigned
overflow wraps by definition, but never write code that depends on what signed
overflow does.

For conversions, prefer static_cast<double>(x) over the old C-style
(double)x. The named cast is explicit, easy to search for in a codebase, and
checked at compile time. It is a small habit that keeps every conversion
honest.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: thinking auto makes C++ dynamically typed — it doesn't; the
type is fixed at compile time either way. Two: assuming signed overflow wraps
like unsigned — it doesn't; it is undefined behaviour, and relying on it
voids your program's contract. Three: mixing up 'a' and "a" — one is a single
character, the other is a null-terminated string.

**[RECAP — ~5:00]**
C++ is statically typed, so the compiler checks types before your program
runs. The fundamentals are int, double, char, and bool — and mind the quotes:
'a' is a character, "a" is a string. const turns runtime mistakes into
compile-time errors, and auto deduces types without making anything dynamic.
Integer division truncates, = is not ==, signed overflow is undefined
behaviour, and conversions belong in static_cast. That is the whole type
system in one paragraph.

## On-screen visuals

- HOOK: "7 / 2 = ?" on screen, the answer "3" revealed with a trap icon.
- WHY IT MATTERS: "statically typed" term card — the compiler shown catching
  a bug before runtime.
- SECTION — The fundamental types: type table — int, double, char, bool —
  with 'a' vs "a" shown side by side; const shown as a lock on a variable;
  auto x = 3.0 resolving to double.
- SECTION — Operators, division, and the traps: 7 / 2 → 3 vs 7.0 / 2 → 3.5
  comparison; if (x = 5) flagged with a warning; static_cast vs C-style cast
  side by side.
- COMMON MISTAKES: three trap cards — auto labelled "still static", signed
  overflow marked UB, 'a' vs "a".
- RECAP: the cheat-sheet terms rendered as a clean summary card.
