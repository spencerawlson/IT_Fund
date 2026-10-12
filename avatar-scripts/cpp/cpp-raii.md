# C++ RAII & Smart Pointers: Ownership You Can See in the Type — Avatar Tutor Script

**Lesson ID:** cpp-raii
**Track:** C++ Programming
**Estimated runtime:** ~5 minutes (~671 words)

## Spoken script

**[HOOK — 0:00]**
What if forgetting to clean up were impossible? Not unlikely — impossible.
Not a matter of discipline, but of design, so that the correct behaviour is
the default behaviour. That is RAII, the single most important idiom in C++,
and it changes how you think about every resource you will ever manage.

**[WHY IT MATTERS — ~0:25]**
Manual cleanup fails. Every new that needs a delete, every file that needs a
close, is a promise your future self must remember on every code path —
including the ones where an exception is flying. RAII ties a resource's
lifetime to an object's scope, so the destructor releases it automatically,
on every path, even when exceptions fly. Once you internalise this, raw
new and delete start to look like what they are: a last resort.

**[SECTION — Ownership, expressed in types — ~0:50]**
The idea is disarmingly simple: acquire the resource in the constructor,
release it in the destructor. Because destructors run automatically when an
object leaves scope — including during stack unwinding when an exception
propagates — resources are released on every path, with no manual cleanup to
forget. Picture a self-closing door: it shuts behind you even in a fire
drill. This is why RAII beats manual new and delete so completely: the
correct behaviour is the default behaviour.

std::unique_ptr expresses exclusive ownership of a heap object. It cannot be
copied, only moved, and it frees the object when it dies. Think of it as a
key with exactly one holder — ownership is unambiguous. std::shared_ptr
expresses shared ownership through reference counting: copying increments
the count, destruction decrements it, and the object is freed when the last
owner goes away. Roommates splitting the rent: the last one out turns off
the lights. But two shared_ptrs pointing at each other would never release —
which is why std::weak_ptr exists. It observes a shared_ptr without owning,
breaking the cycle.

Always prefer std::make_unique<T>(...) over raw new: it is exception-safe —
no leak if construction throws — and you never write the type twice. And
after auto p2 = std::move(p1);, p1 is left empty. Ownership transferred, not
duplicated. Notice what this buys you beyond memory: files that always
close, locks that always release, handles that always shut. RAII is a
universal pattern — memory management is just its most famous application.

**[SECTION — Move semantics and the rules — ~2:50]**
Move semantics transfer resources instead of copying them. std::move casts to
an rvalue so the move constructor — not the copy constructor — is chosen.
Moving a vector hands over its buffer pointer rather than duplicating every
element: the difference between O(1) and O(n). It is the difference between
handing over the deed to a house and rebuilding the house brick by brick.

The Rule of Five says: if you define any of the destructor, copy
constructor, copy assignment, move constructor, or move assignment, consider
all five. Managing a resource usually means handling them as a set — define
one and the compiler's defaults for the others may silently do the wrong
thing.

But the better rule is the Rule of Zero: design classes so you need none of
them, letting members like smart pointers and vectors manage resources for
you. The safest special member function is the one you never write.

**[COMMON MISTAKES — ~4:45]**
Three traps. One: trying to copy a unique_ptr — it is movable, not copyable,
and the compiler will stop you. That is the type system doing its job. Two:
two shared_ptrs pointing at each other with no weak_ptr to break the cycle —
neither ever reaches zero owners, and the memory leaks. Three: writing raw
new when make_unique would do — you lose exception safety for nothing.

**[RECAP — ~5:10]**
RAII ties resource lifetime to object scope: the destructor releases the
resource automatically, even during exception unwinding. unique_ptr is
exclusive ownership — movable, never copied. shared_ptr is shared ownership
by reference counting, freed at zero owners. weak_ptr observes without
owning and breaks cycles. Prefer make_unique over raw new, remember that
std::move transfers ownership and empties the source, and aim for the Rule
of Zero: let your members manage resources so you define no special member
functions at all.

## On-screen visuals

- HOOK: a door closing itself behind an exiting object — cleanup that cannot
  be forgotten.
- WHY IT MATTERS: two code paths side by side — manual delete missed on the
  exception path vs RAII releasing on every path.
- SECTION — Ownership, expressed in types: constructor-acquires /
  destructor-releases lifecycle diagram; unique_ptr as a single key,
  shared_ptr as a reference counter reaching zero, weak_ptr breaking a cycle;
  make_unique vs raw new.
- SECTION — Move semantics and the rules: a buffer pointer being handed over
  (O(1)) vs elements being duplicated one by one (O(n)); the five special
  members as a set; the Rule of Zero with smart-pointer members.
- COMMON MISTAKES: three trap cards — copying a unique_ptr, a shared_ptr
  cycle, raw new instead of make_unique.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
