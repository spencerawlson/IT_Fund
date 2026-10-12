# C++ Pointers, References & Memory: Addresses, the Heap, and Dangling Pointers — Avatar Tutor Script

**Lesson ID:** cpp-pointers
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~663 words)

## Spoken script

**[HOOK — 0:00]**
A pointer is a number that points at another number's house. Get it right and
you command the machine directly; get it wrong and the program crashes in
ways the debugger can barely explain. Pointers are C++'s superpower and its
most notorious footgun — and understanding them is understanding how C++
actually works.

**[WHY IT MATTERS — ~0:25]**
There is no safety net here. Every abstraction C++ offers — references,
smart pointers, containers — is built on raw addresses, and every one of
them leaks eventually. When the abstraction surprises you, the raw mechanics
are where the answer lives, which is why this lesson comes before the
conveniences, not after. If you understand the raw mechanics, the abstractions
make sense; if you skip them, the abstractions will betray you at the worst
possible moment.

**[SECTION — Addresses, pointers, and references — ~0:50]**
A pointer is a variable that stores a memory address. &x gives you the
address of x — so int* p = &x; makes p point at x — and *p dereferences the
pointer, reaching the object it points to. Think street address versus house:
the pointer is the address written on paper, dereferencing is walking up to
the door. And on the left side of an assignment, *p = 5; writes through the
pointer — it changes the house, not the paper.

A pointer that points to nothing should be nullptr, the modern null-pointer
constant. Dereferencing nullptr — or a wild, uninitialised pointer — is
undefined behaviour. It is knocking on a door that isn't there: anything can
happen, and none of it is good.

A reference is the safer cousin: an alias that must bind at creation, can
never be null, and can never be reseated. It is like a nickname that sticks
forever — you cannot reassign it to someone else, and it cannot refer to
nobody. Safer than a pointer, but less flexible, which is exactly the trade.
Choose references when you can — for parameters and aliases — and reach for
pointers when you need the flexibility: reseating, nullability, or pointer
arithmetic. The exam loves asking which one fits, so practise the
distinction until it is reflex.

**[SECTION — Stack, heap, and the ways memory dies — ~2:40]**
Local variables live on the stack and are freed automatically when their
scope ends — hotel checkout is automatic when you leave the room. Heap
memory, obtained with new, is yours to manage: new returns a pointer, and you
must delete it, or the memory is lost until the program exits. That loss has
a name: a memory leak. Slow, silent, and cumulative — the program's footprint
grows until something gives.

Worse than a leak is a dangling pointer: one that points to memory already
freed or out of scope. It is a map to a house that burned down — following
it is undefined behaviour, and it is a favourite primitive for exploits,
because the attacker gets to decide what now lives at that address.

And arrays allocated with new[] must be freed with delete[] — mismatching the
forms is undefined behaviour. The modern answer to all of this is smart
pointers, which you will meet in the RAII lesson. But you must understand the
raw mechanics first, because every abstraction leaks eventually.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: dereferencing an uninitialised pointer — a wild pointer
points anywhere, and using it is undefined behaviour. Initialise to nullptr
or to a real address, no exceptions. Two: forgetting delete — every new
needs its delete, or you have a leak. Three: mismatching new[] with delete
instead of delete[] — the forms must match, always.

**[RECAP — ~5:05]**
A pointer holds a memory address: &x takes the address, *p dereferences it,
and nullptr is the honest way to point at nothing. References are aliases
that bind once, can never be null, and can never be reseated. Stack memory is
automatic; heap memory from new must be deleted by you, or it leaks. A
dangling pointer — aimed at freed or out-of-scope memory — is undefined
behaviour and an exploit primitive. And new[] pairs with delete[], never
with plain delete.

## On-screen visuals

- HOOK: a memory grid with one cell holding an address that points at
  another cell — the "number pointing at a house".
- WHY IT MATTERS: layers diagram — references, smart pointers, containers —
  all resting on raw addresses at the bottom.
- SECTION — Addresses, pointers, and references: &x producing an address,
  *p reaching the object; nullptr shown as an empty slot; a reference
  binding permanently to its object.
- SECTION — Stack, heap, and the ways memory dies: stack frame growing and
  shrinking automatically; heap block allocated with new and freed with
  delete; a leaking block fading out; a dangling pointer aimed at a freed
  block marked with a skull icon; new[]/delete[] pairing.
- COMMON MISTAKES: three trap cards — a wild pointer, a new without delete,
  mismatched new[]/delete.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
