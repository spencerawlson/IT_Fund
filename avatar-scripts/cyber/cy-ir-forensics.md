# Incident Response & Forensics: Evidence, Timelines and Running the Response — Avatar Tutor Script

**Lesson ID:** cy-ir-forensics
**Track:** Cybersecurity Operations
**Estimated runtime:** ~5 minutes (~722 words)

## Spoken script

**[HOOK — 0:00]**
Prevention will fail. That is not pessimism — it is the entire premise of
incident response. When it fails, the quality of the response decides the
size of the damage. Good IR stops the spread, preserves the evidence needed
to understand what happened, and communicates without tipping off the
attacker.

**[WHY IT MATTERS — 0:25]**
This lesson covers the forensic craft and the response discipline: volatile
evidence and memory images, forensic imaging, timelines and Windows
artefacts, containment versus eradication, out-of-band communication,
playbooks, notification duties, and lessons learned. These are the skills
that separate a panicked scramble from a controlled response.

**[SECTION — Preserving evidence — 0:50]**
The first rule of evidence: take a memory image before shutting the system
down. RAM holds running processes, network connections, encryption keys, and
fileless malware — all of which disappear at power-off. Pull the plug first
and that evidence is gone forever. Capture memory with tools like WinPmem on
Windows or LiME on Linux, and analyse it with Volatility.

Next, the forensic image: a bit-for-bit copy of the whole disk, including
deleted files and unallocated space. That is the difference from an ordinary
file copy — the "empty" space is where the interesting things live. Hash the
source and the image before and after acquisition to prove integrity, and use
a write blocker so nothing can change the evidence media during the copy.

And if lawyers might get involved, issue a legal hold: an instruction to the
organisation to preserve relevant data from deletion, overriding normal
retention schedules. It freezes the shredder.

**[SECTION — Analysis — 2:10]**
Evidence means nothing until it is ordered. Timeline analysis arranges
artefacts by time to reconstruct what the attacker did, step by step. Tools
like Plaso build "super-timelines" from dozens of sources at once — so a
registry change, a log entry, and a file timestamp all land on one shared
clock.

On Windows, know your execution artefacts. Prefetch files — together with
Amcache and ShimCache — show which programs ran and when, even after the
attacker deleted the executable. The file is gone; the record of it running
is not.

**[SECTION — Running the response — 3:00]**
Now the response itself. Containment stops the spread: isolating hosts,
disabling accounts, blocking command-and-control domains. Eradication removes
the cause: the malware, the persistence mechanism, the exploited
vulnerability. Then recover — and monitor closely for re-infection, because
attackers come back through doors you missed.

During a major incident, communicate out of band. Why? Because the attacker
may be reading your normal email and chat. Use a pre-arranged separate
channel — one you set up before you ever needed it.

A playbook is a predefined, step-by-step procedure for one incident type:
phishing, ransomware, a compromised account. Nobody improvises well under
pressure, so the decisions are made in advance, calmly.

Then notification. Leadership decides, with legal counsel, whether and when
to notify regulators and customers, following the applicable laws and
contracts. The deadlines vary and the exam tests them: GDPR requires
notification to the regulator within 72 hours, and US public companies must
disclose material incidents to the SEC within four business days of
determining materiality.

Finish with a blameless lessons-learned review — blameless, because blame
kills honesty — then update the playbooks and detections with what you
learned.

**[COMMON MISTAKES — 4:30]**
Three traps. One: powering off the machine first. You lose memory evidence —
processes, connections, keys, fileless malware — permanently. Image RAM
first. Two: confusing containment with eradication. Isolating a host stops
the spread; it does not remove the malware. You need both, in that order.
Three: coordinating over normal email during a major incident. If the
attacker is in your mail, you are briefing them on your own response.

**[RECAP — 4:55]**
Image memory before shutdown — RAM holds what the disk never will. Take a
bit-for-bit forensic image, hash it before and after, and use a write
blocker. Legal holds freeze deletion. Reconstruct with timelines — Plaso
builds super-timelines — and Windows Prefetch, Amcache, and ShimCache show
what ran even after deletion. Contain the spread, eradicate the cause,
recover, and watch for return visits. Communicate out of band, follow the
playbook, let leadership and legal handle notification — 72 hours for GDPR,
four business days for the SEC — and close with a blameless lessons-learned
that actually updates your defences.

## On-screen visuals

- HOOK: a breached network with a widening blast radius, then a response team
  ring containing it.
- Evidence: volatility order graphic — RAM fading at power-off; forensic image
  vs ordinary copy comparison showing recovered deleted space; hash-before/
  hash-after integrity check; write blocker in the acquisition path.
- Analysis: Plaso-style super-timeline merging registry, logs, and file
  events; Prefetch artefact record of a deleted executable.
- Response: containment vs eradication split — isolate/block vs remove/fix;
  out-of-band channel separate from compromised mail; playbook flowchart for
  ransomware; GDPR 72-hour and SEC 4-business-day deadline call-outs.
- RECAP: the cheat-sheet table as a summary card.
