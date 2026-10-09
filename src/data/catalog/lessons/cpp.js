// Reading content for the C++ Programming course, keyed by lesson (deck) id.
// Strings support `inline code` only. Aligned with src/data/academy/cpp.js.

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'cpp-basics': {
    overview: [
      'C++ is a compiled language: your source code is translated to native machine code before it ever runs, which is why it powers game engines, operating systems, and high-frequency trading — anywhere speed is non-negotiable.',
      'This lesson covers what compilation means, the three build stages (preprocess, compile, link), the `main()` entry point, basic console output with `std::cout`, and compiling your first program with `g++`.',
    ],
    learn: [
      {
        heading: 'Compiled, not interpreted',
        body: [
          'C++ programs do not run line by line. A compiler — `g++`, `clang++`, or MSVC — translates your entire source into machine code ahead of time and produces a native executable. The payoff is raw speed; the price is that you must build before you can run, and a single missing semicolon stops the whole process.',
          'That build happens in three stages. First the preprocessor expands `#include` directives and macros, essentially stitching your source together. Then the compiler translates each source file into an object file of machine code. Finally the linker combines the object files (plus any libraries) into one executable. When a build fails, knowing which stage complained tells you where to look.',
        ],
      },
      {
        heading: 'Hello, world — anatomy of a program',
        body: [
          'Every C++ program starts at `main()`. Execution enters there, and `return 0;` signals success to the operating system — any non-zero value means something went wrong. The classic first program prints a line: `#include <iostream>` brings in the input/output declarations, and `std::cout << "Hello, world!";` sends text to the console, where `<<` is the stream insertion operator.',
          'The `std::` prefix is a namespace qualifier — it says "this name comes from the standard library." You will see `using namespace std;` in tutorials; it pulls every standard name into scope so you can write `cout` instead of `std::cout`. Convenient, but in real projects it invites name clashes, so prefer the explicit `std::` form.',
          'To build a single file into an executable named `app`, the command is `g++ main.cpp -o app`. Add `-std=c++20` to choose the language standard — C++ evolves, and modern features (smart pointers, `auto`, lambdas) require telling the compiler which era of the language you are writing in.',
        ],
      },
    ],
    cheatSheet: [
      ['Compiled language', 'Translated to machine code before running; fast, but must build first.'],
      ['Preprocess → compile → link', 'The three build stages: expand includes, make object files, combine into an executable.'],
      ['main()', 'The entry point; execution starts here and `return 0` means success.'],
      ['#include <iostream>', 'Brings in console I/O declarations (`std::cout`, `std::cin`).'],
      ['std::cout << "text"', 'Prints to the console; `<<` is the stream insertion operator.'],
      ['std::', 'Namespace qualifier for the standard library; prefer it over `using namespace std;`.'],
      [';', 'Every statement ends with a semicolon — missing ones are a classic compile error.'],
      ['g++ main.cpp -o app', 'Compiles to an executable named `app`; add `-std=c++20` for the language standard.'],
    ],
  },
  'cpp-types': {
    overview: [
      'C++ is statically typed: every variable has a fixed type decided at compile time, which lets the compiler catch a whole class of bugs before your program ever runs.',
      'This lesson covers the fundamental types (`int`, `double`, `char`, `bool`), `const` correctness, type deduction with `auto`, integer division pitfalls, and safe conversions with `static_cast`.',
    ],
    learn: [
      {
        heading: 'The fundamental types',
        body: [
          'The workhorses are `int` for whole numbers (commonly 4 bytes — `sizeof(int)` tells you the actual size on your platform), `double` for decimals, `char` for a single byte or character, and `bool` for `true`/`false`. A character literal uses single quotes (`\'a\'`); a string literal uses double quotes (`"a"`), which is actually a null-terminated array of characters — a different beast entirely.',
          'Mark anything that should not change as `const`: `const int x = 5;` makes `x` read-only, and the compiler will reject any accidental reassignment. `const` is cheap insurance — it turns runtime mistakes into compile-time errors, which is always the better trade.',
          '`auto` deduces a type from the initializer: `auto x = 3.0;` makes `x` a `double`. The variable is still statically typed — `auto` just saves you from writing it out. It does not make C++ dynamically typed; nothing does.',
        ],
      },
      {
        heading: 'Operators, division, and the traps',
        body: [
          'Two traps catch every beginner. First, `7 / 2` is `3`, not `3.5` — when both operands are integers, C++ does integer division and truncates. Write `7.0 / 2` when you want the decimal result. Second, `=` assigns while `==` compares; writing `if (x = 5)` assigns 5 and is always true, a classic bug that compilers now warn about.',
          'Signed integer overflow is undefined behaviour in C++ — not "wraps around," not "throws an exception," but literally anything-goes. (Unsigned overflow does wrap, by definition.) Never write code that depends on what signed overflow does.',
          'For conversions, prefer `static_cast<double>(x)` over the old C-style `(double)x`. The named cast is explicit, greppable, and checked at compile time — a small habit that keeps conversions honest.',
        ],
      },
    ],
    cheatSheet: [
      ['int / double / char / bool', 'Whole numbers, decimals, single byte/character, true/false.'],
      ['const', 'Makes a variable read-only; the compiler rejects reassignment.'],
      ['auto', 'Deduces the type from the initializer — still statically typed.'],
      ['7 / 2 == 3', 'Integer division truncates; use `7.0 / 2` for 3.5.'],
      ['Signed overflow', 'Undefined behaviour — never depend on it.'],
      ['= vs ==', 'Assignment vs comparison; `=` inside an `if` is a classic bug.'],
      ["'a' vs \"a\"", 'Single quotes: one char. Double quotes: null-terminated string.'],
      ['static_cast<T>(x)', 'Explicit compile-time conversion; prefer over C-style casts.'],
    ],
  },
  'cpp-control-functions': {
    overview: [
      'Programs are decisions and repetition. C++ gives you the classic control structures — `if`, `switch`, `for`, `while` — and functions to package logic into reusable, testable units.',
      'This lesson covers the loop flavors (including the do-while that always runs once), `break` vs `continue`, function definitions, pass-by-value vs pass-by-reference, overloading, and default arguments.',
    ],
    learn: [
      {
        heading: 'Decisions and loops',
        body: [
          'The `do { ... } while (cond);` loop is the odd one out: its condition is checked after the body, so it always executes at least once. Every other loop — `while`, `for`, range-based `for` — may execute zero times. Inside any loop, `break` exits the innermost loop immediately, while `continue` skips to the next iteration.',
          '`switch` matches an integral or enumeration value against `case` labels with exact equality — no strings, no ranges. And every `case` needs its own `break;`, because without one execution falls through into the next case. Forgetting `break` is one of the oldest bugs in the language.',
        ],
      },
      {
        heading: 'Functions: the unit of reuse',
        body: [
          'A function declared `void` returns nothing — you call it for its side effects. Parameters are passed by value by default, meaning the function receives a copy; changes to it never reach the caller. To let a function modify the caller\'s variable, take the parameter by reference (`void f(int& x)`) or by pointer.',
          'For large objects you do not want to modify, the idiom is `const T&`: pass by const reference. It avoids an expensive copy while promising the function will not touch the object. This is the default way to pass big read-only parameters in modern C++.',
          'Two functions can share a name if their parameter lists differ — that is overloading, and the compiler picks the best match by the arguments you pass. You can also give parameters defaults (`int f(int x, int y = 0)`), so callers may omit them. And remember: a function must be declared — by its definition or a forward declaration (prototype) — before its first use, which is why headers exist.',
        ],
      },
    ],
    cheatSheet: [
      ['do-while', 'Runs its body at least once; the condition is checked after.'],
      ['break / continue', '`break` exits the loop; `continue` skips to the next iteration.'],
      ['void', 'Return type meaning "returns no value."'],
      ['Pass by value', 'The function gets a copy; the caller is unaffected.'],
      ['int& x', 'Pass by reference — the function can modify the caller\'s variable.'],
      ['const T&', 'Pass large read-only objects by const reference to avoid copies.'],
      ['Overloading', 'Same name, different parameter lists; the compiler picks the match.'],
      ['Default argument', '`int f(int x, int y = 0)` — the caller may omit `y`.'],
      ['switch', 'Matches integral/enum values exactly; each `case` needs `break;`.'],
    ],
  },
  'cpp-pointers': {
    overview: [
      'Pointers are C++\'s superpower and its most notorious footgun: direct access to memory addresses, with no safety net. Understanding them is understanding how C++ actually works.',
      'This lesson covers what pointers are, the address-of and dereference operators, `nullptr`, the stack vs the heap, `new`/`delete`, and the classic failure modes: leaks, dangling pointers, and mismatched array deletes.',
    ],
    learn: [
      {
        heading: 'Addresses, pointers, and references',
        body: [
          'A pointer is a variable that stores a memory address. `&x` gives you the address of `x` — `int* p = &x;` makes `p` point at `x` — and `*p` dereferences the pointer, reaching the object it points to. On the left side of an assignment, `*p = 5;` writes through the pointer.',
          'A pointer that points to nothing should be `nullptr`, the modern null-pointer constant. Dereferencing `nullptr` — or a wild, uninitialized pointer — is undefined behaviour. A reference, by contrast, is an alias that must bind at creation, can never be null, and can never be reseated: safer, but less flexible.',
        ],
      },
      {
        heading: 'Stack, heap, and the ways memory dies',
        body: [
          'Local variables live on the stack and are freed automatically when their scope ends. Heap memory — obtained with `new` — is yours to manage: `new` returns a pointer, and you must `delete` it, or the memory is lost until the program exits. That loss has a name: a memory leak.',
          'Worse than a leak is a dangling pointer: one that points to memory already freed or out of scope. Using it is undefined behaviour and a favorite exploit primitive. And arrays allocated with `new[]` must be freed with `delete[]` — mismatching the forms is undefined behaviour. The modern answer to all of this is smart pointers (see the RAII lesson), but you must understand the raw mechanics first, because every abstraction leaks eventually.',
        ],
      },
    ],
    cheatSheet: [
      ['Pointer', 'A variable holding a memory address; dereference with `*`.'],
      ['&x', 'Address-of operator — yields the address of `x`.'],
      ['*p', 'Dereference — accesses the object the pointer points to.'],
      ['nullptr', 'The null pointer; dereferencing it is undefined behaviour.'],
      ['Reference', 'An alias: must bind at creation, cannot be null or reseated.'],
      ['Stack', 'Automatic storage for locals; freed when scope ends.'],
      ['new / delete', 'Heap allocation you must free yourself; every `new` needs a `delete`.'],
      ['Memory leak', 'Heap memory never freed — lost until the program exits.'],
      ['Dangling pointer', 'Points to freed or out-of-scope memory; using it is UB.'],
      ['new[] / delete[]', 'Array forms must match — mismatching is undefined behaviour.'],
    ],
  },
  'cpp-oop': {
    overview: [
      'C++ invented much of what the world now calls object-oriented programming — and then kept the escape hatches. Classes bundle data with the functions that operate on it, and the access system decides who may touch what.',
      'This lesson covers `class` vs `struct`, constructors and destructors, encapsulation, `virtual` functions and runtime polymorphism, abstract classes, and constructor initializer lists.',
    ],
    learn: [
      {
        heading: 'Classes, construction, destruction',
        body: [
          'In C++, `class` and `struct` are nearly identical — the only difference is the default access: `class` members are private unless stated otherwise, `struct` members are public. That default is why `class` signals "encapsulated abstraction" and `struct` signals "plain data."',
          'A constructor is the special member function that initializes an object at creation — same name as the class, no return type. Its counterpart, the destructor (`~ClassName()`), runs automatically when the object dies and handles cleanup: freeing resources, closing handles. Prefer initializing members in the constructor\'s initializer list — `ClassName() : member(value) {}` — rather than assigning in the body: it is more efficient, and it is required for `const` and reference members.',
          'Access specifiers are the encapsulation machinery: `private` means class-only, `protected` extends to derived classes, `public` is open to everyone. The discipline is to keep internals private and expose a deliberate public interface — clients depend on the interface, not the implementation.',
        ],
      },
      {
        heading: 'Inheritance and polymorphism',
        body: [
          'Declaring a member function `virtual` makes it overridable: calling it through a base-class pointer or reference dispatches at runtime to the derived class\'s override, via the virtual table. That is runtime polymorphism — one interface, many behaviors, chosen by the actual object type.',
          'Two rules follow. First, a polymorphic base class needs a virtual destructor, so that deleting a derived object through a base pointer runs the derived destructor; without it, you get undefined behaviour and likely a leak. Second, a pure virtual function (`virtual void f() = 0;`) has no base implementation and makes the class abstract — it cannot be instantiated, and derived classes must override the function. Inside any member function, `this` is a pointer to the current object.',
        ],
      },
    ],
    cheatSheet: [
      ['class vs struct', 'Nearly identical; `class` defaults to private, `struct` to public.'],
      ['Constructor', 'Initializes an object at creation; same name as the class, no return type.'],
      ['Destructor (`~ClassName`)', 'Cleanup at end of lifetime; runs automatically.'],
      ['Initializer list', '`ClassName() : member(value) {}` — required for const/reference members.'],
      ['private / protected / public', 'Class-only, plus derived classes, open to all.'],
      ['virtual', 'Makes a function overridable; enables runtime dispatch.'],
      ['Polymorphism', 'A virtual call through a base pointer runs the derived override.'],
      ['Virtual destructor', 'Required on polymorphic bases so derived destructors run.'],
      ['Pure virtual (`= 0`)', 'No base body; makes the class abstract.'],
      ['this', 'Pointer to the current object inside a member function.'],
    ],
  },
  'cpp-stl': {
    overview: [
      'The Standard Template Library is the part of C++ you will use every day: containers that manage their own memory, iterators that traverse them, and algorithms that operate on ranges.',
      'This lesson covers `std::vector` (your default container), `std::map` and `std::set`, `std::string`, iterators, range-based for loops, and the `<algorithm>` header — `sort`, `find`, and friends.',
    ],
    learn: [
      {
        heading: 'Containers: vector first, the rest on demand',
        body: [
          '`std::vector` is a dynamic, contiguous array — it grows as needed, and because its elements sit side by side in memory it is cache-friendly and fast to iterate. It is the default container: reach for anything else only when you need its specific behavior. Add elements with `push_back` (or `emplace_back`), check `size()` and `empty()`.',
          '`std::map` stores sorted, unique key→value pairs; `std::set` stores sorted unique elements. Their hash-based cousins, `std::unordered_map` and `std::unordered_set`, trade ordering for average O(1) lookup. And `std::string` is a managed, resizable string that owns its memory — no manual null-termination, no buffer sizing, none of the C-string anxiety.',
          '`std::pair` holds two values together (a map entry exposes `.first` and `.second`); `std::tuple` generalizes the idea to any number of values.',
        ],
      },
      {
        heading: 'Iterators and algorithms',
        body: [
          'An iterator is an object that points into a container and can be advanced to traverse it — a generalization of the pointer idea. `begin()` and `end()` delimit the range, and `end()` is the past-the-end sentinel: `std::find` returns `end()` when the value is absent, so always compare against it before using the result.',
          'The modern way to traverse is the range-based for loop: `for (const auto& x : container)`. The `&` avoids copying each element; `const` promises read-only. For everything else there is `<algorithm>`: `std::sort(v.begin(), v.end())` sorts ascending by default (pass a comparator for custom order), and dozens of siblings — `find`, `count`, `transform`, `any_of` — turn raw loops into named intent.',
        ],
      },
    ],
    cheatSheet: [
      ['std::vector', 'Dynamic contiguous array — the default container; cache-friendly.'],
      ['push_back / emplace_back', 'Append to a vector; `size()` counts, `empty()` checks.'],
      ['std::map / std::set', 'Sorted unique keys (map: key→value; set: elements).'],
      ['std::unordered_map/set', 'Hash-based; average O(1), no ordering.'],
      ['std::string', 'Managed resizable string — no manual null-termination.'],
      ['Iterator', 'Points into a container; `begin()`/`end()` delimit the range.'],
      ['for (const auto& x : c)', 'Range-based for; `&` avoids copies, `const` is read-only.'],
      ['std::sort / std::find', 'Sort a range; `find` returns `end()` when absent — always check.'],
      ['std::pair / std::tuple', 'Bundle two (or N) values together.'],
    ],
  },
  'cpp-raii': {
    overview: [
      'RAII — Resource Acquisition Is Initialization — is the single most important idiom in C++: tie a resource\'s lifetime to an object\'s scope, and the destructor releases it automatically, even when exceptions fly.',
      'This lesson covers the RAII principle, `unique_ptr` and `shared_ptr` (and why `weak_ptr` exists), `make_unique`, move semantics, the Rule of Five, and the Rule of Zero.',
    ],
    learn: [
      {
        heading: 'Ownership, expressed in types',
        body: [
          'The idea is disarmingly simple: acquire the resource in the constructor, release it in the destructor. Because destructors run automatically when an object leaves scope — including during stack unwinding when an exception propagates — resources are released on every path, with no manual cleanup to forget. This is why RAII beats manual `new`/`delete` so completely: the correct behavior is the default behavior.',
          '`std::unique_ptr` expresses exclusive ownership of a heap object; it cannot be copied, only moved, and it frees the object when it dies. `std::shared_ptr` expresses shared ownership through reference counting — copying increments the count, destruction decrements it, and the object is freed when the last owner goes away. Two `shared_ptr`s pointing at each other would never release, which is why `std::weak_ptr` exists: it observes a `shared_ptr` without owning, breaking the cycle.',
          'Always prefer `std::make_unique<T>(...)` over raw `new`: it is exception-safe (no leak if construction throws) and you never write the type twice. After `auto p2 = std::move(p1);`, `p1` is left empty — ownership transferred, not duplicated.',
        ],
      },
      {
        heading: 'Move semantics and the rules',
        body: [
          'Move semantics transfer resources instead of copying them: `std::move` casts to an rvalue so the move constructor (not the copy constructor) is chosen. Moving a vector hands over its buffer pointer rather than duplicating every element — the difference between O(1) and O(n).',
          'The Rule of Five says: if you define any of the destructor, copy constructor, copy assignment, move constructor, or move assignment, consider all five — managing a resource usually means handling them as a set. But the better rule is the Rule of Zero: design classes so you need none of them, letting members like smart pointers and vectors manage resources for you. The safest special member function is the one you never write.',
        ],
      },
    ],
    cheatSheet: [
      ['RAII', 'Tie resource lifetime to object scope; the destructor releases it automatically.'],
      ['unique_ptr', 'Exclusive ownership; movable but not copyable; auto-frees.'],
      ['shared_ptr', 'Shared ownership via reference counting; frees at zero owners.'],
      ['weak_ptr', 'Non-owning observer of a shared_ptr; breaks reference cycles.'],
      ['make_unique', 'Exception-safe creation; prefer over raw `new`.'],
      ['Move semantics', 'Transfer resources without copying; `std::move` selects the move path.'],
      ['Rule of Five', 'Define or consider all five special members together when managing a resource.'],
      ['Rule of Zero', 'Let member types manage resources; define no special members yourself.'],
      ['Exceptions + RAII', 'Stack unwinding runs destructors, so resources release even on throw.'],
    ],
  },
  'cpp-modern-templates': {
    overview: [
      'Modern C++ — roughly C++11 onward — is almost a different language from the C++ of the 1990s: type-safe generics, lambdas, compile-time computation, and a standard library that finally feels complete.',
      'This lesson covers templates and when they instantiate, lambdas and captures, `constexpr`, namespaces, the header/source split, `nullptr`, and `std::optional`.',
    ],
    learn: [
      {
        heading: 'Templates and lambdas',
        body: [
          'A template is a blueprint: `template<typename T> T max(T a, T b)` generates a separate function for every type actually used — at compile time, not runtime. That is why templates mostly live in headers: the compiler needs the full definition visible wherever instantiation happens.',
          'A lambda is an inline anonymous function object: `[](int x){ return x*2; }`. The capture list in brackets decides what surrounding state it can see — `[&]` captures everything by reference, `[=]` by value. Capturing by reference is powerful and dangerous in equal measure: if the lambda outlives the captured variable, you have a dangling reference.',
        ],
      },
      {
        heading: 'The modern toolkit',
        body: [
          '`constexpr` asks the compiler to evaluate something at compile time when possible, turning runtime computation into compile-time constants. Namespaces group related names to avoid collisions — `std` is just the most famous one, accessed as `ns::name`.',
          'The header/source split is C++\'s compilation model made concrete: the `.h`/`.hpp` declares the interface so callers can compile against it, while the `.cpp` defines the implementation. (Templates are the exception — they usually stay header-only.) Two small modernizations punch above their weight: `nullptr` is a real null-pointer type, so overload resolution is unambiguous where `NULL`-as-zero could silently pick the wrong function; and `std::optional<T>` represents "a value that may not be present" — a type-safe alternative to sentinels and null pointers.',
        ],
      },
    ],
    cheatSheet: [
      ['Template', 'Compile-time blueprint generating code per type used; lives in headers.'],
      ['Lambda', 'Anonymous inline function: `[](int x){ return x*2; }`.'],
      ['[&] / [=]', 'Capture outer variables by reference / by value; `[&]` can dangle.'],
      ['constexpr', 'Requests compile-time evaluation when possible.'],
      ['Namespace', 'Groups names to avoid collisions; access via `ns::name`.'],
      ['Header (.hpp) / source (.cpp)', 'Declaration of the interface vs definition of the implementation.'],
      ['nullptr', 'True null-pointer type; unambiguous overload resolution vs `NULL`/0.'],
      ['std::optional<T>', 'A value that may be absent — type-safe, no sentinels.'],
    ],
  },
  'cpp-safety': {
    overview: [
      'C++ gives you no guardrails: out-of-bounds access, use-after-free, and signed overflow are not errors the language catches — they are undefined behaviour, meaning the compiler is allowed to do literally anything.',
      'This lesson covers what undefined behaviour means, why buffer overflows are a security catastrophe, the safe alternatives (`vector`, `.at()`), and the tooling that catches what the compiler cannot: warnings, sanitizers, and Valgrind.',
    ],
    learn: [
      {
        heading: 'Undefined behaviour: the contract you cannot break',
        body: [
          'Undefined behaviour (UB) means the C++ standard assigns no meaning to your code — the compiler may do anything, including appearing to work today and exploding after an unrelated change. Out-of-bounds array access, signed integer overflow, and use-after-free are all UB, not "an exception" or "a crash you can rely on." Treating UB as merely a bug understates it: it voids every assumption your program rests on.',
          'The most consequential UB is the buffer overflow: writing past an array corrupts adjacent memory, and C++ performs no bounds checking on raw arrays or `operator[]`. Attackers have turned this into decades of exploits. The defences are straightforward — use `std::vector` or `std::array` instead of raw arrays, iterate with range-based for loops, and reach for `.at(i)` instead of `[i]` when the index is uncertain: `.at()` throws `std::out_of_range` rather than invoking UB.',
          'A use-after-free — accessing memory through a pointer after it was freed — is UB with the same exploit potential. Null pointers after freeing, or better yet smart pointers that make the question moot, are the way out. And the single highest-leverage habit in modern C++: never write raw `new`/`delete` when RAII and smart pointers will do.',
        ],
      },
      {
        heading: 'The tooling safety net',
        body: [
          'The compiler is your first line of defence: build with `-Wall -Wextra` to enable warnings that catch likely bugs, and consider `-Werror` in CI so warnings cannot be ignored into production. Warnings are the cheapest bugs you will ever fix.',
          'What warnings miss, sanitizers catch at runtime. AddressSanitizer (`-fsanitize=address`) detects use-after-free, buffer overflows, and leaks during testing with modest slowdown — run your test suite under it routinely. Valgrind finds the same class of memory errors without recompilation, at the cost of much slower execution. Between strict warnings, sanitizers, RAII, and bounds-checked access, modern C++ is far safer than its reputation — but every layer is opt-in, and the language will never force you to use them.',
        ],
      },
    ],
    cheatSheet: [
      ['Undefined behaviour (UB)', 'No defined meaning — the compiler may do anything; never rely on it.'],
      ['Buffer overflow', 'Writing past an array; corrupts memory and is a classic exploit. C++ does not bounds-check `[]`.'],
      ['std::vector / std::array', 'Safe alternatives to raw arrays; prefer range-based for loops.'],
      ['.at(i) vs [i]', '`.at()` throws `std::out_of_range`; `[i]` is unchecked UB on a bad index.'],
      ['-Wall -Wextra (-Werror)', 'Enable warnings; treat them as errors in CI.'],
      ['AddressSanitizer', '`-fsanitize=address`: finds use-after-free, overflows, leaks at runtime.'],
      ['Valgrind', 'Detects leaks and invalid memory use without recompiling.'],
      ['Use-after-free', 'Accessing freed memory — UB and exploitable; prefer smart pointers.'],
      ['const T&', 'Default for large read-only parameters — avoids a copy.'],
    ],
  },
};
