# OOP & Pythonic Code: Classes, Generators, and the Pythonic Way — Avatar Tutor Script

**Lesson ID:** py-oop
**Track:** Python & Automation
**Estimated runtime:** ~5 minutes (~738 words)

## Spoken script

**[HOOK — 0:00]**
Scripts model the world: a host has an address and a port, a finding has a
severity and a timestamp. As your scripts grow into tools, you need a way to
model things — and to reuse behaviour without copy-pasting code. That's what
this lesson is about.

**[WHY IT MATTERS — 0:25]**
Copy-pasted logic is how tools rot: fix a bug in one copy, miss it in the
other four. Object-oriented programming lets you model things like hosts and
findings as objects with their own data and behaviour, and a few Pythonic
features — generators, decorators, type hints — make larger code readable,
testable, and genuinely pleasant to work with.

**[SECTION — Classes, self and dunder methods — 0:50]**
A class is a blueprint; each object created from it is an instance. The
__init__ method initialises a new instance's attributes, and every method
receives the instance it was called on as its first parameter — named self by
convention. It's not magic, just plumbing: self is how a method knows which
object it's working on.

Methods with double underscores — dunder methods — hook into Python's syntax.
Repr controls how an object appears to developers, in the shell and in logs,
and it should be unambiguous. Str is the friendlier form for end users. Eq
defines what double-equals means for your objects. These little hooks are why
your objects can print sensibly and compare correctly instead of showing
useless memory addresses.

And when your class is mostly data — like a Host with an ip and a port — the
dataclass decorator writes __init__, repr, and eq for you from annotated
fields. Less boilerplate, fewer bugs.

**[SECTION — Inheritance and method types — 1:55]**
Inheritance lets a class reuse and extend another: class Admin of User gets
every User method, and super lets you call the parent's version. But keep
hierarchies small. Deep inheritance trees become mazes. Often, composition —
an object holding another object — is clearer than inheritance.

Two method types to know. A staticmethod takes neither self nor cls: it's a
plain function grouped with the class for organisation. A classmethod receives
the class itself as cls, which makes it perfect for alternative constructors —
like Host dot from string parsing "10.0.0.1:2222" into a Host. Same class,
different ways in.

**[SECTION — Generators, decorators and lambdas — 2:55]**
A generator function uses yield instead of return, producing values lazily,
one at a time. Why does that matter? Because it can process a huge file or an
endless stream without loading everything into memory. The lesson's error
scanner yields matching lines as it reads — the whole file never has to fit
in RAM. If it fits in memory, fine; if it doesn't, generators save you.

A decorator is a function that wraps another function to add behaviour:
timing, logging, retries, access checks. Writing at-login-required above a def
wraps it without editing its body. It's the cleanest way to bolt on
cross-cutting behaviour — and the lesson's timed decorator shows the pattern:
wrap, do the extra thing, call the original.

And lambda creates a small anonymous function from one expression, most often
as a sort key: sorted of users with key lambda u colon u dot age. One line,
no def needed, thrown away after use.

**[SECTION — Type hints and style — 4:00]**
Type hints like def f with x as int returning str document intent, and they
let tools like mypy and your IDE catch bugs early. But here's the honest
caveat: they are not enforced at runtime. A hint is a promise to the reader
and the tooling, not a guardrail in the interpreter. Still worth writing —
future you will thank present you.

PEP 8 naming keeps codebases consistent: snake case for functions and
variables, CapWords for classes, UPPER CASE for constants. Conventions like
these are why you can read someone else's Python and feel at home.

**[COMMON MISTAKES — 4:40]**
Three traps. One: forgetting self as the first method parameter — Python
passes the instance automatically, so your signature must accept it. Two:
expecting type hints to be enforced at runtime; they're documentation for
tools, not guards. Three: building deep inheritance hierarchies when
composition would be clearer — prefer small, flat designs.

**[RECAP — 5:05]**
Classes are blueprints, instances are the objects, self is the plumbing, and
dunder methods hook your objects into Python's syntax — with dataclass
writing the boring parts for you. Inheritance reuses behaviour but keep it
shallow; staticmethod organises, classmethod constructs. Generators yield
lazily and stream huge data; decorators wrap functions to add behaviour;
lambdas are throwaway one-expression functions. Type hints document intent
for tools, and PEP 8 naming keeps everything consistent. That's OOP, the
Pythonic way.

## On-screen visuals

- HOOK: a flat script with copy-pasted blocks transforming into tidy class
  definitions.
- Classes SECTION: a blueprint stamping out instances, self shown as an arrow
  from method back to its object; repr versus str output side by side.
- Inheritance SECTION: a shallow two-level hierarchy, super calling upward;
  staticmethod and classmethod labelled with what they receive.
- Generators/decorators SECTION: a huge log file streaming through a yield
  one line at a time; a decorator wrapping a function like gift paper.
- Type hints SECTION: a hinted signature with the IDE flagging a wrong-type
  call, plus the PEP 8 naming table.
- RECAP: the cheat-sheet terms as a clean summary card.
