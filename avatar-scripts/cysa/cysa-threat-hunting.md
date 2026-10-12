# Threat Hunting & Telemetry Analysis: Finding What Automation Missed — Avatar Tutor Script

**Lesson ID:** cysa-threat-hunting
**Track:** CompTIA CySA+ (CS0-003)
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
Automated detection catches the known. Threat hunting exists for everything
else: the novel malware, the misused legitimate tool, the slow exfiltration
no signature describes. Proactive, hypothesis-driven searching for what evaded your defenses.

**[WHY IT MATTERS — ~0:25]**
Dwell time is measured in days to weeks, and that gap between compromise and
detection is exactly the ground hunting covers. The exam tests the loop, the
telemetry, and the forensic confirmation as one connected story.

**[SECTION — The hunting loop — ~0:50]**
Every hunt starts with a hypothesis about attacker behavior to test against telemetry. "Ransomware affiliates are abusing our
RDP gateway" is a hypothesis. "Let's look at logs" is not. The hypothesis focuses the hunt and defines what evidence would confirm or refute it. Without one, you are browsing, not hunting.

The loop has four movements: hypothesize, investigate, uncover, inform. Form the hypothesis, dig through telemetry, then inform the organization — new detections, hardened configurations, updated runbooks. A hunt that finds nothing still has value
if it produces a detection or closes a blind spot. The only failed hunt is
one that teaches nothing.

Intel-driven hunting starts from threat
reports and known actor TTPs Data-driven hunting explores telemetry for anomalies
with no intelligence lead, chasing statistical oddities. Mature programs do both: intel tells you where to look first,
data tells you what you were not looking for.

**[SECTION — Reading network telemetry — ~1:55]**
Command-and-control
beaconing has a recognizable shape in logs: regular, low-volume callbacks at
fixed intervals, often to rare domains. Humans browse irregularly; malware phones home on a schedule.

DNS tunneling abuses the one protocol almost every network allows everywhere:
long, encoded subdomains with high query volume to rare domains Ten thousand queries to random-looking subdomains of one domain in an hour is an exfiltration channel, not a misconfiguration.

NetFlow analysis answers the structural question: who talked to whom, when,
and how much — without packet contents. The workstation uploading gigabytes to an external IP at 2 AM; the server contacting a never-before-seen address; one host scanning its neighbors. Flow data is compact enough to retain for months — the hunting ground for slow intrusions.

**[SECTION — Endpoint and email evidence — ~3:00]**
Unexpected
parent-child pairs — Word spawning PowerShell, rundll32.exe with no command
line making external connections — signal process injection and payload execution. Attackers increasingly practice living-off-the-land: legitimate tools like PowerShell and WMI instead of custom malware, because trusted tools bypass allowlists. The defense is not blocking the tool — it is detecting
its misuse.

Email is the most common initial access vector; the headers are the evidence. Return-Path, the Received chain, and the SPF, DKIM, and DMARC
results show where a message actually came from versus where it claims to be
from. A "bank" email whose Received chain starts at a residential ISP and
fails all three checks is not a bank email. URL detonation — opening a suspicious link in a sandbox — answers what it does safely. Check mailbox rules in every investigation: auto-forwarding rules let attackers keep reading email — and keep their access to password resets.

**[SECTION — Confirming with forensics — ~4:05]**
Memory forensics finds
what disk forensics cannot: fileless malware, injected code, encryption keys
existing only in RAM. A process clean on disk with injected threads in memory is modern tradecraft — visible only in RAM.

Collection follows the order of volatility: most ephemeral first — cache, RAM, connections, processes — then disk and logs. Volatile evidence dies the moment a system powers off or reboots. Image
the disk before capturing memory and you have already lost the fileless
payload. Timeline analysis orders artifacts by timestamp into one narrative; file carving recovers deleted files from unallocated space.

**[COMMON MISTAKES — ~4:55]**
Three traps. One: hunting without a hypothesis — "let's look at logs" is
browsing. Two: trying to block living-off-the-land tools outright. Detect the
misuse, not the tool. Three: imaging disk before capturing memory. The order
of volatility is not optional; volatile evidence dies on reboot.

**[RECAP — ~5:15]**
Hunting is hypothesis-driven: hypothesize, investigate, uncover, inform —
from intel leads or data anomalies, and a hunt that teaches never fails. In network telemetry: beaconing's regularity, DNS tunneling's subdomain floods, NetFlow's who-talked-to-whom. On endpoints and
email: parent-child oddities, living-off-the-land misuse, forged headers,
detonated URLs, hidden mailbox rules. Confirm with forensics — memory first
per the order of volatility, then timelines and file carving.

## On-screen visuals

- HOOK: automated detection net with threats slipping through the gaps;
 hunter's magnifying lens over telemetry.
- Hunting loop: four-stage cycle — hypothesize, investigate, uncover, inform —
 with intel-driven and data-driven entry arrows.
- Network telemetry: beaconing shown as metronome-regular callbacks vs
 irregular human browsing; DNS tunnel with long encoded subdomains flooding
 one domain; NetFlow graph of hosts with a 2 AM gigabyte upload highlighted.
- Endpoint/email: process tree with Word → PowerShell flagged; email header
 anatomy (Return-Path, Received chain, SPF/DKIM/DMARC results); sandbox
 detonation of a URL; hidden mailbox rule revealed.
- Forensics: order-of-volatility stack (cache → RAM → network → processes →
 disk → logs); timeline of artifacts ordered by timestamp; file carving from
 unallocated space.
- RECAP: the cheat-sheet terms as a clean summary card.
