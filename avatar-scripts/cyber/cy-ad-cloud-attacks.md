# Active Directory & Cloud Attacks: Identity Paths, MFA Bypass and Hardening — Avatar Tutor Script

**Lesson ID:** cy-ad-cloud-attacks
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~789 words)

## Spoken script

**[HOOK — 0:00]**
Attackers rarely need exotic exploits anymore. They follow permission paths
and steal tokens. One compromised account becomes control of everything —
because Active Directory and cloud identity providers are where the keys to
the kingdom live. This lesson is about how attackers climb identity, and how
to make the climb fail.

**[WHY IT MATTERS — 0:25]**
Enterprise attacks are identity attacks. BloodHound maps the paths, Golden
Tickets forge the master key, MFA gets bypassed, and cloud tokens get stolen.
If you defend enterprise networks, this is the terrain — learn the attack
paths so you can close them.

**[SECTION — Active Directory attack paths — 0:50]**
BloodHound maps Active Directory relationships — group memberships, sessions,
ACLs — and draws the attack paths from any account to privileged ones. Here
is the twist: defenders use it too, to find and remove the riskiest paths
first. The map is neutral; whoever reads it first wins.

A Golden Ticket is a forged Kerberos ticket-granting ticket, made with the
KRBTGT account's hash. It grants domain-wide access — the master key. And the
remediation has a catch that the exam loves: reset the KRBTGT password
twice, because the previous password remains valid after the first reset.
Reset once and the old ticket still works.

DCSync impersonates a domain controller to request password hashes through
replication. It needs replication rights, which ordinary users do not have —
so watch for it. Monitor Event ID 4662 for the replication GUIDs coming from
non-DC accounts. A workstation asking for replication data is lying about
what it is.

**[SECTION — Hardening AD — 2:00]**
Two defences close the biggest holes. First, shared local admin passwords:
one compromised machine's local admin password unlocks every machine that
shares it. Windows LAPS fixes this by giving every device a unique, rotating
local admin password. One breach stays one breach.

Second, the tiered admin model. It separates admin accounts for domain
controllers, servers, and workstations. Why? So credentials stolen from a
laptop can never expose a domain admin. The compromise is contained to the
tier where it happened. Lateral movement hits a wall.

**[SECTION — Beating MFA — 2:50]**
MFA is not invincible, and attackers know it. MFA fatigue — push bombing —
spams push prompts until a tired user approves one just to make it stop. The
defence is number matching, which forces the user to engage, and
phishing-resistant MFA.

Worse is the adversary-in-the-middle attack. Phishing kits like Evilginx
proxy the real login page: the user completes MFA on the genuine site, and
the kit steals the session cookie afterwards. MFA was satisfied — and it did
not matter, because the attacker never needed the password. FIDO2 and
passkeys resist this because the credential is cryptographically bound to the
genuine domain. A fake domain simply cannot use it.

**[SECTION — Cloud identity attacks — 3:40]**
The same game plays out in the cloud. The most common initial access comes
from leaked access keys — often sitting in code repositories — and
misconfigured public storage. Scan repos for secrets, and block public
buckets by default.

An illicit OAuth consent grant tricks a user into approving a malicious
app's access to their data. It looks like a normal permission prompt. The
fix: restrict user consent and review app permissions regularly.

Now zoom out. The cloud control plane — the IAM and API layer — is critical,
because whoever controls it controls every resource. Protect root and global
admin accounts with strong MFA, alerting, and break-glass procedures.

And token theft: stealing session or refresh tokens to act as the user
without the password or MFA. Limit it with short token lifetimes, token
binding, and conditional access — make the stolen token expire fast and work
narrowly.

**[COMMON MISTAKES — 4:35]**
Three traps. One: resetting KRBTGT once after a Golden Ticket. The old
password stays valid — reset twice. Two: thinking MFA stops everything. Push
bombing beats inattentive users, and Evilginx steals the session after MFA
succeeds — only phishing-resistant MFA like FIDO2 closes that hole. Three:
treating the cloud control plane like just another workload. Whoever owns
the IAM layer owns everything beneath it.

**[RECAP — 5:00]**
BloodHound draws the attack paths — use it before the attacker does. Golden
Tickets forge domain-wide access from the KRBTGT hash; reset it twice.
DCSync steals hashes through fake replication; watch Event 4662 from
non-DCs. LAPS gives every device a unique admin password; tiered admins keep
a laptop breach away from domain controllers. Push bombing is beaten by
number matching and FIDO2; Evilginx-style session theft is beaten only by
credentials bound to the real domain. In the cloud, guard leaked keys and
public buckets, restrict OAuth consent, protect the control plane like the
crown jewels — and keep tokens short-lived, bound, and conditional.

## On-screen visuals

- HOOK: a single user account icon expanding into domain-wide control via
  permission paths.
- AD paths: BloodHound-style graph from a workstation account to Domain
  Admins; Golden Ticket forgery flow with the double KRBTGT reset call-out;
  DCSync replication request flagged via Event 4662.
- Hardening: LAPS unique-password-per-device diagram; three-tier admin
  separation with a laptop breach contained at its tier.
- MFA: push-bombing phone spammed with prompts vs number matching; Evilginx
  proxy stealing the session cookie after real MFA; FIDO2 domain-bound
  credential blocking the fake site.
- Cloud: leaked key in a code repo; OAuth consent prompt with a malicious
  app; control-plane layer sitting above all resources; token lifetime and
  binding controls.
- RECAP: the cheat-sheet table as a summary card.
