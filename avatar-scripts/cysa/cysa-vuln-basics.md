# Vulnerability Scanning Basics: Find It, Score It, Decide — Avatar Tutor Script

**Lesson ID:** cysa-vuln-basics
**Track:** CompTIA CySA+ (CS0-003)
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
You cannot defend what you have not inventoried, and you cannot fix what you
have not found. Vulnerability scanning is the flashlight that turns an unknown
attack surface into a prioritized list of problems.

**[WHY IT MATTERS — ~0:25]**
Every finding you will ever prioritize, every patch you will ever argue for,
starts with a scan result. The exam tests the mechanics relentlessly, and in the job, these
fundamentals separate a mature program from a spreadsheet of doom.

**[SECTION — How vulnerability scanning works — ~0:50]**
A vulnerability scanner probes systems and compares what it finds against a
database of known weaknesses: missing patches, misconfigurations, weak
credentials, exposed services. Its superpower is coverage: every asset in scope, the same way, every time.

A credentialed scan logs in with provided credentials, so it sees what no outsider could — patch levels,
registry settings, local security policy. A non-credentialed scan sees only
what is exposed over the network. You need both: authenticated scans find missing patches, unauthenticated scans confirm what an attacker can reach.

A lightweight host agent reports continuously — no scheduled sweep required. Agents cover periodic scanning's blind spots: the laptop asleep during the scan window, the three-hour cloud instance. The tradeoff: deploying and maintaining the agent fleet. Scan scope — the defined asset set — is a formal decision: scanning outside it can violate contracts, and aggressive scanning can crash fragile legacy systems.

**[SECTION — CVSS, CVE, and the NVD — ~2:00]**
CVSS scores severity from 0.0 to 10.0 — the common language for "how bad is this." Three metric groups. Base metrics describe intrinsic properties: attack vector, complexity, privileges, impact. Temporal metrics adjust for change over time, like exploit code maturity. Environmental metrics adjust for your deployment: 9.0–10.0 is critical, 7.0–8.9 is high.

CVSS measures severity — how bad the flaw is in the abstract — not likelihood of exploitation in your environment. A 9.8 with no exploit code in the wild may matter less than a 7.5 with active exploitation. Scoring guides attention; it does not replace judgment.

A CVE — CVE-YYYY-NNNNN — uniquely identifies a known vulnerability. The NVD, NIST's database, enriches each CVE with scores, references, and affected products.

**[SECTION — Remediation, mitigation, and acceptance — ~3:05]**
Every confirmed finding ends in one of three dispositions. Remediation fixes the root cause — a
patch or reconfiguration — so the vulnerability no longer exists. Mitigation reduces exposure without fixing the flaw: an IPS signature, segmentation, disabling the feature. An exception is the formal decision to live with it — approved by a risk owner, with an expiry date.

Mitigation is for when no patch exists: zero-days, abandoned legacy systems, frozen change windows. The tool is the compensating control: segmentation, IPS signatures, enhanced monitoring. They make the finding survivable until remediation is possible.

Exceptions need a workflow — request, risk assessment, owner approval, expiry date — or they quietly become permanent. Accepted risks accumulate into attack paths. Risk acceptance has a shelf life.

**[SECTION — Scanning in context — ~4:05]**
A vulnerability assessment finds and reports weaknesses; a penetration test
attempts to exploit them to prove impact. The assessment answers "what is
wrong"; the pen test answers "what can an attacker actually do with it."
Assessments run regularly and broadly; pen tests are deeper, point-in-time. Run both.

Compliance scanning checks systems against secure baselines, not CVEs. CIS Benchmarks are the standard reference. A fully patched system can still be insecure through configuration drift. And vulnerability chaining: attackers combine minor flaws into serious paths — the deferred "low" becomes the stepping stone to "critical."

**[COMMON MISTAKES — ~4:55]**
Three traps. One: treating CVSS as likelihood. It measures severity Two: demanding
remediation where only mitigation is possible. Three: confusing assessments with pen tests. Finding is not
proving.

**[RECAP — ~5:15]**
Scanning is automated discovery: credentialed scans see patch levels, non-credentialed see the attacker's view, agents cover the gaps. Findings are identified by CVE, enriched by the NVD,
scored by CVSS from 0.0 to 10.0, with 9.0-plus critical. Every finding ends
as remediation, mitigation, or a formally accepted exception with an expiry
date. Find it, score it, decide. That is the job.

## On-screen visuals

- HOOK: flashlight sweeping across a dark network map, unknown hosts lighting
 up as findings populate a list.
- How scanning works: three panels — credentialed scan seeing inside a host,
 non-credentialed scan probing from outside, agent reporting continuously;
 scope boundary highlighted with a "do not scan outside" callout.
- CVSS section: 0.0–10.0 gauge with critical/high bands; base, temporal,
 environmental metric chips; CVE-YYYY-NNNNN format card and NVD entry.
- Remediation/mitigation/acceptance: three-path flowchart for one finding;
 compensating control wrapping an unpatchable legacy server; exception with
 approval signature and expiry date.
- Scanning in context: assessment vs pen test comparison table ("what is
 wrong" vs "what can an attacker do"); CIS Benchmarks checklist; drift
 timeline showing a config diverging; chaining diagram of lows linking to a
 critical.
- RECAP: the cheat-sheet terms as a clean summary card.
