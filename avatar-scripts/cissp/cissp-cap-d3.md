# D3 Capstone: Scenario Judgment — Architecture Under Pressure — Avatar Tutor Script

**Lesson ID:** cissp-cap-d3
**Track:** CISSP Domains
**Estimated runtime:** ~5 minutes (~643 words)

## Spoken script

**[HOOK — 0:00]**
Domain 3 scenarios test architectural principles under pressure: what the
system does when it fails, how controls layer, and where the keys live. The
exam loves designs that look reasonable until one principle is violated —
and your job is to spot the violation. This lesson drills the three patterns
that catch most of them.

**[WHY IT MATTERS — ~0:25]**
Architecture questions punish memorisation and reward principle. You can't
memorise every design the exam invents, but three principles — fail secure,
layered defences, separated keys — resolve a surprising number of scenarios.
Learn to ask the right questions of any design.

**[SECTION — Fail secure, layer defences — ~0:50]**
You're reviewing a new payment application. If a component fails
unexpectedly, what's the most important design property? Fail-secure — fail
closed. Failures deny access rather than granting it. Any design where a bug
becomes a vulnerability has this backwards. Picture the authentication
service crashing during a login storm: fail-secure means the doors stay
shut; fail-open means the storm walks in. Deny by default is the quiet
version of the same principle: the system says no unless it's told yes,
especially when things break. A failure that opens access turns every bug
into a vulnerability — and bugs are inevitable.

Then the layering debate. The team argues firewall versus IPS for the
data-centre edge. The answer is both — and here's why it's not a cop-out.
Defence in depth is not two firewalls. It's different control functions
layered so one miss is another's catch: a firewall for access control plus
an IPS for threat prevention. They aren't substitutes; they're complements.
Duplicates of the same control are redundancy. Different functions in layers
are defence in depth. When the exam offers you a bigger version of one
control — a second firewall, a faster IPS — that's the distractor. Depth
means different functions, each catching what the others miss.

**[SECTION — Keys live apart from data — ~2:50]**
A cloud design stores encryption keys alongside the encrypted data — same
account, same admins. What's wrong? Everything about the key management.
Whoever holds both the ciphertext and the key holds the plaintext. One
compromised account yields both the lock and the key, and the encryption
might as well not exist.

Keys belong in a dedicated security domain: a KMS or HSM with split
administrative duties. Never next to the data, never in source code, never
in the same admin's pocket. The separation has to be real — different
access paths, different administrators — because the whole point is that one
breach can't collect both halves.

Key management questions on the exam almost always reduce to separation and
lifecycle. Generate securely. Store separately. Rotate on schedule and on
compromise — a suspected breach means new keys, not a debate. Destroy when
retired. If a scenario hands you keys in the wrong place, keys that never
rotate, or keys nobody destroys, you've found the violation. Separation and
lifecycle — that's the whole checklist.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: choosing fail-open for availability. A failure that grants
access is a vulnerability, not a feature — fail secure, deny by default.
Two: treating defence in depth as stacking identical controls. Two
firewalls aren't layered defence; a firewall plus an IPS — different
functions — is. Three: accepting keys stored with the data for convenience.
Convenience is the distractor; separation into a KMS or HSM with split
duties is the answer.

**[RECAP — ~5:05]**
Fail-secure means failures deny access — fail closed — and deny by default
is the same principle running quietly. Defence in depth layers different
control functions, not duplicates: a firewall's miss is the IPS's catch.
Keys live apart from the data they protect, in a dedicated security domain
— KMS or HSM with split duties — never beside the data, in source code, or
with the same admins. And every key question reduces to separation and
lifecycle: generate securely, store separately, rotate on schedule and on
compromise, destroy when retired.

## On-screen visuals

- HOOK: a payment-app design review with a hidden principle violation
  highlighted.
- Fail secure, layer defences: fail-closed vs fail-open outcome diagram;
  firewall-plus-IPS layered defence vs duplicated-firewall comparison.
- Keys live apart from data: the "lock and key in one account" violation
  diagram; KMS/HSM dedicated security domain with split duties; the key
  lifecycle — generate, store, rotate, destroy.
- RECAP: the cheat-sheet rows as a clean summary card.
