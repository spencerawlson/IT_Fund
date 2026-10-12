# Go Errors & Error Handling: Values, Wrapping, and Why panic Is Not Error Handling — Avatar Tutor Script

**Lesson ID:** go-errors
**Track:** Go Programming
**Estimated runtime:** ~5 minutes (~662 words)

## Spoken script

**[HOOK — 0:00]**
Go has no exceptions. No try, no catch, no throw. When something fails, you
get a value back — and you must look at it. It is verbose, it is deliberate,
and it is the reason Go programs fail loudly instead of mysteriously.

**[WHY IT MATTERS — ~0:25]**
Most languages let failures hide behind invisible control flow: an
exception fired three calls deep, caught somewhere you didn't expect. Go
would rather make error handling visible than let failures hide. The
language makes ignoring an error a visible choice, not an accident. Verbose
by design — and once you've debugged a swallowed exception at 2 a.m., you
will appreciate the trade.

**[SECTION — Errors are values, not exceptions — ~0:50]**
The core pattern is three lines you will write ten thousand times: call,
check, handle. if err != nil { return err }. An error is anything
implementing the tiny error interface — a single method, Error() string —
created with errors.New("message") or formatted with fmt.Errorf. Because
errors are just values, they flow through the same channels as data:
returned, wrapped, logged, compared.

And because handling is explicit, ignoring one is a visible choice — _ =
f() announces the decision rather than hiding it. Think of it as a fire
alarm you must acknowledge versus one that texts you silently: Go insists
the alarm gets a response. Silent failures are what you get when a language
lets you forget, and Go refuses to let you forget quietly. The verbosity is
the feature: when you read Go code, every failure path is on the page in
front of you, not hidden in an exception table somewhere else.

**[SECTION — Wrapping and inspecting error chains — ~2:40]**
Real programs add context as errors travel upward, and Go's %w verb in
fmt.Errorf("open config: %w", err) wraps the underlying error so the chain
stays inspectable. Picture nested envelopes: each layer adds a note about
where it has been, and the original letter stays intact inside.

Two functions then do the interrogation. errors.Is(err, target) asks whether
anything in the chain matches a sentinel error — the right way to compare,
since direct equality breaks across wrapping. errors.As(err, &target) finds
the first error of a given type and assigns it for closer inspection.
Together they replace the fragile habit of string-matching error messages —
asking what an error means instead of what it happens to say.

**[SECTION — Panic is not error handling — ~4:00]**
Then there is panic — and the discipline around it is absolute. Panic is for
the truly exceptional and usually unrecoverable: violated invariants,
programmer bugs, impossible states. It is the fire alarm, not the toaster
setting: you pull it when the building's assumptions are broken, not when
breakfast is merely burnt.

Panic unwinds the stack, running deferred calls along the way, which makes
recover() — callable only inside a deferred function — the mechanism for
turning a panic back into a returned error at a package boundary. Ordinary,
foreseeable failures get returned as errors; panics are for when the
program's assumptions are broken. Reserve panic for the truly impossible —
the invariant that must hold, the branch that cannot happen — and return
errors for everything the world might actually do. Mixing the two up is the
fastest way to write un-idiomatic Go.

**[COMMON MISTAKES — ~4:55]**
Three traps. One: using panic for ordinary, foreseeable errors — return an
error value instead; panic is for broken assumptions. Two: comparing errors
with == across a wrap chain — wrapping breaks direct equality, so use
errors.Is. Three: silently ignoring a returned error — at minimum log it,
and if you truly mean to discard it, write _ = f() so the choice is
visible.

**[RECAP — ~5:15]**
Errors are values, returned conventionally last: call, check, handle — if
err != nil. The error interface is one method, Error() string; create errors
with errors.New and fmt.Errorf. Wrap with %w to keep the chain inspectable,
match sentinels with errors.Is, extract types with errors.As — never
string-match. panic is for unrecoverable states only, recover() works solely
inside deferred functions, and ordinary failures are returned, never thrown.
Go makes you look at every failure. That is the point.

## On-screen visuals

- HOOK: "no try/catch/throw" stamped over a Go program; an error value
  handed back visibly.
- WHY IT MATTERS: a hidden exception path vs Go's explicit if err != nil
  checks at every level.
- SECTION — Errors are values, not exceptions: the call-check-handle
  three-line pattern; the error interface as a single method; _ = f() as a
  visible, logged discard.
- SECTION — Wrapping and inspecting error chains: nested envelopes — %w
  adding context while the original stays intact; errors.Is matching
  through the chain; errors.As extracting by type.
- SECTION — Panic is not error handling: the fire-alarm analogy — panic
  for broken assumptions only; recover() inside a deferred function at a
  package boundary.
- COMMON MISTAKES: three trap cards — panic for ordinary errors, ==
  across a wrap chain, a silently ignored error.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
