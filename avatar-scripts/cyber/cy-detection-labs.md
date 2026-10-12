# Detection Lab Drills: Reading Real Attack Traces — Avatar Tutor Script

**Lesson ID:** cy-detection-labs
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~797 words)

## Spoken script

**[HOOK — 0:00]**
Reading about detections only goes so far. The CyberSecurity_Lab simulations
generate real attack traces safely — so you can run a drill, capture it with
your own tools, and check what you actually caught. This lesson walks through
four labs, what each attack looks like in telemetry, and how to grade your
detections against the answer key.

**[WHY IT MATTERS — 0:25]**
Every attack in this lesson is mapped to a MITRE ATT&CK technique ID, so
what you practise here connects directly to the framework from the
frameworks lesson. The goal is pattern recognition: when you see these
shapes in real telemetry, your instincts fire before your runbook does.

**[SECTION — Web attack traces — 0:50]**
First, credential stuffing — T1110. A burst of 401 responses for many
distinct usernames, all from one source, hammering /login. The giveaway is
the combination: one source, many names, all failing. And watch the ending —
a 401 burst that ends in a 200 means somebody got in.

Enumeration and directory busting — T1595 — is the mirror image: a spike of
404s across many distinct paths from one source, with a few 200s revealing
real content. The attacker is mapping the site by knocking on every door.
Hits on /.git, /.env, or admin paths deserve attention.

The SSRF drill aims a url= parameter at 169.254.169.254 — the cloud instance
metadata endpoint, where SSRF can leak IAM credentials (T1552.005). A web
tier should never fetch arbitrary user-supplied URLs.

For path traversal (T1083), a file= value like ..%2f..%2fetc/passwd teaches
the rule: decode once before matching. Double encoding — %252e decodes to
%2e, which a second decode turns into a dot — slips past a rule that
matches only one decoding.

**[SECTION — DDoS and amplification — 2:05]**
At the victim, different floods have different shapes. A volumetric flood
shows high requests per second over reused connections. Slowloris is the
opposite: concurrency climbs while requests never complete — the connections
just hang there, consuming slots.

A connection flood opens a fresh socket per request, so connections roughly
equal requests. A volumetric flood reuses keep-alive connections, so
requests far exceed connections. Same damage, different fingerprint.

The rapid-reset vector models CVE-2023-44487: streams initiated far exceed
streams completed, and connections open and then abort or reset almost
immediately.

The amplification lab is safe by design: it never spoofs a source IP, so the
large responses return to the sender, not a victim. NTP monlist has the
highest factor of the lab's profiles — about 556x — answering from UDP
source port 123.

**[SECTION — The gift-card lure chain — 3:25]**
The lure masquerades — T1036 — with a double or mismatched extension: the
name claims .pdf or .txt, but the real type is executable. Correlate the
downloaded file's Mark of the Web — the Zone.Identifier — with its later
execution. Downloaded from the internet, then executed: that is the story.

The persistence stage writes a Run key — caught by Sysmon Event IDs 12 and
13 on ...\CurrentVersion\Run, or by an Autoruns diff (T1547.001). It also
simulates a scheduled task — caught by Security Event ID 4698, or
schtasks.exe in process telemetry (T1053.005).

Its C2 beacon (T1071) is found by periodicity, not volume: repeated small
check-ins to one destination at a near-constant interval. Regularity is the
signal — even with jitter, the clockwork shows through.

**[SECTION — Grade yourself with the answer key — 4:30]**
Each lab writes an events.jsonl file: a ground-truth timeline of exactly what
the simulation did. Run a drill, capture it with Sysmon, EDR, or Wireshark,
then compare your alerts with the answer key. Anything in the key that you
did not catch is your next detection to write.

**[COMMON MISTAKES — 4:55]**
Three traps. One: hunting beacons by volume. Beaconing is found by
periodicity — the regular interval — not by how much data moves. Two:
matching traversal strings without decoding first. Double encoding like
%252e slips past a single-decode rule. Three: treating the answer key as the
lesson. events.jsonl is the grading rubric — the learning is in the
detections you write for what you missed.

**[RECAP — 5:20]**
Credential stuffing is a 401 burst across many usernames from one source;
enumeration is a 404 spike across many paths. SSRF aims at the metadata
endpoint — never let a web tier fetch user-supplied URLs. Decode before
matching traversal, and watch for double encoding. Volumetric floods reuse
connections; connection floods open fresh ones; slowloris hangs them open;
rapid reset aborts them. NTP monlist amplifies about 556x off UDP port 123 —
measured safely, with no spoofing. The lure masquerades with mismatched
extensions; persistence lands in Run keys and scheduled tasks; beacons betray
themselves by their clockwork. And events.jsonl grades it all: drill,
capture, compare, write the missing detection.

## On-screen visuals

- HOOK: lab simulation running, telemetry streaming into Sysmon/EDR/
  Wireshark dashboards.
- Web traces: 401-burst timeline across usernames; 404-spike across paths
  with /.git and /.env hits flagged; SSRF arrow to 169.254.169.254; double-
  encoding decode chain %252e to %2e to dot.
- DDoS: three flood shapes side by side — volumetric (high RPS), slowloris
  (climbing concurrency), rapid reset (initiated vs completed streams);
  amplification factor bars with NTP monlist at ~556x.
- Lure chain: file with mismatched extension and its Zone.Identifier;
  Sysmon 12/13 on the Run key; Event 4698 for the scheduled task; beacon
  timeline with clockwork intervals.
- Answer key: events.jsonl timeline beside the analyst's alerts, missed items
  highlighted as "next detection to write."
- RECAP: the cheat-sheet table as a summary card.
