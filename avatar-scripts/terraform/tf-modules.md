# Modules: Reusable Building Blocks — Avatar Tutor Script

**Lesson ID:** tf-modules
**Track:** Terraform & Infrastructure as Code
**Estimated runtime:** ~5 minutes (~697 words)

## Spoken script

**[HOOK — 0:00]**
Somewhere in your future there is a team maintaining five copies of the same
VPC code — each slightly different, each slightly wrong in its own way. The
cure is older than Terraform itself: write it once, parameterise it, reuse it.
In Terraform, that unit of reuse is the module.

**[WHY IT MATTERS — 0:25]**
Every configuration you have ever written is already a module — the root
module. Named modules just let you use the pattern deliberately, turning
repeated infrastructure into a library your whole organisation can share. The
exam tests module mechanics directly, but the real prize is a codebase that
stays consistent as it grows.

**[SECTION — Calling and composing — 0:50]**
You call a module with a module block: module "vpc" { source = "./modules/vpc" }
plus whatever input arguments the module declares. Inside, the module reads
them as var.something; outside, you read its results as module.vpc.<output>.
The symmetry is the whole idea — modules take inputs and return outputs,
exactly like functions. The root module is just the outermost call.

The source argument is remarkably flexible: a local path for code you own, a
registry address like "terraform-aws-modules/vpc/aws" for community code, a
git URL for anything else. Whatever the source, pin the version. An unpinned
module is a standing invitation for someone else's release to redesign your
infrastructure overnight. Version constraints are the cheapest insurance in
the ecosystem — a one-line policy that says "change only when I say so."

Modules compose. A module can call other modules, forming a tree rooted at
your configuration. The discipline is to keep the tree shallow and each node
honest: a vpc module that builds a network, an app module that deploys a
service. Deep nesting turns the tree into a maze where nobody can find the
wiring. Flat composition keeps every layer readable — you can always see what
calls what.

**[SECTION — Designing modules worth reusing — 2:20]**
A good module boundary is a cohesive unit with a clear contract. The test is
simple: can you describe what it does in one sentence, and list its inputs on
one hand? "A VPC" passes. "All of production" does not — that is just the root
module wearing a costume. And one resource per module is usually too fine; the
overhead of the ceremony outweighs the reuse. Aim for the natural unit your
team actually thinks in.

Where does provider configuration belong? In the root module. Child modules
should declare what they need and receive providers explicitly when they must
— but the credentials, regions, and aliases live at the top, where a reviewer
can see the full blast radius in one place. Here is why: a child module
quietly configuring its own provider is a child module that will surprise you
in exactly the wrong environment. Provider config is a global decision; make
it visible globally.

The public Terraform Registry at registry.terraform.io is where the community's
modules live, with verified authorship marked. Treat registry modules like any
third-party dependency: read the source, pin the version, and prefer the
boring, widely-used ones. A module with ten thousand downloads and a clear
README has been debugged by strangers on your behalf. Boring is a feature.

**[COMMON MISTAKES — 3:50]**
Three traps. One: module boundaries that are too grand or too fine — "all of
prod" in one module, or one module per resource. Test every boundary with the
one-sentence, one-hand rule. Two: leaving the version unpinned and letting
someone else's release redesign your infrastructure overnight. Three: letting
child modules configure their own providers, hiding the credentials and
regions where no reviewer will see them.

**[RECAP — 4:10]**
A module is a reusable container of configuration files with a clear contract
— and your configuration is already the root module. Call one with a module
block: source plus inputs in, module.name.output out, exactly like a
function. Source can be a local path, a registry address, or a git URL, and
whatever you choose, pin the version. Compose modules into a shallow tree of
honest nodes. Draw boundaries at cohesive units — "a VPC," not "all of prod"
— and keep provider configuration in the root, where the blast radius is
visible. From the registry, prefer the boring, widely-used, pinned modules.
Write it once, parameterise it, reuse it — and the five copies of the VPC
never happen to you.

## On-screen visuals

- HOOK: five diverging copies of the same VPC code collapsing into one
  shared, parameterised module.
- Calling and composing: a module block drawn as a function call — inputs in
  as var.something, outputs out as module.vpc.<output>; source options as
  three cards (local path, registry address, git URL); a pinned version as a
  locked gate; modules composed into a shallow tree.
- Designing modules worth reusing: the boundary test — one sentence, one hand
  of inputs; provider config sitting visibly in the root module with the blast
  radius highlighted; the registry shown with verified marks and the "boring
  is a feature" note.
- RECAP: module, call, pin, compose, boundary, providers-in-root as a
  six-card summary.
