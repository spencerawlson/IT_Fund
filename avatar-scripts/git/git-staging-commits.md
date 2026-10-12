# Staging & Committing: Crafting History Worth Reading — Avatar Tutor Script

**Lesson ID:** git-staging-commits
**Track:** Git & Version Control
**Estimated runtime:** ~5 minutes (~657 words)

## Spoken script

**[HOOK — 0:00]**
In six months, someone will read your commit history trying to understand a
bug — and that someone is probably you. The difference between a history that
answers your questions and one that shrugs at you comes down to a two-step
rhythm and one non-negotiable rule. This lesson teaches both.

**[WHY IT MATTERS — 0:25]**
A commit is the atom of Git history: a labelled snapshot you can return to,
compare against, or undo. Making good commits is a skill, not a formality. A
tidy history of small, well-described changes is a gift to every future reader
of the project — starting with you, debugging at midnight, half a year from
now.

**[SECTION — Stage, then commit — 0:50]**
The rhythm has two steps. git add <file> copies a file's current changes into
the staging area; git add . stages everything beneath the current directory.
Then git commit -m "message" records exactly what is staged — and only what
is staged — as a new commit. Changes left unstaged stay in your working
directory, untouched. This two-step rhythm is what lets you split a messy
afternoon of edits into several clean, logical commits. You did the work in
one chaotic burst; history gets to see it as a tidy sequence. That
translation — chaos in, clarity out — is the whole craft.

Before committing, look. git diff shows unstaged changes — the working
directory versus the staging area. git diff --staged shows what you are about
to commit — the staging area versus the last commit. Reviewing your own diff
is the cheapest code review you will ever do: it catches stray debug lines,
accidental deletions, and the odd secret before they enter history. And if you
staged something by mistake, git restore --staged <file> removes it from the
staging area while leaving your edits intact. Unstage, not unwrite.

**[SECTION — History, hygiene, and secrets — 2:30]**
Once commits exist, you can read them. git log prints the commit history,
newest first; git log --oneline compresses each commit to a single readable
line; and git show <commit> expands one commit into its full diff. A good
commit message explains why a change was made, not merely what — the diff
already shows the what. "Fix off-by-one in retry loop that dropped the final
attempt" beats "fix stuff" the way a labelled folder beats a shoebox of
papers. Keep commits small and focused so each one can be understood,
reviewed, and reverted on its own.

A .gitignore file lists patterns Git should never track — build output,
dependency folders like node_modules, local config, and above all secrets such
as .env files and private keys. This matters enormously, and here is why: Git
keeps history forever. A password committed once and "deleted" in the next
commit is still sitting in the history, fully recoverable, like a letter you
mailed and then asked the post office to forget. The habit is simple and
non-negotiable: secrets go in .gitignore, never in a commit — and anything
that does leak must be rotated, not merely removed. Deleting is not
un-sending.

**[COMMON MISTAKES — 4:15]**
Three traps. One: writing commit messages that describe the what — "update
file" — when the diff already shows that. Explain the why. Two: committing
giant, multi-purpose changes that cannot be reviewed or reverted
independently. Small and focused, always. Three: trusting that deleting a
leaked secret from the working directory fixes the leak. History is forever —
the secret is in the log, so rotate it.

**[RECAP — 4:35]**
Stage, then commit: git add assembles the snapshot, git commit -m records
exactly what is staged, and the two-step rhythm turns a messy afternoon into
clean, logical history. Before you commit, look — git diff for unstaged
changes, git diff --staged for what is about to be recorded — and unstage
mistakes with git restore --staged without losing your edits. Read history
with git log, --oneline for the compact view, and git show for the full diff.
Write messages that explain why, keep commits small, and keep noise out with
.gitignore. And the rule that outranks all others: never commit a secret.
History is forever, so a leak means rotation, not deletion.

## On-screen visuals

- HOOK: a future developer — labelled "you, in six months" — reading a clear
  commit history versus a shrug-inducing one.
- Stage, then commit: five edited files with two staged into a curated commit;
  git diff versus git diff --staged shown as two different comparisons; an
  accidental stage being undone by git restore --staged with edits preserved.
- History, hygiene, and secrets: git log --oneline as a readable timeline, a
  good "why" message versus a "fix stuff" message; a committed password
  surviving its own deletion in the history; .gitignore as a gate with
  node_modules and .env turned away.
- RECAP: add, commit, diff, log, .gitignore, and the secrets rule as a
  six-card summary.
