# Identity & Access Management: Prove, Permit, Manage — Avatar Tutor Script

**Lesson ID:** sec-iam
**Track:** Security+ (SY0-701)
**Estimated runtime:** ~6 minutes (~797 words)

## Spoken script

**[HOOK — 0:00]**
Identity is the new perimeter. The firewall used to be the wall; now the wall is the login. Most breaches involve stolen or misused credentials, which makes strong authentication, sensible authorisation models, and disciplined account lifecycles among the highest-value controls you can implement.

**[WHY IT MATTERS — ~0:25]**
This lesson is classification-heavy, which means the exam loves it: factors versus categories, SAML versus OAuth versus OpenID Connect, four access control models that sound alike. The scenarios collapse once you can sort each term into its bucket — and in real jobs, this is the control set that stops the most breaches per dollar spent.

**[SECTION — Multi-factor authentication — ~0:50]**
Factors are categories of proof. Something you know: a password, a PIN. Something you have: a phone, a hardware key. Something you are: a fingerprint, a face. Plus somewhere you are — location — as an attribute. Here is the rule the exam tests: MFA needs factors from different categories. Two passwords are still one factor. A password plus a hardware key is two.

Not all MFA is equal. SMS codes can be intercepted through SIM swapping — the attacker convinces your carrier to move your number to their SIM. Push prompts can be fatigue-bombed: approve, approve, approve until the tired user taps yes at midnight. FIDO2 and passkeys, using hardware or platform authenticators, resist phishing best — the credential is bound to the real site's domain and never typed.

**[SECTION — SSO and federation — ~2:00]**
Single sign-on lets one authentication grant access to many applications. The win is less password fatigue — fewer passwords to remember, fewer to reuse. But it concentrates risk: compromise the identity provider, the IdP, and you hold keys to everything. So the IdP gets the strongest protection you have.

Federation extends SSO across organisational boundaries, and three protocols do the work. SAML is the XML-based standard for federated web SSO: the IdP issues signed assertions that a service provider trusts — "my company's login vouches for me to this vendor's app." OAuth 2.0 is delegated authorisation, letting an app act on your behalf with limited scope, without your password. OpenID Connect adds authentication on top of OAuth with an ID token — that is what "Sign in with Google" uses.

The exam's favourite split: SAML for federated web SSO, OAuth for delegated authorisation, OpenID Connect when you add authentication to OAuth.

**[SECTION — Access control models — ~3:10]**
Four models, from most to least centralised. Mandatory Access Control — MAC — uses labels and clearances set by the system, and users cannot change permissions. It is the military and government model: the system decides, full stop.

Discretionary Access Control — DAC — lets the data owner set permissions, as on NTFS file shares. Convenient, and exactly as safe as the owner's judgement.

Role-Based Access Control — RBAC — grants permissions by job function: permissions go to roles, users go to roles. New hire in accounting? Put them in the accounting role. It scales because you manage roles, not individuals.

Attribute-Based Access Control — ABAC — evaluates attributes: department, time of day, device, data sensitivity. The most granular, and cloud IAM policies are largely ABAC under the hood. When the question describes access decided by multiple attributes, that is ABAC.

**[SECTION — Privilege and the account lifecycle — ~4:10]**
Least privilege means giving only the access needed to do the job. Pair it with regular access reviews to catch privilege creep: the slow accumulation of rights as people change roles and nobody removes the old ones.

Privileged access management — PAM — vaults admin credentials, provides just-in-time elevation instead of standing privilege, and records privileged sessions. No more shared admin passwords in a spreadsheet.

And the lifecycle: provisioning creates accounts at hire; deprovisioning removes access at exit. Orphaned accounts left behind by leavers are one of the most common audit findings — a former employee's credentials still working, months later.

**[COMMON MISTAKES — ~5:00]**
Three traps. One: counting two passwords as MFA. Same category means one factor. Two: mixing up the federation trio — SAML is federated web SSO, OAuth is delegated authorisation, OpenID Connect adds the ID token. Three: confusing MAC with DAC. MAC is system-set labels you cannot change; DAC is the owner's discretion.

**[RECAP — ~5:25]**
MFA combines factors from different categories — know, have, are — and FIDO2 and passkeys resist phishing best, while SMS falls to SIM swapping. SSO centralises convenience and risk in the IdP; SAML federates web SSO, OAuth delegates authorisation, OpenID Connect adds authentication. Access models run from MAC's system-set labels through DAC's owner discretion and RBAC's roles to ABAC's attributes. Least privilege plus reviews beats privilege creep, PAM vaults the admin keys, and deprovisioning closes the door behind leavers.

## On-screen visuals

- HOOK: a login prompt as the new perimeter wall, with a breached credential walking through.
- MFA: factor categories as three buckets — know, have, are — with two passwords landing in the same bucket; FIDO2/passkey versus SMS-under-SIM-swap and push fatigue.
- SSO/federation: one login branching to many apps with the IdP as the crown; SAML, OAuth, and OpenID Connect as three labelled protocol cards.
- Access models: a spectrum from MAC (system labels) through DAC (owner decides) and RBAC (roles) to ABAC (attributes evaluated).
- Lifecycle: provisioning at hire, access reviews catching privilege creep, deprovisioning at exit — no orphaned accounts.
- RECAP: the cheat-sheet rows as a clean summary card.
