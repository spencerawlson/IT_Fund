# Go Variables, Types & Constants: Zero Values and Explicit Conversions — Avatar Tutor Script

**Lesson ID:** go-types
**Track:** Go Programming
**Estimated runtime:** ~5 minutes (~662 words)

## Spoken script

**[HOOK — 0:00]**
In Go, nothing is ever uninitialised. Declare a variable, forget to set it,
and it holds a sensible zero — not garbage, not null, not "undefined." A
whole category of bugs simply cannot happen here, because the language
refuses to leave anything in an unknown state.

**[WHY IT MATTERS — ~0:25]**
Go's type system is deliberately boring — and that is a compliment. Boring
means predictable: code does what it says, on every machine, every time.
Declarations come in two flavours, every type has a zero value, and the
compiler refuses to silently convert between numeric types. Small rules,
enormous reliability — and every one of them exists because someone,
somewhere, shipped the bug that the rule prevents.

**[SECTION — Declaration in two flavors — ~0:50]**
Inside functions, x := 5 declares and initialises in one stroke, inferring
the type — the short variable declaration you will use most. At package
level, or when you want an explicit type or a zero value, the var form takes
over: var x int, or var x int = 5. Think shorthand versus full signature:
both are statically typed; Go simply lets you skip writing what the compiler
can already see.

What Go will not do is guess across types. Assigning an int where a float64
is expected is a compile error — conversions are always explicit, as in
float64(i). It reads as ceremony until the day it catches a precision bug
that a silently-converting language would have shipped. It is like a
currency exchange that makes you declare the conversion: no skimming happens
in the shadows.

**[SECTION — Every type starts somewhere: zero values — ~2:35]**
Every Go type has a zero value, and uninitialised variables hold it: 0 for
numbers, "" for strings, false for booleans. There is no "undefined" — var s
string is the empty string, not nil, not garbage. A new notebook is blank,
not broken; Go variables start the same way.

Useful types are designed around this. A bytes.Buffer or a sync.Mutex is
ready to use the moment you declare it — no constructor required. Zero
values are one of Go's quietest productivity features: the useful default
is the automatic default, so setup code you would write in other languages
simply does not exist here.

**[SECTION — Text, bytes, and constants — ~3:40]**
Strings are immutable sequences of bytes — build them with strings.Builder
or convert to []byte when you need to mutate. The byte type is an alias for
uint8; a rune is an alias for int32 holding a Unicode code point, which is
what range yields when you iterate a string.

One sharp edge: len(s) counts bytes, not runes. For ASCII text the two agree,
but multibyte UTF-8 text needs utf8.RuneCountInString. Think of it as
counting ink strokes instead of letters — fine until the alphabet gets
wider than one byte.

Constants are declared with const: compile-time only, no :=, and you cannot
take their address. And iota generates successive integer constants inside
a const block — the idiomatic way to write enumerations, counting 0, 1, 2
down the block without you writing a single number twice. Because the
constants are untyped until used, an iota enumeration stays flexible — the
same constant can serve as an int, a float64, or a string index without a
single conversion.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: using := at package level — short declarations work only
inside functions; packages need var or const. Two: assuming len(s) counts
characters — it counts bytes, so multibyte text needs the rune counter.
Three: expecting implicit numeric conversion — Go makes every conversion
explicit, and mixing types without one is a compile error.

**[RECAP — ~5:05]**
x := 5 is the short declaration for functions, with the type inferred; var
is for package level and explicit types. Every type has a zero value — 0,
"", false — so nothing is ever undefined, and types like bytes.Buffer work
the moment you declare them. Conversions are always explicit: float64(i).
Strings are immutable bytes; byte is uint8, rune is int32; len counts bytes,
not runes. Constants are compile-time with const, and iota generates
successive constants for enumerations. Deliberately boring — deliberately
reliable.

## On-screen visuals

- HOOK: an uninitialised variable resolving to its zero value — 0, "", false
  — instead of garbage.
- WHY IT MATTERS: "deliberately boring" as a badge of honour; the same code
  behaving identically on every machine.
- SECTION — Declaration in two flavors: x := 5 vs var x int side by side;
  float64(i) as an explicit, declared conversion.
- SECTION — Every type starts somewhere: zero values: zero-value table for
  numbers, strings, booleans; a bytes.Buffer working with no constructor.
- SECTION — Text, bytes, and constants: string as immutable bytes; byte vs
  rune aliases; len(s) counting bytes vs runes on multibyte text; a const
  block with iota counting 0, 1, 2.
- COMMON MISTAKES: three trap cards — := at package level crossed out,
  len counting bytes, implicit conversion refused.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
