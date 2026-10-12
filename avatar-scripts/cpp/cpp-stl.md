# C++ The Standard Library (STL): vector First, Iterators, and Algorithms — Avatar Tutor Script

**Lesson ID:** cpp-stl
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~642 words)

## Spoken script

**[HOOK — 0:00]**
Every day you write C++, you will reach for the Standard Template Library.
It is the difference between managing memory by hand and letting
battle-tested containers do it for you. Containers that manage their own
memory, iterators that traverse them, algorithms that operate on ranges —
this is the part of C++ that pays rent daily.

**[WHY IT MATTERS — ~0:25]**
Raw arrays and hand-rolled loops are where C++ bugs are born: overflows,
leaks, off-by-one errors. The STL replaces them with components that have
been hammered on for decades. Learn the defaults — which container to reach
for, how to traverse, how to search — and you write less code with fewer
bugs.

**[SECTION — Containers: vector first, the rest on demand — ~0:50]**
std::vector is a dynamic, contiguous array: it grows as needed, and because
its elements sit side by side in memory, it is cache-friendly and fast to
iterate. Picture a row of neighbouring houses — visiting them in order is
quick because there is no travel in between. Vector is the default container:
reach for anything else only when you need its specific behaviour. Add
elements with push_back or emplace_back, and check size() and empty().

std::map stores sorted, unique key-to-value pairs; std::set stores sorted
unique elements. Their hash-based cousins, std::unordered_map and
std::unordered_set, trade ordering for average constant-time lookup — a
sorted bookshelf versus labelled drawers you can open instantly. And
std::string is a managed, resizable string that owns its memory: no manual
null-termination, no buffer sizing, none of the C-string anxiety.

Finally, std::pair holds two values together — a map entry exposes .first
and .second — and std::tuple generalises the idea to any number of values.
Reach for pair when a function must return two linked values, and tuple
when two is not enough: small, honest packaging instead of inventing a
struct for a one-off result.

**[SECTION — Iterators and algorithms — ~2:40]**
An iterator is an object that points into a container and can be advanced to
traverse it — a generalisation of the pointer idea. begin() and end()
delimit the range, and end() is the past-the-end sentinel. Here is the
detail that matters: std::find returns end() when the value is absent, so
always compare against it before using the result. It is the librarian
telling you "we don't have it" — check the signal before you try to read
the book.

The modern way to traverse is the range-based for loop: for (const auto& x :
container). The & avoids copying each element; const promises read-only.
Simple, fast, and almost impossible to get wrong.

For everything else there is the <algorithm> header.
std::sort(v.begin(), v.end()) sorts ascending by default — pass a comparator
for custom order. And dozens of siblings — find, count, transform, any_of —
turn raw loops into named intent. A loop says "do this repeatedly"; an
algorithm says what you mean. Prefer saying what you mean. That shift —
from how to what — is the STL's real lesson. A hand-rolled loop can hide an
off-by-one for months; std::find with its end() check wears its correctness
on the surface.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: using the result of std::find without comparing it to
end() — when the value is absent you are holding the sentinel, not an
element. Two: writing for (auto x : container) without the & and silently
copying every element — correct, but wasteful. Three: reaching for an exotic
container before vector — vector's contiguous storage makes it the right
default far more often than beginners expect.

**[RECAP — ~5:05]**
std::vector is the default container: dynamic, contiguous, cache-friendly.
map and set are sorted and unique; the unordered versions trade ordering for
fast lookup; std::string manages its own memory. Iterators generalise
pointers — begin() to end(), and end() is the past-the-end sentinel that
std::find returns when the value is absent, so always check. Traverse with
for (const auto& x : container), and reach for <algorithm> — sort, find,
count, transform — to say what you mean instead of writing raw loops.

## On-screen visuals

- HOOK: the STL trio — containers, iterators, algorithms — as three
  interlocking gears.
- WHY IT MATTERS: a raw array with a red overflow warning beside a vector
  with a green shield.
- SECTION — Containers: vector first, the rest on demand: vector as
  neighbouring houses in contiguous memory; map as sorted key→value pairs;
  unordered_map as labelled drawers; std::string vs a manual C-string with
  its null terminator.
- SECTION — Iterators and algorithms: an iterator walking begin() to end();
  std::find returning the end() sentinel with a "check this!" flag; the
  range-based for loop with & and const annotated; sort/find/count/transform
  as named operations over a range.
- COMMON MISTAKES: three trap cards — unchecked find result, a copying
  range loop missing &, an exotic container chosen over vector.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
