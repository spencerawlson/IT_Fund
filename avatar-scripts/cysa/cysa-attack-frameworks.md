# Attack Frameworks & Threat-Informed Defense: Think Like the Adversary — Avatar Tutor Script

**Lesson ID:** cysa-attack-frameworks
**Track:** CompTIA CySA+ (CS0-003)
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
Defenders who think in isolated alerts lose to attackers who think in
campaigns. Frameworks like MITRE ATT&CK, the cyber kill chain, and the
diamond model give analysts a shared language for what an attacker is doing —
not just which alert fired, but which step of the intrusion it represents.

**[WHY IT MATTERS — ~0:25]**
"TTP," "tactic versus technique," "kill chain phase" — this is how the
industry talks, and the exam speaks it fluently. These frameworks are the
difference between reacting to alerts and understanding the operation behind
them: one alert becomes the whole intrusion, unfolded.

**[SECTION — MITRE ATT&CK: the adversary playbook — ~0:50]**
MITRE ATT&CK is a knowledge base of adversary tactics, techniques, and
procedures, organized as a matrix. Three
words, three levels. A tactic is the adversary's goal — the "why": Initial
Access, Persistence, Exfiltration. A technique is how they achieve it — the
"how": phishing, scheduled tasks. A procedure is the specific implementation —
the actual malware, command, or sequence a particular actor uses. Goal,
method, implementation.

The matrix pays for study because it turns vague alerts into precise
statements. Credential dumping via LSASS access is Credential Access — T1003.
Scheduled tasks for persistence are Persistence — T1053. Moving through the
environment with WMI or PsExec is Lateral Movement; obfuscating payloads is
Defense Evasion.

ATT&CK improves on older models by being non-linear and granular. Real
intrusions do not march through phases in order — attackers loop back, skip
steps, pursue multiple tactics at once. ATT&CK describes that reality: a menu
of behaviors in any sequence, each mapped to detection and mitigation
guidance. A map of the territory, not a script of the journey.

**[SECTION — The kill chain and the diamond model — ~1:55]**
The cyber kill chain describes seven phases of an intrusion in order:
Reconnaissance, Weaponization, Delivery, Exploitation, Installation, Command
and Control, and Actions on Objectives. Its strategic insight: disrupt any
single phase and you defeat the attack. Its limitation is linearity: it models the initial
compromise well and everything after it poorly.

The diamond model of intrusion analysis complements it by linking four
elements of every intrusion event: the adversary, their capability, the
infrastructure they use, and the victim. The analytic
power is pivoting across the diamond: from a malicious IP to the other
victims it touched, from a capability to the adversary known to use it. One
indicator expands into the full picture.

Use the frameworks together, each for what it is good at. The kill chain
gives the campaign narrative: where in the intrusion are we? ATT&CK gives the
behavioral detail: exactly what technique is this alert describing? The
diamond gives the analytic pivots: what else connects to what we just found?

**[SECTION — Threat-informed defense — ~3:00]**
Threat-informed defense is the discipline of prioritizing controls against
the TTPs most relevant to your sector and threat landscape — not every
technique in the matrix equally. ATT&CK
Navigator visualizes this as heatmaps: technique coverage across your
defenses, showing which adversary behaviors you can detect and which are
blind spots.

The durability argument is central. TTP-based detections describe attacker
behavior — process injection patterns, unusual authentication sequences — and
survive infrastructure changes because behavior changes slowly. IOC-based
detections describe artifacts — a hash, a domain — and expire the moment the
attacker rotates infrastructure.

MITRE D3FEND extends the picture defensively: a knowledge base of defensive
techniques mapped against ATT&CK, so each adversary technique links to the
countermeasures that defeat it. Adversary emulation closes the loop —
simulating a specific threat actor's TTPs against your environment. And mapping incidents to ATT&CK
after response standardizes reporting and reveals systemic gaps: if every
incident involves the same uncovered technique, the gap is the finding.

**[COMMON MISTAKES — ~4:05]**
Three traps. One: mixing up tactic, technique, and procedure — goal, method,
implementation, in that order. Two: treating the kill chain as the whole
story. It models initial compromise well and post-compromise poorly; that is
what ATT&CK is for. Three: building detections only on IOCs. Artifacts
expire; behavior endures.

**[RECAP — ~4:25]**
ATT&CK is the common language: tactics are goals, techniques are methods,
procedures are implementations — non-linear, granular, mapped to detection
guidance. The kill chain's seven phases teach you to break one link; the
diamond's four elements — adversary, capability, infrastructure, victim —
teach you to pivot from one indicator to the whole intrusion. Threat-informed
defense aims controls at the TTPs that actually threaten your sector. Think in campaigns, not alerts.

## On-screen visuals

- HOOK: scattered isolated alerts vs one unfolding campaign timeline.
- ATT&CK section: the matrix with a column highlighted; tactic → technique →
 procedure ladder (goal, method, implementation); T1003 / T1053 callouts with
 plain-English behavior descriptions.
- Kill chain: seven-phase chain with one link breaking and the attack
 collapsing; linearity limitation note.
- Diamond model: diamond diagram — adversary, capability, infrastructure,
 victim — with pivot arrows expanding one indicator into a full intrusion.
- Threat-informed defense: ATT&CK Navigator heatmap with blind spots glowing;
 TTP-based vs IOC-based detection durability comparison; D3FEND mapping
 adversary technique to countermeasure; adversary emulation exercise loop.
- RECAP: the cheat-sheet terms as a clean summary card.
