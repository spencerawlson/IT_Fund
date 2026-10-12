# Cloud Concepts: What "Cloud" Actually Means — Avatar Tutor Script

**Lesson ID:** cl-concepts
**Track:** Cloud Computing & Security
**Estimated runtime:** ~5 minutes (~770 words)

## Spoken script

**[HOOK — 0:00]**
Cloud computing changed how organisations buy and run IT: capacity on demand,
paid for as it is used, managed through APIs. But it also redrew the line of
who is responsible for what — and misunderstanding that split is behind many
cloud breaches.

**[WHY IT MATTERS — ~0:25]**
Every cloud exam question and every cloud breach comes back to these ideas:
the service models, the shared responsibility split, regions and zones. This
is the vocabulary the entire track assumes. Learn it cold now.

**[SECTION — What makes something "cloud" — ~0:50]**
NIST SP 800-145 defines five essential characteristics: on-demand
self-service, broad network access, resource pooling, rapid elasticity, and
measured service. The practical test is simple: if you cannot provision it
yourself in minutes and pay by use, it is hosting, not cloud.

Two words people blur: scalability and elasticity. Scalability is the ability
to grow. Elasticity is doing it automatically, in both directions — up when
demand spikes, down when it fades, without human intervention. Financially, cloud shifts spending from CapEx — buying hardware up front — to OpEx, pay as you go.

**[SECTION — Service and deployment models — ~1:50]**
The service models are a sliding scale of who manages what: the further up
the stack you rent, the less you operate — and the less you control. With
IaaS, the provider runs the hardware, virtualisation, and facilities; you
manage the operating system and up — including patching the OS yourself.
PaaS adds the OS, runtime, and middleware to the
provider's side; you deploy code and data, and you never touch the OS. FaaS
goes a step further into serverless: you deploy single functions — Lambda,
Azure Functions — billed per invocation, but mind cold starts and execution
timeouts. With SaaS, the provider runs the whole application; you configure
it and own your data, users, and access. Least operational burden — but a
misconfigured sharing setting is still your breach, not theirs.

Deployment is a separate question: where the cloud physically lives and who
it is shared with. Public cloud is compute sold to anyone on shared
infrastructure — cheapest, most elastic, strangers isolated by the provider's
controls. Private cloud is infrastructure for one organisation, on-premises
or hosted — more control, but you carry the capacity planning public cloud
was meant to remove. Community cloud is shared by organisations with common
concerns — hospitals, government agencies. And hybrid — on-premises working
with public cloud, bursting to public for peaks while regulated data stays
home — is what most real enterprises actually run.

**[SECTION — Shared responsibility — ~3:10]**
The shared responsibility model splits security in two: the provider secures
the cloud itself — data centres, hardware, the virtualisation layer — and
the customer secures what they put in the cloud. The split shifts with the
model: in IaaS you patch the OS; in SaaS you do not.

But some responsibilities never move. In every model, the customer owns their
data, their users, and access configuration. That is the exam's favourite
trap and the industry's most repeated breach: a misconfigured public storage
bucket is always the customer's problem, no matter how far up the stack they
rented.

**[SECTION — Where cloud runs — ~3:55]**
A region is a geographic area. An availability zone is one or more isolated
data centres within a region, with independent power and networking. The
design rule follows directly: spread workloads across AZs for high
availability, and across regions for disaster recovery. Edge locations sit
beyond both — caching content close to users as part of a CDN, like
CloudFront, Azure Front Door, or Cloud CDN.

One strategic concept to carry: vendor lock-in, dependence on one provider's
proprietary services. Reduce it with open standards, containers, and portable
infrastructure as code — and accept it deliberately where a managed service
is worth the tradeoff.

**[COMMON MISTAKES — ~4:45]**
Three traps. One: calling anything hosted "cloud." Without the five NIST
characteristics — especially self-service and measured service — it is just
hosting. Two: confusing scalability with elasticity. Scalability is the
ability to grow; elasticity is automatic scaling in both directions. Three:
assuming SaaS means the provider owns security. You always own your data,
your users, and access configuration.

**[RECAP — ~5:05]**
Cloud means the five NIST characteristics, with elasticity as automatic
scaling both ways and CapEx giving way to OpEx. The service models slide
from IaaS — you patch the OS — through PaaS and FaaS to SaaS, where you own
only data, users, and access. Deployment is separate: public, private,
community, and the hybrid most enterprises run. The provider secures the
cloud; you secure what is in it — and your data and access never leave your
side of the line. Regions hold availability zones, edge locations bring
content close, and lock-in is managed, not feared. That is what "cloud"
actually means.

## On-screen visuals

- HOOK: on-premises server room morphing into on-demand cloud capacity;
 responsibility line redrawing between provider and customer.
- What makes something "cloud": the five NIST characteristics as icons;
 elasticity animation scaling up and down automatically; CapEx → OpEx
 cost shift.
- Service models: sliding scale — IaaS, PaaS, FaaS, SaaS — with the
 provider/customer management boundary moving up the stack; exam callouts
 ("you patch the OS", "billed per invocation").
- Deployment models: four cards — public (shared building), private
 (single tenant), community (sector-shared), hybrid (burst to public,
 data stays home).
- Shared responsibility: provider side vs customer side split diagram;
 "never moves" box around data, users, access; misconfigured bucket
 warning.
- Where cloud runs: region containing multiple AZs; edge locations on a
 world map feeding a CDN; lock-in scale balancing portability vs managed
 value.
- RECAP: the cheat-sheet terms as a clean summary card.
