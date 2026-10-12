# Linux & Command Line for Security: Navigation, Permissions, Logs and Process Hunting — Avatar Tutor Script

**Lesson ID:** cy-linux
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~783 words)

## Spoken script

**[HOOK — 0:00]**
Picture this: three in the morning, the SOC phones you, and someone is logged
into a production server who should not be there. Your only way in is a black
screen and a blinking cursor. The people who thrive in that moment are not
hackers with magic tools. They are analysts who know their way around a Linux
command line cold.

**[WHY IT MATTERS — 0:25]**
Most servers, security tools, and attacker infrastructure all run Linux.
Analysts read its logs, testers live in its shell, and both need to spot a
dangerous permission or a suspicious process at a glance. Everything else in
this track assumes you can move around, search, and investigate on a Linux
box — so let us build that foundation now.

**[SECTION — Moving around and finding things — 0:50]**
Three commands orient you: pwd prints the current directory, cd changes it,
and ls lists what is inside. Then learn ls -la, because it includes hidden
files — the ones starting with a dot, like .bashrc or .ssh. Here is why you
care: hidden files are exactly where persistence mechanisms and secrets tend
to hide. Skip them and you only see the tidy part of the filesystem.

grep searches text for a pattern. Want failed logins? grep -i "failed"
/var/log/auth.log — the -i makes it case-insensitive. And the pipe sends one
command's output into the next command's input, so small tools chain into
powerful one-liners: filter, extract, count, no programming needed.

**[SECTION — Permissions, accounts and privilege — 2:00]**
Permissions are three numbers in disguise. Read is 4, write is 2, execute is
1, set separately for the owner, the group, and everyone else. chmod 600 on a
private key gives the owner read and write and nobody else any access — and
here is a nice detail: SSH will refuse to use a private key that others can
read. The system enforces good hygiene for you.

Now accounts. /etc/passwd lists the accounts on the system, but the password
hashes have not lived there for years. They live in /etc/shadow, readable
only by root. So when an old tutorial says "grab the hashes from passwd," you
know it is dated — and the exam knows the difference too.

Two privilege-escalation paths you must know cold. sudo runs a command as
another user, root by default. An overly broad sudo rule — say, allowing an
editor or an interpreter as root — is a privilege escalation path, because
that editor can spawn a root shell. So audit sudoers. And SUID: a SUID binary
runs with its owner's privileges rather than the caller's. When the owner is
root, that binary is a classic escalation target — there is even a public
catalogue of them on GTFOBins.

**[SECTION — Logs, processes and network state — 3:15]**
Authentication logs move around by distribution. On Debian and Ubuntu, SSH and
sudo events go to /var/log/auth.log. RHEL-family systems write the same
events to /var/log/secure, and systemd hosts expose everything through
journalctl. The exam loves swapping these, so anchor each one to its family.

ps aux — or top and htop — shows running processes. Look for odd parents,
names impersonating system processes, or unexplained high CPU. Then ss -tulpn
lists listening TCP and UDP sockets with the owning process — what is open
and waiting for connections.

Last one, and it is a favourite exam trap: base64 is an encoding, not
encryption. base64 -d reverses it instantly, no key required. Attackers use
it to smuggle payloads past naive filters, so whenever you find something
suspicious in a log or a script, decode it before you decide it is harmless.

**[COMMON MISTAKES — 4:25]**
Three traps. One: calling base64 encryption. It is encoding — decoding takes
no key and no effort. Treat it as camouflage, not a lock. Two: saying the
password hashes live in /etc/passwd. That file lists accounts; the hashes
live in /etc/shadow, root-only. Three: mixing up whose privileges a SUID
binary gets. It runs as the file owner, not the caller — which is precisely
why a SUID-root binary is dangerous.

**[RECAP — 4:50]**
Orient with pwd, cd, and ls — and always check hidden files with ls -la,
because that is where secrets and persistence hide. Search with grep and chain
tools with the pipe. Permissions are read 4, write 2, execute 1; chmod 600
keeps a key private, and SSH enforces it. Hashes live in /etc/shadow, not
passwd. Audit sudoers and SUID binaries for escalation paths. Know your auth
log: auth.log on Debian, /var/log/secure on RHEL. Hunt with ps aux and
ss -tulpn. And decode before you trust — base64 is encoding, not encryption.

## On-screen visuals

- HOOK: dark server room with a blinking terminal cursor; red "3 AM" call-out.
- Moving section: terminal showing ls -la with dotfiles highlighted; the
  grep -i failed-login pipeline from the lesson example.
- Permissions: the 4-2-1 permission grid animating to 600; /etc/passwd vs
  /etc/shadow split panel; GTFOBins-style SUID call-out.
- Logs section: side-by-side auth.log vs /var/log/secure vs journalctl; sample
  ps aux and ss -tulpn output with a suspicious process highlighted; a
  base64 blob decoding to reveal a payload.
- RECAP: the cheat-sheet table as a summary card.
