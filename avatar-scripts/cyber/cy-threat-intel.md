# Threat Intelligence & Hunting: From Intel to Detections — Avatar Tutor Script

**Lesson ID:** cy-threat-intel
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~789 words)

## Spoken script

**[HOOK — 0:00]**
Threat intelligence feeds are cheap. Threat intelligence that changes what
you do is rare. Intelligence is only useful when it changes a defender's
decision: which vulnerability to patch first, which behaviour to hunt for,
which detection to write. Everything else is just reading material.

**[WHY IT MATTERS — 0:25]**
This lesson connects the two halves of proactive defence: intelligence that
tells you what to prioritise, and hunting that tests whether your
environment would catch it. Done right, hunting closes the loop — every hunt
should end as a new or better automated detection.

**[SECTION — Intelligence levels and lifecycle — 0:50]**
Threat intelligence comes at three levels, from the boardroom down to the
SOC console. Strategic intelligence serves leaders: long-term trends and
risk, the kind that shapes budgets. Operational sits in between: specific
campaigns — who is active, what they want, when. Tactical serves defenders
directly: the TTPs and indicators of compromise to detect and block.

And the intelligence lifecycle starts where most teams get it backwards: from
the questions your organisation needs answered — not from whatever feeds you
can buy. Direction sets the requirements: what decisions must this
intelligence support? Collection gathers data from feeds, logs, OSINT, and
partners. Processing normalises, translates, and de-duplicates the raw data.
Analysis turns data into judgements that answer the requirements. Then the
step teams skip: dissemination — delivering it to the right audience in a
usable form. Intelligence nobody reads is not intelligence. And Feedback asks
consumers what helped, refining the next cycle.

**[SECTION — Prioritising what to fix — 2:10]**
You cannot patch everything, so patch the right things first. CISA's Known
Exploited Vulnerabilities catalogue lists vulnerabilities confirmed as
exploited in the wild — patch those first. US federal agencies have mandatory
deadlines for them, which tells you how seriously to take the list.

EPSS, from FIRST, estimates the probability a vulnerability will be exploited
soon. The exam wants the combination, not a single score: use KEV, EPSS,
CVSS, and your own asset context together — rather than sorting by CVSS
alone. A critical score on a printer you do not own matters less than a
medium on your internet-facing crown jewel.

One more judgement call: attribution — identifying who is behind an attack.
It is hard, and it is often less useful to a defender than knowing the
TTPs. You cannot detect a nation-state's name. You can detect its behaviour.

**[SECTION — Sharing and hunting — 3:20]**
Intelligence only works if it is shared carefully. The Traffic Light Protocol
labels how widely intel may be shared: TLP:RED means named recipients only,
then AMBER, then GREEN, and TLP:CLEAR is public. Check the label before you
forward — leaking RED intel burns sources.

A hunt starts from a testable hypothesis about attacker behaviour in your
environment — for example, "attackers use scheduled tasks for persistence on
servers." Not a vague worry; a statement you can prove or disprove with
data. Stack counting is one hunting technique: count occurrences of a value
across the fleet to surface rare outliers. An autorun present on 3 of 5,000
hosts stands out immediately — the rare thing is the interesting thing.

And here is the discipline: a successful hunt should produce a new or
improved automated detection. Hunts that find nothing still document
coverage. Every hunt either finds the attacker or proves a blind spot is
actually covered.

**[SECTION — Deception — 4:15]**
Deception technology has one killer advantage: very high-fidelity alerts.
Why? Because legitimate users never touch decoys. Any interaction is almost
certainly malicious — there is no "normal" traffic to tune out.

Honeytokens are the elegant version: fake credentials planted in memory or
files that catch attackers during lateral movement. The attacker steals what
looks like a password, uses it, and trips the alarm. They did the work of
detecting themselves.

**[COMMON MISTAKES — 4:40]**
Three traps. One: starting intel from feeds instead of requirements. The
lifecycle begins with Direction — the questions you need answered. Two:
prioritising by CVSS alone. Combine KEV, EPSS, CVSS, and asset context —
exploitability plus exposure beats a raw severity number. Three: treating
attribution as the goal. Knowing who attacked you is satisfying; knowing
their TTPs is actionable.

**[RECAP — 5:05]**
Intel comes in three levels: strategic for leaders, operational for
campaigns, tactical TTPs and IoCs for defenders. The lifecycle runs
Direction, Collection, Processing, Analysis, Dissemination, Feedback —
starting from your questions, ending with feedback. Patch KEV first, weight
with EPSS, never CVSS alone, and prefer TTPs over attribution. Share under
TLP — RED, AMBER, GREEN, CLEAR. Hunt from a testable hypothesis, use stack
counting to find the rare outlier, and turn every hunt into a detection.
And deceive: honeytokens catch lateral movement with alerts you can trust,
because no legitimate user ever touches them.

## On-screen visuals

- HOOK: an intel feed scrolling past, one item transforming into a patched
  server, a new hunt, and a new detection.
- Levels/lifecycle: three-tier pyramid — leaders, planners, defenders; the
  six-step lifecycle wheel with Direction highlighted as the start.
- Prioritising: KEV catalogue entry with "patch first" stamp; EPSS probability
  gauge combined with CVSS and asset context into one priority score;
  attribution crossed out in favour of TTPs.
- Hunting: TLP four-colour label bar; hypothesis statement card; stack-counting
  histogram with the 3-of-5000 outlier glowing; hunt output becoming a new
  detection rule.
- Deception: honeytoken credential planted in memory, attacker grabbing it,
  high-fidelity alert firing.
- RECAP: the cheat-sheet table as a summary card.
