# Branching & Merging: Parallel Lines of Work — Avatar Tutor Script

**Lesson ID:** git-branching
**Track:** Git & Version Control
**Estimated runtime:** ~5 minutes (~678 words)

## Spoken script

**[HOOK — 0:00]**
Here is the moment Git stops being a backup tool and becomes a way of working.
You want to try a risky idea without endangering the code that ships. You
want to build a feature while a teammate fixes a bug in the same files. The
answer is so cheap it feels like cheating — and it takes about a second.

**[WHY IT MATTERS — 0:25]**
Branching is where Git earns its reputation. A branch is a cheap, throwaway
line of development — try an idea, build a feature, fix a bug — all without
disturbing the stable mainline until you are ready. Understand what a branch
really is, and merging stops being scary and starts being routine.

**[SECTION — Branches and HEAD — 0:50]**
Under the hood, a branch is almost nothing: a lightweight, movable pointer to
a commit. Creating one does not copy any files — it just writes a new
reference, which is why branching in Git is instantaneous and why you should
branch freely. Here is the mental model: commits form a graph, branches are
sticky notes pointing at commits in that graph, and HEAD is the sticky note
that says "you are here." HEAD tracks your current branch, and therefore the
commit you are standing on. Switching branches moves HEAD and updates your
working directory to match.

The commands follow the model. git switch -c <name> — or the older git
checkout -b <name> — creates a branch from your current commit and moves onto
it. git branch lists branches, marking the current one; git switch main moves
back to main. Branching costs nothing, so the professional habit is to branch
for everything: each feature, each fix, each experiment gets its own line of
development. The mainline stays clean because the mess happens elsewhere.

**[SECTION — Merging branches back — 2:20]**
git merge <branch> integrates another branch's commits into the one you are
on. Now, two things can happen. When your current branch has not advanced
since the other branched off, Git can simply slide the pointer forward — a
fast-forward merge, with no extra commit, because the history is already
linear. Think of it as catching up to someone walking ahead of you on the
same path: no ceremony, you just walk forward.

But when both branches have new commits, the paths have diverged, and Git
performs a true three-way merge, recording a merge commit with two parents
that ties the two lines of history together. Two walkers took different
forks; the merge commit is where the paths rejoin, and it remembers both
routes. That two-parent commit is the honest record that parallel work
happened here.

The everyday rhythm is: branch for each feature or fix, commit there until it
is done, switch to main, and merge the branch in. This keeps main releasable
while work proceeds in isolation, and it makes each change reviewable as a
unit — one branch, one purpose, one story. When a branch is merged and no
longer needed, git branch -d <name> deletes it cleanly. Reach for -D only to
force-delete unmerged work you are sure you want gone — the capital letter is
Git asking "are you really sure?" and you should be.

**[COMMON MISTAKES — 3:55]**
Three traps. One: treating branches as expensive and doing all your work on
main. Branches are pointers, nearly free — branch freely and keep main
releasable. Two: confusing what merge does with what switch does. Switch
moves you; merge brings work to you. Three: using -D casually on unmerged
branches. The lowercase -d refuses to delete unmerged work; the capital -D
does not ask twice. Know which one you typed.

**[RECAP — 4:15]**
A branch is a lightweight, movable pointer to a commit — creating one copies
nothing, so branch freely. HEAD points at your current branch, the sticky
note that says "you are here," and switching branches moves it. git switch -c
creates and moves onto a branch; git switch main takes you home. Merging
brings another branch's work into yours: a fast-forward simply slides the
pointer when history is linear, while diverged branches produce a true merge
commit with two parents. The rhythm is branch, build, switch to main, merge,
then delete the branch with -d. Parallel lines of work, one clean mainline.

## On-screen visuals

- HOOK: a stable mainline with a risky experiment branching off safely to the
  side, then merging back when ready.
- Branches and HEAD: the commit graph with branches as sticky notes and HEAD
  as the "you are here" note; creating a branch shown as writing one new
  reference — no files copied.
- Merging branches back: fast-forward as sliding the pointer along one path;
  diverged branches rejoining at a two-parent merge commit; the
  branch-build-merge-delete rhythm as a four-step loop; -d versus -D shown as
  a polite refusal versus no second chances.
- RECAP: branch, HEAD, switch, fast-forward, merge commit, and the rhythm as
  a six-card summary.
