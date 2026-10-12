# Expressions & Functions: Making Your Configuration Compute — Avatar Tutor Script

**Lesson ID:** tf-expressions
**Track:** Terraform & Infrastructure as Code
**Estimated runtime:** ~5 minutes (~679 words)

## Spoken script

**[HOOK — 0:00]**
Terraform configurations are not static documents. They compute. One line can
pick an instance type based on the environment, transform a list of names into
security group rules, or render an entire startup script from a template. Once
you see the expression toolkit, your configurations stop being paperwork and
start being programs.

**[WHY IT MATTERS — 0:25]**
Every non-trivial configuration branches, transforms, and composes values.
Conditionals, for-expressions, and the built-in functions are the tools that
let one configuration behave differently per environment without forking into
copies. They are also everywhere in real-world code you will read — so fluency
here pays off immediately.

**[SECTION — Branching and transforming — 0:50]**
The ternary conditional — condition ? a : b — is Terraform's if statement, and
it belongs in exactly the places where a whole separate resource would be
overkill. var.prod ? "m5.large" : "t3.micro" picks an instance type by
environment in one line. Keep the branches simple, though: if the conditional
sprawls, the logic probably deserves a local or a module input instead. A
ternary is a fork in the road, not a whole detour.

For-expressions transform collections. [for s in var.names : upper(s)] takes a
list and returns a list with each element uppercased. Swap the square brackets
for braces and you build a map instead. They are the workhorse for turning one
shape of data into another — a list of subnet CIDRs into a map keyed by
availability zone, a set of ports into security group rules. If you have ever
wished you could run a little assembly line over a list, this is it.

The splat expression is the common case made terse.
aws_instance.web[*].id collects the id from every instance in the resource —
exactly as if you had written the for-expression longhand. When you see
star-brackets, read it as "each of these, give me that attribute." It is the
idiom for fanning one resource's outputs out to many consumers, and you will
see it constantly in the wild.

**[SECTION — Functions worth memorizing — 2:30]**
Terraform ships a standard library of functions, and a dozen of them do most
of the work. length() counts elements. lookup(map, key, default) reads a map
with a fallback — the polite way to handle a key that might be missing.
coalesce(a, b, c) returns the first argument that is neither null nor empty —
the "use this, else that" pattern. jsondecode() and jsonencode() cross the
boundary between JSON text and Terraform values. templatefile(path, vars)
renders a file template — user-data scripts, policy documents — with variables
injected.

Two functions deserve special attention for defensive coding. try() evaluates
its arguments in order and returns the first one that does not error, which
tames optional attributes that may not exist. can() is its boolean sibling,
handy for validation. Together they let configurations tolerate the ragged
edges of real provider data without collapsing — the difference between code
that survives contact with reality and code that does not.

Finally, string interpolation — embedding ${ ... } inside quotes — glues it
all together: "web-${var.env}". One piece of etiquette: where a bare reference
works, use it. name = var.prefix is cleaner than name = "${var.prefix}", and
modern Terraform will tell you so. Interpolation is for composition, not
decoration.

**[COMMON MISTAKES — 4:10]**
Three traps. One: wrapping everything in interpolation quotes out of habit.
Bare references are cleaner, and the tooling prefers them. Two: letting a
ternary sprawl into nested unreadable logic — if it no longer fits on one
line, promote it to a local. Three: forgetting the defensive pair. Real
provider data has ragged edges; try() and can() exist precisely for the
attributes that might not be there.

**[RECAP — 4:30]**
Configurations compute. The ternary — condition ? a : b — branches in one
line; keep it small. For-expressions transform collections, lists with square
brackets and maps with braces. The splat, star-brackets, reads as "each of
these, give me that attribute." The functions you will actually use: length,
lookup with a default, coalesce for fallbacks, jsondecode and jsonencode for
the JSON boundary, and templatefile for rendering scripts and policies.
Defensive coding belongs to try() and can(). And interpolation with ${ ... }
is for composing strings — but where a bare reference works, use the bare
reference. That is the whole toolkit.

## On-screen visuals

- HOOK: a static document morphing into a living program — one line
  branching per environment.
- Branching and transforming: a fork-in-the-road diagram for the ternary; an
  assembly line turning a list of names into uppercase values for the
  for-expression; the splat fanning one resource's ids out to many consumers.
- Functions worth memorizing: function cards — length, lookup, coalesce,
  jsondecode/jsonencode, templatefile — with one-line examples; try() and
  can() shown as a safety net under ragged provider data; bare reference vs
  quoted interpolation side by side.
- RECAP: the toolkit — ternary, for, splat, key functions, try/can,
  interpolation etiquette — as a summary strip.
