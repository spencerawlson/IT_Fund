import { describe, it, expect } from 'vitest';
import {
  SEED_FILES,
  COMMANDS,
  COMMAND_IDS,
  createState,
  runCommand,
  editFile,
  teammatePush,
  stashPop,
  resolveConflict,
  abortMerge,
  fileStatus,
  fileZone,
  counts,
  statusLines,
  headFiles,
} from './gitWorkflow';

function runAll(state, steps) {
  let current = state;
  let last = null;
  for (const step of steps) {
    const [id, opts] = Array.isArray(step) ? step : [step];
    last = runCommand(current, id, opts || {});
    current = last.state;
  }
  return { state: current, last };
}

function initAndCommit(state, message = 'Initial commit') {
  return runAll(state, [
    'init',
    ['add', { files: [...SEED_FILES] }],
    ['commit', { message }],
  ]);
}

describe('gitWorkflow engine', () => {
  it('exposes the Reel’s ten commands in order', () => {
    expect(COMMAND_IDS).toEqual([
      'init', 'status', 'add', 'commit', 'branch',
      'switch', 'merge', 'stash', 'pull', 'push',
    ]);
    expect(COMMANDS).toHaveLength(10);
    for (const cmd of COMMANDS) expect(cmd.hint.length).toBeGreaterThan(0);
  });

  it('starts uninitialized with three untracked files', () => {
    const state = createState();
    expect(state.initialized).toBe(false);
    for (const name of SEED_FILES) {
      expect(fileStatus(state, name)).toBe('untracked');
      expect(fileZone(state, name)).toBe('working');
    }
    expect(counts(state)).toEqual({ modified: 3, staged: 0, untracked: 3, ahead: 0, behind: 0, commits: 0, stashed: 0 });
  });

  it('refuses git commands before init with the real fatal', () => {
    const { state, ok, output } = runCommand(createState(), 'status');
    expect(ok).toBe(false);
    expect(output[0]).toContain('fatal: not a git repository');
    expect(state.initialized).toBe(false);
  });

  it('init creates the repo; a second init is a harmless re-init', () => {
    const first = runCommand(createState(), 'init');
    expect(first.ok).toBe(true);
    expect(first.state.initialized).toBe(true);
    expect(first.output[0]).toContain('Initialized empty Git repository');
    const second = runCommand(first.state, 'init');
    expect(second.ok).toBe(true);
    expect(second.output[0]).toContain('Reinitialized existing Git repository');
  });

  it('status shows the three untracked files after init', () => {
    const { state } = runAll(createState(), ['init']);
    const lines = statusLines(state);
    expect(lines[0]).toBe('On branch main');
    expect(lines.join('\n')).toContain('No commits yet');
    expect(lines.join('\n')).toContain('Untracked files:');
    for (const name of SEED_FILES) expect(lines.join('\n')).toContain(name);
  });

  it('add stages files; commit records only the staged snapshot', () => {
    const { state } = runAll(createState(), [
      'init',
      ['add', { files: ['cart.js'] }],
    ]);
    expect(fileStatus(state, 'cart.js')).toBe('staged');
    expect(fileStatus(state, 'app.js')).toBe('untracked');
    expect(fileZone(state, 'cart.js')).toBe('staging');
    expect(counts(state).staged).toBe(1);

    const committed = runCommand(state, 'commit', { message: 'Add cart' });
    expect(committed.ok).toBe(true);
    expect(committed.output[0]).toContain('[main (root-commit) c1] Add cart');
    expect(fileStatus(committed.state, 'cart.js')).toBe('clean');
    expect(fileZone(committed.state, 'cart.js')).toBe('local');
    expect(fileStatus(committed.state, 'app.js')).toBe('untracked');
    expect(headFiles(committed.state)).toEqual({ 'cart.js': 1 });
  });

  it('add with no selection stages every changed file', () => {
    const { state } = runAll(createState(), ['init', 'add']);
    expect(counts(state).staged).toBe(3);
  });

  it('commit with nothing staged fails and changes nothing', () => {
    const { state } = runAll(createState(), ['init']);
    const result = runCommand(state, 'commit', { message: 'Empty' });
    expect(result.ok).toBe(false);
    expect(result.output.join('\n')).toContain('nothing to commit');
    expect(result.state.commits).toHaveLength(0);
  });

  it('edit → add → commit moves a file working → staging → local', () => {
    let { state } = initAndCommit(createState());
    const edited = editFile(state, 'cart.js');
    state = edited.state;
    expect(fileStatus(state, 'cart.js')).toBe('modified');
    expect(fileZone(state, 'cart.js')).toBe('working');
    const added = runCommand(state, 'add', { files: ['cart.js'] });
    expect(fileStatus(added.state, 'cart.js')).toBe('staged');
    const committed = runCommand(added.state, 'commit', { message: 'Update cart' });
    expect(fileStatus(committed.state, 'cart.js')).toBe('clean');
    expect(headFiles(committed.state)['cart.js']).toBe(2);
    expect(counts(committed.state).ahead).toBe(2);
  });

  it('edit after staging leaves the file staged + modified', () => {
    let { state } = initAndCommit(createState());
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = editFile(state, 'cart.js').state;
    expect(fileStatus(state, 'cart.js')).toBe('staged+modified');
    expect(fileZone(state, 'cart.js')).toBe('working');
  });

  it('branch creates feature at the current tip; switch moves HEAD', () => {
    let { state } = initAndCommit(createState());
    const branched = runCommand(state, 'branch');
    expect(branched.ok).toBe(true);
    expect(branched.state.branches.feature.tip).toBe('c1');
    expect(branched.state.branch).toBe('main');
    const switched = runCommand(branched.state, 'switch');
    expect(switched.ok).toBe(true);
    expect(switched.state.branch).toBe('feature');
    expect(switched.output[0]).toBe("Switched to branch 'feature'");
    const back = runCommand(switched.state, 'switch');
    expect(back.state.branch).toBe('main');
  });

  it('switch fails when the feature branch does not exist yet', () => {
    const { state } = runAll(createState(), ['init']);
    const result = runCommand(state, 'switch');
    expect(result.ok).toBe(false);
    expect(result.output.join('\n')).toContain("did not match any file(s)");
  });

  it('branch fails when feature already exists', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'branch').state;
    const again = runCommand(state, 'branch');
    expect(again.ok).toBe(false);
    expect(again.output[0]).toContain('already exists');
  });

  it('merge fast-forwards when main has not moved since branching', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'branch').state;
    state = runCommand(state, 'switch').state;
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Feature cart' }).state;
    expect(state.branches.feature.tip).toBe('c2');
    state = runCommand(state, 'switch').state; // back to main at c1
    const merged = runCommand(state, 'merge');
    expect(merged.ok).toBe(true);
    expect(merged.output.join('\n')).toContain('Fast-forward');
    expect(merged.state.branches.main.tip).toBe('c2');
    expect(merged.state.commits).toHaveLength(2); // no merge commit
    expect(headFiles(merged.state)['cart.js']).toBe(2);
  });

  it('merge creates a merge commit when both branches diverged', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'branch').state;
    state = runCommand(state, 'switch').state;
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Feature cart' }).state;
    state = runCommand(state, 'switch').state; // main
    state = editFile(state, 'style.css').state;
    state = runCommand(state, 'add', { files: ['style.css'] }).state;
    state = runCommand(state, 'commit', { message: 'Main styles' }).state;
    const merged = runCommand(state, 'merge');
    expect(merged.ok).toBe(true);
    expect(merged.state.commits).toHaveLength(4);
    const mergeCommit = merged.state.commits[3];
    expect(mergeCommit.parents).toHaveLength(2);
    expect(mergeCommit.message).toContain("Merge branch 'feature' into main");
    expect(headFiles(merged.state)).toEqual({ 'app.js': 1, 'cart.js': 2, 'style.css': 2 });
  });

  it('merge reports already up to date when there is nothing to bring in', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'branch').state;
    const merged = runCommand(state, 'merge');
    expect(merged.ok).toBe(true);
    expect(merged.output[0]).toBe('Already up to date.');
  });

  it('merge conflicts when both sides changed the same file differently', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'branch').state;
    state = runCommand(state, 'switch').state;
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Feature cart' }).state;
    state = runCommand(state, 'switch').state; // main
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Main cart' }).state;
    const merged = runCommand(state, 'merge');
    expect(merged.ok).toBe(false);
    expect(merged.output.join('\n')).toContain('CONFLICT (content): Merge conflict in cart.js');
    expect(merged.state.conflict.files).toEqual(['cart.js']);
    expect(fileStatus(merged.state, 'cart.js')).toBe('conflicted');
    expect(merged.state.commits).toHaveLength(3); // no merge commit yet
  });

  it('resolving the conflict completes the merge commit', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'branch').state;
    state = runCommand(state, 'switch').state;
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Feature cart' }).state;
    state = runCommand(state, 'switch').state;
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Main cart' }).state;
    state = runCommand(state, 'merge').state;
    const resolved = resolveConflict(state, 'cart.js', 'theirs');
    expect(resolved.ok).toBe(true);
    expect(resolved.state.conflict).toBeNull();
    expect(resolved.state.commits).toHaveLength(4);
    expect(headFiles(resolved.state)['cart.js']).toBe(2); // feature version
    expect(fileStatus(resolved.state, 'cart.js')).toBe('clean');
  });

  it('abort merge returns the branch to its pre-merge state', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'branch').state;
    state = runCommand(state, 'switch').state;
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Feature cart' }).state;
    state = runCommand(state, 'switch').state;
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Main cart' }).state;
    state = runCommand(state, 'merge').state;
    expect(state.conflict).not.toBeNull();
    const aborted = abortMerge(state);
    expect(aborted.ok).toBe(true);
    expect(aborted.state.conflict).toBeNull();
    expect(aborted.state.commits).toHaveLength(3);
  });

  it('stash shelves tracked changes and leaves untracked files in place', () => {
    let { state } = initAndCommit(createState());
    state = editFile(state, 'cart.js').state;
    state = editFile(state, 'app.js').state;
    const stashed = runCommand(state, 'stash');
    expect(stashed.ok).toBe(true);
    expect(stashed.state.stash).toHaveLength(1);
    expect(fileStatus(stashed.state, 'cart.js')).toBe('clean');
    expect(counts(stashed.state).stashed).toBe(1);
    const popped = stashPop(stashed.state);
    expect(popped.ok).toBe(true);
    expect(popped.state.stash).toHaveLength(0);
    expect(fileStatus(popped.state, 'cart.js')).toBe('modified');
  });

  it('stash leaves untracked files in place', () => {
    let { state } = runAll(createState(), ['init', ['add', { files: ['cart.js'] }], ['commit', { message: 'Only cart' }]]);
    state = editFile(state, 'cart.js').state;
    const stashed = runCommand(state, 'stash');
    expect(fileStatus(stashed.state, 'app.js')).toBe('untracked');
    expect(stashed.output.join('\n')).toContain('Untracked files left in place (app.js, style.css)');
  });

  it('stash with a clean tree reports nothing to save', () => {
    const { state } = initAndCommit(createState());
    const result = runCommand(state, 'stash');
    expect(result.ok).toBe(true);
    expect(result.output[0]).toBe('No local changes to save');
    expect(result.state.stash).toHaveLength(0);
  });

  it('stash pop is blocked when the working tree already changed that file', () => {
    let { state } = initAndCommit(createState());
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'stash').state;
    state = editFile(state, 'cart.js').state;
    const popped = stashPop(state);
    expect(popped.ok).toBe(false);
    expect(popped.output.join('\n')).toContain('would be overwritten');
    expect(popped.state.stash).toHaveLength(1);
  });

  it('push before any commit fails; first push sets upstream and ahead 0', () => {
    const { state } = runAll(createState(), ['init']);
    const empty = runCommand(state, 'push');
    expect(empty.ok).toBe(false);
    expect(empty.output[0]).toContain('does not match any');

    let pushed = initAndCommit(createState());
    expect(counts(pushed.state).ahead).toBe(1);
    const result = runCommand(pushed.state, 'push');
    expect(result.ok).toBe(true);
    expect(result.output.join('\n')).toContain('[new branch]');
    expect(result.output.join('\n')).toContain('set up to track');
    expect(result.state.upstream).toBe(true);
    expect(result.state.remoteTip).toBe('c1');
    expect(counts(result.state).ahead).toBe(0);
    expect(fileZone(result.state, 'cart.js')).toBe('remote');
  });

  it('push with nothing new is up to date; a second commit pushes again', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'push').state;
    const again = runCommand(state, 'push');
    expect(again.output[0]).toBe('Everything up-to-date');
    state = editFile(state, 'app.js').state;
    state = runCommand(state, 'add', { files: ['app.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Update app' }).state;
    expect(counts(state).ahead).toBe(1);
    const pushed = runCommand(state, 'push');
    expect(pushed.output.join('\n')).toContain('c1..c2');
    expect(counts(pushed.state).ahead).toBe(0);
  });

  it('pull before any push reports no tracking information', () => {
    const { state } = initAndCommit(createState());
    const result = runCommand(state, 'pull');
    expect(result.ok).toBe(false);
    expect(result.output[0]).toContain('There is no tracking information for the current branch.');
  });

  it('teammate push → pull fast-forwards; push rejected until pulled', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'push').state;
    const team = teammatePush(state);
    expect(team.ok).toBe(true);
    expect(team.state.remoteTip).not.toBe('c1');
    expect(counts(team.state).behind).toBe(1);
    state = team.state;

    // Local commit on top of c1, then push is rejected (remote moved).
    state = editFile(state, 'app.js').state;
    state = runCommand(state, 'add', { files: ['app.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Local app change' }).state;
    const rejected = runCommand(state, 'push');
    expect(rejected.ok).toBe(false);
    expect(rejected.output.join('\n')).toContain('[rejected]');
    expect(rejected.output.join('\n')).toContain('Pull first');

    // Pull merges the teammate's change in (different files, no conflict).
    const pulled = runCommand(rejected.state, 'pull');
    expect(pulled.ok).toBe(true);
    expect(counts(pulled.state).behind).toBe(0);
    expect(pulled.state.commits.length).toBeGreaterThan(3);
    const pushed = runCommand(pulled.state, 'push');
    expect(pushed.ok).toBe(true);
    expect(counts(pushed.state).ahead).toBe(0);
    expect(counts(pushed.state).behind).toBe(0);
  });

  it('pull fast-forwards when local has no new commits', () => {
    let { state } = initAndCommit(createState());
    state = runCommand(state, 'push').state;
    state = teammatePush(state).state;
    const pulled = runCommand(state, 'pull');
    expect(pulled.ok).toBe(true);
    expect(pulled.output.join('\n')).toContain('Fast-forward');
    expect(counts(pulled.state).behind).toBe(0);
    expect(pulled.state.commits).toHaveLength(2); // no merge commit
    expect(headFiles(pulled.state)['style.css']).toBe(2);
  });

  it('teammate push is blocked while origin is empty', () => {
    const { state } = initAndCommit(createState());
    const result = teammatePush(state);
    expect(result.ok).toBe(false);
    expect(result.output[0]).toContain('origin is empty');
  });

  it('the full Reel story runs end to end', () => {
    let { state } = runAll(createState(), ['init', 'status', 'add']);
    let r = runCommand(state, 'commit', { message: 'Initial commit' });
    state = r.state;
    expect(r.ok).toBe(true);
    state = runCommand(state, 'branch').state;
    state = runCommand(state, 'switch').state;
    expect(state.branch).toBe('feature');
    // Feature work, then back to main and merge.
    state = editFile(state, 'cart.js').state;
    state = runCommand(state, 'add', { files: ['cart.js'] }).state;
    state = runCommand(state, 'commit', { message: 'Add cart total' }).state;
    state = runCommand(state, 'switch').state;
    const merged = runCommand(state, 'merge');
    expect(merged.ok).toBe(true);
    state = merged.state;
    // Stash a fresh change, then pull (empty remote) and push.
    state = editFile(state, 'style.css').state;
    state = runCommand(state, 'stash').state;
    expect(counts(state).stashed).toBe(1);
    const pulled = runCommand(state, 'pull');
    expect(pulled.ok).toBe(false); // origin empty — the real error
    state = runCommand(pulled.state, 'push').state;
    expect(counts(state).ahead).toBe(0);
    expect(fileZone(state, 'app.js')).toBe('remote');
    const popped = stashPop(state);
    expect(popped.ok).toBe(true);
    expect(fileStatus(popped.state, 'style.css')).toBe('modified');
  });
});
