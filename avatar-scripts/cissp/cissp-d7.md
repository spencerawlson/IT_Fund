# Domain 7: Security Operations (13%): The 3 a.m. Phone Call — Avatar Tutor Script

**Lesson ID:** cissp-d7
**Track:** CISSP Domains
**Estimated runtime:** ~5 minutes (~714 words)

## Spoken script

**[HOOK — 0:00]**
Domain 7 is where policy meets the three a.m. phone call. Incident response,
evidence, investigations, backups, patching, keeping people alive. Everything
in the other domains is theory until something breaks at the worst possible
moment — and this domain is the plan for that moment.

**[WHY IT MATTERS — ~0:25]**
Operations is the largest domain by weight alongside its neighbours, and it's
where the CISSP's managerial mindset shows most clearly. The exam doesn't
want heroes; it wants process. Contain before you cure. People before
systems. Evidence before conclusions. This lesson is the playbook.

**[SECTION — Incident management — ~0:50]**
The ISC2 incident management process runs: detection, response — that's
containment — mitigation, reporting, recovery, remediation, and lessons
learned. Notice the order. You contain the bleeding before you treat the
patient, and you learn from the incident before you close the ticket.

SIEM correlation rules drive detection by linking related events across
sources into one meaningful alert. Repeated failed logons followed by a
success from a new country — three separate log lines, one story. Correlation
is what turns noise into signal.

Egress monitoring — DLP, proxy logs, NetFlow — detects data leaving the
organisation. Most defences watch the front door; egress monitoring watches
the exits. Data theft only counts if it gets out.

**[SECTION — Evidence and investigations — ~2:05]**
The best evidence rule means courts prefer original evidence over copies.
Forensic images with verified hashes are accepted as duplicates — the hash
proves the copy is faithful. Hearsay is second-hand information, not from
direct knowledge, although business records made in the normal course of
business can be an exception.

Investigations come in four types: administrative, criminal, civil and
regulatory. The burden of proof is the exam's favourite distinction.
Criminal cases require proof beyond reasonable doubt. Civil cases need a
preponderance of evidence — more likely than not. Same facts, different bars.

Entrapment induces someone to commit a crime they would not otherwise have
committed — and it's illegal. Enticement lures someone already intent on the
crime — and it's legal. A properly used honeypot is enticement. The
distinction: entrapment pushes someone into the pool; enticement leaves the
pool open for someone already sprinting toward it.

**[SECTION — Backups, DR tests and patching — ~3:25]**
An incremental backup captures changes since the last backup of any kind:
fast to back up, slow to restore — you need the full backup plus every
incremental since. A differential backup captures changes since the last full
backup: slower to back up, faster to restore — the full plus the latest
differential only. Fast backup, slow restore versus slow backup, fast
restore. Pick your pain.

DR tests, from least to most disruptive: read-through — the checklist —
walk-through — the tabletop — simulation, parallel, and full interruption,
where production actually fails over. Do full interruption tests rarely and
carefully. The ladder exists so you can match the test to your courage.

Patch management follows evaluate, test, approve, deploy, verify. Emergency
patches still go through an expedited change process — expedited, not
skipped. An untested emergency patch is just a second incident wearing a
disguise.

**[SECTION — People first — ~4:40]**
In an emergency, evacuate people first; systems and data are secondary. Doors
on escape routes fail safe — unlocked — for life safety. This is the Domain 7
expression of the mindset lesson's first priority: human safety beats data,
systems and money, every single time. When the fire alarm sounds, nobody
backs up the database on the way out.

**[COMMON MISTAKES — ~5:05]**
Three traps. One: incremental versus differential restore. Incremental needs
the full plus every incremental since; differential needs the full plus the
latest differential. Two: entrapment versus enticement. Inducing the crime
is illegal; luring the already-willing is legal — honeypots are enticement.
Three: criminal versus civil proof. Beyond reasonable doubt versus
preponderance of evidence.

**[RECAP — ~5:30]**
Incidents run detection, response, mitigation, reporting, recovery,
remediation, lessons learned. SIEM correlation turns scattered events into
one alert; egress monitoring watches data leaving. Courts prefer originals —
hashed forensic images count as duplicates — and hearsay has a business-
records exception. Criminal needs proof beyond reasonable doubt; civil needs
preponderance. Entrapment induces and is illegal; enticement lures and is
legal. Incremental is fast to back up and slow to restore; differential is
the reverse. DR tests climb from read-through to full interruption. Patches
go evaluate, test, approve, deploy, verify. And in every emergency, people
come first and escape doors fail safe.

## On-screen visuals

- HOOK: a phone ringing at 3 a.m. beside an incident playbook.
- Incident management: the seven-step process as a response timeline;
  SIEM correlation linking log lines into one alert; egress monitoring at
  the network exits.
- Evidence and investigations: best-evidence original-vs-copy scale;
  criminal vs civil burden-of-proof bar; entrapment-vs-enticement pool
  analogy cards.
- Backups, DR tests and patching: incremental vs differential backup/restore
  comparison; the five-rung DR test ladder; patch pipeline
  evaluate-test-approve-deploy-verify.
- People first: evacuation-first priority graphic; fail-safe door diagram.
- RECAP: the cheat-sheet rows as a clean summary card.
