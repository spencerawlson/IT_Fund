# The Core Workflow: init, plan and apply — Avatar Tutor Script

**Lesson ID:** tf-core-workflow
**Track:** Terraform & Infrastructure as Code
**Estimated runtime:** ~6 minutes (~800 words)

## Spoken script

**[HOOK — 0:00]**
Here is a nightmare scenario. You type one command and, seconds later, your
production database is gone — no warning, no review, no way to take it back.
The workflow you are about to learn exists to make that story impossible.
Three commands, one habit, and it never happens to you.

**[WHY IT MATTERS — 0:25]**
init, plan, apply is the rhythm of everyday Terraform work, and it is also the
safety net under everything you will build later. The exam loves to ask what
each command does — and what plan output means — but the real reason to master
this is simpler: this loop is what makes infrastructure changes reviewable
before they touch anything real.

**[SECTION — init, plan, apply: the three beats — 0:50]**
Every Terraform session opens with terraform init — setting up the workshop
before you start building. It downloads the provider plugins your
configuration declares, installs modules, and configures the backend where
state will live. Run it once when you start, and again whenever providers,
modules, or the backend change. A stale init is behind half of all confusing errors — if something looks
weird, re-run init first.

Then comes terraform plan, the dry run. Plan compares your desired
configuration against the current state and prints the difference: what would
be created, updated, or destroyed. Nothing touches the cloud. This is the
moment a human reviews the change, and it is the single most important habit
in Terraform: never apply what you have not read.

Finally, terraform apply executes the plan against real infrastructure. It
shows the plan once more and asks for confirmation, because applying is the
point of no return. In automation you can pass -auto-approve to skip the
prompt, which is exactly as dangerous as it sounds — fine in a pipeline that
already reviewed the plan, reckless anywhere else.

**[SECTION — Reading the plan — 2:20]**
Plan output is a small language of its own, and fluency pays. A plus sign
beside a resource means it will be created. A tilde means updated in place —
the resource survives, one or more arguments change. A minus means destroyed.
And minus-slash-plus means replaced: destroyed and recreated, because you
changed an argument the platform treats as immutable.

Replacement deserves your respect. It is the plan's way of telling you there
will be a gap — the old object dies before the new one lives. When that gap
means downtime, reach for create_before_destroy in the lifecycle block, or
reconsider the change. The plan is Terraform negotiating with you; read it
like a contract.

For extra safety, save the plan with terraform plan -out=planfile, and then run
terraform apply planfile. That apply executes exactly the plan you reviewed —
no drift between preview and execution, no surprises from a state that moved
while you were reading. What you reviewed is what happens. That is the whole
game.

**[SECTION — Hygiene: fmt, validate, destroy — 3:40]**
Two commands keep a codebase honest. terraform fmt rewrites your files into the
canonical style — consistent indentation, aligned equals signs — so diffs show
real changes instead of formatting noise. Run it before every commit, or
enforce terraform fmt -check in CI so unformatted code never merges.

terraform validate checks the configuration is syntactically valid and
internally consistent: references resolve, required arguments are present,
types line up. It talks to no provider and touches no infrastructure, which
makes it fast and perfect for CI. Remember the division of labour: validate
answers "is this well-formed?" Only plan can answer "is this wise?"

And when the environment has served its purpose, terraform destroy tears it
all down — think of it as an apply aimed at an empty desired state. It plans
first, asks first, and removes every tracked resource. Preview a destroy the
same way you preview anything else: terraform plan -destroy shows exactly what
would vanish.

**[COMMON MISTAKES — 4:40]**
Three traps. One: using -auto-approve by hand because the prompt is annoying.
The prompt is the seatbelt — in a pipeline with a reviewed plan, fine; on your
laptop, never. Two: reading the plan as if it were advisory. A minus-slash-plus
is a real replacement with real downtime; skim it and you will feel it. Three:
confusing validate with plan. Validate never looks at the cloud, so it cannot
catch a configuration that is perfectly formed and perfectly wrong.

**[RECAP — 5:00]**
Three beats, one habit. init prepares the working directory — providers,
modules, backend. plan shows you the future without touching it: plus means
create, tilde means update in place, minus means destroy, and minus-slash-plus
means replaced. apply makes it real, asking first, with -auto-approve reserved
for pipelines that already reviewed the plan. Save the plan with -out and apply
that exact file so review and execution cannot diverge. fmt and validate keep
your code clean and well-formed in CI, and destroy — previewed with plan
-destroy — tears everything down when you are done. Above all: never apply
what you have not read.

## On-screen visuals

- HOOK: a red "destroy" command typed without review, fading to the three
  calm commands — init, plan, apply — as the safe path.
- init, plan, apply: the three beats: workshop setup animation for init,
  a dry-run magnifying glass over the cloud for plan, and a confirmation
  prompt gate before apply; -auto-approve flagged with a warning badge.
- Reading the plan: plan symbols (+, ~, -, -/+) as colour-coded legend cards;
  a replacement shown as old object fading before the new one appears, with
  the "contract" metaphor.
- Hygiene: fmt, validate, destroy: before/after formatting diff, a fast
  "well-formed" check stamp for validate, and a preview listing everything
  plan -destroy would remove.
- RECAP: the three beats plus the hygiene trio as a six-card summary strip.
