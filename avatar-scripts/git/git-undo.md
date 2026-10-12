# Undoing Changes: The Right Tool for Every Mistake — Avatar Tutor Script

**Lesson ID:** git-undo
**Track:** Git & Version Control
**Estimated runtime:** ~5 minutes (~692 words)

## Spoken script

**[HOOK — 0:00]**
Git's greatest gift is that almost nothing is truly lost — if you know the
right command. But undoing changes is a whole toolkit, not a single button,
and choosing the wrong tool is how people actually lose work. One distinction
decides everything, and it is not the one beginners expect.

**[WHY IT MATTERS — 0:25]**
The difference between a two-minute fix and a lost afternoon is knowing which
undo tool fits the situation — and the master distinction is whether a change
is still private or already shared. This lesson also introduces the reflog,
the safety net that turns most "I lost my work" panics into a two-minute
recovery.

**[SECTION — Restore, reset, and revert — 0:50]**
Start small. git restore <file> throws away unstaged edits to a file,
returning it to the last committed state. It is destructive, so be sure —
there is no undo for the undo.

To undo a commit, git reset moves your branch pointer backwards, and the flag
decides how much survives. --soft HEAD~1 keeps the changes staged, ideal for
re-committing them differently. --mixed — the default — keeps them in the
working directory, unstaged. And --hard discards them entirely. That last one
is the sharpest edge in all of Git: git reset --hard can erase uncommitted
work with no undo. Think of the flags as three levels of eraser — soft keeps
the pencil marks staged, mixed scatters them on the desk, hard burns the
page.

Here is the master distinction. Reset rewrites history, which makes it wrong
for commits you have already pushed. For those, use git revert <commit> — it
creates a new commit that undoes the target's changes, leaving the original
in place. Because revert only adds to history rather than rewriting it, it is
safe on shared branches where reset would break your collaborators' clones.
The rule is short enough to memorise: pushed? revert. Local only? reset is
fine.

**[SECTION — Stash and the reflog safety net — 2:35]**
Sometimes you do not want to undo work — you want to set it aside. git stash
shelves your uncommitted changes and hands you a clean working tree, perfect
for switching branches mid-thought or pulling without committing
half-finished work. Think of it as a desk drawer: sweep the papers in, deal
with the interruption, then take them back out. git stash pop reapplies the
most recent stash and drops it from the list; git stash apply reapplies but
keeps it. And git commit --amend replaces the last commit, letting you fix
its message or fold in a forgotten file — but avoid amending anything you
have already pushed, because amend rewrites history too.

Now the safety net. The reflog is the feature that turns most "I lost my
work" panics into a two-minute fix. git reflog records everywhere HEAD has
been — every commit, reset, checkout, and merge — even commits no branch
points to anymore. After a bad reset --hard, the reflog still lists the
commit you reset away from, and you can recover it. Git very rarely deletes
your commits immediately; it just stops pointing at them. The reflog is how
you find them again — the lost-and-found drawer for everything HEAD has ever
touched.

**[COMMON MISTAKES — 4:20]**
Three traps. One: reaching for reset --hard on a shared branch. It rewrites
history your collaborators already have — use revert for anything pushed.
Two: amending a commit that is already pushed, which is the same rewriting
sin in a smaller package. Three: assuming a "lost" commit is gone forever
before checking the reflog. Almost nothing in Git is truly lost; the reflog
remembers where HEAD has been even when no branch does.

**[RECAP — 4:40]**
git restore discards unstaged edits to a file — destructive, so be sure. git
reset moves the branch pointer back: --soft keeps changes staged, --mixed
keeps them unstaged, and --hard discards them entirely with no undo. The
master rule: pushed? revert, which adds a new undoing commit without
rewriting history. Local only? reset is fine. git stash shelves uncommitted
work into a drawer — pop to take it back out, apply to keep a copy — and git
commit --amend fixes the last commit, but never on pushed history. And when
all else fails, the reflog records everywhere HEAD has been, so "lost"
commits are almost always recoverable. Almost nothing is truly lost — if you
know the right command.

## On-screen visuals

- HOOK: a toolkit laid out on a bench — restore, reset, revert, stash,
  reflog — with the private-versus-shared distinction as the choosing rule.
- Restore, reset, and revert: the three eraser levels — soft, mixed, hard —
  showing what survives each; revert drawn as a new commit undoing an old
  one, history intact; the "pushed? revert. Local? reset." rule as a decision
  diamond.
- Stash and the reflog safety net: stash as a desk drawer sweeping papers
  aside; pop versus apply; the reflog as a lost-and-found ledger of every
  place HEAD has been, recovering a commit after a bad reset --hard.
- RECAP: restore, reset flags, revert, stash, amend, and reflog as a
  six-card summary.
