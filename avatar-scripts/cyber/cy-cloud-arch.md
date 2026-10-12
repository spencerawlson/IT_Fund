# Cloud Models & Virtualization Security: The Shared Line and the Shared Kernel — Avatar Tutor Script

**Lesson ID:** cy-cloud-arch
**Track:** Cybersecurity Operations
**Estimated runtime:** ~5 minutes (~662 words)

## Spoken script

**[HOOK — 0:00]**
Cloud security starts with one uncomfortable truth: most cloud breaches are
the customer's misconfiguration, not the provider's failure. The provider
secures the cloud; you secure what you put in it. The line between those two
is called the shared responsibility model — and Security+ expects you to
draw it differently for every service model.

**[WHY IT MATTERS — 0:25]**
This lesson covers where that line sits for IaaS, PaaS, and SaaS, the
virtualisation and container realities underneath, and the zero-trust
direction modern architecture is heading. Plus the practical controls —
CSPM, golden images, secrets management — that keep cloud estates safe.

**[SECTION — Models and the shared line — 0:50]**
Three service models, one rule: the higher the stack, the less you control —
and the more the provider secures. IaaS rents raw infrastructure: you manage
the OS upward. PaaS rents a platform: you manage code and data. SaaS rents
finished software: you manage users, access, and data. Every step up the
stack hands the provider more of the security burden — but never all of it.

Deployment models: public clouds are multi-tenant and shared, private clouds
are dedicated to one organisation, hybrid mixes both, and community clouds
serve peer organisations with shared concerns.

Now the uncomfortable part. Misconfigurations — public storage buckets, open
security groups, exposed keys — cause more breaches than zero-days. Cloud
Security Posture Management continuously scans for them, because humans
cannot eyeball a thousand resources. And a warning about lift-and-shift
migrations: moving workloads unchanged is fast, but it carries your on-prem
weaknesses straight into the cloud. You moved the problem, not just the
server.

**[SECTION — Virtualization, containers, and zero trust — 2:10]**
Under the cloud sits virtualisation. Type 1 hypervisors run on bare metal;
Type 2 run atop a host OS. Two failure modes to know: VM sprawl — untracked,
unpatched virtual machines accumulating without owners — which is really an
asset-management failure; and VM escape, the guest breaking out to the
hypervisor. Rare, but catastrophic — one flaw compromises every tenant.

Containers share the host kernel — and that is the whole security story. A
kernel bug escapes every container on the host, so run containers as
non-root, keep images minimal, and scan them in CI. The boundary is thinner
than a VM's; treat it that way.

Harden with four practices. Golden images: approved, hardened templates you
build once and deploy everywhere. Immutable infrastructure: replace rather
than patch — never SSH in to fix a running box, ship a new one.
Infrastructure-as-code scanning: catch misconfigurations before deploy. And
runtime-injected secrets — never baked into images. A secret in an image is
a secret you published.

Where is it all heading? Zero trust — "never trust, always verify" —
replaces flat VPN-era networking with per-request, identity-aware access.
Its network expressions are microsegmentation and service meshes: mutual TLS
between services, so every hop proves itself.

**[COMMON MISTAKES — 4:00]**
Three traps. One: "the provider secures everything in SaaS." No — you still
own users, access, and data, and misconfigured sharing settings are your
breach. Two: treating containers like lightweight VMs. They share the host
kernel — a kernel escape hits every container, so non-root and minimal
images are not optional. Three: baking secrets into images. Inject at
runtime from a vault; anything baked in ships to everyone who pulls the
image.

**[RECAP — 4:25]**
IaaS, PaaS, SaaS: you manage the OS up, code and data, or users and data —
the higher the stack, the more the provider secures. Public, private,
hybrid, community describe who shares the cloud. Misconfiguration beats
zero-days as the breach cause — run CSPM continuously. Type 1 hypervisors
sit on bare metal, Type 2 on a host OS; fight VM sprawl and fear VM escape.
Containers share the kernel: non-root, minimal images, CI scanning. Harden
with golden images, immutable infrastructure, IaC scanning, and runtime
secrets. And the direction of travel is zero trust — never trust, always
verify — expressed through microsegmentation and mutual-TLS service meshes.

## On-screen visuals

- HOOK: a cloud split by a line — "provider secures" below, "you secure"
  above — with a misconfigured bucket on the customer's side.
- Models: IaaS/PaaS/SaaS stack with the responsibility line moving up each
  tier; deployment model four-panel; CSPM scanner flagging a public bucket.
- Virtualisation: Type 1 vs Type 2 hypervisor diagrams; VM sprawl graveyard
  of untracked VMs; VM escape arrow breaking the hypervisor boundary;
  containers sharing one kernel with the escape blast radius highlighted.
- Hardening: golden image stamp; immutable replace-not-patch flow; secrets
  injected at runtime vs baked into an image (crossed out); zero-trust
  per-request verification with mutual TLS between services.
- RECAP: the cheat-sheet table as a summary card.
