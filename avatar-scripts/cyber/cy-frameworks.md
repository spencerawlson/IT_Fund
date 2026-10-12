# Frameworks: ATT&CK, Kill Chain, CSF: Mapping Attacks and Organising Defences — Avatar Tutor Script

**Lesson ID:** cy-frameworks
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~789 words)

## Spoken script

**[HOOK — 0:00]**
Two analysts are arguing about the same intrusion. One says "we have a
malware problem." The other says "we have no coverage for lateral movement."
Who is more useful? The second one — because she is speaking the language of
a framework. Frameworks turn gut feelings into a shared map of where attacks
happen and where defences are thin.

**[WHY IT MATTERS — 0:25]**
Frameworks give defenders a shared map of how attacks unfold and what a
security programme should cover — "we have no coverage for lateral movement"
instead of "we feel exposed."

**[SECTION — MITRE ATT&CK — 0:50]**
ATT&CK is a knowledge base of real adversary behaviour. The crucial split
is tactics versus techniques. Tactics are the why: the attacker's goal at
each stage. Techniques are the how: the specific method.

Learn three tactics cold. Initial Access is getting a first foothold — think
phishing, exploiting a public-facing app, or logging in with valid accounts.
Persistence is staying on after a reboot — scheduled tasks, run keys, new
accounts. Lateral Movement is moving to other hosts — RDP, SMB admin shares,
pass-the-hash. Foothold, stay, spread.

Each technique has an ID, like T1053 for Scheduled Task/Job, so tools,
detections, and reports refer to exactly the same behaviour. When your EDR
tags an alert T1053, everyone knows precisely what it means.

**[SECTION — Kill Chain, CSF and the Diamond Model — 1:55]**
The Lockheed Martin Cyber Kill Chain has seven phases, and the whole point
is this: breaking any single link stops the attack. Reconnaissance
researches the target. Weaponization pairs an exploit with a payload, like a
malicious document. Delivery sends it: phishing email, malicious link, USB
drop. Exploitation triggers the vulnerability to run code. Installation puts
down malware or a backdoor. Command and Control opens a channel so the
attacker can steer the compromised host. Actions on Objectives is what they
came for: steal, encrypt, or destroy data. Seven links, and defenders only
need to break one.

NIST CSF 2.0, from 2024, organises a whole security programme into six
functions: Govern — new in 2.0 — covers organisational context, risk
strategy, and supply-chain oversight, sitting over the other five. Then
Identify, Protect, Detect, Respond, Recover.

The Diamond Model links four features of every intrusion: adversary,
capability, infrastructure, and victim. Its power is pivoting — start from
one known element and walk the diamond to discover the others.

**[SECTION — Pyramid of Pain and sharing intel — 3:30]**
Not all indicators are worth the same effort. The Pyramid of Pain ranks them
by how much it hurts the attacker when you block them, and the lesson is
simple: aim your detections as high up as you can.

At the bottom are hash values — change one byte and the hash changes, so
blocking them is trivial to dodge. Above that, IP addresses — trivial to
rotate through proxies and cloud hosts. Domain names cost a little effort to
replace. Host and network artifacts — registry keys, file paths, user
agents — are annoying to change. Tools are challenging to replace. And at
the very top are TTPs — tactics, techniques and procedures. Changing
behaviour is expensive, so this hurts the attacker most.

STIX is a standard format for describing threat intelligence, and TAXII is
the transport for exchanging it — so tools can share indicators
automatically.

**[SECTION — Purple teams and OSINT — 4:20]**
A purple team is red and blue working together: attack, observe whether the
detection fired, tune, repeat. It improves detection far faster than a
report delivered weeks after the fact — the tuning happens live.

OSINT is intelligence from publicly available sources: search engines, social
media, DNS records, certificate transparency logs. Attackers use it for
reconnaissance, so defenders should know what it reveals about them.

**[COMMON MISTAKES — 4:50]**
Three traps. One: calling a technique a tactic. Tactics are the goal — the
why. Techniques are the method — the how. Two: thinking NIST CSF 2.0 has five
functions. It has six now — Govern was added in 2024, and it sits above the
other five. Three: chasing hashes up the Pyramid of Pain. Blocking hashes is
trivial for the attacker to dodge; invest in TTP-level detection where it
actually hurts.

**[RECAP — 5:15]**
ATT&CK splits the why — tactics like Initial Access, Persistence, Lateral
Movement — from the how, the numbered techniques. The Kill Chain has seven
links, and breaking one stops the attack. NIST CSF 2.0 organises a programme
into Govern, Identify, Protect, Detect, Respond, Recover. The Diamond Model
pivots from adversary to victim across capability and infrastructure. The
Pyramid of Pain says: detect high, at TTPs, not low at hashes. STIX formats
intel, TAXII transports it. Purple teams tune detection live, and OSINT is
the public reconnaissance both sides use.

## On-screen visuals

- HOOK: two speech bubbles — vague worry vs "no coverage for lateral
  movement" — resolving to a map graphic.
- ATT&CK: why-vs-how split panel; technique card showing the T1053 ID format.
- Kill Chain: seven-link chain diagram, one link breaking; CSF 2.0 six-function
  wheel with Govern on top; Diamond Model four-point diamond with pivot arrows.
- Pyramid: six-tier pyramid labelled top to bottom, TTPs to hashes, with
  difficulty tags; STIX/TAXII format-plus-transport icon pair.
- RECAP: the cheat-sheet table as a summary card.
