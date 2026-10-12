# SOC Analyst Fundamentals: Tiers, Event IDs and Phishing Analysis — Avatar Tutor Script

**Lesson ID:** cy-soc
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~774 words)

## Spoken script

**[HOOK — 0:00]**
A SOC receives thousands of alerts a day. Ninety-nine percent of them are
noise. The analyst's job is to find the one percent — fast — and not miss the
one that matters. The difference between a good analyst and a burned-out one
comes down to triage discipline, a handful of memorised event numbers, and
knowing how email actually works.

**[WHY IT MATTERS — 0:25]**
A security operations centre turns a flood of alerts into a few confident
decisions. Analysts who know the key log events by number, can read an email
header, and understand what a hash lookup does — and does not — prove are
the ones who escalate the right things.

**[SECTION — How a SOC is organised — 0:50]**
A SOC works in tiers. Tier 1 triages alerts: validate them, enrich them with
context, and escalate the real ones. Tier 2 investigates in depth. Tier 3
hunts and handles major incidents. Clear escalation criteria keep Tier 1 fast
and consistent — when you see X, you escalate; no debate at two in the
morning.

Two words you will hear constantly: a true positive is an alert that fired on
genuinely malicious activity, and a false positive fired on benign activity.
Tracking both rates measures how good your detections actually are.

And the SOC's biggest enemy? Alert fatigue — analysts overwhelmed by noise,
missing real attacks buried in it. The fix is not working harder. It is
tuning detections, suppressing known-good activity, and automating
enrichment. A SOC that does not fight fatigue will drown in its own alerts.

**[SECTION — Windows events to know by number — 1:55]**
Every analyst memorises these. 4624 is a successful logon, 4625 a failed one.
The logon type tells you how: type 10 is RemoteInteractive, meaning RDP — so
a 4624 type 10 at 3 AM from an unusual host is worth a look. 4672 means
special privileges were assigned to a new logon, which signals an admin
logging in. 4720 means a user account was created — and an unexpected one is
a persistence indicator. Attackers love new accounts.

And 1102: the security audit log was cleared. That is a strong indicator of
anti-forensics — someone erasing their tracks. An empty log is itself
evidence.

Then there is Sysmon, a free Microsoft tool that logs far richer detail than
the defaults. Its Event ID 1 records process creation with the full command
line. Why is that gold? Because malicious PowerShell and living-off-the-land
activity show up in the command line — the tool you thought was legitimate,
with arguments that betray it.

**[SECTION — Phishing analysis — 3:15]**
When a suspicious email arrives, start with the headers. Every mail server
that handles a message adds a Received header — so read them from the bottom
up to trace the path the message actually took. The bottom is the origin; the
top is the last hop. Attackers lie in the body, but the headers keep a travel
log.

Then the authentication trio. SPF lists which servers may send mail for a
domain. DKIM signs the message so tampering is detectable. DMARC checks that
those results align with the visible From address — and tells receivers what
to do on failure: none, quarantine, or reject.

Finally, the file. A sandbox is an isolated environment where you run a
suspicious file and watch its behaviour: files dropped, registry keys
changed, network calls made. A hash lookup on a service like VirusTotal tells
you whether that exact file is known to be malicious. But here is the catch:
changing a single byte changes the hash — so "no results" proves very
little. A clean hash lookup is the absence of evidence, not evidence of
safety.

**[COMMON MISTAKES — 4:30]**
Three traps. One: reading Received headers top to bottom. The path goes
bottom to top — the origin is at the bottom. Two: treating a clean
VirusTotal result as proof the file is safe. A single byte change defeats
hash matching; the absence of a result proves almost nothing. Three: confusing
1102 with a routine event. A cleared security log is not housekeeping — it
is anti-forensics, and it should raise your pulse.

**[RECAP — 4:55]**
Tier 1 triages, Tier 2 investigates, Tier 3 hunts — and clear escalation
criteria keep it fast. Measure true and false positives, and fight alert
fatigue by tuning, suppressing known-good, and automating. Memorise the
numbers: 4624 success, 4625 failure, 4672 admin privileges, 4720 new account,
1102 log cleared. Sysmon Event ID 1 shows the full command line. Read email
headers bottom to top. SPF, DKIM, and DMARC authenticate the sender. Sandboxes
reveal behaviour; hash lookups only confirm what is already known.

## On-screen visuals

- HOOK: alert queue flooding in, one red alert surfacing above the noise.
- SOC tiers: three-tier pyramid — triage, investigate, hunt — with escalation
  arrows; true vs false positive split diagram.
- Event IDs: a cheat-card of 4624/4625/4672/4720/1102 with plain meanings;
  Sysmon Event ID 1 log line with the full command line highlighted.
- Phishing: email header stack with bottom-up reading order arrows; SPF/DKIM/
  DMARC three-layer diagram; sandbox behaviour report mock-up; VirusTotal-style
  hash lookup with a "no results" caution note.
- RECAP: the cheat-sheet table as a summary card.
