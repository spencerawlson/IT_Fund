# C++ Templates & Modern C++: Lambdas, constexpr, and nullptr — Avatar Tutor Script

**Lesson ID:** cpp-modern-templates
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~655 words)

## Spoken script

**[HOOK — 0:00]**
One function definition, infinite types. Write max once, and the compiler
generates a version for integers, doubles, strings — whatever you actually
use. That is the template, and it is the reason modern C++ feels like a
different language from the C++ of the 1990s.

**[WHY IT MATTERS — ~0:25]**
Modern C++ — roughly C++11 onward — brought type-safe generics, lambdas,
compile-time computation, and a standard library that finally feels complete.
These are not cosmetic upgrades. They change how you express intent, and the
exam expects you to know exactly when each one applies.

**[SECTION — Templates and lambdas — ~0:50]**
A template is a blueprint: template<typename T> T max(T a, T b) generates a
separate function for every type actually used — at compile time, not
runtime. Think of it as a cookie cutter: the compiler stamps out one cookie
per type, and types you never use never get baked. That is also why templates
mostly live in headers: the compiler needs the full definition visible
wherever instantiation happens. Hide a template's definition in a .cpp file
and the compiler cannot stamp out the cookie when it is needed.

A lambda is an inline anonymous function object: [](int x){ return x*2; }.
The capture list in brackets decides what surrounding state it can see — [&]
captures everything by reference, [=] captures by value. Capturing by
reference is powerful and dangerous in equal measure: if the lambda outlives
the captured variable, you have a dangling reference. It is like borrowing a
friend's charger and keeping it after they move away — the thing you are
holding no longer exists. The fix is [=] or an explicit capture list naming
only what the lambda needs: capture deliberately, and a lambda that must
outlive its context stops being a trap and becomes a tool.

**[SECTION — The modern toolkit — ~2:40]**
constexpr asks the compiler to evaluate something at compile time when
possible, turning runtime computation into compile-time constants. It is the
difference between doing your homework before the exam and during it — same
answers, zero pressure at runtime.

Namespaces group related names to avoid collisions — std is just the most
famous one, accessed as ns::name. Surnames for identifiers: the reason two
libraries can each have a log function without fighting.

The header/source split is C++'s compilation model made concrete: the
.h/.hpp declares the interface so callers can compile against it, while the
.cpp defines the implementation. The menu versus the kitchen — diners order
from the menu without needing to see the stoves. Templates are the exception:
they usually stay header-only, as we just saw.

Two small modernisations punch above their weight. nullptr is a real
null-pointer type, so overload resolution is unambiguous — where NULL-as-zero
could silently pick the wrong function, nullptr cannot be mistaken for an
integer. And std::optional<T> represents "a value that may not be present":
a type-safe alternative to sentinels and null pointers. Instead of a magic
-1 meaning "no result," you get a labelled box that is either full or
honestly empty. The payoff is honesty in interfaces: a function returning
optional<int> tells every caller that absence is possible, where a sentinel
-1 whispers it only to those who read the documentation.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: defining a template in a .cpp file and wondering why
linking fails — templates instantiate at compile time, so the definition
must be visible in the header. Two: capturing by reference with [&] in a
lambda that outlives the variable — a dangling reference. Three: using NULL
or 0 where nullptr belongs and silently selecting the wrong overload.

**[RECAP — ~5:05]**
Templates are compile-time blueprints that generate code per type used, and
they live in headers. Lambdas are anonymous inline functions; [&] captures
by reference and can dangle, [=] captures by value. constexpr moves
computation to compile time. Namespaces prevent collisions. Headers declare
the interface, .cpp files define it — except templates, which stay
header-only. nullptr is a true null-pointer type with unambiguous overloads,
and std::optional<T> is the type-safe way to say "maybe no value."

## On-screen visuals

- HOOK: one template definition stamping out versions for int, double,
  and string.
- WHY IT MATTERS: "C++11 onward" timeline with templates, lambdas,
  constexpr highlighted.
- SECTION — Templates and lambdas: the cookie-cutter analogy — one template,
  per-type instantiations; a lambda with [&] and [=] captures annotated; a
  dangling reference shown in red.
- SECTION — The modern toolkit: constexpr evaluated at compile time vs
  runtime; namespace as surnames; header/source split as menu vs kitchen;
  NULL/0 picking the wrong overload vs nullptr; optional<T> as a labelled
  box, full or empty.
- COMMON MISTAKES: three trap cards — template defined in a .cpp, a
  dangling [&] capture, NULL selecting the wrong overload.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
