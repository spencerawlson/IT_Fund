import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, GitBranch } from 'lucide-react';
import {
  SEED_FILES,
  COMMANDS,
  COMMAND_IDS,
  ZONES,
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
  commitById,
} from '@/lib/gitWorkflow';

const MAX_LOG_LINES = 80;

const STATUS_META = {
  untracked: { label: 'untracked', cls: 'bg-slate-200/70 text-slate-700' },
  modified: { label: 'modified', cls: 'bg-amber-100 text-amber-800' },
  staged: { label: 'staged', cls: 'bg-violet-100 text-violet-800' },
  'staged+modified': { label: 'staged + modified', cls: 'bg-violet-100 text-violet-800' },
  clean: { label: 'clean', cls: 'bg-emerald-100 text-emerald-800' },
  conflicted: { label: 'conflict', cls: 'bg-red-100 text-red-800' },
};

const CHECK_YOURSELF = [
  {
    q: 'You edited two files, but `git commit` says "nothing to commit". Why?',
    a: 'Nothing is staged. A commit records only the staging area, never the working tree directly — run `git add` first (or check `git status`, which shows exactly what is staged and what is not).',
  },
  {
    q: '`git push` is rejected with "(fetch first)". What happened, and what do you do?',
    a: 'Origin has commits you do not have — a teammate pushed first. Pull (fetch + merge) to bring their work in, resolve anything that conflicts, then push again. Never force-push shared history: it rewrites commits other people already have.',
  },
  {
    q: '`git pull` says "There is no tracking information for the current branch." What does that mean?',
    a: 'The branch has no upstream — push and pull do not know which remote branch to talk to. Push once with `git push -u origin main` and the branch tracks origin/main from then on.',
  },
  {
    q: 'What is the difference between `git stash` and `git commit`?',
    a: 'Stash shelves uncommitted changes without recording any history — the tree goes clean and nothing is saved as a commit. A commit records a snapshot in history. `git stash pop` brings the shelved changes back and drops the stash entry.',
  },
  {
    q: 'When does `git merge` fast-forward, and when does it create a merge commit?',
    a: 'Fast-forward when the current branch has not moved since the branch point: Git just moves the pointer forward, no new commit. A merge commit appears when both sides diverged — a 3-way merge off the common ancestor, with two parents tying the histories together.',
  },
];

export default function GitWorkflowSimulator() {
  const [sim, setSim] = useState(() => createState());
  const [log, setLog] = useState(() => [
    { id: 0, text: 'Git Workflow Simulator — a repo in a folder, three files, one remote.' },
    { id: 1, text: 'Run `git init` to create the repository, then follow the guided story.' },
  ]);
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState('guided');
  const [step, setStep] = useState(0);
  const [commitMsg, setCommitMsg] = useState('Initial commit');
  const [editName, setEditName] = useState('cart.js');
  const [revealed, setRevealed] = useState({});
  const logId = useRef(2);
  const termRef = useRef(null);

  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const appendLog = (lines) => {
    setLog((prev) => {
      const next = [...prev, ...lines.map((text) => ({ id: logId.current, text }))];
      logId.current += lines.length;
      return next.slice(-MAX_LOG_LINES);
    });
  };

  const stagedNames = SEED_FILES.filter((n) => ['staged', 'staged+modified'].includes(fileStatus(sim, n)));
  const defaultMsg = sim.commits.length === 0 ? 'Initial commit' : `Update ${stagedNames.join(', ') || 'files'}`;

  const run = (cmdId) => {
    const idx = COMMAND_IDS.indexOf(cmdId);
    if (mode === 'guided' && idx > step) {
      appendLog([`(${COMMANDS[idx].label} comes later — finish step ${step + 1} first, or switch to Free play.)`]);
      return;
    }
    const opts = {};
    if (cmdId === 'add') opts.files = selected;
    if (cmdId === 'commit') opts.message = commitMsg;
    const result = runCommand(sim, cmdId, opts);
    const echo = cmdId === 'add'
      ? `git add ${selected.length > 0 ? selected.join(' ') : '.'}`
      : cmdId === 'commit'
        ? `git commit -m "${(commitMsg || '').trim() || defaultMsg}"`
        : `git ${cmdId}`;
    appendLog([`$ ${echo}`, ...result.output]);
    setSim(result.state);
    if (cmdId === 'add') setSelected([]);
    if (cmdId === 'commit' && result.ok) setCommitMsg('');
    if (mode === 'guided' && idx === step) setStep((s) => Math.min(s + 1, COMMAND_IDS.length));
  };

  const doEdit = () => {
    const result = editFile(sim, editName);
    appendLog(result.output);
    setSim(result.state);
  };

  const doTeammate = () => {
    const result = teammatePush(sim);
    appendLog(result.output);
    setSim(result.state);
  };

  const doPop = () => {
    const result = stashPop(sim);
    appendLog(result.output);
    setSim(result.state);
  };

  const doResolve = (name, choice) => {
    const result = resolveConflict(sim, name, choice);
    appendLog(result.output);
    setSim(result.state);
  };

  const doAbort = () => {
    const result = abortMerge(sim);
    appendLog(result.output);
    setSim(result.state);
  };

  const reset = () => {
    setSim(createState());
    setSelected([]);
    setStep(0);
    setCommitMsg('Initial commit');
    setLog([{ id: logId.current, text: 'Reset — fresh folder, three new files, no repo yet.' }]);
    logId.current += 1;
  };

  const toggleSelect = (name) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const toggleReveal = (key) => setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));

  const c = counts(sim);
  const tip = sim.branches[sim.branch]?.tip ?? null;
  const headCommit = tip ? commitById(sim, tip) : null;
  const nextCmd = step < COMMAND_IDS.length ? COMMANDS[step] : null;
  const history = [...sim.commits].reverse().slice(0, 5);

  const metric = (label, value, tone) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${tone || 'text-ink-1'}`}>{value}</p>
    </div>
  );

  const fileChip = (name) => {
    const status = fileStatus(sim, name);
    const meta = STATUS_META[status];
    const version = sim.files[name].working;
    const selectable = status !== 'clean' && fileZone(sim, name) === 'working';
    const isSelected = selected.includes(name);
    const chip = (
      <>
        <span className="font-mono text-[12px] font-bold text-ink-1">{name}</span>
        <span className="text-[11px] tabular-nums text-ink-3">v{version}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
      </>
    );
    const cls = `flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg border px-2 py-1.5 text-left ${isSelected ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500' : 'border-black/10 bg-white'}`;
    return selectable ? (
      <button key={name} type="button" onClick={() => toggleSelect(name)} aria-pressed={isSelected} title="Click to select for git add" className={cls}>
        {chip}
      </button>
    ) : (
      <div key={name} className={cls}>{chip}</div>
    );
  };

  // One screen on desktop: the ten commands on the left, counters + the
  // four-zone diagram in the middle, the terminal + stash on the right.
  // On narrow screens the rails stack in reading order.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px]">
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
          {/* Left rail: mode, guided step, the ten commands, edit, reset */}
          <div className="rounded-xl glass-1 p-3">
            <div className="flex overflow-hidden rounded-lg border border-black/10" role="group" aria-label="Simulator mode">
              {[
                { id: 'guided', label: 'Guided story' },
                { id: 'free', label: 'Free play' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  className={`flex-1 px-2 py-1.5 text-[13px] font-semibold ${mode === m.id ? 'glass-btn rounded-none' : 'glass-1 text-ink-2'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mode === 'guided' && (
              <p className="mt-2 text-xs leading-snug text-ink-2">
                {nextCmd ? (
                  <>
                    <strong className="text-ink-1">{`Step ${step + 1} of 10 — ${nextCmd.label}.`}</strong> {nextCmd.hint}
                  </>
                ) : (
                  <>
                    <strong className="text-ink-1">Story complete.</strong> All ten commands run — switch to Free play and try the exercises below.
                  </>
                )}
              </p>
            )}
            {mode === 'free' && (
              <p className="mt-2 text-xs leading-snug text-ink-2">
                Free play — run the commands in any order. Try the exercises below.
              </p>
            )}

            <div className="mt-3 space-y-1.5">
              {COMMANDS.map((cmd, idx) => {
                const locked = mode === 'guided' && idx > step;
                const done = mode === 'guided' && idx < step;
                const isNext = mode === 'guided' && idx === step;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => run(cmd.id)}
                    disabled={locked}
                    aria-label={cmd.label}
                    title={locked ? 'Finish the earlier steps first, or switch to Free play.' : cmd.blurb}
                    className={`w-full rounded-lg px-2 py-1.5 text-left transition ${isNext ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-1'} ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[13px] font-bold">{cmd.label}</span>
                      {done && <span className="text-[11px] font-bold text-emerald-700">✓ done</span>}
                      {isNext && <span className="text-[11px] font-bold">← next</span>}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink-2">{cmd.blurb}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-black/10 pt-3">
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">Commit message</span>
                <input
                  type="text"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder={defaultMsg}
                  aria-label="Commit message"
                  className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] text-ink-1"
                />
              </label>
              <p className="mt-1 text-[11px] leading-snug text-ink-3">Used by git commit. Empty means the default: “{defaultMsg}”.</p>
            </div>

            <div className="mt-3 border-t border-black/10 pt-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Edit a file</p>
              <div className="mt-2 flex gap-1.5">
                <label className="sr-only" htmlFor="git-edit-file">File to edit</label>
                <select
                  id="git-edit-file"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  aria-label="File to edit"
                  className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2 py-1.5 font-mono text-[13px] font-semibold text-ink-1"
                >
                  {SEED_FILES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button type="button" onClick={doEdit} className="glass-btn shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold">
                  Edit file
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-ink-3">Edits the working tree — the change only reaches a commit through add + commit.</p>
            </div>

            <button type="button" onClick={reset} className="mt-3 w-full rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1">
              Reset — fresh folder
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2">
          {/* Middle: counters, conflict banner, four zones, branches */}
          <div className="min-w-0">
            {sim.conflict && (
              <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/5 p-3" role="alert">
                <p className="flex items-start gap-2 text-[13px] leading-snug text-red-700">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>Merge conflict in {sim.conflict.files.join(', ')}.</strong> Both sides changed the same
                    lines — pick which version to keep for each file. Real Git makes you edit the
                    &lt;&lt;&lt;&lt;&lt;&lt;&lt; markers out, then <code>git add</code> + commit.
                  </span>
                </p>
                <div className="mt-2 space-y-1.5">
                  {sim.conflict.files.map((name) => (
                    <div key={name} className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="font-mono font-bold text-ink-1">{name}</span>
                      <button type="button" onClick={() => doResolve(name, 'ours')} className="rounded-lg border border-black/10 bg-white px-2 py-1 font-semibold text-ink-1">
                        Keep {sim.branch}
                      </button>
                      <button type="button" onClick={() => doResolve(name, 'theirs')} className="rounded-lg border border-black/10 bg-white px-2 py-1 font-semibold text-ink-1">
                        Keep {sim.conflict.source}
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={doAbort} className="mt-2 rounded-lg border border-black/10 px-2 py-1 text-[12px] font-semibold text-ink-1">
                  Abort merge
                </button>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              {metric('modified', c.modified, c.modified > 0 ? 'text-amber-700' : 'text-ink-1')}
              {metric('staged', c.staged, c.staged > 0 ? 'text-violet-700' : 'text-ink-1')}
              {metric('ahead', c.ahead, c.ahead > 0 ? 'text-amber-700' : 'text-ink-1')}
              {metric('behind', c.behind, c.behind > 0 ? 'text-red-700' : 'text-ink-1')}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {metric('branch', sim.branch)}
              {metric('HEAD', headCommit ? headCommit.id : '—')}
              {metric('stash', c.stashed)}
            </div>

            <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Working tree → staging → local repo → remote origin</p>
              <p className="mt-0.5 text-[11px] text-ink-3">Click a file in the working tree to select it for git add.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ZONES.map((zone) => {
                  const files = SEED_FILES.filter((name) => fileZone(sim, name) === zone.id);
                  return (
                    <div key={zone.id} className="min-w-0 rounded-xl border border-black/10 bg-white p-2.5">
                      <p className="text-[12px] font-bold text-ink-1">{zone.label}</p>
                      <p className="text-[11px] leading-snug text-ink-3">{zone.blurb}</p>
                      <div className="mt-2 space-y-1.5">
                        {files.length === 0 ? (
                          <p className="text-[12px] italic text-ink-3">— empty —</p>
                        ) : (
                          files.map((name) => fileChip(name))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-snug text-ink-2">
                {sim.initialized
                  ? `On branch ${sim.branch} — HEAD is ${headCommit ? `${headCommit.id} “${headCommit.message}”` : 'nothing committed yet'}.`
                  : 'No repo yet — run git init. The files exist on disk, but Git does not track them.'}
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
              <div className="flex items-baseline justify-between">
                <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Branches & history</p>
                <p className="flex items-center gap-1 text-[11px] text-ink-3"><GitBranch size={12} /> origin/main {sim.remoteTip || '—'}</p>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {Object.entries(sim.branches).map(([name, branch]) => (
                  <span key={name} className={`rounded-full border px-2 py-0.5 font-mono text-[12px] font-semibold ${sim.branch === name ? 'border-violet-500 bg-violet-500/10 text-violet-800' : 'border-black/10 bg-white text-ink-2'}`}>
                    {name} {branch.tip || '—'}{sim.branch === name ? ' ← HEAD' : ''}
                  </span>
                ))}
              </div>
              {history.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-3">No commits yet. Stage the files and commit to start the history.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {history.map((commit) => (
                    <li key={commit.id} className="flex flex-wrap items-baseline gap-2 text-[13px]">
                      <span className="font-mono font-bold text-ink-1">{commit.id}</span>
                      <span className="text-ink-2">{commit.message}</span>
                      {commit.parents.length > 1 && <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">merge</span>}
                      {commit.author === 'teammate' && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">teammate</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-3">
          {/* Right rail: terminal, stash, remote */}
          <div className="flex flex-col lg:flex-1">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Terminal — every command, echoed</p>
            <pre ref={termRef} className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[11px] leading-relaxed text-[#859900] lg:min-h-80 lg:max-h-none lg:flex-1 lg:basis-0">
              {log.map((entry) => entry.text).join('\n')}
            </pre>
          </div>

          <div className="rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Stash</p>
            {sim.stash.length === 0 ? (
              <p className="mt-1.5 text-[13px] text-ink-3">Nothing stashed. Stash shelves tracked changes without committing them.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {sim.stash.map((entry) => (
                  <li key={entry.id} className="text-[13px] leading-snug text-ink-2">
                    <span className="font-mono font-bold text-ink-1">{entry.id}</span> — {entry.message}
                    <span className="block text-[12px] text-ink-3">holds: {Object.keys(entry.files).join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={doPop} disabled={sim.stash.length === 0} className="mt-2 w-full rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1 disabled:cursor-not-allowed disabled:opacity-40">
              git stash pop
            </button>
            <p className="mt-1 text-[11px] leading-snug text-ink-3">Reapplies the newest entry and drops it from the list.</p>
          </div>

          <div className="rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Remote — origin</p>
            <p className="mt-1.5 text-[13px] leading-snug text-ink-2">
              {sim.remoteTip
                ? `origin/main is at ${sim.remoteTip}. ${c.behind > 0 ? `${c.behind} commit${c.behind === 1 ? '' : 's'} behind you.` : 'You are up to date with origin.'}`
                : 'Origin is empty — nothing has been pushed yet.'}
            </p>
            <button
              type="button"
              onClick={doTeammate}
              disabled={!sim.remoteTip}
              title={sim.remoteTip ? 'A teammate pushes a commit to origin/main.' : 'Push once so origin has history to build on.'}
              className="mt-2 w-full rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Teammate pushes to origin
            </button>
            <p className="mt-1 text-[11px] leading-snug text-ink-3">A teammate lands a commit on origin/main — try pushing after that.</p>
          </div>
        </div>
      </div>

      {/* Below the fold: the lab itself — brief, exercises, debrief. */}
      <div className="mt-8 space-y-6">
        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Lab brief — the Git workflow</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Three files, ten commands, four places a change can live. Drive the repo above: edit files, stage
            exactly what the next commit should hold, branch for a feature, merge it back, shelve work with the
            stash, and keep origin in sync — including the day a teammate pushes first.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li>Follow a change through the four areas: working tree → staging area → local repo → remote origin.</li>
                <li>Stage exactly what the next commit should hold — and nothing else.</li>
                <li>Branch, switch, and merge — and tell a fast-forward from a merge commit.</li>
                <li>Shelve work with stash and bring it back with pop.</li>
                <li>Push, pull, and the rejected push: what to do when origin moves first.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li><strong className="text-ink-1">Three areas</strong> — working directory, staging area (index), repository (.git).</li>
                <li><strong className="text-ink-1">Commit = snapshot</strong> — staged files + message + parent; Git stores snapshots, not diffs.</li>
                <li><strong className="text-ink-1">Branch + HEAD</strong> — a branch is a lightweight pointer; HEAD points at the current branch.</li>
                <li><strong className="text-ink-1">Pull = fetch + merge</strong> — fetch downloads without merging; pull merges it in.</li>
                <li><strong className="text-ink-1">Push rejected</strong> — the remote has work you lack; pull first, never force-push shared history.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink-1">Run the guided story.</strong> In Guided story mode, run the ten
              commands in order and read every terminal line. Watch each file travel Working Tree → Staging →
              Local Repo → Remote Origin.
            </li>
            <li>
              <strong className="text-ink-1">Stage only cart.js.</strong> Reset, init, then click cart.js in the
              Working Tree to select it and run git add. <code>git status</code> shows only cart.js staged — commit
              records just that file, and app.js and style.css stay untracked.
            </li>
            <li>
              <strong className="text-ink-1">Push and watch ahead / behind.</strong> After the first commit, push —
              it sets the upstream, Ahead drops to 0, and the files move to the Remote zone. Commit again and watch
              Ahead climb back to 1.
            </li>
            <li>
              <strong className="text-ink-1">Stash, switch, pop.</strong> Edit style.css, stash it (the tree goes
              clean), switch to feature and back, then pop the stash — the change comes back.
            </li>
            <li>
              <strong className="text-ink-1">Push rejected.</strong> Push once, then click “Teammate pushes to
              origin”, edit app.js, add, commit, and push — rejected. Pull (fetch + merge), then push again: it
              goes through.
            </li>
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-2">
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> A file lives in exactly one zone at a time: edit it and it falls back to the Working Tree; add moves it to Staging; commit moves it to the Local Repo; push moves it to Remote.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Commit records only what is staged — editing after add leaves the file both staged and modified.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Merging an untouched main fast-forwards (the pointer just moves); merging after both sides moved creates a merge commit with two parents.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Stash takes tracked changes only — untracked files stay in the working tree.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Push is rejected while origin is ahead of you; pull merges their work in first, then push succeeds.</li>
          </ul>
          <h4 className="mt-4 text-sm font-bold text-ink-1">Check yourself</h4>
          <div className="mt-2 space-y-2">
            {CHECK_YOURSELF.map((item, i) => (
              <div key={item.q} className="rounded-lg border border-black/10 p-3">
                <p className="text-sm font-semibold text-ink-1">{item.q}</p>
                {revealed[i] ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{item.a}</p>
                ) : (
                  <button type="button" onClick={() => toggleReveal(i)} className="mt-1.5 rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold text-ink-1">
                    Reveal answer
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
