# Permissions & Ownership: rwx, chmod and the Special Bits — Avatar Tutor Script

**Lesson ID:** lx-perms
**Track:** Linux Administration
**Estimated runtime:** ~5 minutes (~767 words)

## Spoken script

**[HOOK — 0:00]**
Linux security starts with three letters: r, w, x. Read, write, execute.
Every file and directory carries nine permission bits — three for the owner,
three for the group, three for everyone else — and most "permission denied"
mysteries trace back to them. So do most privilege-escalation findings in real
audits. Learn to read those nine bits fluently and you can diagnose half the
access problems you will ever meet.

**[WHY IT MATTERS — ~0:25]**
This is the lesson interviewers probe and auditors live in. A world-writable
config, a SUID binary nobody remembers installing, a deploy key readable by
everyone — these are findings, and they are all permission bits. You will also
use this daily: locking down a script, sharing a project folder, figuring out
why the web server cannot read its own files. Nine bits, endless consequences.

**[SECTION — Reading and setting the nine bits — ~0:50]**
Take a typical ls minus l line: -rwxr-xr--. The leading dash is the file type —
a d would mean directory. Then come three groups of three: owner gets rwx,
group gets r-x, others get r--. Read that as a sentence: the owner can do
everything, the group can read and execute but not write, and everyone else
can only read.

Now the two dialects of chmod. Numeric mode adds r equals 4, w equals 2, x
equals 1 per group. So 755 is rwxr-xr-x — full for the owner, read and execute
for everyone else — the classic for scripts and web directories. 644 is
rw-r--r-- — the classic for files nobody needs to execute. Symbolic mode is
more surgical: chmod u+x script.sh adds execute for the owner only, leaving
everything else untouched; chmod go-w file removes write for group and others.
Numeric for the broad strokes, symbolic for the scalpel work.

Ownership: chown ana:devs file sets the owner and the group, and it needs root
— you cannot give away files you do not own. And new files? They get
permissions from a base — 666 for files, 777 for directories — minus the
umask. With the common umask 022, new files arrive as 644 and new directories
as 755. The umask is the default-deny dial for everything you create.

**[SECTION — The special bits: SUID, SGID, sticky — ~2:30]**
Beyond the nine bits there are three special ones, and they are exam gold.
SUID, value 4, on an executable means it runs with the file owner's
privileges. The classic is /usr/bin/passwd: it is owned by root, so anyone can
run it to change their own password — and the program is written carefully so
you can only change yours. It shows as an s in the listing: -rwsr-xr-x. That
little s is power, which is why world-writable SUID binaries are a classic
audit finding. Hunt them with find slash minus perm minus 4000.

SGID, value 2, on a directory makes new files inherit the directory's group
instead of the creator's. That is perfect for shared project folders: everyone
on the team creates files, every file belongs to the team group, no manual
chowning. The lesson's example nails it — chmod 2770 on /srv/web gives full
access to owner and group, nothing to others, plus the SGID bit keeping group
ownership consistent.

The sticky bit, value 1, on a directory means anyone can create files but only
the owner — or root — can delete them. The famous example is /tmp, shown as a
t: drwxrwxrwt. Everyone needs a scratch space, but nobody should be able to
delete anyone else's scratch work. Shared, but not lawless.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: chmod 777 as a "fix." It makes everything work and everything
insecure — it is never the answer, it is the surrender. Two: forgetting that
directories need the execute bit to be entered. A directory with rw but no x
lets you list names but not open anything inside — the classic "I can see it
but I cannot cd into it." Three: SUID on a script you wrote yourself without
understanding the implications. That s means your code runs as the file owner;
a flaw in it is a privilege escalation.

**[RECAP — ~4:50]**
Nine bits: rwx for owner, group, and others, read as r equals 4, w equals 2, x
equals 1. Numeric chmod for broad strokes — 755 for executables, 644 for files
— symbolic like u+x for surgery. chown sets owner and group, and the umask
subtracts from the defaults for everything new. SUID runs executables as the
file owner, SGID makes directories share their group with new files, and the
sticky bit keeps shared directories civilised. And find slash minus perm minus
4000 is how you hunt rogue SUID binaries. That is the permission system —
small, precise, and everywhere.

## On-screen visuals

- HOOK: ls -l output with the nine permission bits lighting up in three colour-coded groups.
- WHY IT MATTERS: audit findings montage — world-writable config, mystery SUID binary, exposed deploy key.
- Reading and setting the nine bits: bit-by-bit decode of -rwxr-xr--; r=4/w=2/x=1 addition animation to 755 and 644; symbolic vs numeric chmod demo; umask subtraction diagram.
- The special bits: SUID passwd flow (user runs root-owned binary, changes only own password); SGID shared-folder inheritance; /tmp sticky-bit demo; find / -perm -4000 hunt.
- RECAP: cheat-sheet terms as a clean summary card.
