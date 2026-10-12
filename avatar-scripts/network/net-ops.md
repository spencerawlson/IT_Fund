# Network Operations & Resilience: Monitoring, HA and Recovery — Avatar Tutor Script

**Lesson ID:** net-ops
**Track:** Network+
**Estimated runtime:** ~6 minutes (~793 words)

## Spoken script

**[HOOK — 0:00]**
A network that works today still has to be watched, documented, changed safely
and recovered when something fails. Operations is where most real-world outages
are either prevented or caused.

**[WHY IT MATTERS — ~0:15]**
Operations is what keeps a working network working. This lesson covers
monitoring — SNMPv3, NetFlow and baselines — high availability, disaster
recovery targets and sites, reliability metrics, power, change management,
SD-WAN and infrastructure as code.

**[SECTION — Monitoring — ~0:45]**
You cannot manage what you cannot see. SNMP polls devices for counters such as
interface traffic, errors and CPU. But mind the version: SNMP versions 1 and 2c
authenticate with cleartext community strings — anyone sniffing the wire reads
them. SNMPv3 adds authentication and encryption, so use it.

NetFlow — and its cousins IPFIX and sFlow — records traffic metadata: who
talked to whom, on which ports, and how much. Ideal for capacity planning and
for spotting data exfiltration.

And the most underrated monitoring tool: the baseline. A baseline is a record
of normal performance. Without knowing what normal looks like, you cannot
recognise an anomaly — and you cannot prove an upgrade actually improved
anything. Baseline first, alert second.

**[SECTION — High availability and power — ~2:05]**
High availability is about surviving failure. In an active-active pair, both
nodes serve traffic; in active-passive, one stands by until the other fails.
Active-active sounds strictly better, but it needs capacity planning: a single
surviving node must carry the full load when its partner dies. Size for the
worst day, not the average day.

Two metrics describe reliability. MTBF — mean time between failures —
describes how reliable a component is. MTTR — mean time to repair — describes
how quickly you recover. You want the first high and the second low.

And do not forget the power under it all. A UPS provides short-term battery
power and clean power — bridging the gap until a generator takes over for long
outages. The UPS buys minutes; the generator buys days. They are a pair, not
alternatives.

**[SECTION — Disaster recovery targets and sites — ~3:20]**
Disaster recovery is measured in two targets. RPO — recovery point objective —
is the maximum acceptable data loss, measured in time. An RPO of one hour means
backing up or replicating at least hourly. Lose more than an hour of data, and
you have missed your target.

RTO — recovery time objective — is the maximum acceptable time to restore
service. And the RTO drives the recovery site you pay for. A hot site is fully
equipped with current data and can take over almost immediately. A warm site
has hardware but not current data — you will spend hours restoring. A cold site
offers only space and power, so it is the cheapest and the slowest. Hot, warm,
cold: pick the one whose recovery time fits your RTO, and whose price fits
your budget.

**[SECTION — Change, automation and SD-WAN — ~4:25]**
Most outages follow a change. That is why configuration and change management
control and document changes: review, schedule, test, and always have a
rollback plan. "Always have a rollback plan" is the line the exam is checking
for — and the line production will thank you for.

Infrastructure as code takes this further: network configuration defined in
version-controlled files, deployed with tools such as Ansible or Terraform
through pipelines. Every change becomes repeatable and reviewable — the same
discipline developers apply to software, applied to the network.

And SD-WAN: a software-defined WAN that steers traffic across broadband, LTE
and MPLS links by policy and live link quality, managed centrally. Instead of
one expensive MPLS circuit deciding everything, policy and measurements pick the
best link moment by moment.

**[COMMON MISTAKES — ~5:15]**
Three traps. One: RPO is about data loss measured in time; RTO is about
service restoration time. "How much data can we lose" is RPO; "how long can we
be down" is RTO. Two: a warm site has hardware but no current data — do not
confuse it with a hot site. Three: the UPS does not replace the generator. It
bridges the gap until the generator takes over.

**[RECAP — ~5:35]**
Monitor with SNMPv3 — never cleartext v1/v2c — and NetFlow; keep a baseline so anomalies are visible.
Active-active serves on both nodes, active-passive keeps one in reserve — size
the survivor for the full load. MTBF measures reliability, MTTR measures
recovery. The UPS bridges the gap; the generator handles the long outage. RPO
caps data loss, RTO caps downtime; hot sites are ready now, warm sites have
hardware, cold sites have space and power. Changes get reviewed, scheduled,
tested and rolled back — and infrastructure as code plus SD-WAN bring
automation and policy-driven links to operations.

## On-screen visuals

- HOOK: a dashboard timeline — one outage prevented by monitoring, one caused
  by an unreviewed change.
- Monitoring SECTION: SNMP version comparison card — cleartext community
  strings on v1/v2c versus v3's authentication and encryption — plus a NetFlow
  "who, where, how much" flow map and a baseline-versus-anomaly graph.
- High availability and power SECTION: active-active versus active-passive
  pair diagram, MTBF/MTTR definitions, and the UPS-to-generator handoff
  timeline.
- Disaster recovery targets and sites SECTION: the RPO/RTO twin-target diagram
  and the hot/warm/cold site comparison.
- Change, automation and SD-WAN SECTION: the change-management checklist —
  review, schedule, test, rollback — and the SD-WAN policy-steered multi-link
  diagram.
- COMMON MISTAKES: RPO-versus-RTO and warm-versus-hot callouts.
- RECAP: the cheat-sheet rows as a clean summary card.
