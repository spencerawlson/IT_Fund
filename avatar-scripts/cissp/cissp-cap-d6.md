# D6 Capstone: Scenario Judgment — Testing Triage — Avatar Tutor Script

**Lesson ID:** cissp-cap-d6
**Track:** CISSP Domains
**Estimated runtime:** ~5 minutes (~645 words)

## Spoken script

**[HOOK — 0:00]**
Domain 6 scenarios test whether you choose the right assessment for the
question asked — and whether you can tell a finding from a risk. The exam
punishes both testing the wrong thing and treating scanner output as a
to-do list. This lesson drills the triage: right test, right target, and
findings ranked by risk, not by count.

**[WHY IT MATTERS — ~0:25]**
Assessment questions look technical but they're judgment questions. The
examiner wants to know: do you understand what each test actually proves?
Pick the wrong test and you get elegant answers to the wrong question. Pick
the right one and the scenario resolves itself.

**[SECTION — Right test, right target — ~0:50]**
Before a major release you want the best assurance against vulnerabilities
in the running application. Which test? Penetration testing. Pentests
simulate attackers against running systems — they think like the adversary
and prove what exploitation actually achieves. SAST examines source code.
DAST automates black-box checks of running apps. Vulnerability scans
enumerate known issues. Each answers a different question, and "best
assurance against the running application" points at pentesting the way a
compass points north.

No single test covers everything, and the exam rewards programmes that
layer them. SAST in the pipeline, catching flaws at commit time — it
answers "what did we write wrong?" DAST in staging, probing the running
build — "what does the running app expose?" Pentests for high-risk releases,
where adversarial thinking matters most — "can an attacker actually get
in?" Scans for continuous hygiene across the estate — "what known issues
are out there?" Each in its place, each answering its own question. A mature
programme doesn't pick one test — it orchestrates all four.

**[SECTION — Findings are not risks — ~2:50]**
A vulnerability scan returns five hundred findings across the estate. How do
you prioritise first? By risk: exploitability combined with business impact.
Internet-facing critical systems first. Here's why the exam loves this
scenario: scanners report technical severity, not your risk. A critical on
an isolated lab box matters less than a high on the payment server. Severity
is a property of the vulnerability; risk is a property of the vulnerability
in your environment. Five hundred findings are a starting point, not a
plan. The plan comes from asking two questions of each finding: can it be
exploited, and what happens if it is? Internet-facing and critical means
patch first; isolated lab box means schedule it later — regardless of what
the raw severity says.

Same scepticism applies to vendors. A vendor claims SOC 2 compliance during
procurement. Before signing, what do you do? Read the actual report — scope,
period, methodology, and any qualifications. Scope tells you what was
actually examined; period tells you when; the qualifications tell you what
the auditor wouldn't sign off on. Third-party risk management
runs on evidence, not claims. Check what was audited, when it was audited,
and what the auditor qualified or excluded. A claim is marketing; the report
is the audit. The exam will offer "take their word for it" dressed as
efficiency. It's never the answer.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: choosing a vulnerability scan or code review when the
question asks for the best assurance against the running application. That's
pentesting. Two: prioritising five hundred findings by severity count
instead of risk. Exploitability times business impact — the isolated lab box
can wait. Three: accepting a vendor's compliance claim at face value. Read
the actual report: scope, period, methodology, qualifications.

**[RECAP — ~5:05]**
Match the test to the target: pentests simulate attackers against running
systems, SAST examines source, DAST automates black-box checks, scans
enumerate known issues — and mature programmes layer all four, each in its
place. Five hundred findings are a starting point, not a plan: prioritise
by risk, exploitability times business impact, not by raw severity or
count. And vendor claims are marketing until verified — read the actual
report for scope, period, methodology and qualifications, because third-party
risk management runs on evidence.

## On-screen visuals

- HOOK: a scanner spewing five hundred findings beside a calm triage desk.
- Right test, right target: four-test comparison — pentest, SAST, DAST,
  scan — each matched to its target; the layered testing programme across
  pipeline, staging, release and estate.
- Findings are not risks: findings funnelled through the
  exploitability-times-impact filter; internet-facing critical system
  outranking the isolated lab; the vendor report with scope, period and
  qualifications highlighted.
- RECAP: the cheat-sheet rows as a clean summary card.
