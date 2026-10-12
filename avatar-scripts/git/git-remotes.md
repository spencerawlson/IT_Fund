# Remotes & Syncing: Sharing History Without Fear — Avatar Tutor Script

**Lesson ID:** git-remotes
**Track:** Git & Version Control
**Estimated runtime:** ~5 minutes (~706 words)

## Spoken script

**[HOOK — 0:00]**
Your commits live on your machine — private, safe, and completely useless to
your team. Somewhere between your laptop and your colleagues' screens sits a
small set of commands that decide what gets shared, when, and how safely.
Get them wrong and you can erase someone else's work. Get them right and
collaboration feels effortless.

**[WHY IT MATTERS — 0:25]**
A commit lives on your machine until you deliberately share it. Remotes are
Git's model for other copies of the repository, and push, pull, and fetch are
how your local history and the shared history stay in sync. This lesson also
carries the discipline that keeps collaboration from turning into a merge
nightmare — including one command you should treat like a loaded weapon.

**[SECTION — Remotes, push, and pull — 0:50]**
A remote is a named reference to another copy of the repository — on GitHub,
GitLab, a colleague's server. When you clone, Git automatically adds one
called origin pointing at the source; git remote -v lists your remotes with
their URLs. Think of remotes as phone numbers saved in your contacts: the
name is yours, the address is real, and you choose when to call.

git push uploads your local commits to a remote branch, and git pull brings
remote commits down and merges them into your current branch. Nothing crosses
the network unless you ask — your commits accumulate locally until you push.
That is the distributed design from the first lesson expressing itself: your
machine is the truth until you deliberately share it.

The first push of a branch usually sets its upstream: git push -u origin main
uploads main and records origin/main as its tracking branch, so afterwards a
bare git push or git pull knows the target without you repeating it. Set the
address once, then just say "call them." And you can have more than one
remote — a common open-source pattern names your own fork origin and the
project you forked from upstream, so you can pull from the project and push
to your fork independently.

**[SECTION — Fetch vs pull, and collaborating cleanly — 2:20]**
git fetch and git pull are often confused, and the distinction matters. Fetch
downloads the remote's new commits but does not touch your working branch —
it simply updates your view of what the remote has, letting you inspect the
incoming changes before integrating them. Pull is fetch plus an automatic
merge into your current branch. The mental model: fetch is reading the mail;
pull is reading the mail and immediately acting on it. When you want to look
before you leap, fetch. When you are ready to integrate, pull.

The habit that prevents pain is to pull before you start work and push often.
Beginning the day on code your teammates changed hours ago means a bigger,
messier reconciliation later — small, frequent syncs beat rare, heroic ones.
And treat git push --force as a loaded weapon: on a shared branch it can
erase other people's commits. If you genuinely must rewrite a pushed branch,
prefer --force-with-lease, which refuses to overwrite work you have not seen.
It checks that nobody else moved the target since you last looked — the
safety catch on the weapon. And never force-push a branch others build on.
Some lines you simply do not cross.

**[COMMON MISTAKES — 3:50]**
Three traps. One: using pull when you meant fetch — then being surprised that
your branch just merged something you had not inspected. Fetch first when you
want to look before you leap. Two: force-pushing a shared branch, which can
silently erase your colleagues' commits. Use --force-with-lease, and only on
branches nobody else builds on. Three: working all day on stale code and
syncing once at the end. Pull before you start, push often, and the merges
stay small.

**[RECAP — 4:10]**
A remote is a named reference to another copy of the repository — origin by
default, listed with git remote -v. Push uploads your commits; pull brings
remote commits down and merges them; nothing crosses the network unless you
ask. Set the upstream once with git push -u origin main, and plain push and
pull know where to go. Fetch downloads without merging — look before you leap
— while pull is fetch plus merge. Collaborate cleanly: pull before you start
work, push often, and treat --force as a loaded weapon, preferring
--force-with-lease and never force-pushing branches others build on. Small
syncs, shared history, no surprises.

## On-screen visuals

- HOOK: commits sitting privately on a laptop, with a bridge of
  push/pull/fetch commands connecting to teammates' screens.
- Remotes, push, and pull: remotes as saved contacts (name → address);
  commits accumulating locally, then deliberately pushed; the -u flag shown
  as saving the address once; the fork pattern with origin and upstream as
  two separate contacts.
- Fetch vs pull, and collaborating cleanly: fetch as reading the mail versus
  pull as reading and acting on it; small frequent syncs versus one giant
  painful merge; --force shown as a loaded weapon with --force-with-lease as
  its safety catch.
- RECAP: remote, push, pull, fetch, upstream, and the force-push rule as a
  six-card summary.
