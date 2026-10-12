# Core Security Concepts: CIA, AAA, Zero Trust and Physical Security — Avatar Tutor Script

**Lesson ID:** cy-concepts
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~789 words)

## Spoken script

**[HOOK — 0:00]**
Before any tool or protocol, security rests on a handful of ideas that show
up on every exam and in every real design review. What are you protecting?
Who gets in? How do you arrange trust? Learn these cold.

**[WHY IT MATTERS — 0:25]**
This lesson turns abstractions into working instincts: which goal a
ransomware attack actually hits, why a mantrap beats a polite sign, and how
biometric error rates really trade off. The exam tests these as scenarios —
so we will train the instinct, not just the vocabulary.

**[SECTION — CIA and AAA in practice — 0:50]**
The CIA triad: confidentiality keeps secrets secret, integrity keeps data
trustworthy, availability keeps systems reachable. Now practise the instinct.
Ransomware that encrypts your files attacks availability; when it also steals
them for double extortion, confidentiality falls too. A database with wrong
balances but no outage is an integrity failure — and only a verified clean
copy restores it, because a backup of corrupted data restores corruption.

Redundancy — RAID, clustering, generators — buys availability. Hashes,
checksums, and version control buy integrity by detecting change.
Encryption buys confidentiality. Most real controls serve one goal
primarily, and knowing which one tells you what an attack actually breaks.

Then AAA, three separate questions. Authentication: prove who you are.
Authorization: what you may do. Accounting: a record of what you did. A
badge that opens the door but logs nothing failed at accounting — and
without that record, incident response is blind.

**[SECTION — Zero trust and layered defense — 2:10]**
The old castle-and-moat model trusted everything inside the network. Zero
trust assumes no implicit trust by location: every request is verified
continuously — identity, device health, context. A compromised laptop on the
LAN gets no free pass.

Microsegmentation carves the network into tiny isolated zones, so breaching
one does not open the rest. Continuous validation re-checks throughout the
session, rather than once at login.

The architecture has three logical pieces, per NIST 800-207: the policy
engine decides, the policy administrator configures, and the policy
enforcement point applies the decision.

Defence in depth layers controls so one failure is not a breach: if phishing
beats training, MFA and EDR still stand in the way. And "assume breach"
designs detection, segmentation, and least privilege as if attackers were
already inside — because eventually, they will be.

**[SECTION — Physical security and biometrics — 3:25]**
Physical controls are the outermost layer. Bollards stop vehicle ramming. A
mantrap — two interlocked doors, the second opening only after the first
closes — defeats tailgating. A Faraday cage blocks all radio signals, for
rooms where wireless exfiltration is a concern. Cable locks deter
opportunistic laptop theft, and visitor logs with escorts keep non-employees
accountable.

Biometrics authenticate "something you are": fingerprint, iris, face, voice.
Two error rates govern them — the false acceptance rate, wrongly admitting
someone, and the false rejection rate, wrongly denying them. Lowering one
raises the other. The crossover error rate, where the two are equal, lets you
compare systems objectively.

The catch with biometrics is permanence: you cannot revoke a compromised
fingerprint. So use biometrics for convenience, and pair them with something
revocable — a PIN or token — where the stakes are high.

**[SECTION — Design principles that prevent fraud — 4:30]**
Separation of duties splits critical tasks so no single person can complete
fraud alone — the approver of payments cannot also issue them. Dual control
requires two authorised people for one sensitive action, as in key ceremonies
and large transfers.

Job rotation exposes fraud by putting fresh eyes on a role. Mandatory
vacations force a break in any scheme that needs constant cover — both are
classic anti-fraud controls, especially in finance. And "need to know"
limits information access to those whose role requires it.

See how they compose: classification labels the data, need-to-know limits
who sees it, least privilege limits what they can do with it, and separation
of duties ensures no one person controls the whole chain.

**[COMMON MISTAKES — 5:25]**
Three traps. One: calling ransomware purely an availability attack. With
double extortion it hits confidentiality too. Two: treating biometrics as
the strong factor. They are convenient but irrevocable — pair them with
something you can revoke. Three: thinking any backup restores integrity.
Only a verified clean copy does.

**[RECAP — 5:50]**
CIA: confidentiality through encryption, integrity through hashes and
version control, availability through redundancy. AAA: prove, permit,
record. Zero trust verifies every request; the engine decides, the
administrator configures, the enforcement point applies. Defence in depth
layers controls; assume breach designs as if attackers are inside.
Physically: bollards, mantraps, Faraday cages, escorts. Biometrics trade FAR
against FRR — compare with CER — and cannot be revoked. Against fraud:
separation of duties, dual control, job rotation, mandatory vacations, need
to know.

## On-screen visuals

- HOOK: three questions — "what are you protecting?", "who gets in?", "how
  do you arrange trust?" — resolving into the lesson map.
- CIA/AAA: ransomware hitting availability then confidentiality; integrity
  failure with corrupted balances; controls mapped to their primary goal;
  AAA three-gate flow with the unlogged badge failure; implicit-deny default.
- Zero trust: castle-and-moat vs never-trust-always-verify; microsegmented
  zones containing a breach; engine/administrator/enforcement-point
  decision flow; assume-breach design posture.
- Physical/biometrics: bollard, mantrap door sequence, Faraday cage;
  FAR-vs-FRR seesaw with the CER crossover point; permanence warning on a
  fingerprint.
- Fraud principles: separation-of-duties split task; dual-control ceremony;
  the composed chain — classify, need-to-know, least privilege, separation.
- RECAP: the cheat-sheet table as a summary card.
