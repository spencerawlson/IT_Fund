# Meta-Arguments & Lifecycle: count, for_each and Guardrails — Avatar Tutor Script

**Lesson ID:** tf-meta-lifecycle
**Track:** Terraform & Infrastructure as Code
**Estimated runtime:** ~6 minutes (~783 words)

## Spoken script

**[HOOK — 0:00]**
Copy-paste is the slowest form of infrastructure automation. Three identical
servers declared three times, twelve firewall rules written out longhand, one
replacement that causes an outage because nobody controlled the order. There
is a better way for every one of these — and it starts with the word "meta."

**[WHY IT MATTERS — 0:25]**
Most resources are declared once and exist once. Meta-arguments are how you
break that rule with intent: create many copies, control replacement
behaviour, generate repetitive blocks — all without copy-paste. The exam loves
the count-versus-for_each distinction and the lifecycle guardrails, and
production will love you for knowing them.

**[SECTION — Many from one: count and for_each — 0:50]**
The count meta-argument creates N copies of a resource, each addressable as
<resource>[0], <resource>[1], and so on, with count.index available inside.
Simple, and perfectly adequate when the copies are truly interchangeable —
three identical workers, say.

But count has a brittle heart. Remove the middle item from the list and
everything after it re-indexes — and Terraform reads that as destroy-and-
recreate churn across resources that never actually changed. Think of numbered
seats in a row: if the person in seat two leaves and everyone shuffles down,
the seating chart says every seat changed hands, even though the same people
are sitting there.

for_each exists to fix exactly that. It creates one instance per key in a map
or set, addressed by stable keys instead of positions: <resource>["api"],
<resource>["worker"]. Inside, each.key and each.value expose the current
entry. Remove "worker" from the map and only the worker is destroyed; the rest
keep their identities. Named seats, not numbered ones. Prefer for_each
whenever the instances have names — which, in production, is nearly always.

**[SECTION — Lifecycle: guardrails for the dangerous moments — 2:25]**
The lifecycle block governs the moments Terraform would otherwise handle
bluntly. create_before_destroy = true flips the replacement order: the new
resource is created before the old one dies, closing the gap that would
otherwise mean downtime. It is the difference between a rolling upgrade and an
outage wearing a plan's clothing. When a change forces replacement — remember
minus-slash-plus from the plan lesson — this guardrail decides whether anyone
notices.

prevent_destroy = true is the opposite instinct made declarative: Terraform
will error rather than destroy this resource, full stop. Put it on the things
that cannot come back — production databases, state buckets, the keys to the
kingdom. It does not make the resource immortal; nothing does. It makes
destroying it a conscious, deliberate act instead of an accident.

ignore_changes tells Terraform to stop reconciling specific attributes after
creation — tags that another system mutates, say, or a password that external
rotation handles. Use it surgically: ignored attributes are invisible to drift
detection, which is the point, but also the risk. Ignore the attribute, never
the resource.

**[SECTION — Dynamic blocks and the provisioner warning — 3:55]**
A dynamic block generates repeatable nested blocks from a collection — a dozen
ingress rules from a list of ports, for example — the way for_each generates
resources. It keeps configurations DRY precisely where copy-paste would
otherwise breed: inside the repeated stanzas that differ only in values. One
list in, many blocks out.

Provisioners deserve their reputation as the last resort, and the reason is
architectural. They are imperative commands that run only at create or destroy
time, and Terraform does not track their effects in state. A provisioner that
installs software leaves no record of having done so — the next plan cannot
see it, the next engineer cannot audit it. Prefer provider resources,
cloud-init user data, or a proper configuration tool — anything whose results
live in the world Terraform understands. When nothing else fits, the
terraform_data resource — successor to the older null_resource — at least
gives the workaround a clean, provider-free home.

**[COMMON MISTAKES — 5:00]**
Three traps. One: using count for named, long-lived things — the re-indexing
churn will bite you the first time the list changes shape. Reach for for_each.
Two: forgetting that replacement kills the old resource before the new one
lives — and discovering the gap during an outage instead of in the plan.
Three: treating provisioners as a first resort. They are invisible to state,
which means invisible to plans, audits, and the next engineer.

**[RECAP — 5:20]**
count makes N indexed copies — simple, but brittle when the list changes
shape. for_each makes one instance per key with stable identities — prefer it
for anything with a name. The lifecycle block is your guardrail kit:
create_before_destroy closes the replacement gap, prevent_destroy turns
accidents into deliberate acts, and ignore_changes tells Terraform to look
away from specific attributes — surgically. Dynamic blocks generate repetitive
nested stanzas from collections. And provisioners are the last resort:
imperative, untracked in state, invisible to the next plan — prefer
cloud-init, provider resources, or terraform_data when nothing else fits.
Meta-arguments are how you scale one declaration into many, with intent.

## On-screen visuals

- HOOK: three copy-pasted server blocks collapsing into one declaration with
  a meta-argument; twelve firewall rules written longhand collapsing into one
  list.
- Many from one: count and for_each: numbered seats shuffling when the middle
  item is removed (churn) versus named seats staying put; each.key/each.value
  labels on the stable-keyed instances.
- Lifecycle: guardrails for the dangerous moments: replacement shown as old
  dying before new lives, then flipped by create_before_destroy; a shield
  over a database for prevent_destroy; a spotlight deliberately looking away
  from one attribute for ignore_changes.
- Dynamic blocks and the provisioner warning: one list expanding into many
  ingress blocks; a provisioner shown running once and leaving no trace in
  state, flagged as last resort.
- RECAP: count, for_each, the three lifecycle guardrails, dynamic blocks, and
  the provisioner warning as a summary strip.
