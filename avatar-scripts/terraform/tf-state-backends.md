# State & Backends: Terraform's Memory — Avatar Tutor Script

**Lesson ID:** tf-state-backends
**Track:** Terraform & Infrastructure as Code
**Estimated runtime:** ~6 minutes (~779 words)

## Spoken script

**[HOOK — 0:00]**
Every plan Terraform shows you, every apply it executes, every destroy it
performs — all of it is a conversation with one file. Corrupt that file, lose
that file, or let two people write to it at once, and the conversation turns
into an argument. This lesson is about the file Terraform cannot live without.

**[WHY IT MATTERS — 0:25]**
State is Terraform's memory: the mapping between your configuration and the
real infrastructure it manages. Misunderstand state and you will eventually
face a corrupted mapping, a leaked secret, or two applies clobbering each
other. Understand it, and Terraform's behaviour — plans, drift, imports —
stops being mysterious and starts being obvious.

**[SECTION — Why remote state, and why locked — 0:50]**
A state file on one engineer's laptop is a liability wearing a disguise. It
diverges the moment two people apply, it leaks secrets to anyone with the
disk, and it cannot be the single source of truth for a team. Remote state —
in S3, Terraform Cloud, or any supported backend — puts one authoritative copy
where every run can reach it, with encryption and access control the laptop
never had. One memory, shared by everyone, guarded properly.

But shared state introduces a new failure mode: two applies racing each
other, each reading the same state, each writing back its own version, one
silently clobbering the other. State locking prevents it. Before an operation
that writes state, Terraform takes a lock; anyone else attempting the same
operation waits or fails fast — the S3 backend coordinates through DynamoDB
or native S3 locking. A stuck lock after a crashed run is the one time you
will ever think about unlocking by hand — and even then, confirm no apply is
actually running first.

The backend block declares both halves of this arrangement: where state lives
and how operations coordinate. It is the rare piece of Terraform configuration
that cannot itself be parameterised — the backend must be known before
anything else runs, so it takes only literal values. Chicken before egg,
deliberately.

**[SECTION — Reading, repairing, and respecting state — 2:35]**
A handful of commands make state legible. terraform state list prints every
tracked resource address — a quick inventory of what Terraform believes it
owns. And when reality and belief diverge, that divergence has a name: drift.
Someone changed a security group in the console; a plan or refresh detects
the drift, and the next apply reconciles it. Drift is not corruption — it is
information, and Terraform is designed to absorb it.

Sometimes the mapping itself needs surgery, and for that there are scalpels,
not hammers. terraform state mv renames a resource's address in state — after
you refactor a module, say — so Terraform does not destroy and recreate a
perfectly good object just because its address changed. terraform state rm
removes an address from state without touching the real resource, for the day
you decide Terraform should stop managing something. And terraform import
brings an existing, hand-built resource under management: write the matching
configuration, import the ID into state, and from then on Terraform owns it.
Three scalpels, three distinct operations.

The one rule: never edit terraform.tfstate by hand. The file is a database
with invariants your editor cannot see; a stray comma or a well-meaning tweak
can corrupt the mapping in ways that surface hours later as mysterious
replacements. Use the state commands — they exist precisely so you never need
the editor.

Two corollaries follow. Never commit state to git: it holds secrets, shifting
IDs, and the full topology of your infrastructure — a prime target wearing a
version-control costume. And share values between configurations with
terraform_remote_state, the read-only data source that lets one stack consume
another's outputs. Borrow, don't annex.

**[COMMON MISTAKES — 4:35]**
Three traps. One: keeping state on a laptop and calling it fine — the moment
a second person applies, you have two memories and one lie. Two: hand-editing
the state file to "fix" something, which trades a small problem for a
corrupted mapping that surfaces hours later. Three: force-unlocking a stuck
lock without confirming no apply is running — you would be removing the guard
while the guarded operation is mid-flight.

**[RECAP — 4:55]**
State — terraform.tfstate — is the mapping between your configuration and real
infrastructure, and every plan, apply, and destroy is a conversation with it.
Keep it remote so the team shares one guarded source of truth. Lock it, so
concurrent applies cannot clobber each other — and never unlock by hand while
an apply might be running. Read it with terraform state list; name drift for
what it is and let apply reconcile it. Repair the mapping with the scalpels —
state mv to rename, state rm to stop managing, import to adopt hand-built
resources. Never edit the file by hand, never commit it to git, and share
between stacks with terraform_remote_state. Respect the memory, and Terraform
stays sane.

## On-screen visuals

- HOOK: a single file with plan, apply, and destroy all conversing with it —
  then two people writing to it at once and the argument beginning.
- Why remote state, and why locked: a laptop state file diverging and leaking
  versus one guarded remote copy; two applies racing, with a lock letting only
  one through; the backend block card noting "literals only".
- Reading, repairing, and respecting state: state list as an inventory
  printout; drift shown as the ledger noticing a mismatch, then reconciling;
  three scalpels labelled mv, rm, import with their distinct operations; a
  hand-editing attempt crossed out; state kept out of git.
- RECAP: remote, locked, readable, repairable, respected — five cards in a row.
