# Domain 2: Asset Security Deep Dive (10%): Lifecycle, Legal Holds and DLP — Avatar Tutor Script

**Lesson ID:** cissp-d2b
**Track:** CISSP Domains
**Estimated runtime:** ~6 minutes (~799 words)

## Spoken script

**[HOOK — 0:00]**
Data lives a whole life — it's created, stored, used, shared, archived and
finally destroyed. Most breaches don't happen in the database. They happen in
the awkward middle chapters: the share phase, the archive phase, the moment
nobody was watching.

**[WHY IT MATTERS — ~0:25]**
Protection that only covers the database is theatre. The exam tests whether
your protections follow the data everywhere it goes — across roles, across
retention schedules, across the network boundary and into the cloud. If you
can think in lifecycles instead of locations, Domain 2 scenarios get easy.

**[SECTION — The data lifecycle and its roles — ~0:50]**
Protection must follow the data through every phase of its lifecycle. Six
phases. Create: data is generated or captured — classify it here, at birth.
Store: committed to storage — encrypt it and control access. Use: viewed or
processed — enforce least privilege and log access. Share: made available to
others — apply DLP and secure transfer. Archive: moved to long-term storage
— follow retention rules. Destroy: permanently removed — sanitise or
crypto-shred. Think of it as the data's biography: protection belongs in
every chapter.

Three roles govern the data. The data owner is accountable and classifies it
— the owner decides. The data steward manages day-to-day quality and handling
according to the owner's policy — the steward oversees handling. The
custodian maintains the systems that store and process the data — the
custodian operates. The exam will hand you a scenario and ask who's
accountable; the answer is always the owner.

Handling requirements scale with classification: higher classifications need
marking, encryption and strict access control, while public data mainly needs
integrity. The rules must be written down, trained and enforced — or they
don't exist.

**[SECTION — Retention and legal holds — ~2:35]**
A retention period is set by legal and regulatory requirements plus business
need — whichever is longer — and the justification should be documented.
Over-retention inflates breach impact and e-discovery costs; under-retention
risks non-compliance.

A legal hold — or litigation hold — suspends normal destruction so relevant
data is preserved for litigation. Destroying data under a hold can be ruled
spoliation of evidence, and that's a legal disaster on top of the lawsuit.
Two things the exam loves: holds extend to backups and archives, not just
live data — a hold that misses the backups is a failed hold. And the schedule
is frozen, not deleted; the hold overrides retention, it doesn't cancel it.

**[SECTION — Data loss prevention — ~3:40]**
DLP watches data leaving, not data arriving — the bouncer checking bags on
the way out. Network DLP inspects data in motion at egress points: email, web
uploads, file transfers. Endpoint DLP controls USB drives, printing,
clipboard and local storage on devices, closing the sneakernet exfiltration
path. Cloud DLP, often delivered
through a CASB, scans uploads, sharing links and collaboration apps in SaaS.

On a policy violation, DLP can block, quarantine, encrypt or alert. And
here's the deployment wisdom the exam rewards: new deployments should start
in monitor and alert mode before enforcing blocks, so legitimate workflows
aren't broken on day one.

**[SECTION — Data in the cloud — ~4:35]**
The customer, not the provider, owns data in a SaaS application. Contracts
should state ownership, return and deletion terms explicitly. In IaaS the split is cleaner: the customer
owns the data and OS layers while the provider owns the hypervisor down. So
customer-managed keys — BYOK — storage encryption and private endpoints are
the customer's controls to apply.

Data sovereignty means data is subject to the laws of the country where it's
stored or processed — and that drives cloud region selection for regulated
data. Data residency is only about where data is stored. You can meet residency and
still fail sovereignty: the data can sit in the right country and still be
governed by the wrong laws.

Finally, data discovery and classification tools automatically scan data
stores to find and label sensitive data — PII, card numbers, the lot.
Because you can't apply handling rules to data you haven't found. Discovery
precedes enforcement.

**[COMMON MISTAKES — ~4:45]**
Three traps. One: confusing sovereignty with residency. Residency is where
it's stored; sovereignty is whose laws apply. Two: assuming the cloud
provider owns or protects your data for you. The customer owns the data —
full stop. Three: deploying DLP straight into block mode. Monitor and alert
first, or you'll break legitimate business on day one.

**[RECAP — ~5:05]**
Data's life runs create, store, use, share, archive, destroy — protect every
phase. The owner decides and is accountable, the steward oversees handling,
the custodian operates the systems. Retention follows legal requirements
plus business need, whichever is longer. A legal hold freezes destruction —
including backups — and breaking it is spoliation. DLP covers network,
endpoint and cloud, and starts in monitor mode. In the cloud the customer
owns the data; sovereignty is whose laws apply, residency is where it sits.
And you can't enforce rules on data you haven't discovered.

## On-screen visuals

- HOOK: the six-phase data lifecycle as a circular timeline with breach-risk
  hotspots on share and archive.
- The data lifecycle and its roles: lifecycle phases with per-phase controls;
  owner/steward/custodian decide-oversee-operate triptych.
- Retention and legal holds: retention schedule with the legal hold as a
  red freeze overlay extending to backups and archives.
- Data loss prevention: three-pane DLP — network egress, endpoint, cloud
  CASB — with block/quarantine/encrypt/alert action buttons.
- Data in the cloud: IaaS shared-responsibility stack showing customer vs
  provider layers; sovereignty vs residency comparison card.
- RECAP: the cheat-sheet rows as a clean summary card.
