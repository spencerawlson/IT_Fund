# C++ Basics & the Compile Model: Preprocess, Compile, Link — Avatar Tutor Script

**Lesson ID:** cpp-basics
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~710 words)

## Spoken script

**[HOOK — 0:00]**
Before your C++ program runs a single instruction, three invisible tools have
already touched it. A preprocessor stitched your files together, a compiler
translated them into machine code, and a linker bound everything into one
executable. And here is why you should care: when a build fails — and it will,
often — knowing which of those three complained tells you exactly where to
look. So let's pull back the curtain on what compilation actually means.

**[WHY IT MATTERS — ~0:25]**
C++ is a compiled language, and that single fact explains its reputation. Your
source is translated into native machine code before it ever runs, so there is
no interpreter slowing things down at runtime. That is why C++ powers game
engines, operating systems, and high-frequency trading — anywhere speed is
non-negotiable. The price is a build step between you and a running program,
and this lesson makes that step legible: the three stages, the entry point,
and your first compile command.

**[SECTION — Compiled, not interpreted — ~0:50]**
Think of an interpreted language as a live interpreter whispering translations
line by line while the program runs. C++ takes the other approach: a translator
converts the entire book into the reader's native language before anyone opens
it. The whole program becomes machine code — instructions the processor
executes directly — so at runtime there is zero translation overhead. Raw speed
is the payoff; the price is that you must build before you can run, and a
single missing semicolon stops the whole translation.

That build has three stages, and each one does a distinct job. First, the
preprocessor expands #include directives and macros — essentially stitching
your source together, like an editor pasting every referenced chapter into one
manuscript. Then the compiler translates each source file into an object file
of machine code. Finally, the linker combines those object files, plus any
libraries you use, into a single executable. Remember this pipeline, because
it is a diagnostic map: complaints about headers point at the preprocessor,
type errors point at the compiler, and undefined references point at the
linker.

**[SECTION — Hello, world — anatomy of a program — ~2:35]**
Every C++ program has a front door, and it is called main. Execution enters
there, and return 0 signals success to the operating system — any non-zero
value means something went wrong. The classic first program prints a line of
text. #include <iostream> brings in the input and output declarations, and
std::cout << "Hello, world!"; sends text to the console, where << is the
stream insertion operator — picture it pushing characters down a conveyor belt
into the terminal.

Notice the std:: prefix. That is a namespace qualifier: it says this name
comes from the standard library. Tutorials love using namespace std;, which
pulls every standard name into scope so you can write cout instead of
std::cout. Convenient — until two libraries each define a name you use, and
the compiler can no longer tell them apart. It is like everyone in an office
dropping their surnames: fine until two people with the same first name join
the team. In real projects, prefer the explicit std:: form.

To build a single file into an executable named app, you run g++ main.cpp -o
app. Add -std=c++20 to select the language standard, because C++ keeps
evolving — modern features like smart pointers, auto, and lambdas only exist
if you tell the compiler which era of the language you are writing in.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: C++ is not interpreted — if an exam option says it runs line
by line, it is wrong. Two: the missing semicolon. Every statement ends with
one, and forgetting it is the single most common compile error beginners hit.
Three: compiling modern code without the -std flag, then wondering why
features like auto refuse to work. The compiler defaults to an older dialect
unless you ask.

**[RECAP — ~5:00]**
C++ is compiled, not interpreted: the whole program becomes machine code
before it runs, which buys speed at the cost of a build step. That build runs
preprocess, then compile, then link — and the stage that complains tells you
where the bug lives. Execution starts at main, return 0 means success,
std::cout with << prints to the console, and you qualify standard names with
std:: rather than pulling in the whole namespace. Build it with g++ main.cpp
-o app, and add -std=c++20 for modern C++.

## On-screen visuals

- HOOK: three-stage pipeline diagram — preprocess, compile, link — stages
  lighting up in sequence.
- WHY IT MATTERS: "compiled vs interpreted" comparison card; text labels for
  game engines, operating systems, high-frequency trading.
- SECTION — Compiled, not interpreted: manuscript-stitching animation for the
  preprocessor, object-file icons for the compiler, a single executable for the
  linker; an example error message pinned under each stage.
- SECTION — Hello, world — anatomy of a program: annotated hello-world source
  with main marked as the entry point, the std:: qualifier highlighted, and
  the << operator traced to the console; the g++ main.cpp -o app command with
  -std=c++20 flagged.
- COMMON MISTAKES: three trap cards — "runs line by line" crossed out, a
  missing semicolon glowing red, the -std=c++20 flag circled.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
