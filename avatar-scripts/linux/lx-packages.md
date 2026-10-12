# Package Management: apt, dnf and the Repo Habit — Avatar Tutor Script

**Lesson ID:** lx-packages
**Track:** Linux Administration
**Estimated runtime:** ~4 minutes (~611 words)

## Spoken script

**[HOOK — 0:00]**
Software on Linux comes from repositories — signed, versioned collections that
resolve dependencies for you. The package manager is the difference between a
system you can patch with one command and a snowflake server nobody dares to
touch. Every admin has inherited a snowflake: hand-compiled software, mystery
binaries, no record of what is installed. This lesson is how you never become
the person who built one.

**[WHY IT MATTERS — ~0:25]**
Patching is a security control. When a critical OpenSSL CVE drops, the team
that runs one upgrade command across the fleet sleeps; the team with
hand-installed software spends the weekend hunting binaries. The package
manager is what makes the first team possible. It is also how you answer audit
questions: what is installed, what version, which package owns this suspicious
binary. The repo habit is a professional habit.

**[SECTION — The two families — ~0:50]**
Linux has two package families, and the verbs rhyme. On Debian and Ubuntu,
apt is the friendly frontend and dpkg is the low-level tool underneath. On
RHEL and Fedora, dnf is the frontend and rpm is underneath. Installs read the
same: apt install nginx, dnf install nginx. Removals rhyme too. Learn one
family's verbs and the other is a translation exercise — which is exactly how
the exam tests it.

Two commands that beginners constantly confuse: apt update and apt upgrade.
Update refreshes the package index — the catalogue of what is available and
which versions. Upgrade actually installs the newer versions. Running upgrade
without update works from a stale catalogue, so you "upgrade" to versions that
were current weeks ago and miss the security fix entirely. The rule is
non-negotiable: always update first, then upgrade. Update is reading the menu;
upgrade is ordering the food.

**[SECTION — Query, clean, and stay safe — ~2:10]**
Installation is half the job; interrogation is the other half, and that is the
low-level tools' moment to shine. dpkg minus l pipe grep ssh lists installed
packages matching ssh — what is here and which version. dpkg minus capital S
/usr/bin/curl, or rpm minus qf on the Red Hat side, tells you which package
owns a file. That one is invaluable when a binary misbehaves: is this the
distro's curl or something someone dropped here? And apt autoremove drops
orphaned dependencies — packages installed automatically that nothing needs
anymore. Cruft accumulates; autoremove is the spring clean.

Now the safety sermon, because it matters. Prefer the distro repository over
a downloaded dot-deb or dot-rpm, every time. Repo packages are signed,
dependency-resolved, and — critically — get security updates automatically.
A manually installed package is a package you must remember to patch forever,
and human memory is not a patching strategy. The one time you download
something manually, document it, because future-you is the auditor.

**[COMMON MISTAKES — ~3:35]**
Three traps. One: apt upgrade without apt update — the stale-catalogue trap —
which leaves you believing you are patched when you are not. Two: installing
random dot-debs from the internet instead of using the repo. It works today
and becomes an unpatched liability tomorrow. Three: never running autoremove.
Orphaned packages pile up, each one a version you are not tracking and a
surface you are not watching.

**[RECAP — ~4:05]**
Two families: apt over dpkg on Debian and Ubuntu, dnf over rpm on RHEL and
Fedora — the verbs rhyme. apt update refreshes the catalogue, apt upgrade
installs the new versions, and update always comes first. dpkg minus l lists
what is installed, dpkg minus capital S names the package that owns a file,
and apt autoremove clears the orphans. Repositories live in
/etc/apt/sources.list and sources.list.d. And the standing rule: prefer the
repo — signed, resolved, auto-updated — over anything you download by hand.
One source of truth, one command to patch, no snowflakes. That is the whole
point.

## On-screen visuals

- HOOK: snowflake server with mystery binaries vs clean repo-managed system with one-command patching.
- WHY IT MATTERS: CVE drops — fleet patched with one command while the hand-installed server waits.
- The two families: apt/dpkg and dnf/rpm side by side with rhyming verbs; update (refresh catalogue) vs upgrade (install) animation.
- Query, clean, and stay safe: dpkg -l and dpkg -S interrogation demo; autoremove spring-clean; repo package (signed, auto-updated) vs manual download (unpatched liability).
- RECAP: cheat-sheet terms as a clean summary card.
