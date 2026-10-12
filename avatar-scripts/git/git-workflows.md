# Workflows & Collaboration: How Teams Use Git — Avatar Tutor Script

**Lesson ID:** git-workflows
**Track:** Git & Version Control
**Estimated runtime:** ~5 minutes (~670 words)

## Spoken script

**[HOOK — 0:00]**
Commands are only half of Git. The other half is how a team agrees to use
them — where work happens, how it gets reviewed, and how it lands on the
mainline. Without that agreement, ten developers with perfect Git skills
produce chaos. With it, they produce software.

**[WHY IT MATTERS — 0:25]**
A workflow is the shared choreography that lets many people change the same
codebase without chaos. This lesson covers the dominant model — feature
branches and pull requests — the tools for shaping history before you share
it, how releases get marked, and the two broad shapes teams choose between.
Walk into any team and you will recognise their workflow within a day.

**[SECTION — Feature branches and pull requests — 0:50]**
The dominant model is simple. Each change — a feature, a fix — gets its own
branch off main, is developed in isolation, and is proposed back through a
pull request, called a merge request on some platforms. A pull request is
where review happens: teammates read the diff, comment, request changes, and
continuous-integration checks run lint, tests, and the build so broken code
cannot merge. Think of it as a proposal with a panel of judges — the code
does not land until it has been read and the machines have voted. Only when
it is approved and green does the branch land on main.

Keep pull requests small. A focused change of a few files is reviewed
carefully in minutes; a thousand-line megabranch is rubber-stamped, hides
bugs, and is painful to revert. Small branches merge often, keep main close
to everyone's work, and reduce conflicts. The whole system runs smoother when
each unit of change is something a human can actually hold in their head —
review quality is inversely proportional to pull-request size.

**[SECTION — Shaping history and releases — 2:25]**
Before sharing a branch, you can tidy it — remember, private history is yours
to rewrite. git rebase -i, interactive rebase, lets you reorder, edit, drop,
or squash commits: folding "wip," "fix typo," and "actually fix it" into one
clean commit that tells a coherent story. Squashing turns a messy drafting
process into a single logical change. git cherry-pick <commit> copies a
single commit from one branch onto another — the standard way to apply a
hotfix across branches without dragging the whole branch along. And git tag
v1.2.0 marks a specific commit as a release, giving humans and deploy
systems a stable name to point at instead of a hash.

Teams choose an overall shape. Trunk-based development keeps everyone merging
small changes into main frequently, often behind feature flags — which suits
continuous delivery, where the mainline is always close to shippable. GitFlow
uses longer-lived develop and release branches with a more ceremonial path to
production — which suits versioned, scheduled releases. Forking workflows,
common in open source, give each contributor their own server-side copy that
they propose from. There is no single right answer — only the one your team
actually follows. The best workflow is the one everyone uses.

**[COMMON MISTAKES — 4:05]**
Three traps. One: thousand-line pull requests that get rubber-stamped instead
of reviewed. Keep them small enough for a human to hold in their head. Two:
tidying history after pushing — interactive rebase is for private branches;
once shared, the history belongs to everyone. Three: treating the workflow
choice as a religion. Trunk-based, GitFlow, forking — each suits a different
release rhythm. Match the shape to how you actually ship.

**[RECAP — 4:25]**
The feature-branch workflow: one branch per change, proposed back through a
pull request where humans review and CI runs lint, tests, and builds — and
only approved, green code lands on main. Keep pull requests small, because
review quality shrinks as size grows. Shape private history before sharing:
interactive rebase to reorder, squash, edit, or drop commits into a coherent
story; cherry-pick to carry a single commit — like a hotfix — across
branches; tag releases like v1.2.0 so humans and deploy systems have a stable
name. Choose your team's shape deliberately: trunk-based for continuous
delivery with frequent small merges, GitFlow for versioned scheduled releases,
forking for open source. Commands are half of Git; the agreement about how
to use them is the other half.

## On-screen visuals

- HOOK: ten developers' branches converging chaotically versus converging
  through an agreed workflow into clean software.
- Feature branches and pull requests: each change on its own branch flowing
  into a pull request with reviewers and CI checks as judges; a small focused
  PR reviewed carefully beside a thousand-line megabranch being rubber-stamped.
- Shaping history and releases: messy "wip / fix typo" commits folding into
  one clean commit via interactive rebase; a cherry-picked hotfix hopping
  branches; a tag labelling a release commit; trunk-based versus GitFlow as
  two contrasting flow diagrams.
- RECAP: feature branches, pull requests, rebase -i, cherry-pick, tags, and
  the workflow shapes as a six-card summary.
