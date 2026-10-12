# D2 Capstone: Scenario Judgment — Data Under Pressure — Avatar Tutor Script

**Lesson ID:** cissp-cap-d2
**Track:** CISSP Domains
**Estimated runtime:** ~5 minutes (~656 words)

## Spoken script

**[HOOK — 0:00]**
Domain 2 scenarios revolve around one truth: data outlives every other asset
in the story. Employees leave, projects end, lawsuits begin — and the data
remains. The exam tests whether you protect it through its whole lifecycle,
including the awkward moments: the departure, the test environment, the
litigation hold. This lesson drills those moments.

**[WHY IT MATTERS — ~0:25]**
Data-handling scenarios are deceptively simple. The right answer is usually
the disciplined one — revoke first, sanitise properly, never shortcut —
while the distractors offer speed and convenience. Learn the patterns and
these questions answer themselves in seconds.

**[SECTION — Departures and remanence — ~0:50]**
An employee with access to customer PII resigns today. What matters first?
Containment before cleanup. Revoke access immediately — so nothing more can
leave — then handle the hardware per the media-handling policy: sanitise,
destroy, or reassign based on classification. The order is the lesson.
Cutting off access is urgent; the laptop can wait an hour. Reversing the
order is how data walks out the door on someone's last day.

Then the hardware. Data remanence means the bits survive deletion, so the
method must match the classification. A quick format is not sanitisation —
it's tidying the index while the chapters remain. For the highest tiers:
cryptographic erase or destruction, documented and witnessed. Documented,
because one day an auditor — or a court — will ask for proof, and "trust
us" isn't proof. Witnessed, because sensitive destruction performed alone
is a story, not a control.

Notice the policy gives three options, not one: sanitise, destroy, or
reassign — chosen by classification. Lower-sensitivity media can be
sanitised and reassigned to the next user; the highest tiers get erased or
destroyed. The point is that the decision follows the classification, not
convenience. Ask yourself: if this drive turned up for sale tomorrow, would
the method you chose hold up?

**[SECTION — Test data and legal holds — ~2:40]**
Marketing wants production customer data copied into the test environment to
speed up QA. The answer is always no — use masked, anonymised, or synthetic
data instead. Here's why: test systems rarely carry production-grade access
controls, logging, or monitoring. They're built for speed and rebuilt
constantly, with developers, testers and contractors all reaching in. Real
PII in a test environment is a breach waiting for an auditor — or an
attacker — to find. Convenience is the distractor; the data's protection
level must follow the data, not the environment's budget. Whichever
substitute you choose — masked, anonymised, or synthetic — the real customer
data never lands in test.

Then the litigation hold. Legal issues a hold covering six months of email.
What happens first? Suspend the normal retention and destruction schedule
for the affected data. A legal hold overrides retention — the schedule is
frozen, not cancelled, which means even the automated deletion jobs get
switched off for the affected data. Destroying held data can be ruled
spoliation of evidence, with serious legal consequences on top of the
original lawsuit — the organisation's position in the case collapses along
with the data.
And the hold extends to backups and archives, not just live data. When in
doubt, preserve and ask legal. Deleting first and asking later is how
careers end.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: sanitising the laptop before revoking access. Containment
comes first — revoke, then handle the hardware. Two: accepting a quick
format as sanitisation. It's not, for any sensitive classification. Three:
copying production data to test "temporarily." There is no safe temporary
— test environments don't carry production-grade controls, so the answer is
masked, anonymised, or synthetic data, every time.

**[RECAP — ~5:00]**
Departures run containment before cleanup: revoke access first, then
sanitise, destroy, or reassign hardware per the media-handling policy —
matched to classification, documented and witnessed. A quick format is never
sanitisation. Production PII never belongs in test environments; use masked,
anonymised, or synthetic data. A litigation hold suspends retention and
destruction — including backups and archives — and destroying held data is
spoliation. When in doubt, preserve and ask legal.

## On-screen visuals

- HOOK: a departing employee's timeline — access revoked, then hardware
  handled.
- Departures and remanence: revoke-first-then-cleanup sequence diagram;
  sanitisation methods matched to classification tiers; the "quick format is
  not sanitisation" warning.
- Test data and legal holds: production-vs-test protection gap diagram;
  masked/anonymised/synthetic data options; legal hold as a freeze overlay
  on the retention schedule, extending to backups.
- RECAP: the cheat-sheet rows as a clean summary card.
