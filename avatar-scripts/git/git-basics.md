# Git Basics: Distributed Version Control and the Three Areas — Avatar Tutor Script

**Lesson ID:** git-basics
**Track:** Git & Version Control
**Estimated runtime:** ~5 minutes (~684 words)

## Spoken script

**[HOOK — 0:00]**
Every serious project is a long argument with its own past. What changed, when
did it change, why did it change, and who changed it? Get those answers wrong
and you are debugging blind. Git is the tool that keeps that argument honest —
and this lesson is where the honesty starts.

**[WHY IT MATTERS — 0:25]**
Git underpins nearly all modern software collaboration, and it shows up
across certifications too — source control, change management, and integrity
all trace back here. But the practical reason matters more: once you
understand what "distributed" means and the three areas every change passes
through, the rest of Git stops being memorised commands and starts being
obvious.

**[SECTION — Distributed by design — 0:50]**
Older systems were centralised: one server held the history, and you borrowed
pieces of it. Git is distributed — when you clone a repository you get the
entire history, every commit back to the first, on your own machine. Think of
the difference between a library and owning the books. With the library, you
can only read while you are inside and connected. Own the books and you can
read anywhere, anytime, even with the network unplugged.

That design has two consequences worth internalising early. First, almost
everything is fast, because it is local — no round trip to a server to see
yesterday's changes. Your commits, branches, and diffs all happen on your
machine, instantly. Second, every clone is a full backup. Lose the central
server and any developer's copy can restore the project entirely. Sharing is a
deliberate, separate act — push and pull — not something that happens behind
your back. Your work stays yours until you choose to share it.

**[SECTION — The three areas — 2:10]**
A change in Git travels through three places. The working directory is the
files you see and edit — your desk. The staging area, also called the index,
is a holding pen where you assemble precisely what the next snapshot will
contain — the tray where you gather exactly the pages going into the
envelope. The repository is the committed history itself, stored in the hidden
.git directory — the filing cabinet where finished work lives. You edit in the
first, stage into the second, and commit into the third.

The staging area is the part newcomers underestimate, so let me sell it to
you. It exists so a commit can be a deliberate, curated unit rather than
"whatever happened to be lying around." You might edit five files in an
afternoon but stage only two — committing a single coherent change and leaving
the rest for later. That curation is what makes history readable months from
now, when someone — probably you — is trying to understand why something
changed.

Three commands open the door. git init creates a new empty repository in the
current folder. git clone <url> copies an existing repository with its full
history. And git status is your constant companion — it tells you which files
are untracked, modified, or staged at any moment. When in doubt, run git
status. It is the command that answers "where am I?"

**[COMMON MISTAKES — 3:50]**
Three traps. One: thinking of Git as a backup tool or a file-sync service. It
is a history tool — it records the story of your files, not just their latest
state. Two: ignoring the staging area and committing "everything, always,"
which produces history nobody can read. Curate the snapshot. Three: believing
a commit sends your work to the remote. Commits are local until you push —
your work accumulates on your machine, private, until you deliberately share
it.

**[RECAP — 4:10]**
Git is distributed: cloning gives you the entire history on your own machine,
so you work offline and at full speed, and every clone is a complete backup.
A change travels through three areas — the working directory where you edit,
the staging area where you assemble the next snapshot, and the repository
where history lives in .git. The staging area exists so each commit is a
deliberate, curated unit, not whatever happened to be lying around. git init
starts a repository, git clone copies one with full history, and git status —
your constant companion — tells you where everything stands. And remember: a
commit records a snapshot, and it stays local until you push.

## On-screen visuals

- HOOK: a timeline of a project with the questions "what, when, why, who"
  floating above it, resolving into a Git log.
- Distributed by design: a library (centralised, must be connected) versus
  owning the books (distributed, works offline); every clone shown as a full
  backup of history; push and pull as deliberate sharing acts.
- The three areas: desk (working directory), tray (staging area), filing
  cabinet (repository/.git); five edited files with only two staged into a
  curated commit; git status output as the "where am I?" answer.
- RECAP: distributed, the three areas, the curated commit, and the three
  starter commands as a summary strip.
