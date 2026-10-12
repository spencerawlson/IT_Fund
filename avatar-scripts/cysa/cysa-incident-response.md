# Incident Response & Forensics: The Lifecycle That Saves You — Avatar Tutor Script

**Lesson ID:** cysa-incident-response
**Track:** CompTIA CySA+ (CS0-003)
**Estimated runtime:** ~5 minutes (~715 words)

## Spoken script

**[HOOK — 0:00]**
Every organization will have incidents. The ones that survive them well are
not the ones with the best tools. They are the ones that decided — before the
crisis — who does what, in what order, with whose authority. Incident response
is that decision, written down and rehearsed.

**[WHY IT MATTERS — ~0:25]**
Incidents are where analyst careers are made or broken. The exam tests the lifecycle phases in order, the
containment calls under pressure, and the legal tripwires. In the job, the plan you wrote in peacetime carries you at 3 AM.

**[SECTION — The NIST SP 800-61 lifecycle — ~0:50]**
NIST SP 800-61 defines four phases: Preparation; Detection and Analysis;
Containment, Eradication, and Recovery; and Post-Incident Activity. They form a cycle, not a line — lessons learned feed back into preparation.

Preparation is everything built before the incident: the IR team, tooling, playbooks, communication plans — plus the forgotten one: an IR retainer, a pre-contracted response firm for surge support, signed before you need it. Negotiating
contracts during a breach is how you lose days you do not have.

Detection and Analysis is the SOC's handoff: confirming the incident, determining scope.
Contain too early and you tip off the attacker; contain too late and the damage spreads. A war room keeps analysis and decisions in one place.

**[SECTION — Containment, eradication, recovery — ~1:55]**
When ransomware is confirmed, contain first: isolate the host immediately — every minute of delay is lateral movement. Short-term containment isolates fast: pull the cable, disable the switch port, revoke cloud sessions and keys.
Long-term containment keeps the business running — segmented VLANs, hardened temporary controls.

Eradication removes all attacker presence: the malware, the backdoors, the
persistence mechanisms, the compromised credentials. Partial eradication is how incidents recur — a surviving scheduled task or stolen service account re-compromises the "recovered" environment within days.
Eradication must be verified, not assumed.

Recovery restores systems from known-good backups and hardened images — never
from the compromised state, never before eradication is confirmed. Systems return in priority order, with enhanced monitoring for recurrence.
One tension, resolved in advance: forensics wants systems frozen, the business wants them back.

**[SECTION — Forensics: evidence that holds up — ~3:00]**
Digital forensics is the scientific collection of digital evidence — and evidence must survive scrutiny by management, regulators, potentially a court. A forensic image is a bit-for-bit
copy of the media; the original stays untouched, and all examination happens
on the copy. Write-blocking prevents any writes to the evidence media during imaging.

Chain of custody is the documented record of who handled evidence, when, and
how, from collection to presentation. A gap argues tampering; an unbroken chain makes evidence admissible. Skipping the paperwork destroys the evidence's value.

Collection follows the order of volatility; analysis follows the timeline;
both serve one goal: a defensible reconstruction of what happened. Avoid definitive attack attribution: focus on TTPs — what the attacker did and how. Attribution is an intelligence judgment most organizations cannot make.

**[SECTION — The legal and business layer — ~4:05]**
Legal counsel protects privilege, manages breach notification obligations, and guides evidence handling. When counsel directs the investigation, findings can be protected by attorney-client privilege — so involve legal early.

An incident is not automatically a breach. A breach is confirmed unauthorized
acquisition of data — a higher bar with regulatory consequences. Breach notification laws trigger on breaches: what happened, data types affected, steps taken, what individuals should do. Under
GDPR, supervisory authorities must be notified within 72 hours of becoming
aware of a qualifying breach. The clock starts at awareness.

Post-Incident Activity closes the loop: a blameless lessons-learned review with assigned action items and owners. Blameless is not optional. A
review that punishes honesty guarantees the next review hears nothing.

**[COMMON MISTAKES — ~4:55]**
Three traps. One: recovering before eradication is verified — restoring from
a compromised state replays the incident. Two: calling every incident a
breach. Notification triggers on confirmed unauthorized acquisition. Three:
attempting attribution. Report TTPs; leave the "who" to intelligence
agencies.

**[RECAP — ~5:15]**
NIST SP 800-61 — Preparation, Detection and Analysis, Containment Eradication and Recovery, Post-Incident Activity — a cycle, retainer signed in advance. Contain fast, eradicate completely and verify it, recover
from known-good backups in priority order. Forensics means bit-for-bit
images, write-blocking, unbroken chain of custody — order of volatility
respected, attribution avoided. Counsel protects privilege, the 72-hour GDPR
clock starts at awareness, and every incident ends in a blameless
lessons-learned review with owners. Decide it before the crisis. That is the
lifecycle.

## On-screen visuals

- HOOK: calm planning room vs 3 AM crisis — the plan written in peacetime
 carrying the response.
- Lifecycle: four-phase cycle diagram — Preparation → Detection and Analysis
 → Containment/Eradication/Recovery → Post-Incident Activity — feeding back;
 IR retainer contract highlighted in Preparation; war room layout.
- Containment/eradication/recovery: ransomware host isolated (cable pulled);
 short-term vs long-term containment split; eradication checklist with
 verification tick; recovery from known-good backup in priority order.
- Forensics: bit-for-bit imaging with write-blocker; chain-of-custody
 document trail; order-of-volatility stack; "TTPs, not attribution" callout.
- Legal layer: counsel directing the investigation under privilege; incident
 vs breach bar diagram; GDPR 72-hour clock starting at awareness;
 blameless review with action items and owners.
- RECAP: the cheat-sheet terms as a clean summary card.
