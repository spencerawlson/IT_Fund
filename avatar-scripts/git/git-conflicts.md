# Conflicts, Merge & Rebase: Resolving Collisions — Avatar Tutor Script

**Lesson ID:** git-conflicts
**Track:** Git & Version Control
**Estimated runtime:** ~5 minutes (~671 words)

## Spoken script

**[HOOK — 0:00]**
Sooner or later, two branches change the same lines, and Git stops and asks
you which version wins. Beginners dread this moment. They should not. A merge
conflict is not an error — it is Git refusing to guess. And resolving one is
a routine, learnable skill.

**[WHY IT MATTERS — 0:25]**
Understanding conflicts dissolves most of the fear beginners attach to
merging — and this lesson goes further, into the deeper choice every team
faces between merge and rebase for integrating work. The golden rule you will
learn here is one of the most-quoted rules in all of Git, and violating it
breaks other people's clones.

**[SECTION — Reading and resolving a conflict — 0:50]**
A conflict happens when two branches edit the same region of a file in
incompatible ways. Git can merge changes that touch different places
automatically — but overlapping edits it leaves to you, because only a human
knows which version is correct. That restraint is a feature, not a failure.

Git marks the file with three delimiters. Everything between <<<<<<< and
======= is your current branch's version. Everything between ======= and
>>>>>>> is the incoming version. Your job: edit the region down to the
correct final result — keeping one side, the other, or a blend of both — and
delete all three markers. All three. This very project learned that lesson
the hard way: a file committed with the markers still in it breaks the code.
A pre-commit hook that scans for <<<<<<< is cheap insurance against exactly
that.

Once the file reads the way it should, git add the file to mark the conflict
resolved, then git commit — or git merge --continue — to complete the merge.
And if you decide the whole thing was a mistake, git merge --abort returns
the branch to its pre-merge state, as if it never happened. You always have
an exit.

**[SECTION — Merge vs rebase — 2:25]**
There are two ways to bring main's latest work into your feature branch. git
merge main creates a merge commit joining the histories, preserving exactly
what happened — branches, forks, and all. It is the honest record. git rebase
main instead replays your branch's commits one by one on top of the current
main, producing a clean, linear history as if you had started from main
today. It is the tidy record. But rebase rewrites your commits, giving them
new hashes — and that rewriting is where the danger lives.

The trade-off is honesty versus tidiness, and the golden rule settles most
arguments: never rebase commits you have already pushed and shared. Rewriting
public history changes hashes out from under your collaborators and breaks
their clones — their history no longer lines up with yours, and the repair is
miserable. So rebase freely on your own local, unpushed work to tidy it
before sharing; use merge to integrate anything that others already have.
Private history is yours to rewrite; public history belongs to everyone.

Conflicts can occur during a rebase too. The rhythm is familiar: resolve the
file, git add it, then git rebase --continue to proceed — or --abort to cancel
the whole rebase. Same markers, same judgement, slightly different vehicle.

**[COMMON MISTAKES — 4:05]**
Three traps. One: treating a conflict as a disaster instead of a question.
Git stopped because it refuses to guess — answer it calmly. Two: committing
a file with the markers still in it. Delete all three delimiters, every
time; a pre-commit scan makes this automatic. Three: rebasing pushed, shared
commits. Your local tidy-up becomes everyone else's broken clone. Rebase
what is private; merge what is public.

**[RECAP — 4:25]**
A conflict means two branches changed the same lines and Git refused to
guess — read the markers, keep your side, their side, or a blend, delete all
three delimiters, then git add and git commit to finish, or git merge --abort
to walk away. To integrate main into your branch you have two philosophies:
merge preserves the true history with a merge commit; rebase replays your
commits onto main for a linear history, but rewrites hashes. The golden rule
decides: never rebase what you have pushed and shared. Tidy your private
work freely, merge the public work honestly, and conflicts — during merges
and rebases alike — become routine.

## On-screen visuals

- HOOK: two branches editing the same lines, with Git pausing and holding up
  a "you decide" sign instead of guessing.
- Reading and resolving a conflict: the three markers with the two versions
  labelled yours and theirs; the edit blending them into one correct result
  with all markers deleted; a pre-commit hook catching a leftover <<<<<<<;
  git merge --abort as an exit door.
- Merge vs rebase: merge shown as two paths rejoining with history preserved;
  rebase shown as commits replayed in a straight line with new hashes; the
  golden rule as a boundary line between private (rebase freely) and public
  (merge only) history.
- RECAP: conflict anatomy, resolution steps, merge versus rebase, and the
  golden rule as a four-card summary.
