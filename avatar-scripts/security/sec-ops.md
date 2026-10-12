# Security Operations: Hunt, Detect, Respond — Avatar Tutor Script

**Lesson ID:** sec-ops
**Track:** Security+ (SY0-701)
**Estimated runtime:** ~6 minutes (~785 words)

## Spoken script

**[HOOK — 0:00]**
Controls on paper mean nothing until someone operates them. Security operations is where controls meet reality: finding and prioritising vulnerabilities, watching for attacks, and responding when one succeeds. It is the largest Security+ domain at 28% of the exam — so this lesson carries real weight.

**[WHY IT MATTERS — ~0:25]**
Every scenario in this lesson is a day in the life of an analyst. Which vulnerability do you patch first? What does that tool actually do — correlate, automate, or contain? When ransomware lands on a host, what is your first move? The exam tests judgement here, not vocabulary, and the judgement follows from understanding each tool's job.

**[SECTION — Vulnerability management — ~0:50]**
A CVE is a unique public identifier for a known vulnerability, in the form CVE-YYYY-NNNNN — the shared name the whole industry uses. CVSS scores severity from 0 to 10. But here is the analyst's discipline: prioritise with context, not just the score. Is it being exploited in the wild — is it in CISA's Known Exploited Vulnerabilities catalogue? And how valuable and exposed is the affected asset? A 9.8 on an isolated test box loses to a 7.5 on the internet-facing payment server. Score plus exploitability plus asset value: that is prioritisation.

Scanning comes in two flavours. A credentialed scan logs in to hosts and sees far more — missing patches, local configuration. A non-credentialed scan shows the outside view an attacker would get.

Two terms that trip people up: a false positive reports a vulnerability that does not exist and wastes time; a false negative misses a real one — which is worse.

**[SECTION — Monitoring tools — ~2:00]**
Four tools, four jobs. A SIEM aggregates and correlates logs from across the environment to detect incidents. SOAR adds automated response playbooks: enriching an alert and isolating a host automatically, without waiting for a human at 3 a.m. EDR monitors endpoint behaviour and lets responders investigate and contain. XDR extends detection across network, cloud, and identity.

The exam's favourite confusion is SIEM versus SOAR: SIEM correlates and detects; SOAR automates the response. One finds, the other acts.

**[SECTION — Incident response — ~2:50]**
NIST SP 800-61r2 defines four phases of incident response. One: Preparation — plans, playbooks, tools, training, contacts, ready before anything happens. Two: Detection and Analysis — spot the incident, confirm it, scope its impact. Three: Containment, Eradication, and Recovery — stop the spread, remove the cause, restore systems. Four: Post-Incident Activity — lessons learned, fed back into preparation. The 2025 revision, SP 800-61r3, maps incident response onto the NIST CSF 2.0 functions.

Now the scenario the exam loves: ransomware is detected on one host. What is the first priority? Containment — isolate the host from the network to stop the spread. Not eradication first, not recovery first. And preserve evidence: do not simply power it off if memory forensics matters, because RAM is lost the moment power dies. Isolate, preserve, then work.

**[SECTION — Evidence handling — ~4:00]**
Two rules govern evidence. First, the order of volatility: collect the most volatile evidence first. CPU cache and RAM come before temporary files, then disk, then remote logs, with archives last. Volatile evaporates — grab it first.

Second, chain of custody: document who handled evidence, when, and how. Without it, evidence may be inadmissible — the court cannot trust what it cannot trace. Every handoff, written down.

**[SECTION — Proactive work — ~4:30]**
Not all security work waits for alerts. Threat hunting proactively searches for threats that evaded detection — hypothesis-driven ("if an attacker used stolen VPN credentials, we would see..."), often mapped to MITRE ATT&CK techniques. Hunting assumes the tools missed something and goes looking.

A tabletop exercise is a discussion-based walk-through of an incident scenario: the team talks through who does what, with no systems touched. A cheap, effective way to test plans, roles, and communication — and to discover, in a conference room, the confusion you do not want during a real incident.

**[COMMON MISTAKES — ~5:05]**
Three traps. One: patching by CVSS score alone. Add exploitability and asset context — CISA KEV first. Two: SIEM versus SOAR. SIEM correlates logs; SOAR automates response. Three: on ransomware, jumping to eradication before containment. Isolate the host first, preserve the evidence, then clean.

**[RECAP — ~5:30]**
CVEs name vulnerabilities, CVSS scores them, and prioritisation adds exploitability and asset value. Credentialed scans see inside; false negatives are worse than false positives. SIEM correlates, SOAR automates, EDR works the endpoint, XDR spans domains. Incident response runs preparation, detection and analysis, containment-eradication-recovery, post-incident — and ransomware means contain first, isolate the host, preserve memory. Evidence follows volatility order and chain of custody. Threat hunting hypothesises; tabletops rehearse.

## On-screen visuals

- HOOK: an analyst's day — a prioritised vulnerability queue, a SIEM alert, and an incident unfolding.
- Vulnerability management: a CVE identifier beside a 0–10 CVSS scale, then the prioritisation triangle — score, CISA KEV exploitability, asset value; credentialed versus non-credentialed scan views.
- Monitoring: four tool cards — SIEM, SOAR, EDR, XDR — each with its one-line job.
- Incident response: the four NIST phases as a cycle, with post-incident feeding preparation; the ransomware scenario — isolate first.
- Evidence: the volatility order as a top-down stack from RAM to archives; a chain-of-custody log.
- RECAP: the cheat-sheet rows as a clean summary card.
