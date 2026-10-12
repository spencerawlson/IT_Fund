# Detection Engineering: Sigma, YARA and Behavioural Detections — Avatar Tutor Script

**Lesson ID:** cy-detection
**Track:** Cybersecurity Operations
**Estimated runtime:** ~5 minutes (~696 words)

## Spoken script

**[HOOK — 0:00]**
Your SIEM collects millions of logs a day. Without detection rules, it is
just an expensive hard drive. Detection engineering is the craft of writing
the rules that turn those logs into alerts worth a human's attention — and
done well, it is software engineering applied to the SOC.

**[WHY IT MATTERS — 0:25]**
Detection engineering means writing, testing, and maintaining the rules that
turn logs into alerts. The discipline matters: version-controlled, tested,
and measured against real attacker techniques. This lesson covers the rule
languages, the engineering discipline, and the attacker behaviours worth
detecting.

**[SECTION — Rule languages — 0:50]**
Three languages, three jobs. Sigma is a generic, SIEM-agnostic format for log
detections. You write the logic once in YAML, then convert it into Splunk,
Elastic, or Microsoft Sentinel queries. Why does that matter? Because without
Sigma, every SIEM migration means rewriting your entire detection library by
hand.

YARA rules identify malware files with strings and conditions — "if a file
contains these byte patterns, flag it." Scanners and sandboxes use them. And
Snort and Suricata are open-source network intrusion detection and prevention
engines that match signature rules against traffic as it flows.

Then the two philosophies. Signature detection matches known-bad patterns:
precise, but blind to novel attacks — it only catches what it has seen.
Anomaly detection flags deviations from a baseline: it catches the new, but
it is noisier. Precision versus novelty — you need both.

**[SECTION — Coverage and discipline — 2:05]**
How do you know your detections cover anything? Map each detection to ATT&CK
techniques. A heat map of techniques makes the gaps obvious — you can see at
a glance which attacker behaviours you would miss entirely. Coverage you can
see is coverage you can fix.

Then treat detections like software: detection as code. Store rules in git,
test them, review them like code, and deploy them through CI. A detection
that was never tested and never reviewed is a hope, not a control.

And here is the validation step most teams skip: prove the detection works by
safely emulating the technique — Atomic Red Team is the standard tool — and
confirming the alert actually fires. Do it in a lab or controlled environment
first. An untested detection is a detection you are hoping works.

**[SECTION — Behaviours worth detecting — 3:15]**
Now the attacker behaviours that earn their detections. PowerShell abuse
often shows encoded commands — the -enc flag — and download cradles. Enable
Script Block Logging, Event ID 4104, to see the decoded script. Here is why:
the attacker encodes the command to hide it, and Script Block Logging
decodes it for you.

Living off the land means abusing built-in tools like certutil or rundll32 —
LOLBins. They are hard to block because they are legitimate Windows tools, so
detect the anomaly instead: unusual parent-child process pairs and strange
arguments. Nobody's word processor should be launching certutil.

Beaconing is malware calling back to its command and control at regular
intervals — detectable by consistent timing and request sizes. And DNS
tunnelling hides data or C2 inside DNS queries: look for long, high-entropy
subdomains and unusually high query volumes to one domain. Normal DNS does
not look like that.

**[COMMON MISTAKES — 4:25]**
Three traps. One: writing a detection and never testing it. Emulate the
technique with Atomic Red Team and confirm it fires — in a lab first. Two:
relying on signatures alone. They are precise but blind to anything novel;
anomaly detection covers the gap at the cost of noise. Three: blocking
LOLBins outright. They are legitimate tools — you cannot block certutil
without breaking Windows. Detect the unusual use instead.

**[RECAP — 4:50]**
Sigma writes once and converts to any SIEM. YARA matches malware files by
strings and conditions. Snort and Suricata match signatures against network
traffic. Signatures are precise but blind to the new; anomalies catch the new
but are noisier. Map detections to ATT&CK to see your gaps, manage them as
code with git and CI, and validate with Atomic Red Team. Detect encoded
PowerShell with Event 4104, LOLBins by their odd parents and arguments,
beaconing by its clockwork timing, and DNS tunnelling by its strange, chatty
subdomains.

## On-screen visuals

- HOOK: a SIEM drowning in log lines, detection rules distilling them into a
  few crisp alerts.
- Rule languages: Sigma YAML flowing into Splunk/Elastic/Sentinel query
  shapes; the lesson's YARA rule with strings and condition highlighted;
  Snort/Suricata inspecting packets on a wire.
- Coverage: ATT&CK heat map with dark gaps; git/CI pipeline for detection-as-
  code; Atomic Red Team emulation triggering an alert in a lab sandbox.
- Behaviours: the encoded PowerShell Sigma rule from the lesson; parent-child
  process tree showing rundll32 launched oddly; beaconing timing graph with
  clockwork intervals; DNS query with a long high-entropy subdomain.
- RECAP: the cheat-sheet table as a summary card.
