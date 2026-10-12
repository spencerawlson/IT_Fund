# SOC Foundations: Tiers, Triage, SIEM and Metrics — Avatar Tutor Script

**Lesson ID:** cysa-soc-foundations
**Track:** CompTIA CySA+ (CS0-003)
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
Every firewall alert and every suspicious login lands in one room, where a
human decides — usually in minutes — noise, misconfiguration, or intruder. That room is the SOC, and the difference between a contained
event and a headline breach is often decided in its triage queue.

**[WHY IT MATTERS — ~0:25]**
CySA+ is written from the analyst's chair — this is your home turf. Everything later assumes this workflow — every hunt, response, and prioritization begins as an alert in this queue.

**[SECTION — How the SOC is organized — ~0:50]**
A SOC is layered into tiers because not every alert deserves the same depth
of attention Tier 1 analysts are the front line:
monitoring the queue, triaging, enriching tickets, escalating the genuinely malicious. Their job: filtering signal from noise, at volume, consistently.

Tier 2 goes deep on escalations: correlating logs, pulling packet captures, examining endpoint telemetry, determining scope.
Tier 3 is where threat hunting lives — hypothesis-driven searching for what evaded automation.
The escalation path runs Tier 1 to Tier 2 to Tier 3 to management, defined in the incident response plan.

The distinction that makes triage work: severity is not priority. Severity is
the technical impact of the event. Priority is the response order, folding in
business context — above all, asset criticality. A critical alert on a domain
controller outranks the identical alert on a print server. Triage without
asset context is guessing.

**[SECTION — Alerts, events, and the anatomy of triage — ~1:55]**
An event is any observable occurrence — a
login, a blocked connection, a file hash match. An incident is an event
confirmed as a policy or security violation, and only incidents trigger the
formal incident response process. Confuse the two and you waste IR resources or starve real incidents.

A true positive is an alert for a real
malicious event. A false positive flags benign activity. A false negative is the dangerous one: a real
attack with no alert at all. Alert fatigue — desensitization from false positives — is how true positives get missed; the cure is tuning, correlation, and automation.

A runbook is a step-by-step procedure
for one alert type: check this log, look up that hash, escalate if X. A
playbook is broader: a conditional response plan linking multiple runbooks,
tools, and decisions. Enrichment — automatically attaching asset owner, threat intel, and related alerts — lets an analyst decide in two minutes instead of twenty.

**[SECTION — The SIEM at the center — ~3:00]**
The SIEM is the SOC's nervous system. It collects logs from firewalls, IDS, endpoints, servers, identity, and cloud audit trails; normalizes them into a common schema; and correlates them into single incidents — one attack, one case, not fifty alerts.

Your firewall calls a source
address src_ip; your endpoint agent calls it srcAddr. Without normalization,
the analyst cannot ask "show me everything this IP touched" across both. Parser quality quietly determines the quality of every detection built on top.

It does not block traffic inline — that is
the intrusion prevention system's job. Its value sits entirely downstream of log quality, coverage, and tuning. A SIEM with poor telemetry is a very expensive
alert factory.

**[SECTION — Measuring the SOC — ~4:00]**
MTTD — mean time to detect — is the
average time from compromise to detection. MTTR — mean time to respond is detection to containment. Dwell time is how
long an attacker remains undetected — days to weeks on average, which is why hunting exists.

Baselines make these metrics meaningful: a profile of normal behavior —
login times, traffic volumes, process trees. Deviations trigger
investigation. Without a baseline, every anomaly is a coin flip. Continuous monitoring — ongoing collection and analysis — is the SOC's standing posture.

**[COMMON MISTAKES — ~4:50]**
Three traps. One: calling everything an incident. Only a confirmed violation
triggers the IR process. Two: confusing severity with priority.
Three: assuming the SIEM blocks attacks. It detects and correlates; blocking
inline is the IPS's job.

**[RECAP — ~5:10]**
The SOC is tiered — Tier 1 triages at volume, Tier 2 investigates deep, Tier
3 hunts — with escalation written into the IR plan. An event is anything
observable; an incident is a confirmed violation. Triage runs on runbooks and
playbooks, fed by enrichment, graded by severity versus priority. The SIEM
collects, normalizes, and correlates telemetry into single incidents — it
detects, it does not block. MTTD, MTTR, and dwell time against baselines prove the SOC, in continuous monitoring.

## On-screen visuals

- HOOK: SOC floor graphic — alert queue flowing in, analyst decision point,
 branching to "contained" and "breach".
- How the SOC is organized: three-tier pyramid — Tier 1 triage, Tier 2
 investigation, Tier 3 hunting — with escalation arrows to management.
- Severity vs priority: same alert shown on a domain controller vs a print
 server, priority badges flipping.
- Alerts/events section: event → classification (true/false positive/negative)
 → incident flowchart; runbook vs playbook side-by-side cards.
- The SIEM section: log sources feeding into a normalization layer
 (src_ip / srcAddr → one field), then correlation merging fifty alerts into
 one case; "does not block inline" callout with IPS labelled separately.
- Measuring the SOC: MTTD / MTTR / dwell time timeline graphic; baseline
 "normal profile" with an anomaly spike.
- RECAP: the cheat-sheet terms as a clean summary card.
