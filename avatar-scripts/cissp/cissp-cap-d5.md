# D5 Capstone: Scenario Judgment — Identity Under Stress — Avatar Tutor Script

**Lesson ID:** cissp-cap-d5
**Track:** CISSP Domains
**Estimated runtime:** ~4 minutes (~611 words)

## Spoken script

**[HOOK — 0:00]**
Domain 5 scenarios test the identity lifecycle under stress: proving who
someone is without sharing secrets, bounding the damage when a session is
stolen, and treating an exposed credential as compromised the instant it
leaks. The exam's identity questions are really judgment questions — and
they have patterns. Let's drill them.

**[WHY IT MATTERS — ~0:25]**
Identity failures cause most breaches, so the exam probes every weak seam:
the shared password, the endless session, the leaked key nobody rotated.
Each scenario has a standard answer. Learn the standards and you'll spot the
right move in seconds.

**[SECTION — Federate, do not share — ~0:50]**
A new SaaS HR tool must let staff sign in with corporate credentials — but
passwords must never be shared with the vendor. The answer is federation:
SAML for enterprise SSO, OIDC for modern web apps. The identity provider
authenticates the user; the service trusts the assertion. Passwords never
cross the boundary. The vendor never holds your secrets, so the vendor can
never leak them — there's nothing in the vendor's database worth phishing for.

Here's the deeper principle: shared accounts destroy accountability. If
everyone signs in as the same service account, the logs prove nothing and
no action is attributable. When everyone is "admin," no one is. Every exam answer that proposes sharing
credentials — service or human — is wrong. Federation gives each user their
own identity at the third party without giving the third party anything to
steal. It's the standard because it removes the secret from the equation
entirely.

**[SECTION — Sessions are the second half of authentication — ~2:45]**
An administrator's session was hijacked even though MFA was enforced at
login. Which control would best have limited the damage? Short session
timeouts with step-up re-authentication for privileged actions. Here's the
insight: MFA proves identity at login — it says nothing about the session
afterwards. Authentication is the front door; the session is everything that
happens inside the house. A stolen session bypasses the MFA entirely,
because the MFA already did its job and went home.

So sessions need their own controls. Short timeouts. Idle disconnects.
Step-up re-authentication before privileged actions — prove it's still the
same human before the irreversible move. The more powerful the session, the
shorter its leash. An admin session that lives forever is a standing
invitation, and the exam treats it as one.

And the leaked secret. A developer committed a production API key to a
public repository an hour ago. What do you do first? Revoke and rotate the
key immediately — then investigate the exposure. An exposed secret is a
compromised secret; the order matters because every minute of delay is
attacker opportunity. Assume the key is already in someone else's hands —
because it might be. Containment cannot wait for the investigation to
finish. Delete the repo, monitor the key, schedule rotation for next
quarter — those are all ways of hoping. Hope is not a control.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: storing corporate passwords in the SaaS app or issuing
shared accounts. Federate with SAML or OIDC — never share secrets across
the boundary. Two: believing MFA protects the session. MFA proves identity
at login; sessions need timeouts and step-up re-authentication of their
own. Three: investigating a leaked key before rotating it. Revoke and rotate
first — every minute of delay is attacker opportunity.

**[RECAP — ~5:05]**
Federate, don't share: SAML for enterprise SSO, OIDC for modern web apps —
the IdP authenticates, the service trusts the assertion, and passwords never
cross the boundary. Shared accounts destroy accountability and are never the
answer. MFA proves identity at login; sessions need their own controls —
short timeouts, idle disconnects, step-up re-authentication for privileged
actions. And an exposed secret is a compromised secret: revoke and rotate
first, investigate second.

## On-screen visuals

- HOOK: an identity under stress — stolen session, leaked key, shared
  password — three threat cards.
- Federate, do not share: federation flow — user to IdP to SaaS assertion —
  with the password staying inside the corporate boundary; shared-account
  accountability breakage diagram.
- Sessions are the second half of authentication: MFA-at-login vs session-
  lifetime timeline showing the unprotected gap; step-up re-authentication
  gate before privileged actions; revoke-first secret-spill response order.
- RECAP: the cheat-sheet rows as a clean summary card.
