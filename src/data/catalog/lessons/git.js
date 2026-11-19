// Reading content for the Git track. Keyed by deck id; wired into LESSON_CONTENT
// by src/data/catalog/lessonContent.js. Voice: professional, narrative, precise.

export default {
  'git-basics': {
    overview: [
      'Every serious project is a long argument with its own past: what changed, when, why, and by whom. Git is the tool that keeps that argument honest. It records the history of your files as a chain of snapshots so you can move through time — compare, revert, branch, and reconstruct exactly what the code looked like on any day it mattered.',
      'This lesson covers what makes Git distributed, how a repository is created, and the three areas every change passes through: the working directory where you edit, the staging area where you assemble a commit, and the repository where history lives.',
    ],
    learn: [
      {
        heading: 'Distributed by design',
        body: [
          'Older systems were centralized: one server held the history, and you borrowed pieces of it. Git is distributed — when you clone a repository you get the entire history, every commit back to the first, on your own machine. You can commit, branch, inspect the log, and diff versions with the network unplugged, because the complete project lives locally in a hidden .git directory.',
          'That design has two consequences worth internalizing early. First, almost everything is fast, because it is local — no round trip to a server to see yesterday’s changes. Second, every clone is a full backup; lose the central server and any developer’s copy can restore the project entirely. Sharing is a deliberate, separate act (push and pull), not something that happens behind your back.',
        ],
      },
      {
        heading: 'The three areas',
        body: [
          'A change in Git travels through three places. The working directory is the files you see and edit. The staging area (also called the index) is a holding pen where you assemble precisely what the next snapshot will contain. The repository is the committed history itself, stored in .git. You edit in the first, stage into the second, and commit into the third.',
          'The staging area is the part newcomers underestimate. It exists so a commit can be a deliberate, curated unit rather than “whatever happened to be lying around.” You might edit five files but stage only two, committing a single coherent change and leaving the rest for later. `git init` creates a new empty repository, `git clone <url>` copies an existing one with its full history, and `git status` is your constant companion — it tells you which files are untracked, modified, or staged at any moment.',
        ],
      },
      {
        heading: 'Configuring Git and ignoring files',
        body: [
          'Before your first commit, tell Git who you are: `git config --global user.name "Ana Silva"` and `git config --global user.email ana@example.com`. These details are recorded in every commit. Other useful settings include `git config --global init.defaultBranch main` and a default editor for commit messages. `git config --list --show-origin` shows every setting and the file it came from.',
          'A `.gitignore` file lists patterns Git should never track: build output (`dist/`, `*.o`), dependencies (`node_modules/`), editor files and, above all, secrets such as `.env`. Add it at the start of a project; ignoring a file that is already committed does not remove it from history. `git check-ignore -v file` explains which rule ignores a file, and gitignore.io-style templates give sensible starting lists per language.',
        ],
      },
    ],
    examples: [
      {
        title: 'First repository',
        code: '$ git init demo && cd demo\n$ echo \'# Demo\' > README.md\n$ git status --short\n?? README.md\n$ git add README.md\n$ git commit -m "Add README"\n$ git log --oneline\na1b2c3d Add README',
        explanation: 'Files move from untracked to staged (git add) to committed (git commit). git status tells you which state each file is in.',
      },
    ],
    cheatSheet: [
      ['Distributed VCS', 'Every clone holds the full history; work and commit offline'],
      ['Repository (.git)', 'Hidden folder holding all history, objects, refs and config'],
      ['Working directory', 'The files you actually see and edit'],
      ['Staging area (index)', 'Holding area for exactly what the next commit will contain'],
      ['git init', 'Create a new, empty repository in the current folder'],
      ['git clone <url>', 'Copy a remote repository, full history included'],
      ['git status', 'Show untracked, modified and staged files — your first stop'],
      ['Snapshot, not diff', 'A commit records the state of the project, not just line changes'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Git documentation', url: 'https://git-scm.com/doc' },
      { title: 'Pro Git — About Version Control', url: 'https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control' },
      { title: 'Pro Git — Installing Git', url: 'https://git-scm.com/book/en/v2/Getting-Started-Installing-Git' },
    ],
  },
  'git-staging-commits': {
    overview: [
      'A commit is the atom of Git history: a labelled snapshot you can return to, compare against, or undo. Making good commits is a skill, not a formality — a tidy history of small, well-described changes is a gift to every future reader of the project, starting with you in six months.',
      'This lesson covers the stage-then-commit cycle, inspecting what you are about to record with diff, reading history with log, keeping noise out with .gitignore, and the one rule that matters most: never commit a secret.',
    ],
    learn: [
      {
        heading: 'Stage, then commit',
        body: [
          '`git add <file>` copies a file’s current changes into the staging area; `git add .` stages everything beneath the current directory. Then `git commit -m "message"` records exactly what is staged — and only what is staged — as a new commit. Changes left unstaged stay in your working directory, untouched. This two-step rhythm is what lets you split a messy afternoon of edits into several clean, logical commits.',
          'Before committing, look. `git diff` shows unstaged changes (working directory versus the staging area), and `git diff --staged` shows what you are about to commit (staging area versus the last commit). Reviewing your own diff catches stray debug lines, accidental deletions, and the odd secret before they enter history. If you staged something by mistake, `git restore --staged <file>` removes it from the staging area while leaving your edits intact.',
        ],
      },
      {
        heading: 'History, hygiene, and secrets',
        body: [
          '`git log` prints the commit history, newest first; `git log --oneline` compresses each commit to a single readable line, and `git show <commit>` expands one commit into its full diff. A good commit message explains why a change was made, not merely what — the diff already shows the what. Keep commits small and focused so each one can be understood, reviewed, and reverted on its own.',
          'A .gitignore file lists patterns Git should never track — build output, dependency folders like node_modules, local config, and above all secrets such as .env files and private keys. This matters enormously because Git keeps history forever: a password committed once and “deleted” in the next commit is still sitting in the history, fully recoverable. The habit is simple and non-negotiable: secrets go in .gitignore, never in a commit, and anything that does leak must be rotated, not merely removed.',
        ],
      },
      {
        heading: 'Writing good commit messages',
        body: [
          'A commit message is a note to a future reader, often yourself, trying to understand why the code changed. A widely used convention is a short summary line of about 50 characters in the imperative mood (\'Fix rounding in invoice totals\', not \'Fixed stuff\'), a blank line, then a body that explains why the change was needed and anything non-obvious about how. The diff already shows what changed.',
          'Keep each commit to one logical change, so it can be reviewed, reverted or cherry-picked on its own. Some teams adopt Conventional Commits (`feat:`, `fix:`, `docs:`), which lets tools generate changelogs and version numbers automatically. Before committing, read `git diff --staged` once more; it is the cheapest review there is, and it catches debugging code and secrets.',
        ],
      },
    ],
    examples: [
      {
        title: 'Stage part of a change',
        code: '$ git add -p app.py          # choose hunks: y = stage, n = skip\n$ git diff --staged          # what will be committed\n$ git diff                   # what is still unstaged\n$ git commit -m "Fix rounding in invoice totals"',
        explanation: 'Interactive staging lets one messy working session become several focused commits, each with a clear message.',
      },
    ],
    cheatSheet: [
      ['git add <file>', 'Stage a file’s changes for the next commit (git add . stages all)'],
      ['git commit -m "…"', 'Record the staged changes as a new commit'],
      ['git diff', 'Unstaged changes: working directory vs staging area'],
      ['git diff --staged', 'Staged changes: what the next commit will contain'],
      ['git log --oneline', 'Compact, one-line-per-commit history'],
      ['git restore --staged <f>', 'Unstage a file without losing your edits'],
      ['.gitignore', 'Patterns Git never tracks: build output, deps, secrets'],
      ['Secrets rule', 'History is forever — never commit secrets; rotate anything leaked'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Pro Git — Recording Changes', url: 'https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository' },
      { title: 'git-add documentation', url: 'https://git-scm.com/docs/git-add' },
      { title: 'git-commit documentation', url: 'https://git-scm.com/docs/git-commit' },
    ],
  },
  'git-remotes': {
    overview: [
      'A commit lives on your machine until you deliberately share it. Remotes are Git’s model for other copies of the repository — on GitHub, GitLab, a colleague’s server — and the push/pull/fetch commands are how your local history and the shared history stay in sync.',
      'This lesson covers what a remote is, the difference between fetching and pulling, tracking branches that remember where to push, and the discipline that keeps collaboration from turning into a merge nightmare.',
    ],
    learn: [
      {
        heading: 'Remotes, push, and pull',
        body: [
          'A remote is a named reference to another copy of the repository. When you clone, Git automatically adds one called origin pointing at the source; `git remote -v` lists them with their URLs. `git push` uploads your local commits to a remote branch, and `git pull` brings remote commits down and merges them into your current branch. Nothing crosses the network unless you ask — your commits accumulate locally until you push.',
          'The first push of a branch usually sets its upstream: `git push -u origin main` uploads main and records origin/main as its tracking branch, so afterwards a bare `git push` or `git pull` knows the target without you repeating it. You can have more than one remote — a common open-source pattern names your own fork origin and the project you forked from upstream.',
        ],
      },
      {
        heading: 'Fetch vs pull, and collaborating cleanly',
        body: [
          '`git fetch` and `git pull` are often confused. Fetch downloads the remote’s new commits but does not touch your working branch — it simply updates your view of what the remote has, letting you inspect the incoming changes before integrating them. Pull is fetch plus an automatic merge into your current branch. When you want to look before you leap, fetch; when you are ready to integrate, pull.',
          'The habit that prevents pain is to pull before you start work and push often. Beginning the day on code your teammates changed hours ago means a bigger, messier reconciliation later. And treat `git push --force` as a loaded weapon: on a shared branch it can erase other people’s commits. If you genuinely must rewrite a pushed branch, prefer `--force-with-lease`, which refuses to overwrite work you have not seen — and never force-push a branch others build on.',
        ],
      },
      {
        heading: 'Authentication, forks and keeping in sync',
        body: [
          'Remotes are reached over HTTPS or SSH. HTTPS uses a personal access token or a credential manager rather than your account password; SSH uses a key pair, with the public key added to your hosting account. `git remote -v` shows each remote\'s URL, and `git remote set-url origin git@github.com:org/repo.git` switches a clone from HTTPS to SSH.',
          'When contributing to a project you cannot push to, you fork it and clone your fork as `origin`, then add the original as `upstream`: `git remote add upstream https://github.com/org/repo.git`. To stay current, `git fetch upstream` and merge or rebase `upstream/main` into your branch. `git push --force-with-lease` is the safe way to update a branch after rebasing: it refuses if someone else pushed in the meantime.',
        ],
      },
    ],
    examples: [
      {
        title: 'Fetch, inspect, then integrate',
        code: '$ git fetch origin\n$ git log --oneline main..origin/main     # commits you don\'t have yet\n4e5f6a7 Update dependencies\n$ git merge --ff-only origin/main         # or: git pull --rebase\n$ git push -u origin feature/login        # set upstream on first push',
        explanation: 'fetch is always safe: it downloads without touching your branches, so you can look before you merge.',
      },
    ],
    cheatSheet: [
      ['Remote', 'A named reference to another copy of the repo; default is origin'],
      ['git push', 'Upload local commits to the remote branch'],
      ['git pull', 'Fetch remote changes AND merge them into your branch'],
      ['git fetch', 'Download remote changes WITHOUT merging — look before you leap'],
      ['git push -u origin main', 'Push and set the upstream for future push/pull'],
      ['git remote -v', 'List remotes and their fetch/push URLs'],
      ['Pull before you work', 'Integrate others’ changes early to avoid big conflicts'],
      ['--force-with-lease', 'Safer forced push; refuses to clobber unseen work'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Pro Git — Working with Remotes', url: 'https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes' },
      { title: 'git-push documentation', url: 'https://git-scm.com/docs/git-push' },
      { title: 'git-fetch documentation', url: 'https://git-scm.com/docs/git-fetch' },
    ],
  },
  'git-branching': {
    overview: [
      'Branching is where Git stops being a backup tool and becomes a way of working. A branch is a cheap, throwaway line of development — try an idea, build a feature, fix a bug — all without disturbing the stable mainline until you are ready to merge it in.',
      'This lesson covers what a branch really is (a movable pointer), what HEAD tracks, how to create and switch branches, and how merging brings diverging histories back together — sometimes as a fast-forward, sometimes as a true merge commit.',
    ],
    learn: [
      {
        heading: 'Branches and HEAD',
        body: [
          'Under the hood a branch is almost nothing: a lightweight, movable pointer to a commit. Creating one does not copy any files — it just writes a new reference, which is why branching in Git is instantaneous and why you should branch freely. HEAD is the pointer to your current branch, and therefore to the commit you are standing on; switching branches moves HEAD and updates your working directory to match.',
          '`git switch -c <name>` (or the older `git checkout -b <name>`) creates a branch from your current commit and moves onto it. `git branch` lists branches, marking the current one; `git switch main` moves back to main. The mental model is simple and powerful: commits form a graph, branches are sticky notes pointing at commits in that graph, and HEAD is the sticky note that says “you are here.”',
        ],
      },
      {
        heading: 'Merging branches back',
        body: [
          '`git merge <branch>` integrates another branch’s commits into the one you are on. When your current branch has not advanced since the other branched off, Git can simply slide the pointer forward — a fast-forward merge, with no extra commit, because the history is already linear. When both branches have new commits, Git performs a true three-way merge and records a merge commit with two parents, tying the two lines of history together.',
          'The everyday rhythm is: branch for each feature or fix, commit there until it is done, switch to main, and merge the branch in. This keeps main releasable while work proceeds in isolation, and it makes each change reviewable as a unit. When a branch is merged and no longer needed, `git branch -d <name>` deletes it cleanly (use -D only to force-delete unmerged work you are sure you want gone).',
        ],
      },
      {
        heading: 'Inspecting and tidying branches',
        body: [
          '`git branch -vv` lists local branches with their last commit and the remote branch each one tracks, including how far ahead or behind it is. `git branch --merged main` shows branches whose work is already in main and can be deleted with `git branch -d`. `-D` forces deletion of unmerged work, so use it only when you are sure. `git fetch --prune` removes remote-tracking branches that were deleted on the server.',
          '`git log --oneline --graph --all` draws the whole branch structure in the terminal, which helps when you are unsure where a branch started or what a merge will bring in. `git log main..feature` lists commits on feature that are not yet in main, and `git diff main...feature` shows the changes the feature branch introduced since it diverged.',
        ],
      },
    ],
    examples: [
      {
        title: 'Feature branch lifecycle',
        code: '$ git switch -c feature/search\n# ...commits...\n$ git switch main && git pull\n$ git merge --no-ff feature/search\n$ git branch -d feature/search\n$ git log --oneline --graph -5',
        explanation: 'Branches are cheap pointers to commits. --no-ff keeps a merge commit so the feature remains visible as a unit in history.',
      },
    ],
    cheatSheet: [
      ['Branch', 'A lightweight, movable pointer to a commit — cheap to create'],
      ['HEAD', 'Pointer to your current branch (and the commit you are on)'],
      ['git switch -c <name>', 'Create a branch and move onto it'],
      ['git switch <name>', 'Move to an existing branch; updates the working directory'],
      ['git merge <branch>', 'Integrate another branch into the current one'],
      ['Fast-forward', 'Move the pointer forward when history is linear — no merge commit'],
      ['Merge commit', 'Created when both branches diverged; has two parents'],
      ['git branch -d <name>', 'Delete a merged branch (-D force-deletes)'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Pro Git — Branches in a Nutshell', url: 'https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell' },
      { title: 'git-branch documentation', url: 'https://git-scm.com/docs/git-branch' },
      { title: 'git-checkout documentation', url: 'https://git-scm.com/docs/git-checkout' },
    ],
  },
  'git-conflicts': {
    overview: [
      'Sooner or later two branches change the same lines, and Git stops to ask you which version wins. A merge conflict is not an error — it is Git refusing to guess. Resolving one is a routine, learnable skill, and understanding it dissolves most of the fear beginners attach to merging.',
      'This lesson covers what causes a conflict, how to read and resolve the markers Git leaves in a file, and the deeper choice between merge and rebase for integrating one branch’s work on top of another.',
    ],
    learn: [
      {
        heading: 'Reading and resolving a conflict',
        body: [
          'A conflict happens when two branches edit the same region of a file in incompatible ways; Git can merge changes that touch different places automatically, but overlapping edits it leaves to you. It marks the file with three delimiters: everything between `<<<<<<<` and `=======` is your current branch’s version, everything between `=======` and `>>>>>>>` is the incoming version. You edit the region down to the correct final result and delete all three markers.',
          'Once the file reads the way it should, `git add` the file to mark the conflict resolved, then `git commit` (or `git merge --continue`) to complete the merge. If you decide the whole thing was a mistake, `git merge --abort` returns the branch to its pre-merge state. One hard-won lesson from this very project: committing a file with the conflict markers still in it breaks the code — a pre-commit hook that scans for `<<<<<<<` is cheap insurance.',
        ],
      },
      {
        heading: 'Merge vs rebase',
        body: [
          'There are two ways to bring main’s latest work into your feature branch. `git merge main` creates a merge commit joining the histories, preserving exactly what happened — branches, forks, and all. `git rebase main` instead replays your branch’s commits one by one on top of the current main, producing a clean, linear history as if you had started from main today. Rebase rewrites your commits, giving them new hashes.',
          'The trade-off is honesty versus tidiness, and the golden rule settles most arguments: never rebase commits you have already pushed and shared. Rewriting public history changes hashes out from under your collaborators and breaks their clones. Rebase freely on your own local, unpushed work to tidy it before sharing; use merge to integrate anything that others already have. Conflicts can occur during a rebase too — resolve, `git add`, then `git rebase --continue`.',
        ],
      },
      {
        heading: 'Tools that make conflicts easier',
        body: [
          'Setting `git config --global merge.conflictstyle zdiff3` adds a third section to conflict markers showing the common ancestor\'s version, which makes it much easier to see what each side changed. `git mergetool` opens a configured visual merge tool, and most editors, including VS Code, show conflicts with buttons to accept either side or both. After resolving, run the tests before committing: a conflict-free merge can still produce broken code.',
          'If you resolve the same conflict repeatedly, for example while rebasing a long-running branch, enable rerere (`git config --global rerere.enabled true`), which records how you resolved a conflict and reapplies it automatically next time. Conflicts are fewer and smaller when branches are short-lived and merged often.',
        ],
      },
    ],
    examples: [
      {
        title: 'Resolve a merge conflict',
        code: '<<<<<<< HEAD\nTIMEOUT = 30\n=======\nTIMEOUT = 60\n>>>>>>> feature/slow-api\n\n# edit to the intended result, remove the markers:\nTIMEOUT = 60\n$ git add config.py && git commit',
        explanation: 'Git marks both versions; you decide the correct result, then stage it to mark the conflict resolved. Run the tests before committing.',
      },
    ],
    cheatSheet: [
      ['Merge conflict', 'Two branches changed the same lines; Git asks you to choose'],
      ['<<<<<<< ======= >>>>>>>', 'Markers around the two versions — edit and DELETE all three'],
      ['Resolve', 'Edit to the right result, git add the file, then git commit'],
      ['git merge --abort', 'Bail out and return to the pre-merge state'],
      ['git merge main', 'Integrate with a merge commit; preserves true history'],
      ['git rebase main', 'Replay your commits on top of main; linear, new hashes'],
      ['Golden rule', 'Never rebase commits that are already pushed/shared'],
      ['git rebase --continue', 'Proceed after resolving a conflict mid-rebase'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Pro Git — Basic Branching and Merging', url: 'https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging' },
      { title: 'git-merge documentation', url: 'https://git-scm.com/docs/git-merge' },
      { title: 'Pro Git — Advanced Merging', url: 'https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging' },
    ],
  },
  'git-undo': {
    overview: [
      'Git’s greatest gift is that almost nothing is truly lost — if you know the right command. Undoing changes is a whole toolkit, not a single button, and choosing the wrong tool is how people actually lose work. The distinction that matters most: whether a change is still private, or already shared.',
      'This lesson covers discarding edits, un-committing with reset, safely undoing a shared commit with revert, shelving work with stash, and the reflog — the safety net that can recover commits you thought were gone.',
    ],
    learn: [
      {
        heading: 'Restore, reset, and revert',
        body: [
          '`git restore <file>` throws away unstaged edits to a file, returning it to the last committed state — destructive, so be sure. To undo a commit, `git reset` moves your branch pointer backwards; `--soft HEAD~1` keeps the changes staged (ideal for re-committing differently), `--mixed` (the default) keeps them in the working directory unstaged, and `--hard` discards them entirely. That last one is the sharpest edge in Git: `git reset --hard` can erase uncommitted work with no undo.',
          'Reset rewrites history, which makes it wrong for commits you have already pushed. For those, use `git revert <commit>` — it creates a new commit that undoes the target’s changes, leaving the original in place. Because revert only adds to history rather than rewriting it, it is safe to use on shared branches where reset would break your collaborators’ clones.',
        ],
      },
      {
        heading: 'Stash and the reflog safety net',
        body: [
          '`git stash` shelves your uncommitted changes and hands you a clean working tree — perfect when you need to switch branches mid-thought or pull without committing half-finished work. `git stash pop` reapplies the most recent stash and drops it from the list; `git stash apply` reapplies but keeps it. And `git commit --amend` replaces the last commit, letting you fix its message or fold in a forgotten file — but avoid amending anything you have already pushed.',
          'The reflog is the feature that turns most “I lost my work” panics into a two-minute fix. `git reflog` records everywhere HEAD has been — every commit, reset, checkout, and merge — even commits no branch points to anymore. After a bad `reset --hard`, the reflog still lists the commit you reset away from, and you can recover it. Git very rarely deletes your commits immediately; the reflog is how you find them again.',
        ],
      },
      {
        heading: 'Choosing the safest undo',
        body: [
          'Before undoing anything, check whether the commits have been pushed. Local, unpushed history can be rewritten freely with `git reset`, `git commit --amend` or an interactive rebase. Shared history should not be rewritten, because collaborators\' copies still contain the old commits; use `git revert`, which adds a new commit that undoes the change, and works even for merges with `git revert -m 1 <merge>`.',
          '`git reset` has three modes. `--soft` moves the branch but keeps your changes staged, `--mixed` (the default) keeps them unstaged, and `--hard` discards them. Uncommitted work lost to `--hard` is very hard to recover, so stash or commit first. To recover a single file from an older commit, `git restore --source=<commit> path/to/file` is precise and leaves everything else alone.',
        ],
      },
    ],
    examples: [
      {
        title: 'Pick the right undo',
        code: 'Situation                                 Command\n----------------------------------------  -------------------------------\nDiscard unstaged edits to a file          git restore app.py\nUnstage a file                            git restore --staged app.py\nFix the last unpushed commit message      git commit --amend\nUndo a pushed commit safely               git revert <sha>\nFind a \'lost\' commit after a reset        git reflog',
        explanation: 'Rewrite only unpushed history; for anything shared, revert creates a new commit that undoes the change.',
      },
    ],
    cheatSheet: [
      ['git restore <file>', 'Discard unstaged edits to a file (destructive)'],
      ['git reset --soft HEAD~1', 'Undo last commit, keep its changes staged'],
      ['git reset --hard', 'Reset and WIPE working/staged changes — no undo'],
      ['git revert <commit>', 'New commit that undoes one — safe for shared history'],
      ['git commit --amend', 'Replace the last commit (don’t amend pushed commits)'],
      ['git stash / pop', 'Shelve uncommitted changes, then reapply them'],
      ['git reflog', 'Log of where HEAD has been — recover “lost” commits'],
      ['revert vs reset', 'Pushed? revert. Local only? reset is fine'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'git-reset documentation', url: 'https://git-scm.com/docs/git-reset' },
      { title: 'git-revert documentation', url: 'https://git-scm.com/docs/git-revert' },
      { title: 'Pro Git — Undoing Things', url: 'https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things' },
    ],
  },
  'git-workflows': {
    overview: [
      'Commands are only half of Git; the other half is how a team agrees to use them. A workflow is the shared choreography — where work happens, how it gets reviewed, and how it lands on the mainline — that lets many people change the same codebase without chaos.',
      'This lesson covers the feature-branch workflow and pull requests, the cleanup tools of interactive rebase and cherry-pick, release tags, and the broad shapes of trunk-based development versus GitFlow.',
    ],
    learn: [
      {
        heading: 'Feature branches and pull requests',
        body: [
          'The dominant model is simple: each change — a feature, a fix — gets its own branch off main, is developed in isolation, and is proposed back through a pull request (called a merge request on some platforms). A pull request is where review happens: teammates read the diff, comment, request changes, and continuous-integration checks run lint, tests, and the build so broken code cannot merge. Only when it is approved and green does the branch land on main.',
          'Keep pull requests small. A focused change of a few files is reviewed carefully in minutes; a thousand-line megabranch is rubber-stamped, hides bugs, and is painful to revert. Small branches merge often, keep main close to everyone’s work, and reduce conflicts — the whole system runs smoother when each unit of change is something a human can actually hold in their head.',
        ],
      },
      {
        heading: 'Shaping history and releases',
        body: [
          'Before sharing a branch, you can tidy it. `git rebase -i` (interactive rebase) lets you reorder, edit, drop, or squash commits — folding “wip,” “fix typo,” and “actually fix it” into one clean commit that tells a coherent story. `git cherry-pick <commit>` copies a single commit from one branch onto another, the standard way to apply a hotfix across branches. And `git tag v1.2.0` marks a specific commit as a release, giving humans and deploy systems a stable name to point at.',
          'Teams choose an overall shape. Trunk-based development keeps everyone merging small changes into main frequently, often behind feature flags, which suits continuous delivery. GitFlow uses longer-lived develop and release branches with a more ceremonial path to production, which suits versioned, scheduled releases. Forking workflows, common in open source, give each contributor their own server-side copy that they propose from. There is no single right answer — only the one your team actually follows.',
        ],
      },
      {
        heading: 'Protecting the main branch',
        body: [
          'Whatever workflow a team uses, the main branch should always be releasable. Hosting platforms enforce this with branch protection rules: require pull requests instead of direct pushes, require at least one approving review, require CI checks to pass, and require branches to be up to date before merging. A CODEOWNERS file routes reviews of sensitive paths, such as infrastructure or authentication code, to the right people automatically.',
          'Agree how pull requests are merged. A merge commit preserves every commit and the branch shape; squash merging collapses a branch into one commit on main, giving a tidy history; rebase merging replays the commits in a straight line. Many teams squash by default. Signed commits and tags (GPG or SSH signing) let reviewers verify who authored a change.',
        ],
      },
    ],
    examples: [
      {
        title: 'Trunk-based flow with a pull request',
        code: '$ git switch -c fix/null-total main\n$ git commit -am "Handle empty cart total"\n$ git push -u origin fix/null-total\n# open PR -> CI runs tests -> review -> squash merge to main within a day\n$ git switch main && git pull && git branch -d fix/null-total',
        explanation: 'Short-lived branches merged daily keep conflicts small; unfinished features hide behind flags rather than long-lived branches.',
      },
    ],
    cheatSheet: [
      ['Feature-branch workflow', 'One branch per change, merged via review — main stays stable'],
      ['Pull request', 'Proposal to merge, with review, discussion and CI gates'],
      ['CI on a PR', 'Runs lint/tests/build so broken code cannot merge'],
      ['git rebase -i', 'Interactive: reorder, edit, drop or squash commits before sharing'],
      ['Squash', 'Fold several commits into one clean, logical change'],
      ['git cherry-pick <commit>', 'Apply a single commit from one branch onto another'],
      ['git tag v1.2.0', 'Mark a commit as a release'],
      ['Trunk-based vs GitFlow', 'Frequent small merges to main vs long-lived release branches'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Pro Git — Branching Workflows', url: 'https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows' },
      { title: 'GitHub Flow', url: 'https://docs.github.com/en/get-started/using-github/github-flow' },
      { title: 'Comparing Git workflows — Atlassian', url: 'https://www.atlassian.com/git/tutorials/comparing-workflows' },
    ],
  },
  'git-internals-hygiene': {
    overview: [
      'Git can feel like magic until you see the handful of simple ideas underneath — and those ideas explain why some operations are safe, why others are dangerous, and why the history is so hard to tamper with. Understanding the object model turns Git from a set of memorized incantations into a system you can reason about.',
      'This lesson covers how commits are identified by cryptographic hashes, the four object types, the commit graph, and the good-practice disciplines — keeping secrets out, signing commits, handling large files, and never rewriting shared history — that keep a repository healthy and trustworthy.',
    ],
    learn: [
      {
        heading: 'The object model',
        body: [
          'Everything in Git is a hashed object stored under .git/objects. There are four types: a blob holds a file’s contents, a tree represents a directory (names pointing at blobs and other trees), a commit points at one tree plus its parent commit(s) and carries author and message, and a tag can annotate a specific object. Each object is named by a cryptographic hash of its content — historically SHA-1, now moving to SHA-256.',
          'Hashing by content is what makes history tamper-evident: change a single byte in any commit and its hash changes, which changes every descendant’s hash in turn. The commits themselves form a directed acyclic graph (DAG) — each pointing back at its parents — and branches and merges are simply nodes and edges in that graph. This is also why rewriting a commit everyone else already has is so disruptive: new content means new hashes, and your collaborators’ histories no longer line up with yours.',
        ],
      },
      {
        heading: 'Keeping a repository healthy',
        body: [
          'The single most important discipline is keeping secrets out. Because every commit is permanent and content-addressed, a committed password lives on in history even after you “delete” it — so use .gitignore plus a secret scanner such as gitleaks in a pre-commit hook, and if something does leak, rotate the credential rather than trusting a cleanup. For provenance, signing commits and tags with GPG or SSH cryptographically proves who authored them, defending against impersonation in the log.',
          'A few more habits keep repositories fast and sane. Large binaries bloat every clone’s history forever, so store them with Git LFS, which keeps lightweight pointers in Git and the bytes elsewhere. Write commit messages that explain the why, because future debuggers will read them. And treat the golden rule as sacred: never rewrite history that has been shared. Local cleanup before you push is good craftsmanship; rewriting public history is how you break everyone downstream of you.',
        ],
      },
      {
        heading: 'Large files, secrets and repository maintenance',
        body: [
          'Git stores every version of every file forever, so large binary files make clones slow and repositories huge. Git LFS stores large files such as images, models and datasets on a separate server and keeps only small pointer files in the repository. Track patterns with `git lfs track "*.psd"` before committing them.',
          'If a secret is committed, treat it as compromised and revoke it immediately; then remove it from history with `git filter-repo` (the recommended replacement for `git filter-branch`) or BFG, and force-push, knowing that existing clones and forks still hold the old history. Prevent it next time with a pre-commit secret scanner such as gitleaks. `git gc` packs objects and cleans up, and `git fsck` checks the repository\'s integrity.',
        ],
      },
    ],
    examples: [
      {
        title: 'Look inside a commit object',
        code: '$ git cat-file -p HEAD\ntree 9b2c...\nparent 4e5f...\nauthor Ana <ana@example.com> 1715500000 +0000\ncommitter Ana <ana@example.com> 1715500000 +0000\n\nAdd README\n$ git cat-file -p 9b2c...\n100644 blob 7d1e...    README.md',
        explanation: 'A commit points to a tree (a directory listing), which points to blobs (file contents), all addressed by hash. Change any byte and every hash above it changes.',
      },
    ],
    cheatSheet: [
      ['Commit hash', 'Cryptographic hash (SHA-1 → SHA-256) of content — tamper-evident'],
      ['Object types', 'blob (file), tree (directory), commit, tag'],
      ['DAG', 'History is a directed acyclic graph of commits linked to parents'],
      ['Secrets out', '.gitignore + a scanner (gitleaks); rotate anything that leaks'],
      ['Signed commits', 'GPG/SSH signatures prove authorship, defeat impersonation'],
      ['Git LFS', 'Stores large binaries outside history via pointers'],
      ['Good messages', 'Explain WHY — invaluable when debugging history later'],
      ['Golden rule', 'Never rewrite shared history; tidy local work only'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Pro Git — Plumbing and Porcelain', url: 'https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain' },
      { title: 'git-gc documentation', url: 'https://git-scm.com/docs/git-gc' },
      { title: 'Pro Git — Git Objects', url: 'https://git-scm.com/book/en/v2/Git-Internals-Git-Objects' },
    ],
  },
};
