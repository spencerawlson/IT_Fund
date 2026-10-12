# Vulnerability Prioritization & Response: Beyond the Score — Avatar Tutor Script

**Lesson ID:** cysa-vuln-management
**Track:** CompTIA CySA+ (CS0-003)
**Estimated runtime:** ~5 minutes (~670 words)

## Spoken script

**[HOOK — 0:00]**
A scanner will happily report ten thousand findings. The organization that fixes them all in CVSS order spends its year patching the wrong things. Scanning finds vulnerabilities. Management
decides what to do about them — and that decision is this lesson.

**[WHY IT MATTERS — ~0:25]**
Prioritization is the highest-leverage skill in vulnerability management — the exam tests it as a judgment call: which finding first when scores and reality disagree? Get this right and a ten-thousand-finding backlog becomes a Tuesday.

**[SECTION — Beyond CVSS: prioritizing by risk — ~0:50]**
CVSS measures severity, not likelihood of exploitation — and that gap is
where prioritization lives. EPSS — the Exploit Prediction Scoring System — estimates the probability of exploitation in the wild in the next thirty days, scored 0 to 1. A CVSS 9.8 with an EPSS of 0.001 is a
theoretical problem. A CVSS 7.5 with an EPSS of 0.9 is an operational
emergency.

The CISA KEV catalog lists vulnerabilities known to be actively exploited in the wild. A KEV listing is ground truth — someone is exploiting this right now. The
classic exam scenario: a CVSS 9.8 with no known exploit versus a CVSS 7.5 in
KEV. Remediate the KEV entry first.

Threat-informed prioritization: weight vulnerabilities by threat intel relevant to your sector, not just score. A flaw in the VPN concentrator your sector's ransomware affiliates target outranks a higher-scored flaw nobody attacks. Score tells you how bad; intel tells you how likely; criticality tells you how much it matters. Multiply all three.

**[SECTION — The remediation workflow — ~1:55]**
Findings move through a pipeline: discovery, validation, prioritization,
remediation or mitigation, and verification. Immature programs skip validation — confirming a finding is real before acting.
Scanners produce false positives; patching a phantom wastes a change window. Validate first.

Pen testing validates exploitability and demonstrates impact. Where the scanner says "could be exploited," the pen test says "this is how, and here is what it yields." That evidence justifies emergency patching — and separates weekend findings from cycle findings.

Continuous vulnerability management replaces the quarterly scan-and-panic cycle: ongoing discovery, prioritization, remediation. Point-in-time assessments decay immediately; the goal is a pipeline that never stops.

**[SECTION — SLAs, exceptions, and drift — ~3:00]**
A remediation SLA is a deadline for fixing vulnerabilities by severity:
criticals in days, highs in weeks, mediums in the cycle. SLAs turn "we should patch that" into a commitment with an owner and a date. The metric: mean time to remediate by severity.

The exception workflow — request, risk assessment, owner approval, expiry date — handles what cannot be fixed on schedule. Watch for the indefinite exception: accepted risk that never expires accumulates into the attack path. Every exception needs a next review
date. Without one, it is not an exception. It is surrender.

Then the slow leak: configuration drift — systems diverging from baselines as changes accumulate. That is why compliance scanning
runs continuously The baseline is the contract; drift is the breach of it.

**[SECTION — Disclosure and program health — ~4:05]**
A disclosure program is the official channel for external researchers: a "report a vulnerability" page with scope, safe harbor, and response commitment. It enables coordinated disclosure: private report, vendor remediation, public disclosure after the fix. Organizations without one still receive reports.
They just receive them on social media.

The metrics: mean time to remediate, scan coverage, exception aging — how long findings stay open past SLAs.
Unscanned assets are unmeasured risk Together they tell a story: rising MTTR means the pipeline is the bottleneck; climbing aging means exceptions are accumulating. The analyst who reads these trends can fix the program, not
just the findings.

**[COMMON MISTAKES — ~4:55]**
Three traps. One: sorting purely by CVSS. A 9.8 with no exploit loses to a
7.5 in KEV — check likelihood before severity. Two: exceptions without expiry
dates. Indefinite acceptance is silent accumulation. Three: treating the scan as the program.

**[RECAP — ~5:15]**
Prioritize by risk: EPSS predicts thirty-day exploitation, KEV is ground truth, intel plus criticality complete the picture. Findings flow through discovery, validation, prioritization, remediation or mitigation, verification. SLAs give every
severity a deadline and an owner; exceptions get an expiry date or become the
attack path; drift is caught by continuous compliance scanning. MTTR, coverage, and aging together say what is actually broken. Beyond the score.

## On-screen visuals

- HOOK: scanner output of 10,000 findings; CVSS-sorted list vs
 risk-prioritized list diverging.
- Beyond CVSS: EPSS probability bar (0–1) beside a CVSS gauge; KEV catalog
 entry stamped "actively exploited" overriding the score; three-factor
 multiplication — severity × likelihood × asset criticality.
- Remediation workflow: pipeline stages — discovery, validation,
 prioritization, remediation/mitigation, verification; scanner claim vs
 pen-test proof comparison.
- SLAs/exceptions/drift: SLA timeline by severity (days/weeks/cycle);
 exception ticket with approval and a ticking expiry date; baseline with
 drift diverging over time.
- Disclosure/program health: disclosure program page with safe harbor;
 dashboard of MTTR, coverage, and aging trends telling the bottleneck story.
- RECAP: the cheat-sheet terms as a clean summary card.
