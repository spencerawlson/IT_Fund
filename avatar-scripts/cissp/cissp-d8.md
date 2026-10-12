# Domain 8: Software Development Security (10%): Bugs Are Written, Not Installed — Avatar Tutor Script

**Lesson ID:** cissp-d8
**Track:** CISSP Domains
**Estimated runtime:** ~5 minutes (~761 words)

## Spoken script

**[HOOK — 0:00]**
Most vulnerabilities are written, not installed. They're born in
requirements documents and design meetings, long before any code reaches
production — and the cheapest place to kill them is where they were born.
Domain 8 is software development security: building it right instead of
patching it later.

**[WHY IT MATTERS — ~0:25]**
Software runs everything the other seven domains protect. A perfect firewall
can't save an application that trusts user input, and a perfect backup can't
save data the application leaked by design. The exam treats secure
development as economics: find the flaw early or pay for it late.

**[SECTION — Security in the SDLC — ~0:50]**
Integrate security from the very start — in requirements and design. Flaws
fixed later cost far more. That's "shift left": slide security earlier in
the lifecycle, where fixes are cheap. Proofread the recipe before baking,
not after the cake is served.

DevSecOps builds automated security into DevOps pipelines. SAST, software
composition analysis — SCA — DAST, infrastructure-as-code scanning and
secrets scanning run in CI/CD, every commit, every build. The pipeline
becomes a security gate, not just a delivery mechanism.

SCA identifies third-party components and their known vulnerabilities,
producing or consuming SBOMs. Your application is mostly other people's
code; SCA is the inventory of whose code and which flaws came with it.

AI coding assistants add a new risk: insecure or licence-problematic code
being accepted without review. The assistant is fast and confident and
occasionally wrong. So keep human review, SAST and SCA on generated code
too. The tool changes; the discipline doesn't.

**[SECTION — Measuring maturity — ~2:20]**
OWASP SAMM — open — and BSIMM — descriptive, based on what real firms do —
measure software security programme maturity. One is a blueprint you can
adopt; the other is a mirror held up to the industry. CMMI rates process
maturity from 1 to 5. Highest first: 5, Optimising — continuous, data-driven
process improvement. 4, Quantitatively Managed — processes measured and
controlled with metrics. 3, Defined — standard processes documented across
the organisation. 2, Managed — processes planned and tracked per project.
1, Initial — ad hoc and unpredictable; success depends on heroics. The exam
loves asking you to place a description on this ladder, so learn the rungs.

**[SECTION — Concepts the exam loves — ~3:35]**
Polymorphism is the same interface with different behaviour — an
object-oriented concept. Polyinstantiation stores multiple versions of the
same data at different classification levels, preventing inference attacks
in mandatory access control databases. Same interface, different behaviour
versus same data, different versions per clearance. The exam pairs them
deliberately — don't let the similar names fool you. Polyinstantiation is
like showing different passengers different in-flight maps: everyone sees a
map, nobody sees the full route.

An ACID database transaction guarantees Atomicity, Consistency, Isolation
and Durability, preserving transaction integrity. Either the whole
transaction happens or none of it does — no half-written transfers.

A sandbox is a restricted environment that limits what code can do. Browsers
sandbox tabs; mobile apps are sandboxed from each other. The code can play,
but only inside the playpen.

Broken object-level authorisation — BOLA — is number one in the OWASP API
Security Top 10: check that the caller owns every object it requests. The
API knew who you were; it just never asked whether the record was yours.

**[SECTION — Acquired software — ~4:45]**
Assess third-party software against your security requirements, the vendor's
development practices and contractual obligations. For SaaS, review SOC 2
reports and data-handling terms. You didn't write it, but you own the risk
of running it.

Code escrow has a third party hold the source code in case the vendor fails,
protecting buyers of critical commercial software. It's the spare key with
a trusted neighbour: you hope you never need it, but the business depends
on it existing.

**[COMMON MISTAKES — ~5:20]**
Three traps. One: polymorphism versus polyinstantiation. Interface
behaviour versus per-clearance data versions. Two: the CMMI order. Initial,
Managed, Defined, Quantitatively Managed, Optimising — one to five, heroics
to excellence. Three: treating acquired software as someone else's problem.
You assess it, you contract it, you own its risk.

**[RECAP — ~5:45]**
Shift left: security starts in requirements and design, where fixes are
cheap. DevSecOps automates SAST, SCA, DAST, IaC and secrets scanning into
CI/CD. SCA inventories third-party components and their vulnerabilities via
SBOMs — and AI-generated code gets human review, SAST and SCA too. SAMM is
the open maturity model, BSIMM the descriptive one; CMMI climbs from Initial
heroics to Optimising excellence. Polymorphism is shared interfaces,
polyinstantiation is per-clearance data versions against inference. ACID
keeps transactions whole; sandboxes fence code in; BOLA means checking
object ownership. Assess acquired software against requirements, practices
and contracts — and escrow the source of anything critical.

## On-screen visuals

- HOOK: a bug's price tag growing along the SDLC timeline — cheap at
  design, expensive in production.
- Security in the SDLC: the shift-left arrow on the lifecycle; the
  DevSecOps pipeline stage-by-stage with SAST, SCA, DAST, IaC and secrets
  gates; SCA component inventory; AI-assistant code under human review.
- Measuring maturity: SAMM vs BSIMM comparison card; CMMI 1–5 ladder with
  each rung's description.
- Concepts the exam loves: polymorphism vs polyinstantiation split card;
  ACID four-letter breakdown; sandbox playpen diagram; BOLA ownership-check
  flow.
- Acquired software: vendor assessment checklist; code escrow three-party
  diagram.
- RECAP: the cheat-sheet rows as a clean summary card.
