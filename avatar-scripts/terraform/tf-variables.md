# Variables, Outputs & Locals: Parameterising Your Configuration — Avatar Tutor Script

**Lesson ID:** tf-variables
**Track:** Terraform & Infrastructure as Code
**Estimated runtime:** ~5 minutes (~689 words)

## Spoken script

**[HOOK — 0:00]**
Imagine maintaining three copies of your infrastructure code — one for dev, one
for staging, one for production — and discovering that someone fixed a bug in
staging's copy six months ago and nobody ported it anywhere else. That is the
future hard-coded values give you. There is a better one, and it starts with
variables.

**[WHY IT MATTERS — 0:25]**
Hard-coded values make configurations brittle; every environment becomes a
fork that drifts. Variables, locals, and outputs are how one configuration
serves dev, staging, and production — the same code, parameterised. This is
also where one of the exam's favourite security distinctions lives: what
"sensitive" actually protects, and what it does not.

**[SECTION — Inputs: variables and where values come from — 0:50]**
An input variable is declared with a variable block — a name, and optionally a
type, a default, and a description. Inside the configuration you read it as
var.region. Think of the declaration as a contract: this configuration needs a
region, and here is what happens if you do not provide one.

Values arrive through a well-defined precedence, and it is worth learning the
ladder. An explicit -var flag wins. Then -var-file files. Then terraform.tfvars
and star-dot-auto-dot-tfvars, which load automatically. Then environment
variables prefixed TF_VAR_. And finally, if the variable has no default and
nothing supplied a value, Terraform prompts interactively — or fails outright
in CI, where there is nobody to ask. The layering is deliberate: committed
defaults for the ordinary, environment variables for secrets, flags for the
exceptional.

Types are your early-warning system. Declaring type = string — or a richer
shape like an object — means mistakes surface at validate time, with a clear
message, instead of at apply time against a real cloud account. The available
types — string, number, bool, list, set, map, object, tuple — cover everything
from a region name to a full subnet specification. Catch the typo where it is
cheap, not where it is expensive.

**[SECTION — Locals and outputs: the internal wiring — 2:30]**
Locals are named expressions computed once and reused: local.common_tags,
referenced as local.common_tags wherever needed. They are not inputs — nobody
passes them in. They are how you stop repeating yourself inside a
configuration. A computed naming prefix, a merged tag map, a derived list: if
you type it twice, make it a local. That is the rule.

Outputs run in the opposite direction: values a configuration exposes after
apply. An output block publishes something — a load balancer's DNS name, a
database endpoint — visible via terraform output and, crucially, consumable by
parent modules. Think of outputs as the API of your infrastructure: they define
what callers are allowed to depend on, and everything else stays internal.
Deliberate outputs make deliberate boundaries.

Now the one thing everyone gets wrong. Marking a variable or output
sensitive = true redacts it from plan and apply output, which keeps secrets
out of CI logs and terminal scrollback. But understand precisely what it does
not do: it does not encrypt the value in state. State still holds it in
plaintext. Sensitive is a display control, not a security control — sunglasses,
not a safe. The real protection is an encrypted remote backend with tight
access, which we covered in the state lesson.

**[COMMON MISTAKES — 4:05]**
Three traps. One: assuming sensitive = true protects the secret everywhere.
It redacts the display only — the state file still holds the value in
plaintext, so protect the state. Two: hard-coding environment differences
instead of parameterising, which forks your configuration into copies that
drift. Three: forgetting the precedence ladder and wondering why a value is
wrong — check the -var flags first, then files, then TF_VAR_ environment
variables, then the default.

**[RECAP — 4:25]**
Declare inputs with variable blocks and read them as var.name. Values flow in
through a precedence ladder: -var flags, then -var-file, then terraform.tfvars
and auto files, then TF_VAR_ environment variables, then the default — and
interactive prompts fail loudly in CI. Declare types so mistakes surface at
validate time, where they are cheap. Locals are internal named expressions —
stop repeating yourself. Outputs are the configuration's API to the outside
world — deliberate boundaries. And sensitive = true redacts the display only;
the state file still holds secrets in plaintext, so the real security is an
encrypted remote backend. Parameterise everything that varies, and one
configuration serves every environment.

## On-screen visuals

- HOOK: three forked copies of infrastructure code drifting apart, replaced by
  one parameterised configuration feeding dev, staging, and production.
- Inputs: variables and where values come from: the precedence ladder drawn as
  stacked layers — -var, -var-file, terraform.tfvars, TF_VAR_, default,
  prompt — with a type declaration catching a mistake at validate time.
- Locals and outputs: the internal wiring: locals as a single definition
  feeding multiple references; outputs as a published API surface on the
  configuration boundary; sensitive = true shown redacting terminal output
  while the state file beneath still holds plaintext.
- RECAP: variable declaration, precedence ladder, locals, outputs, and the
  sensitive caveat as a five-card summary.
