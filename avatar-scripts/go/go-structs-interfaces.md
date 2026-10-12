# Go Structs, Methods & Interfaces: Composition and Implicit Satisfaction — Avatar Tutor Script

**Lesson ID:** go-structs-interfaces
**Track:** Go Programming
**Estimated runtime:** ~5 minutes (~652 words)

## Spoken script

**[HOOK — 0:00]**
Go deleted inheritance. On purpose. No classes, no extends, no hierarchies
— and it turns out you don't miss it. What replaced it is simpler and, once
you see it, obviously better: composition for reuse, and interfaces that
your types satisfy without ever declaring it.

**[WHY IT MATTERS — ~0:25]**
This is the lesson that rewires object-oriented instincts. Structs bundle
named fields, methods attach via receivers, and reuse comes from embedding
one type inside another. Polymorphism arrives through interfaces — satisfied
implicitly. If your type has the methods, it qualifies. No declaration
required.

**[SECTION — Structs plus methods — ~0:50]**
A struct is a typed collection of named fields — data, nothing more.
Behaviour attaches through methods, declared with a receiver before the
function name: func (r Rectangle) Area() float64. The struct holds the
nouns; the methods supply the verbs.

The receiver choice matters. A value receiver operates on a copy, while a
pointer receiver — func (r *Rectangle) Grow() — can modify the original and
avoids copying large structs. The rule of thumb is simple: if the method
mutates, or the struct is large, use a pointer receiver. Lending the
original document versus handing over a photocopy — choose based on whether
the method needs to write on it.

Inheritance's job is done by embedding: place one struct inside another and
its fields and methods are promoted, callable as if defined on the outer
type. It is composition with syntactic sugar — you assemble bigger
behaviours from smaller ones instead of building class hierarchies. Think
Lego, not family trees. Go's designers considered deep inheritance trees a
liability, and the language simply does not offer them. The result is
flatter designs: instead of a taxonomy of types, you get small pieces
composed on demand, each one understandable in isolation. When you need
shared behaviour, you embed; when you need polymorphism, you reach for
interfaces — the two tools stay separate, and each stays simple.

**[SECTION — Interfaces, satisfied by structure — ~2:45]**
An interface lists method signatures, and a type satisfies it implicitly —
there is no implements keyword, no registration step. If it has the methods,
it qualifies. Picture a job that hires anyone who can do the tasks, no
certificate required. This structural typing keeps dependencies minimal:
define small interfaces — often a single method, like io.Reader or
io.Writer — at the point of use, and any type in any package that happens
to match can plug in.

To recover a concrete type from an interface value, use a type assertion —
v, ok := i.(MyType) — or a type switch when several cases are possible.

The empty interface, interface{} — modern alias any — is satisfied by every
value. It is the escape hatch for genuinely heterogeneous data, but
idiomatic Go reaches for concrete types or generics first: any everywhere
is a design smell. And note the zero values: interfaces and pointers both
start as nil, and calling a method on a nil interface panics. Nil is honest
about being nothing; it just refuses to pretend otherwise. That honesty
extends to the whole model: a nil interface says "nothing here" loudly, at
the point of the call, instead of failing three layers deeper.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: writing an implements declaration out of habit — Go has
none; the methods alone qualify the type. Two: designing giant interfaces
with a dozen methods — prefer small, focused ones defined where they are
used. Three: sprinkling any everywhere instead of concrete types — the
escape hatch is not the architecture.

**[RECAP — ~5:05]**
Structs hold named fields; methods attach via receivers — value receivers
get a copy, pointer receivers can mutate and avoid copying. Embedding
promotes the inner type's fields and methods: composition, not inheritance.
Interfaces are satisfied implicitly — no implements keyword — so keep them
small and define them where used. Recover concrete types with assertions or
type switches. any accepts every value but is a design smell, and a nil
interface panics if you call a method on it. No hierarchies required.

## On-screen visuals

- HOOK: a class hierarchy being crossed out, replaced by composed blocks
  and a quietly satisfied interface.
- WHY IT MATTERS: structs + methods + embedding + implicit interfaces as
  Go's four building blocks.
- SECTION — Structs plus methods: a struct's fields with methods attached
  via receivers; value vs pointer receiver — photocopy vs original; an
  embedded struct with promoted methods.
- SECTION — Interfaces, satisfied by structure: a type satisfying an
  interface with no declaration step; io.Reader/io.Writer as one-method
  examples; a type assertion recovering the concrete type; any as an
  escape hatch marked "use sparingly".
- COMMON MISTAKES: three trap cards — a phantom implements clause, a
  bloated interface, any used as the architecture.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
