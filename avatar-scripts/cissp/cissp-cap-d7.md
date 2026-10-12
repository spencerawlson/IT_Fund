# D7 Capstone: Scenario Judgment — Operations Under Fire — Avatar Tutor Script

**Lesson ID:** cissp-cap-d7
**Track:** CISSP Domains
**Estimated runtime:** ~4 minutes (~601 words)

## Spoken script

**[HOOK — 0:00]**
Domain 7 scenarios happen at the worst possible time — and the exam checks
whether your instincts follow the incident-response order instead of panic.
Contain first, think second, learn always. When ransomware is encrypting
file shares right now, there's no time to improvise. There is only the
sequence. This lesson drills it until it's pure muscle-memory reflex.

**[WHY IT MATTERS — ~0:25]**
Incident scenarios are the purest test of the CISSP mindset. Every
distractor is something a panicking person would do: pay the ransom, restore
first, blame the user. The right answers are boring, ordered, and
disciplined. Learn the order and the exam's chaos becomes choreography.

**[SECTION — Contain before you cure — ~0:50]**
The SOC watches ransomware actively encrypting file shares right now. The
first action? Isolate the affected systems from the network. Incident
response runs contain, then eradicate, then recover — in that order, always.
Stopping the spread comes before forensics, before backups, before blame.
Every minute of spread multiplies the recovery bill. Isolation buys the team
something priceless: time to think. You don't diagnose the disease while the
patient is bleeding out; you stop the bleeding.

Then eradication before recovery — or you restore the attacker along with
the data. Confirm the attacker has no foothold left, and the root cause is
gone, before bringing systems back. Recovering onto a still-compromised
network is just scheduling the second incident. The sequence exists because each step protects the next one:
containment protects eradication, eradication protects recovery.

**[SECTION — Triage by fidelity, close with learning — ~2:45]**
A three a.m. alert reports a single failed login for one user. How should
the SOC treat it? Low priority: baseline noise unless corroborated by other
indicators. Triage is about fidelity. One failed login is expected
background noise — users mistype passwords. Five hundred failures from one
IP is an incident. Same event type, wildly different meaning. One alert is
a data point; two corroborating alerts are a story. The SOC's job isn't to
chase every alert; it's to tune the noise and chase the signal.
Corroboration is what turns an alert into a case.

The incident is resolved and systems are restored. What's the most important
step before closing it? Hold a lessons-learned review — and update
playbooks, controls, and monitoring from what the incident taught. The
playbooks, so the next shift knows what to do. The controls, so the hole
stays closed. The monitoring, so the signal is louder next time. Without
the post-incident review, the same incident will recur on schedule. The exam
contrasts this with the tempting wrong answers: closing fast to protect the
MTTR metric, or disciplining the user who clicked. Speed of closure is less
important than quality of learning. Improvement — not closure speed — is the
goal. The review is where the organisation gets smarter; everything before
it was just survival.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: restoring from backup before containing and eradicating.
Contain, eradicate, recover — or you restore the attacker too. Two: treating
every alert as an incident. Triage by fidelity and corroboration — a single
failed login is noise. Three: closing the incident without the
lessons-learned review. Gaming the MTTR metric or blaming the user feels
productive; updating playbooks from what you learned actually is.

**[RECAP — ~5:00]**
Active attack right now: isolate first — contain, then eradicate, then
recover, in that order, because each step protects the next. Never recover
onto a still-compromised environment. Triage alerts by fidelity and
corroboration: one failed login is noise, five hundred from one IP is a
case — tune the noise, chase the signal. And before closing any incident,
hold the lessons-learned review and update playbooks, controls, and
monitoring. Speed of closure matters less than quality of learning.

## On-screen visuals

- HOOK: ransomware encrypting file shares in real time with a countdown
  clock.
- Contain before you cure: the contain-eradicate-recover sequence as a
  locked pipeline; isolation cutting the network spread.
- Triage by fidelity, close with learning: single-failed-login noise vs
  five-hundred-failure signal comparison; the lessons-learned review
  feeding updated playbooks.
- RECAP: the cheat-sheet rows as a clean summary card.
