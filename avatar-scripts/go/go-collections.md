# Go Slices, Arrays & Maps: The Workhorse, comma-ok, and range — Avatar Tutor Script

**Lesson ID:** go-collections
**Track:** Go Programming
**Estimated runtime:** ~5 minutes (~657 words)

## Spoken script

**[HOOK — 0:00]**
The most common bug in beginner Go is a single missing assignment: s =
append(s, v). Forget the s =, and your data silently vanishes. Go's data
structures are few and opinionated, and each one has exactly one sharp edge
like that. Let's find them all before they find you.

**[WHY IT MATTERS — ~0:25]**
Arrays are fixed-size values, slices are the dynamic views you actually use,
and maps are the built-in hash tables. The range loop ties them together —
with semantics precise enough that misunderstanding them is a rite of
passage worth skipping. Get these right and the rest of Go feels natural.

**[SECTION — Arrays are fixed; slices are the workhorse — ~0:50]**
An array's length is part of its type — [4]int and [5]int are different
types — which makes arrays precise but rigid. Think of parking lots painted
for exactly four cars versus five: different lots, no interchange. Slices
are what you use almost everywhere: dynamic, cheap views into a backing
array.

Growing one is append, and the critical detail is that append may allocate a
new backing array — so you must assign the result back: s = append(s, v).
Forget the assignment and you keep pointing at the old, too-small array
while the new data lives somewhere else. It is like moving to a bigger
apartment but never updating your address.

Two numbers describe a slice: len, the elements it holds, and cap, the
backing-array space available from the slice's start. make([]int, 0, 10)
creates an empty slice pre-sized with capacity ten — length zero, no wasted
reallocations as you append. Pre-sizing when you know the rough size is one
of the cheapest performance wins in Go. You are telling the runtime the
ending in advance, so it can reserve the space once instead of growing in
fits and starts.

**[SECTION — Maps and the comma-ok idiom — ~2:40]**
Maps come from make(map[string]int) or a literal, and reading a missing key
returns the value type's zero value rather than an error. Convenient — but
ambiguous when zero is a legitimate stored value. It is like asking a
librarian for a book and hearing "zero copies": was it never stocked, or is
it all lent out? You cannot tell from the answer alone.

The comma-ok idiom resolves it: v, ok := m[key] sets ok true only if the key
exists. Deleting is delete(m, key), a no-op when absent. And one more thing
to internalise early: ranging over a map visits keys in a deliberately
randomised order, so sort the keys whenever determinism matters. The
randomness is intentional — it stops you from depending on an order that was
never promised.

**[SECTION — Range: know what you are holding — ~4:00]**
for i, v := range s gives you the index and a copy of each element — a
copy, which means assigning to v changes nothing in the slice. To mutate,
index through s[i] instead. Picture range handing you a photocopy of each
page: scribbling on the copy never changes the book. Over a map, range
yields key and value pairs.

These semantics are simple once stated and endlessly confusing until they
are, so state them once more: v is a copy. Index to mutate. Tattoo it on
the inside of your eyelids — it will save you a debugging session.

**[COMMON MISTAKES — ~4:50]**
Three traps. One: calling append without assigning the result — s =
append(s, v), always. Two: modifying the range variable v and expecting the
slice to change — v is a copy; use s[i]. Three: relying on map iteration
order — it is randomised, so sort the keys when order matters.

**[RECAP — ~5:10]**
Arrays are fixed — the length is part of the type. Slices are the dynamic
workhorse: append grows them, but assign the result back, and pre-size with
make when you know the capacity. len counts elements, cap counts backing
space. Maps return the zero value for missing keys, so use the comma-ok
idiom — v, ok := m[key] — to tell "absent" from "stored zero". Map
iteration is randomised; sort for determinism. And range hands you a copy —
index with s[i] to mutate.

## On-screen visuals

- HOOK: s = append(s, v) with the "s =" circled — the missing assignment
  that loses data.
- WHY IT MATTERS: arrays, slices, maps and range as Go's small,
  opinionated toolkit.
- SECTION — Arrays are fixed; slices are the workhorse: [4]int vs [5]int as
  different types; append reallocating to a new backing array; len vs cap
  gauges; make([]int, 0, 10) pre-sizing.
- SECTION — Maps and the comma-ok idiom: a missing key returning the zero
  value vs the comma-ok idiom distinguishing it; randomised map iteration
  order vs sorted keys.
- SECTION — Range: know what you are holding: v as a photocopy of each
  element; s[i] reaching the original for mutation.
- COMMON MISTAKES: three trap cards — unassigned append, mutating the
  range copy, assumed map order.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
