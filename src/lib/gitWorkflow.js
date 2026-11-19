// Git Workflow simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Git Workflow" (src/components/viz) drives this
// engine for its interactive simulator.
//
// Model (from the Git & Version Control course + the thachdv.it Reel the
// subject is based on):
// - A commit is a snapshot of the staged files, with a message and parents
//   (Git stores snapshots, not diffs). A branch is a lightweight, movable
//   pointer to a commit; HEAD points at the current branch.
// - Every file has a working-tree version and, when staged, the version the
//   index holds. Status compares working vs staged vs HEAD, exactly like
//   real Git: untracked, modified, staged, staged + modified, clean.
// - `git pull` is fetch + merge. `git push` uploads local commits; when the
//   remote has commits you lack, it is rejected until you pull first.
// - A merge fast-forwards when there is no divergent history; otherwise it
//   is a 3-way merge off the common ancestor and creates a merge commit
//   with two parents. Changing the same file differently on both sides is
//   a conflict, resolved by picking a side (real Git makes you edit the
//   markers out, then `git add` + commit).
// - `git stash` shelves tracked changes only — untracked files stay put.

export const SEED_FILES = ['app.js', 'cart.js', 'style.css'];
export const FEATURE_BRANCH = 'feature';
export const REMOTE_URL = 'github.com:you/shop.git';

/** The ten commands, in the Reel's order. `hint` is the guided-tour line. */
export const COMMANDS = [
  { id: 'init', label: 'git init', blurb: 'Create the repo — a hidden .git folder.', hint: 'Start here — create the repository in this folder.' },
  { id: 'status', label: 'git status', blurb: 'See what changed, staged, untracked.', hint: 'Look: three new files, untracked. Status is always the first stop.' },
  { id: 'add', label: 'git add', blurb: 'Stage changes for the next commit.', hint: 'Stage all three files for the first commit. Click a file first to stage just that one.' },
  { id: 'commit', label: 'git commit', blurb: 'Record staged changes as a snapshot.', hint: 'Record the staged files — your first snapshot. Only staged changes are committed.' },
  { id: 'branch', label: 'git branch', blurb: 'Create the feature branch.', hint: 'Create a feature branch from main. A branch is just a pointer to a commit.' },
  { id: 'switch', label: 'git switch', blurb: 'Move HEAD to the other branch.', hint: 'Move HEAD onto feature. Your working files follow the branch.' },
  { id: 'merge', label: 'git merge', blurb: 'Bring the other branch into this one.', hint: 'Bring feature back into main. For a real merge, first make a change on feature — edit cart.js, add, commit, then switch back to main and merge.' },
  { id: 'stash', label: 'git stash', blurb: 'Shelve uncommitted changes.', hint: 'Shelve uncommitted work and get a clean tree. Edit style.css first if the tree is clean.' },
  { id: 'pull', label: 'git pull', blurb: 'Fetch from origin and merge it in.', hint: 'Fetch origin and merge it in. Origin is empty until you push — pulling now shows the real error, and that is the lesson.' },
  { id: 'push', label: 'git push', blurb: 'Upload local commits to origin.', hint: 'Upload your commits to origin and set the upstream. After this, plain git push works.' },
];

export const COMMAND_IDS = COMMANDS.map((c) => c.id);

function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

/** A fresh repo: no .git yet, three new files in the working tree. */
export function createState() {
  return {
    initialized: false,
    branch: 'main',
    branches: {
      main: { tip: null, createdFrom: null },
    },
    /** [{ id, message, parents: [], files: { name: version }, author }] */
    commits: [],
    /** name -> { working: version, staged: version | null } */
    files: Object.fromEntries(SEED_FILES.map((name) => [name, { working: 1, staged: null }])),
    /** [{ id, message, files: { name: { working, staged } } }] */
    stash: [],
    remoteTip: null,
    upstream: false,
    /** { source, sourceTip, files: [names], mergedFiles } while a merge is conflicted */
    conflict: null,
    nextCommit: 1,
    nextStash: 1,
  };
}

export function commitById(state, id) {
  return state.commits.find((c) => c.id === id) || null;
}

export function branchTip(state, branchName = state.branch) {
  return state.branches[branchName]?.tip ?? null;
}

/** The file -> version snapshot at a branch tip ({} before the first commit). */
export function headFiles(state, branchName = state.branch) {
  const tip = branchTip(state, branchName);
  return tip ? { ...(commitById(state, tip)?.files || {}) } : {};
}

/** All commit ids reachable from a tip, walking parents (merge-safe). */
export function reachable(state, tipId) {
  const seen = new Set();
  const stack = tipId ? [tipId] : [];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const commit = commitById(state, id);
    if (commit) stack.push(...commit.parents);
  }
  return seen;
}

export function isAncestor(state, maybeAncestor, tipId) {
  if (maybeAncestor === tipId) return true;
  if (maybeAncestor === null || tipId === null) return false;
  return reachable(state, tipId).has(maybeAncestor);
}

/** First common ancestor of two tips (the merge-base), or null. */
export function mergeBase(state, tipA, tipB) {
  if (tipA === null || tipB === null) return null;
  const reachB = reachable(state, tipB);
  const stack = [tipA];
  const seen = new Set();
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (reachB.has(id)) return id;
    const commit = commitById(state, id);
    if (commit) stack.push(...commit.parents);
  }
  return null;
}

/** Names whose version differs between two file snapshots. */
export function changedFiles(fromFiles, toFiles) {
  const names = new Set([...Object.keys(fromFiles), ...Object.keys(toFiles)]);
  return [...names].filter((name) => (fromFiles[name] ?? null) !== (toFiles[name] ?? null));
}

/** Git status of one file against the current branch HEAD. */
export function fileStatus(state, name) {
  const f = state.files[name];
  if (!f) return null;
  if (state.conflict && state.conflict.files.includes(name)) return 'conflicted';
  const head = headFiles(state)[name];
  const { working, staged } = f;
  if (head === undefined) {
    if (staged === null) return 'untracked';
    return staged === working ? 'staged' : 'staged+modified';
  }
  if (staged !== null && staged !== head) {
    return staged === working ? 'staged' : 'staged+modified';
  }
  return working !== head ? 'modified' : 'clean';
}

/** Files whose HEAD version is already on the remote (pushed). */
function pushedFileNames(state) {
  const tip = branchTip(state);
  if (!tip || !state.remoteTip) return new Set();
  const remoteReach = reachable(state, state.remoteTip);
  const headReach = reachable(state, tip);
  const head = headFiles(state);
  const pushed = new Set();
  for (const name of SEED_FILES) {
    const version = head[name];
    if (version === undefined) continue;
    for (const id of remoteReach) {
      if (!headReach.has(id)) continue;
      if (commitById(state, id)?.files[name] === version) {
        pushed.add(name);
        break;
      }
    }
  }
  return pushed;
}

/** Which of the four zones a file chip lives in — the furthest its newest change has reached. */
export function fileZone(state, name) {
  const status = fileStatus(state, name);
  if (status === 'untracked' || status === 'modified' || status === 'staged+modified' || status === 'conflicted') return 'working';
  if (status === 'staged') return 'staging';
  return pushedFileNames(state).has(name) ? 'remote' : 'local';
}

export const ZONES = [
  { id: 'working', label: 'Working Tree', blurb: 'Where you edit files.' },
  { id: 'staging', label: 'Staging Area', blurb: 'The index — what the next commit holds.' },
  { id: 'local', label: 'Local Repo', blurb: 'Committed snapshots in .git.' },
  { id: 'remote', label: 'Remote Origin', blurb: 'Commits shared on origin.' },
];

/** Headline counters for the panel. */
export function counts(state) {
  let modified = 0;
  let staged = 0;
  let untracked = 0;
  for (const name of SEED_FILES) {
    const status = fileStatus(state, name);
    if (status === 'modified' || status === 'untracked' || status === 'staged+modified' || status === 'conflicted') modified += 1;
    if (status === 'staged' || status === 'staged+modified') staged += 1;
    if (status === 'untracked') untracked += 1;
  }
  const tip = branchTip(state);
  const localReach = reachable(state, tip);
  const remoteReach = reachable(state, state.remoteTip);
  let ahead = 0;
  let behind = 0;
  for (const id of localReach) if (!remoteReach.has(id)) ahead += 1;
  for (const id of remoteReach) if (!localReach.has(id)) behind += 1;
  return { modified, staged, untracked, ahead, behind, commits: state.commits.length, stashed: state.stash.length };
}

function shortId(state, id) {
  return id || '(no commits yet)';
}

function tipSummary(state, branchName) {
  const tip = branchTip(state, branchName);
  if (!tip) return 'no commits yet';
  const commit = commitById(state, tip);
  return `${tip} ${commit.message}`;
}

/** The `git status` output for the current state. */
export function statusLines(state) {
  const lines = [`On branch ${state.branch}`];
  const tip = branchTip(state);
  if (!tip) {
    lines.push('');
    lines.push('No commits yet');
  } else if (state.upstream && state.remoteTip) {
    const { ahead, behind } = counts(state);
    if (ahead === 0 && behind === 0) lines.push(`Your branch is up to date with 'origin/${state.branch}'.`);
    else if (ahead > 0 && behind === 0) lines.push(`Your branch is ahead of 'origin/${state.branch}' by ${ahead} commit${ahead === 1 ? '' : 's'}.`);
    else if (behind > 0 && ahead === 0) lines.push(`Your branch is behind 'origin/${state.branch}' by ${behind} commit${behind === 1 ? '' : 's'}, and can be fast-forwarded.`);
    else lines.push(`Your branch and 'origin/${state.branch}' have diverged, and have ${ahead} and ${behind} different commit${ahead === 1 && behind === 1 ? '' : 's'} each, respectively.`);
  } else if (state.upstream) {
    lines.push(`Your branch is based on 'origin/${state.branch}', but the upstream is gone.`);
  }
  const staged = [];
  const modified = [];
  const untracked = [];
  for (const name of SEED_FILES) {
    const status = fileStatus(state, name);
    const head = headFiles(state)[name];
    if (status === 'staged') staged.push(head === undefined ? `new file:   ${name}` : `modified:   ${name}`);
    else if (status === 'staged+modified') {
      staged.push(head === undefined ? `new file:   ${name}` : `modified:   ${name}`);
      modified.push(`modified:   ${name}`);
    } else if (status === 'modified' || status === 'conflicted') modified.push(`modified:   ${name}`);
    else if (status === 'untracked') untracked.push(name);
  }
  if (staged.length > 0) {
    lines.push('');
    lines.push('Changes to be committed:');
    lines.push('  (use "git restore --staged <file>..." to unstage)');
    for (const line of staged) lines.push(`\t${line}`);
  }
  if (modified.length > 0) {
    lines.push('');
    lines.push('Changes not staged for commit:');
    lines.push('  (use "git add <file>..." to update what will be committed)');
    for (const line of modified) lines.push(`\t${line}`);
  }
  if (untracked.length > 0) {
    lines.push('');
    lines.push('Untracked files:');
    lines.push('  (use "git add <file>..." to include in what will be committed)');
    for (const name of untracked) lines.push(`\t${name}`);
  }
  if (staged.length === 0 && modified.length === 0 && untracked.length === 0) {
    lines.push('nothing to commit, working tree clean');
  }
  return lines;
}

function notARepo() {
  return { ok: false, output: ['fatal: not a git repository (or any of the parent directories): .git', 'Run `git init` first — it creates the hidden .git folder.'] };
}

function createCommit(next, message, parents, files, author = 'you') {
  const id = `c${next.nextCommit}`;
  next.nextCommit += 1;
  const commit = { id, message, parents: [...parents], files: { ...files }, author };
  next.commits.push(commit);
  return commit;
}

/** Shared merge core: source tip into the current branch. */
function attemptMerge(next, sourceLabel, sourceTip) {
  const currentTip = branchTip(next);
  if (!sourceTip) return { ok: false, output: [`Nothing to merge — ${sourceLabel} has no commits yet.`] };
  if (sourceTip === currentTip) return { ok: true, output: ['Already up to date.'] };
  if (isAncestor(next, currentTip, sourceTip)) {
    next.branches[next.branch].tip = sourceTip;
    return { ok: true, output: [`Updating ${shortId(next, currentTip)}..${sourceTip}`, `Fast-forward`, `${next.branch} now points at ${sourceTip} — no merge commit needed.`] };
  }
  if (isAncestor(next, sourceTip, currentTip)) return { ok: true, output: ['Already up to date.'] };
  const base = mergeBase(next, currentTip, sourceTip);
  const baseFiles = base ? { ...(commitById(next, base)?.files || {}) } : {};
  const currentFiles = headFiles(next);
  const sourceFiles = { ...(commitById(next, sourceTip)?.files || {}) };
  const currentChanged = changedFiles(baseFiles, currentFiles);
  const sourceChanged = changedFiles(baseFiles, sourceFiles);
  const conflicts = sourceChanged.filter(
    (name) => currentChanged.includes(name) && currentFiles[name] !== sourceFiles[name],
  );
  if (conflicts.length > 0) {
    // Pre-merge the non-conflicted source changes; conflicted files keep
    // the current version until the learner picks a side.
    const merged = { ...currentFiles };
    for (const name of sourceChanged) if (!conflicts.includes(name)) merged[name] = sourceFiles[name];
    next.conflict = { source: sourceLabel, sourceTip, files: conflicts, mergedFiles: merged };
    return {
      ok: false,
      output: [
        `Auto-merging ${conflicts.join(', ')}`,
        `CONFLICT (content): Merge conflict in ${conflicts.join(', ')}`,
        'Automatic merge failed; fix conflicts and then commit the result.',
        'Pick a side for each conflicted file below, or abort the merge.',
      ],
    };
  }
  const merged = { ...currentFiles };
  for (const name of sourceChanged) merged[name] = sourceFiles[name];
  const message = sourceLabel === 'origin/main'
    ? `Merge remote-tracking branch 'origin/main'`
    : `Merge branch '${sourceLabel}' into ${next.branch}`;
  const commit = createCommit(next, message, [currentTip, sourceTip].filter(Boolean), merged);
  next.branches[next.branch].tip = commit.id;
  return { ok: true, output: [`Merge made by the 'ort' strategy.`, ` ${commit.id} ${message}`] };
}

const handlers = {
  init(state) {
    const next = clone(state);
    if (next.initialized) {
      return { state: next, ok: true, output: ['Reinitialized existing Git repository in /home/you/shop/.git/'] };
    }
    next.initialized = true;
    return {
      state: next,
      ok: true,
      output: [
        'Initialized empty Git repository in /home/you/shop/.git/',
        'On branch main — nothing committed yet. Your three files are untracked.',
      ],
    };
  },

  status(state) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    return { state: clone(state), ok: true, output: statusLines(state) };
  },

  add(state, opts = {}) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    const next = clone(state);
    const wanted = opts.files && opts.files.length > 0 ? opts.files : null;
    const changed = SEED_FILES.filter((name) => {
      const status = fileStatus(next, name);
      return status === 'modified' || status === 'untracked' || status === 'staged+modified' || status === 'conflicted';
    });
    const targets = wanted ? wanted.filter((name) => changed.includes(name)) : changed;
    if (targets.length === 0) {
      return { state: next, ok: true, output: ['Nothing to stage — the working tree is clean.'] };
    }
    for (const name of targets) next.files[name].staged = next.files[name].working;
    return { state: next, ok: true, output: [`Staged: ${targets.join(', ')}`, 'Run `git status` — they are now "changes to be committed".'] };
  },

  commit(state, opts = {}) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    const next = clone(state);
    const stagedNames = SEED_FILES.filter((name) => {
      const status = fileStatus(next, name);
      return status === 'staged' || status === 'staged+modified';
    });
    if (stagedNames.length === 0) {
      return { state: next, ok: false, output: [`On branch ${next.branch}`, 'nothing to commit, working tree clean', 'Stage something first — only staged changes are committed.'] };
    }
    const head = headFiles(next);
    const snapshot = { ...head };
    for (const name of stagedNames) snapshot[name] = next.files[name].staged;
    const first = branchTip(next) === null;
    const message = (opts.message || '').trim() || (first ? 'Initial commit' : `Update ${stagedNames.join(', ')}`);
    const commit = createCommit(next, message, branchTip(next) ? [branchTip(next)] : [], snapshot);
    next.branches[next.branch].tip = commit.id;
    for (const name of stagedNames) next.files[name].staged = null;
    return {
      state: next,
      ok: true,
      output: [
        `[${next.branch}${first ? ' (root-commit)' : ''} ${commit.id}] ${message}`,
        ` ${stagedNames.length} file${stagedNames.length === 1 ? '' : 's'} changed — a snapshot, not a diff.`,
        'Commit is local only — push to share it.',
      ],
    };
  },

  branch(state) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    const next = clone(state);
    if (next.branches[FEATURE_BRANCH]) {
      return { state: next, ok: false, output: [`fatal: A branch named '${FEATURE_BRANCH}' already exists.`, 'Switch to it with `git switch feature`.'] };
    }
    const tip = branchTip(next);
    next.branches[FEATURE_BRANCH] = { tip, createdFrom: tip };
    return {
      state: next,
      ok: true,
      output: [
        tip ? `Created branch '${FEATURE_BRANCH}' at ${tip}.` : `Created branch '${FEATURE_BRANCH}' (no commits yet).`,
        'HEAD is still on main — a branch is just a pointer to a commit.',
      ],
    };
  },

  switch(state) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    const next = clone(state);
    if (next.conflict) {
      return { state: next, ok: false, output: ['error: you need to resolve the merge first (or abort it) before switching branches.'] };
    }
    if (!next.branches[FEATURE_BRANCH]) {
      return { state: next, ok: false, output: [`error: pathspec '${FEATURE_BRANCH}' did not match any file(s) known to git`, 'Create it first with `git branch`.'] };
    }
    const other = next.branch === 'main' ? FEATURE_BRANCH : 'main';
    const hadChanges = SEED_FILES.some((name) => ['modified', 'untracked', 'staged', 'staged+modified'].includes(fileStatus(next, name)));
    next.branch = other;
    const lines = [`Switched to branch '${other}'`, `HEAD is now on ${other} (${tipSummary(next, other)}).`];
    if (hadChanges) lines.push('Uncommitted changes carried over — they applied cleanly on this branch.');
    return { state: next, ok: true, output: lines };
  },

  merge(state) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    const next = clone(state);
    if (next.conflict) {
      return { state: next, ok: false, output: ['error: a merge is already in progress — resolve the conflicts below or abort it.'] };
    }
    const source = next.branch === 'main' ? FEATURE_BRANCH : 'main';
    if (!next.branches[source]) {
      return { state: next, ok: false, output: [`error: no branch '${source}' to merge — create it with \`git branch\` first.`] };
    }
    const result = attemptMerge(next, source, branchTip(next, source));
    return { state: next, ...result };
  },

  stash(state) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    const next = clone(state);
    const head = headFiles(next);
    const stashable = SEED_FILES.filter((name) => {
      if (head[name] === undefined) return false; // untracked files stay put
      const status = fileStatus(next, name);
      return status === 'modified' || status === 'staged' || status === 'staged+modified';
    });
    const untrackedLeft = SEED_FILES.filter((name) => fileStatus(next, name) === 'untracked');
    if (stashable.length === 0) {
      return { state: next, ok: true, output: ['No local changes to save', 'Stash only shelves tracked changes — edit a tracked file first.'] };
    }
    const entry = {
      id: `stash@{${next.nextStash - 1}}`,
      message: `WIP on ${next.branch}: ${branchTip(next) ? tipSummary(next, next.branch) : 'no commits yet'}`,
      files: Object.fromEntries(stashable.map((name) => [name, { ...next.files[name] }])),
    };
    next.nextStash += 1;
    next.stash.unshift(entry);
    for (const name of stashable) {
      next.files[name] = { working: head[name], staged: null };
    }
    const lines = [`Saved working directory and index state ${entry.message}`];
    if (untrackedLeft.length > 0) lines.push(`Untracked files left in place (${untrackedLeft.join(', ')}) — stash does not take them by default.`);
    lines.push('Working tree clean. Pop the stash from the stash panel when you want it back.');
    return { state: next, ok: true, output: lines };
  },

  pull(state) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    const next = clone(state);
    if (next.conflict) {
      return { state: next, ok: false, output: ['error: a merge is already in progress — resolve the conflicts below or abort it.'] };
    }
    if (!next.upstream || !next.remoteTip) {
      return {
        state: next,
        ok: false,
        output: [
          'There is no tracking information for the current branch.',
          'Please specify which branch you want to merge with.',
          'Hint: origin is empty — push once first, and the branch will track origin/main.',
        ],
      };
    }
    const result = attemptMerge(next, 'origin/main', next.remoteTip);
    if (result.ok && result.output[0] === 'Already up to date.') {
      return { state: next, ok: true, output: ['Already up to date.', 'Fetch found nothing new on origin/main.'] };
    }
    return { state: next, ...result };
  },

  push(state) {
    if (!state.initialized) return { state: clone(state), ...notARepo() };
    const next = clone(state);
    const tip = branchTip(next);
    if (!tip) {
      return { state: next, ok: false, output: ['error: src refspec main does not match any', 'error: failed to push some refs — commit something first.'] };
    }
    if (tip === next.remoteTip) {
      return { state: next, ok: true, output: ['Everything up-to-date'] };
    }
    if (!next.upstream || !next.remoteTip) {
      next.remoteTip = tip;
      next.upstream = true;
      return {
        state: next,
        ok: true,
        output: [
          `To ${REMOTE_URL}`,
          ` * [new branch]      ${next.branch} -> ${next.branch}`,
          `Branch '${next.branch}' set up to track remote branch '${next.branch}' from 'origin'.`,
          'Ahead 0 — origin now has your commits.',
        ],
      };
    }
    if (isAncestor(next, next.remoteTip, tip)) {
      const from = next.remoteTip;
      next.remoteTip = tip;
      return {
        state: next,
        ok: true,
        output: [`To ${REMOTE_URL}`, `   ${from}..${tip}  ${next.branch} -> ${next.branch}`, 'Ahead 0 — origin now has your commits.'],
      };
    }
    return {
      state: next,
      ok: false,
      output: [
        `To ${REMOTE_URL}`,
        ` ! [rejected]        ${next.branch} -> ${next.branch} (fetch first)`,
        `error: failed to push some refs to '${REMOTE_URL}'`,
        "hint: Updates were rejected because the remote contains work that you do not have locally.",
        "hint: Pull first ('git pull'), then push again. Never force-push shared history.",
      ],
    };
  },
};

/**
 * Run one of the ten commands. Returns { state, ok, output } — output is
 * the terminal lines (without the `$ git …` echo; the UI adds that).
 */
export function runCommand(state, commandId, opts = {}) {
  const handler = handlers[commandId];
  if (!handler) return { state: clone(state), ok: false, output: [`Unknown command: ${commandId}`] };
  return handler(state, opts);
}

/** Edit a file in the working tree — the one non-Git control. */
export function editFile(state, name) {
  if (!SEED_FILES.includes(name)) return { state: clone(state), ok: false, output: [`No such file: ${name}`] };
  const next = clone(state);
  next.files[name].working += 1;
  const status = fileStatus(next, name);
  return {
    state: next,
    ok: true,
    output: [`✎ ${name} edited in the working tree (v${next.files[name].working}) — now ${status === 'untracked' ? 'untracked' : status}.`],
  };
}

/** A teammate pushes a commit to origin/main. Only possible once origin has history. */
export function teammatePush(state) {
  const next = clone(state);
  if (!next.initialized) {
    return { state: next, ok: false, output: ['(The teammate needs a repo first — run git init.)'] };
  }
  if (!next.remoteTip) {
    return { state: next, ok: false, output: ['origin is empty — push once so the teammate has history to build on.'] };
  }
  const baseFiles = { ...(commitById(next, next.remoteTip)?.files || {}) };
  const files = { ...baseFiles };
  files['style.css'] = (files['style.css'] ?? 1) + 1;
  const commit = createCommit(next, 'Teammate: polish checkout styles', [next.remoteTip], files, 'teammate');
  next.remoteTip = commit.id;
  return {
    state: next,
    ok: true,
    output: [
      `(Teammate pushed ${commit.id} 'polish checkout styles' to origin/main.)`,
      'Your next push will be rejected until you pull their change in.',
    ],
  };
}

/** Reapply the most recent stash entry. */
export function stashPop(state) {
  const next = clone(state);
  if (next.stash.length === 0) {
    return { state: next, ok: false, output: ['No stash entries found.'] };
  }
  const entry = next.stash[0];
  const head = headFiles(next);
  const blocked = Object.keys(entry.files).filter((name) => next.files[name].working !== head[name]);
  if (blocked.length > 0) {
    return {
      state: next,
      ok: false,
      output: [
        'error: Your local changes to the following files would be overwritten by merge:',
        `  ${blocked.join(', ')}`,
        'Please commit your changes or stash them before you merge.',
        'The stash entry is kept — nothing was applied.',
      ],
    };
  }
  for (const [name, saved] of Object.entries(entry.files)) {
    next.files[name] = { working: saved.working, staged: saved.staged };
  }
  next.stash.shift();
  return {
    state: next,
    ok: true,
    output: [
      `On branch ${next.branch}`,
      `Changes restored from ${entry.id}: ${Object.keys(entry.files).join(', ')}`,
      `Dropped ${entry.id} (${entry.message})`,
    ],
  };
}

/** Pick a side for one conflicted file; completes the merge when all are resolved. */
export function resolveConflict(state, name, choice) {
  const next = clone(state);
  if (!next.conflict || !next.conflict.files.includes(name)) {
    return { state: next, ok: false, output: [`${name} is not conflicted.`] };
  }
  const { source, sourceTip } = next.conflict;
  const sourceFiles = { ...(commitById(next, sourceTip)?.files || {}) };
  const resolvedVersion = choice === 'theirs' ? sourceFiles[name] : headFiles(next)[name];
  const merged = { ...next.conflict.mergedFiles };
  merged[name] = resolvedVersion;
  next.conflict.mergedFiles = merged;
  next.conflict.files = next.conflict.files.filter((f) => f !== name);
  next.conflict.resolved = [...(next.conflict.resolved || []), name];
  // Resolving edits the working file to the chosen content and stages it —
  // the same as editing the <<<<<<< markers out and running `git add`.
  next.files[name] = { working: resolvedVersion, staged: resolvedVersion };
  const lines = [`Resolved ${name} — kept the ${choice === 'theirs' ? `${source} version` : 'current-branch version'}.`];
  if (next.conflict.files.length === 0) {
    const currentTip = branchTip(next);
    const message = source === 'origin/main'
      ? `Merge remote-tracking branch 'origin/main'`
      : `Merge branch '${source}' into ${next.branch}`;
    const commit = createCommit(next, message, [currentTip, sourceTip].filter(Boolean), merged);
    next.branches[next.branch].tip = commit.id;
    for (const resolved of next.conflict.resolved) next.files[resolved].staged = null;
    next.conflict = null;
    lines.push(`All conflicts resolved — merge commit ${commit.id} created.`);
    lines.push('Real Git makes you edit the <<<<<<< markers out, then `git add` + commit.');
  }
  return { state: next, ok: true, output: lines };
}

/** Bail out of an in-progress merge. */
export function abortMerge(state) {
  const next = clone(state);
  if (!next.conflict) return { state: next, ok: false, output: ['No merge in progress.'] };
  next.conflict = null;
  return { state: next, ok: true, output: ['Merge aborted — the branch is back to its pre-merge state.'] };
}
