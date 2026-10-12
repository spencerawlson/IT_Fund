# Domain 5: Identity and Access Management (13%): Who, How and How Much — Avatar Tutor Script

**Lesson ID:** cissp-d5
**Track:** CISSP Domains
**Estimated runtime:** ~6 minutes (~778 words)

## Spoken script

**[HOOK — 0:00]**
Identity is the new perimeter. Firewalls still matter, but every decision —
what you can open, what you can change, what gets blamed on you — starts
with the question: who is at the keyboard? Domain 5 makes sure the right
people, and only they, reach the right resources — and that everything they
do is attributable to them.

**[WHY IT MATTERS — ~0:25]**
Most breaches involve compromised credentials, not broken cryptography. The
exam tests identity relentlessly because the real world fails at it
relentlessly. This domain is also beautifully testable: sequences, error
types, protocols with exact behaviours. Precision pays here.

**[SECTION — The access control sequence — ~0:50]**
Four steps, in order. Identification: claim an identity — "I'm Alice."
Authentication: prove it — the password, the token, the fingerprint.
Authorisation: receive permissions — now the system decides what Alice may
do. Accountability: actions are logged and attributable to Alice.

Here's why the order matters, and why the fourth step is the exam's
favourite. Accountability depends on unique identities. Shared accounts
break it: if five people use "admin," the logs prove nothing. Picture a
hotel. You give your name at reception — identification. You show ID —
authentication. You get a room key — authorisation. And the key log records
every entry — accountability. Skip any step and the system can't trust the
rest.

**[SECTION — Biometrics — ~1:50]**
A Type I error is a false rejection: a valid user is denied. A Type II error
is a false acceptance: an impostor gets in. Type II is the more serious
security failure — a stranger inside beats a legitimate user stuck outside,
every time. Tightening a system trades one for the other; you can't reduce
both at once by turning a single dial.

The crossover error rate — the CER — is where the two rates are equal, and
a lower CER means a more accurate system. It's the biometric's report card:
one number that lets you compare devices honestly.

Think of the bouncer analogy. A bouncer who's too strict turns away regulars
— Type I. A bouncer who's too lax waves in strangers — Type II.

**[SECTION — Kerberos and federation — ~2:50]**
Kerberos relies on a trusted third party: the Key Distribution Center, the
KDC, which contains the Authentication Service and the Ticket-Granting
Service. You authenticate to the KDC, it hands you tickets, and services
trust the tickets. Its main weaknesses are structural: the KDC is a single
point of failure, and the protocol needs synchronised time — clock skew
beyond five minutes, the default, breaks authentication. Picture a festival
ticket booth. If the booth goes down, nobody gets in. And if your watch
disagrees with the booth's clock by more than five minutes, your ticket looks
forged.

Federated identity means trusting identities issued by another
organisation's identity provider, implemented with SAML, OIDC or
WS-Federation. Your company trusts the partner's IdP the way a country
trusts another country's passport office.

**[SECTION — Keeping access right-sized — ~3:55]**
Just-in-time access grants elevated rights only when needed, for a limited
time — eliminating standing privilege.

Periodic access reviews, where managers recertify their team's access,
remove privilege creep and orphaned accounts. People's jobs change; their
permissions should change with them. The review is the mechanism.

NIST SP 800-63B rewrote password wisdom: favour length, screen new passwords
against lists of breached passwords, and no forced periodic rotation. Change
a password only on evidence of compromise. Why? Forced rotation produces
"Password1" becoming "Password2" — predictable, not secure. Length plus
breach-screening beats arbitrary complexity plus expiry.

Session management needs timeouts, secure unpredictable tokens,
re-authentication for sensitive actions, and invalidation on logout and
password change. And risk-based — conditional — access adjusts requirements
by context: device, location, risk score. Require MFA from unknown devices;
block impossible travel. Same user, different situation, different rules.

**[COMMON MISTAKES — ~5:10]**
Three traps. One: mixing up Type I and Type II. False rejection is Type I;
false acceptance is Type II — and Type II is the worse security failure.
Two: believing forced password rotation is best practice. NIST 800-63B says
length, breach-screening, and no forced rotation. Three: swapping
identification and authentication. Claiming the identity comes first;
proving it comes second.

**[RECAP — ~5:35]**
Identify, authenticate, authorise, account — in that order — and keep
identities unique so accountability survives. Biometrics: Type I rejects the
valid, Type II admits the impostor, and lower CER means a better system.
Kerberos runs on the KDC — the Authentication Service plus the Ticket-
Granting Service — a single point of failure that needs clocks within five
minutes. Federation trusts another organisation's IdP via SAML, OIDC or
WS-Federation. Right-size access with just-in-time elevation and periodic
reviews. Follow NIST 800-63B: long passwords, breach-screened, no forced
rotation. Manage sessions with timeouts and re-authentication, and let risk
— device, location, score — set the requirements.

## On-screen visuals

- HOOK: a keyboard with a "who is typing?" identity overlay.
- The access control sequence: four-step hotel-analogy flow — reception,
  ID check, room key, key log.
- Biometrics: Type I vs Type II error diagram with the bouncer analogy; CER
  crossover point on an FRR/FAR graph.
- Kerberos and federation: KDC ticket-booth diagram (AS + TGS) with the
  five-minute clock-skew warning; federation trust arrow between two
  organisations' identity providers.
- Keeping access right-sized: JIT elevation timeline; NIST 800-63B password
  guidance card; conditional-access context dials (device, location, risk).
- RECAP: the cheat-sheet rows as a clean summary card.
