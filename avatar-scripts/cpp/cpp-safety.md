# C++ Safety, UB & Performance: Undefined Behaviour and the Tooling Safety Net — Avatar Tutor Script

**Lesson ID:** cpp-safety
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~668 words)

## Spoken script

**[HOOK — 0:00]**
C++ will let you write code that has no meaning. Not an error — no meaning.
The standard assigns it nothing, the compiler may do literally anything, and
the scariest part is that it might appear to work perfectly today and explode
tomorrow after an unrelated change. That is undefined behaviour, and this
lesson is about never triggering it.

**[WHY IT MATTERS — ~0:25]**
C++ gives you no guardrails: out-of-bounds access, use-after-free, and
signed overflow are not errors the language catches. They are undefined
behaviour, and treating UB as "merely a bug" understates it — it voids every
assumption your program rests on. Buffer overflows alone have fuelled decades
of security exploits. This is the lesson where correctness becomes a security
discipline.

**[SECTION — Undefined behaviour: the contract you cannot break — ~0:50]**
Undefined behaviour means the C++ standard assigns no meaning to your code.
The compiler may do anything — including appearing to work today and
exploding after an unrelated change. Out-of-bounds array access, signed
integer overflow, and use-after-free are all UB: not "an exception," not "a
crash you can rely on." Think of it as a contract with a void-if-broken
clause — once breached, nothing your program does afterwards is enforceable.

The most consequential UB is the buffer overflow: writing past an array
corrupts adjacent memory, and C++ performs no bounds checking on raw arrays
or operator[]. Picture overfilling a glass — the spill lands on your
neighbour's table, and in memory, the neighbour might be a return address.
Attackers have turned this into decades of exploits.

The defences are straightforward. Use std::vector or std::array instead of
raw arrays, iterate with range-based for loops, and reach for .at(i) instead
of [i] when the index is uncertain: .at() throws std::out_of_range rather
than invoking UB. A use-after-free — accessing memory through a pointer
after it was freed — is UB with the same exploit potential; null pointers
after freeing, or better yet smart pointers that make the question moot, are
the way out. And the single highest-leverage habit in modern C++: never write
raw new and delete when RAII and smart pointers will do.

**[SECTION — The tooling safety net — ~2:50]**
The compiler is your first line of defence: build with -Wall -Wextra to
enable warnings that catch likely bugs, and consider -Werror in CI so
warnings cannot be ignored into production. Warnings are the cheapest bugs
you will ever fix — cheaper than any test, cheaper than any debugger
session.

What warnings miss, sanitizers catch at runtime. AddressSanitizer —
-fsanitize=address — detects use-after-free, buffer overflows, and leaks
during testing, with modest slowdown. Think of it as a smoke detector:
slight cost, enormous save when it fires. Run your test suite under it
routinely. Valgrind finds the same class of memory errors without
recompilation, at the cost of much slower execution — the thorough inspector
you call in when you need certainty.

Between strict warnings, sanitizers, RAII, and bounds-checked access, modern
C++ is far safer than its reputation. But every layer is opt-in, and the
language will never force you to use them. Safety in C++ is a discipline
you choose, not a default you inherit. Start every new project with warnings
cranked up and the sanitizer in your test loop, and the memory bugs that
haunt C++ codebases will mostly happen to someone else.

**[COMMON MISTAKES — ~4:45]**
Three traps. One: treating UB as "just a crash" — it is worse; it is a
voided contract, and the compiler is allowed to do anything. Two: assuming
operator[] checks bounds — it doesn't; only .at() throws. Three: ignoring
warnings — -Wall -Wextra exist to catch your bugs cheaply, and -Werror makes
sure nobody ships past them.

**[RECAP — ~5:10]**
Undefined behaviour means no defined meaning — the compiler may do anything,
so never rely on it. Buffer overflows corrupt memory and are a classic
exploit; C++ does not bounds-check []. Prefer std::vector and std::array,
range-based loops, and .at() when the index is uncertain. Use-after-free is
UB too — prefer smart pointers. Build with -Wall -Wextra, enforce -Werror in
CI, run tests under AddressSanitizer, and call in Valgrind when you need
certainty. Every layer is opt-in. Choose them all.

## On-screen visuals

- HOOK: code with a red "no meaning" stamp — UB defined as a voided
  contract.
- WHY IT MATTERS: "no guardrails" sign over raw memory; buffer overflow
  noted as a historic exploit class.
- SECTION — Undefined behaviour: the contract you cannot break: the voided
  contract diagram; an overflowing buffer spilling into adjacent memory;
  .at() throwing std::out_of_range beside unchecked [i]; use-after-free
  marked UB.
- SECTION — The tooling safety net: -Wall -Wextra -Werror flags; the
  AddressSanitizer smoke-detector analogy with -fsanitize=address; Valgrind
  as the thorough inspector.
- COMMON MISTAKES: three trap cards — UB dismissed as "just a crash",
  unchecked operator[], ignored warnings.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
