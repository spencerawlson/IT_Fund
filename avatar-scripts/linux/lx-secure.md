# Linux Security Basics: SSH, Firewalls and the Internet-Facing Checklist — Avatar Tutor Script

**Lesson ID:** lx-secure
**Track:** Linux Administration
**Estimated runtime:** ~5 minutes (~739 words)

## Spoken script

**[HOOK — 0:00]**
A default Linux install is not a hardened server. It is a starting point —
convenient defaults, permissive settings, and services you do not need,
waiting on a network you do not control. The moment a box touches the
internet, the scanning starts: bots probe SSH within minutes, sometimes
seconds. This lesson is the minimum viable checklist before that happens.
Short, ordered, and non-negotiable.

**[WHY IT MATTERS — ~0:25]**
These are the controls behind CISSP Domains 3 and 7, and they are the exact
items interviewers probe with "how would you secure a fresh VPS?" Every
compromised-server post-mortem you will ever read comes down to something on
this checklist that was skipped: password SSH left on, no firewall, patches
months behind. The checklist is short precisely so there is no excuse.

**[SECTION — SSH and the front door — ~0:50]**
SSH is the front door, so harden it first. Move to key-based authentication
and turn passwords off: in /etc/ssh/sshd_config set PasswordAuthentication to
no and PermitRootLogin to no, then systemctl reload sshd to apply it. Why
both? Passwords get brute-forced — always, constantly, by bots that never
sleep. Keys do not. And PermitRootLogin no removes the highest-value target:
attackers know the username "root" exists on every box, so do not let them
try its key directly. They have to guess a username and steal a key now,
which is a much harder game.

Protect the private key itself with chmod 600 — readable only by you. Here is
the detail people miss: SSH refuses keys readable by others rather than risk
leaking them. If your key is group-readable, SSH fails closed and will not
connect. That refusal is a feature, not a bug — fix the permissions, do not
fight the check.

Then fail2ban: it watches the logs and firewall-bans IPs after repeated
failures. It is the standard brute-force mitigation for SSH — the bouncer
that notices someone trying the door handle a thousand times. And changing
the default port? Only as obscurity on top of real controls, never instead of
them. Moving SSH to port 2222 cuts log noise; it stops nobody determined.
Keys, no root, fail2ban — those are the real controls.

**[SECTION — Firewall, patching, least privilege — ~2:25]**
Next, the firewall: default-deny inbound, then open only what the box needs.
On Ubuntu that is ufw default deny incoming, then ufw allow 22/tcp, then ufw
enable. On RHEL it is firewall-cmd zones. The order matters — deny everything
first, because "allow SSH" on top of "allow everything" is theatre. Start
closed, open deliberately, and every open port should have a reason you can
say out loud.

Then patching, and here is the uncomfortable truth: patches do not depend on
human memory in a well-run shop. Enable automatic security updates —
unattended-upgrades on Debian/Ubuntu, dnf-automatic on RHEL/Fedora — so the
known CVEs get fixed whether or not anyone remembers. Manual patching works
until the week everyone is busy, which is exactly the week the exploit drops.

Least privilege goes everywhere. Dedicated low-privilege accounts per
service — never run daemons as root, because a compromised daemon should not
mean a compromised box. Sudo rules scoped to single commands, from the users
lesson. No world-writable configs. And finally, file-integrity monitoring:
AIDE or Tripwire alerts when system files change unexpectedly — but baseline
it right after a clean install, because a baseline taken on a compromised
box just memorialises the compromise.

The lesson's VPS sequence is the checklist in order: patch first, firewall to
default-deny with SSH only, SSH to keys-only with no root login, reload, then
fail2ban. Five steps, one hardened box.

**[COMMON MISTAKES — ~4:10]**
Three traps. One: changing the SSH port and calling it security. It is
obscurity — useful noise reduction, not a control. Two: enabling the firewall
after opening ports instead of default-deny first. Order matters; start
closed. Three: baselining file integrity after the box has been running
unmonitored. If it was already compromised, your "known good" baseline is a
lie.

**[RECAP — ~4:40]**
Harden SSH first: keys only with PasswordAuthentication no, no direct root
with PermitRootLogin no, reload sshd, and chmod 600 on the private key —
SSH fails closed on loose permissions. fail2ban is the brute-force bouncer;
a moved port is obscurity, not security. Firewall default-deny inbound, then
open only what you can justify. Automate security patches so they do not
depend on memory. Least privilege everywhere: service accounts, scoped sudo,
no world-writable configs. Baseline AIDE or Tripwire on a clean install.
Patch, firewall, SSH, fail2ban — in that order, before the box meets the
internet. That is the minimum viable hardened server.

## On-screen visuals

- HOOK: fresh server touching the internet; bot scan attempts appearing within seconds.
- WHY IT MATTERS: post-mortem findings checklist — each one a skipped step from this lesson.
- SSH and the front door: sshd_config changes (PasswordAuthentication no, PermitRootLogin no); key vs password brute-force contrast; chmod 600 with SSH's fail-closed refusal; fail2ban banning an IP; port-change labelled "obscurity, not a control."
- Firewall, patching, least privilege: ufw default-deny then allow-SSH sequence; automatic updates timeline vs the busy week; per-service accounts; AIDE baseline on a clean install.
- RECAP: cheat-sheet terms as a clean summary card.
