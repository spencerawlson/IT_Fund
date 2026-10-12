# C++ Classes & OOP: virtual, Polymorphism, and the Abstract Class — Avatar Tutor Script

**Lesson ID:** cpp-oop
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~671 words)

## Spoken script

**[HOOK — 0:00]**
One function call. Three different objects. Three different behaviours. That
is runtime polymorphism — one interface, many behaviours, chosen by the
actual object type — and it powers nearly every extensible C++ design ever
shipped. Let's see how C++ pulls it off.

**[WHY IT MATTERS — ~0:25]**
C++ invented much of what the world now calls object-oriented programming —
and then kept the escape hatches. Classes bundle data with the functions that
operate on it, and the access system decides who may touch what. This is the
lesson where C++ stops being "C with extras" and becomes its own language.

**[SECTION — Classes, construction, destruction — ~0:50]**
In C++, class and struct are nearly identical — the only difference is the
default access: class members are private unless stated otherwise, struct
members are public. Think of a class as a locked diary and a struct as a
bulletin board: same paper, different defaults about who gets to read it.
That default is why class signals "encapsulated abstraction" and struct
signals "plain data."

A constructor is the special member function that initialises an object at
creation — same name as the class, no return type. Its counterpart, the
destructor — ~ClassName() — runs automatically when the object dies and
handles cleanup: freeing resources, closing handles. Construction crew and
demolition crew, each called exactly once.

Prefer initialising members in the constructor's initialiser list —
ClassName() : member(value) {} — rather than assigning in the body. It is
more efficient, and it is required for const and reference members, which
cannot be assigned after the fact. Pack before the trip instead of shopping
at the destination.

Access specifiers are the encapsulation machinery: private means class-only,
protected extends to derived classes, public is open to everyone. Think of
them as clearance levels. The discipline is to keep internals private and
expose a deliberate public interface — clients depend on the interface, not
the implementation.

**[SECTION — Inheritance and polymorphism — ~2:45]**
Declaring a member function virtual makes it overridable: calling it through
a base-class pointer or reference dispatches at runtime to the derived
class's override, via the virtual table. Picture a manager who delegates each
task to the right specialist — one call, and the actual object type decides
who does the work. That is runtime polymorphism.

Two rules follow, and both are exam favourites. First, a polymorphic base
class needs a virtual destructor, so that deleting a derived object through a
base pointer runs the derived destructor. Without it, you get undefined
behaviour and likely a leak — like demolishing a building but never calling
the specialist cleanup crew.

Second, a pure virtual function — virtual void f() = 0; — has no base
implementation and makes the class abstract: it cannot be instantiated, and
derived classes must override the function. Think of it as an architectural
blueprint — you can derive real buildings from it, but you can never move
into the blueprint itself. And inside any member function, this is a pointer
to the current object — the object referring to itself. Step back and see
the payoff: polymorphism lets you write code today that works with classes
written tomorrow. The base interface stays fixed while new derived types
plug in — that extensibility is the whole reason the virtual machinery
exists.

**[COMMON MISTAKES — ~4:45]**
Three traps. One: a polymorphic base class without a virtual destructor —
deleting through a base pointer then skips the derived destructor, which is
undefined behaviour and usually a leak. Two: treating class and struct as
fundamentally different — they differ only in default access. Three: trying
to instantiate an abstract class — a class with a pure virtual function can
never be created directly.

**[RECAP — ~5:10]**
class defaults to private, struct defaults to public — otherwise identical.
Constructors initialise at creation, destructors clean up automatically, and
the initialiser list is the efficient, sometimes mandatory, way to set
members. Keep internals private behind a public interface. virtual enables
runtime dispatch through base pointers; polymorphic bases need virtual
destructors; a pure virtual function (= 0) makes the class abstract; and
this points at the current object. That is the whole OOP core.

## On-screen visuals

- HOOK: one call arrow splitting into three different object behaviours.
- WHY IT MATTERS: "class + access control" as the leap from C to C++.
- SECTION — Classes, construction, destruction: class vs struct default-access
  comparison; constructor/destructor lifecycle timeline; an initialiser list
  vs body-assignment comparison; private/protected/public as clearance
  levels.
- SECTION — Inheritance and polymorphism: virtual dispatch diagram — base
  pointer routing through the vtable to the derived override; a missing
  virtual destructor leaking; a blueprint labelled "abstract: cannot
  instantiate" for the pure virtual class.
- COMMON MISTAKES: three trap cards — base without virtual destructor,
  class/struct confusion, instantiating an abstract class.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
