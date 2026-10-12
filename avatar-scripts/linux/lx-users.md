# Users, Groups & sudo: Identity, sudoers and visudo — Avatar Tutor Script

**Lesson ID:** lx-users
**Track:** Linux Administration
**Estimated runtime:** ~5 minutes (~732 words)

## Spoken script

**[HOOK — 0:00]**
Every process on a Linux box runs as some user. The web server, the database,
your shell — all of them have an identity. And every user is a line in a text
file. Identity is the foundation that permissions, sudo, and SSH all build on,
and misconfigured accounts are among the most common findings in real audits.
Ghost users, shared passwords, overpowered sudo rules — this lesson is the
identity layer, and it maps straight onto CISSP Domain 5.

**[WHY IT MATTERS — ~0:25]**
You will create service accounts, lock departing employees out, and scope sudo
rules for the rest of your career. The difference between su and sudo is an
interview staple. The visudo safety net is the kind of detail that saves you
from locking every admin out of a production box at 2am. Small commands, large
consequences.

**[SECTION — The account files — ~0:50]**
Two files hold the identity system. /etc/passwd has one line per user: name,
UID, GID, home directory, shell. It is world-readable, which surprises people
until they learn the key fact: password hashes have not lived there for
decades. They live in /etc/shadow, readable only by root, alongside the ageing
policy — password expiry, warning days, lockout status. Split for a reason:
the world needs to map names to UIDs; only root needs the secrets.

One line in passwd deserves special attention: UID 0 is root, whatever the
name on the line says. Rename root to "bob" and bob is still all-powerful,
because the kernel checks the number, not the name. Auditors look for extra
UID 0 accounts for exactly this reason — it is the classic backdoor.

The daily commands: useradd minus m ana creates the account and builds the
home directory — the minus m matters, or the user logs into nowhere. passwd
ana sets the secret. id ana shows the UID, GID, and group memberships.
usermod modifies: minus aG appends groups, and here is the trap — never omit
the minus a, or you replace all supplementary groups instead of adding one.
People have locked themselves out of the docker group, the sudo group, their
own sanity, with usermod minus G. And usermod minus L locks the account
without deleting anything — the right move for a departure, preserving the
files and the audit trail.

**[SECTION — sudo: privilege with a paper trail — ~2:25]**
sudo runs one command with elevated privileges, under rules stored in
/etc/sudoers. Two things make it better than sharing the root password. First,
it asks for your password, not root's — so revoking one person's access does
not mean changing a shared secret everyone knows. Second, it logs every
invocation. That audit trail — who ran what, when — is why enterprises prefer
it. "Who restarted the database at 3am?" sudo knows.

Always edit sudoers with visudo. It validates the syntax before saving,
because one typo in that file can lock every admin out of the box. It is the
seatbelt: slightly annoying, and you will be grateful exactly once, which is
enough.

Then the distinction the interview loves: su minus switches to root — or
another user — and needs the target's password. sudo minus i gets you a root
shell using your own credentials, with logging. And the design principle:
prefer sudo's fine-grained rules over handing out full root. "May restart
nginx" is a sudo rule; "is basically root" is a liability. The lesson's
example is the template — deploy ALL equals (root) NOPASSWD colon
/usr/bin/systemctl restart webapp — one service, one command, nothing else.

**[COMMON MISTAKES — ~4:15]**
Three traps. One: usermod minus G without minus a, wiping supplementary
groups — append, do not replace. Two: editing sudoers directly instead of with
visudo. It works right up until the typo that locks everyone out. Three:
handing out ALL equals ALL sudo because it was faster. It is always faster,
and it converts every compromised account into a root compromise.

**[RECAP — ~4:45]**
Identity lives in two files: /etc/passwd for the world-readable account data,
/etc/shadow for the root-only hashes and ageing policy. UID 0 is root no
matter what the name says — watch for impostors. useradd minus m builds the
home, passwd sets the secret, and usermod minus aG appends groups — never drop
the minus a. sudo runs single commands as root with your password and a full
audit trail; visudo is the only safe way to edit its rules; and fine-grained
"may restart one service" rules beat full root every time. That is the
identity layer — small files, enormous leverage.

## On-screen visuals

- HOOK: processes on a system each labelled with their running user; passwd file lines mapping to accounts.
- WHY IT MATTERS: interview question cards — "su vs sudo?", "why visudo?"; 2am lockout scenario.
- The account files: /etc/passwd line dissected field by field; /etc/shadow locked with a root-only badge; UID 0 impostor highlighted; usermod -aG vs -G trap animation.
- sudo: privilege with a paper trail: sudo invocation flowing into an audit log; visudo syntax-check gate; su - vs sudo -i comparison; least-privilege sudo rule example.
- RECAP: cheat-sheet terms as a clean summary card.
