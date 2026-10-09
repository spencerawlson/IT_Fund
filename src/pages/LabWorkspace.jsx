import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, X, Lock, RotateCcw, Clock, FlaskConical, ShieldCheck, SearchX, TerminalSquare } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ProgressBar } from '@/components/ui-glass';
import LabTerminal from '@/components/labs/LabTerminal';
import { labsApi } from '@/api/labs';
import { recordLabCompletion } from '@/lib/labProgress';
import { useSubscription, isLabFree } from '@/lib/subscription';
import UpgradePrompt from '@/components/UpgradePrompt';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const fmt = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

// The device name a prompt belongs to, e.g. "R1(config-if)# " -> "R1", "student@workstation:~$ " ->
// "student@workstation:~$" (single-device labs don't show console tabs, so it doesn't matter).
const deviceFromPrompt = (p) => ((p || '').split(/[>#(\s]/)[0] || null);

/** Countdown to the session's expiry. */
function LabTimer({ expiresAt }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return (
    <span className={`inline-flex items-center gap-1.5 text-small tabular-nums ${left < 120 ? 'text-warning' : 'text-ink-2'}`}>
      <Clock size={15} aria-hidden="true" /> {left > 0 ? fmt(left) : 'expired'}
    </span>
  );
}

const resultFor = (results, id) => results.find((r) => r.objective_id === id);

/** Objectives with live pass/fail from the last validation.
 *  Live-execution labs (real containers) can't fabricate findings, so each open objective
 *  gets an "I did this" attestation button that records the finding and re-validates. */
function LabObjectives({ objectives, results, attestable = false, onAttest, busy = false }) {
  return (
    <ol className="space-y-2">
      {objectives.map((o) => {
        const r = resultFor(results, o.id);
        const passed = r?.passed;
        return (
          <li key={o.id} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                passed ? 'border-success/40 bg-success/15 text-success' : 'border-white/15 text-ink-2'
              }`}
            >
              {passed ? <Check size={14} aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body text-ink-1">{o.label}</span>
              {r && !passed && <span className="block text-small text-ink-2">{r.message}</span>}
              {!r && o.hints?.[0] && <span className="block text-small text-ink-2">Hint: {o.hints[0]}</span>}
            </span>
            {attestable && !passed && (
              <button
                type="button"
                onClick={() => onAttest(o)}
                disabled={busy}
                title="You ran this step for real — record it as done"
                className="shrink-0 self-start rounded-control border border-white/10 px-2 py-1 text-caption font-semibold text-ink-2 transition hover:border-white/25 hover:text-ink-1 disabled:opacity-50"
              >
                I did this
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const NET_FLAGS = [
  ['vlan10_exists', 'VLAN 10 created'], ['vlan20_exists', 'VLAN 20 created'],
  ['sw1_trunk_configured', 'SW1 trunk configured'], ['sw2_trunk_configured', 'SW2 trunk configured'],
  ['router_interfaces_configured', 'Router inter-VLAN interfaces configured'],
  ['pc1_reaches_gateway', 'PC1 reaches its gateway'], ['pc2_reaches_gateway', 'PC2 reaches its gateway'],
  ['pc1_reaches_pc2', 'PC1 reaches PC2 across VLANs'],
];

/** Networking recorder: the resulting device/config state, which the validators check. */
function NetworkWorkbench({ draft, setDraft }) {
  const config = draft.config || {};
  const set = (key, on) => setDraft({ ...draft, config: { ...config, [key]: on } });
  return (
    <div className="space-y-2">
      {NET_FLAGS.map(([key, label]) => (
        <label key={key} className="flex items-center gap-3 text-body text-ink-1">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--action-rgb))]" checked={!!config[key]} onChange={(e) => set(key, e.target.checked)} />
          {label}
        </label>
      ))}
    </div>
  );
}

/** Full-screen lab workspace: instructions and objectives, a workbench (simulated shell for
 * cyber labs, config recorder for networking), and live validation. */
export default function LabWorkspace() {
  useDocumentTitle('Interactive Lab · Road to CISSP');
  const { labId } = useParams();
  const navigate = useNavigate();
  const { subscribed, loading: subLoading } = useSubscription();
  const [lab, setLab] = useState(null);
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [epoch, setEpoch] = useState(0); // bumped on reset to remount the terminal (clear its buffer)
  const [activeDevice, setActiveDevice] = useState(null); // which device console is active (multi-device labs)
  const destroyed = useRef(false);
  const termRef = useRef(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { labs } = await labsApi.listDefinitions();
        const def = labs.find((l) => l.id === labId);
        if (!def) throw new Error('Lab not found.');
        const s = await labsApi.start(labId);
        if (!live) {
          // Left the page while it was starting: end the session rather than leave it holding one
          // of the visitor's slots until it expires.
          labsApi.destroy(s.id).catch(() => {});
          return;
        }
        setLab(def);
        setSession(s);
        setDraft(s.findings || {});
        setActiveDevice(deviceFromPrompt(def.terminal?.prompt));
      } catch (e) {
        if (live) setError(e.message);
      }
    })();
    return () => {
      live = false;
    };
  }, [labId]);

  // Track the live session for the unmount cleanup without re-running that effect. Depending on
  // `session` there would destroy the session every time a command updates it (onSession), which
  // made every command after the first return "Lab session not found".
  const sessionRef = useRef(null);
  sessionRef.current = session;

  // Best-effort cleanup ONLY when leaving the page.
  useEffect(() => {
    return () => {
      const s = sessionRef.current;
      if (s && !destroyed.current) {
        destroyed.current = true;
        labsApi.destroy(s.id).catch(() => {});
      }
    };
  }, []);

  const check = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      await labsApi.recordFindings(session.id, draft);
      setSession(await labsApi.validate(session.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [session, draft]);

  // Live-execution labs: the learner ran the step for real in the container — record the
  // attestation as a finding, then validate so progress ticks. (Simulated labs fabricate
  // findings server-side and never need this.)
  const attest = useCallback(async (objective) => {
    if (!session || !objective?.validator) return;
    setBusy(true);
    setError('');
    try {
      await labsApi.recordFindings(session.id, { [objective.validator]: { attested: true } });
      setSession(await labsApi.validate(session.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [session]);

  // Whether this lab really executes (Docker) instead of simulating — drives the terminal
  // caption and the attestation buttons.
  const isLive = !!lab?.environment?.live;

  // Record the completion (with its duration) the first time this session completes,
  // so the lab progress page can show per-lab times. History lives in this browser.
  const recordedRef = useRef(new Set());
  useEffect(() => {
    if (session?.status === 'COMPLETED' && session.completed_at && !recordedRef.current.has(session.id)) {
      recordedRef.current.add(session.id);
      recordLabCompletion(session.lab_id, session.started_at, session.completed_at);
    }
  }, [session]);

  const reset = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const s = await labsApi.reset(session.id);
      setSession(s);
      setDraft({});
      setEpoch((n) => n + 1);
      setActiveDevice(deviceFromPrompt(lab.terminal?.prompt));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [session, lab]);

  // Device-console tabs (multi-device IOS labs): switch which device the shell is driving.
  const connectTo = useCallback((host) => {
    termRef.current?.send(`connect ${host}`);
    setActiveDevice(host);
    termRef.current?.focus();
  }, []);
  const onPrompt = useCallback((p) => {
    const host = deviceFromPrompt(p);
    if (host) setActiveDevice(host);
  }, []);

  // Terminal command runner: meta-commands (help/objectives/hint/check/devices/progress/reset/exit)
  // are handled in the browser; everything else is the lab's real tooling, sent to the backend shell.
  const runner = useCallback(async (raw) => {
    const trimmed = raw.trim();
    const [cmd, ...args] = trimmed.split(/\s+/);
    const c = cmd.toLowerCase();
    const sub = (args[0] || '').toLowerCase();
    const objList = () => (lab?.objectives || []).map((o) => {
      const passed = session?.progress?.[o.id];
      return `  [${passed ? 'x' : ' '}] ${o.label}`;
    }).join('\n');
    const count = () => `${Object.values(session?.progress || {}).filter(Boolean).length}/${lab?.objectives.length || 0} objectives complete`;

    if (c === 'objectives') return { output: `Mission objectives (${count()}):\n${objList()}` };
    if (c === 'progress' || (c === 'lab' && sub === 'status') || (c === 'status')) return { output: count() };
    if (c === 'devices' && (lab?.targets?.length)) {
      const rows = lab.targets.map((t) => `  ${t.hostname.padEnd(12)} ${t.role || ''}`).join('\n');
      return { output: `Devices in this lab:\n${rows}\nUse  connect <device>  to access one.` };
    }
    if (c === 'hint') {
      const open = (lab?.objectives || []).find((o) => !session?.progress?.[o.id]);
      if (!open) return { output: 'Every objective is complete — nothing left to hint at.' };
      return { output: `Hint for "${open.label}":\n  ${open.hints?.[0] || 'Work through the mission step by step.'}` };
    }
    if (c === 'check') {
      try {
        const s = await labsApi.validate(session.id);
        return { output: `Checked. ${Object.values(s.progress).filter(Boolean).length}/${lab.objectives.length} objectives complete.`, session: s };
      } catch (e) { return { output: e.message, exit_code: 1 }; }
    }
    if (c === 'lab' && sub === 'reset') { reset(); return { output: 'Resetting the lab environment...' }; }
    // NB: bare `exit` is a real device command (e.g. Cisco IOS leaves a config mode), so only the
    // explicit `lab exit` returns to the launcher.
    if (c === 'lab' && sub === 'exit') {
      setTimeout(() => navigate('/labs'), 300);
      return { output: 'Leaving the lab. Back to the lab menu...' };
    }
    if (c === 'lab') return { output: 'Usage: lab reset | lab exit   (while in a lab)' };
    if (c === 'help' || c === '?') {
      const meta = [
        'Lab commands:',
        '  objectives        show the mission objectives and your progress',
        '  hint              a hint for the next unfinished objective',
        '  check             re-check your work now',
        '  progress          how many objectives are complete',
        (lab?.targets?.length > 1 ? '  devices           list the devices · connect <device> to access one' : null),
        '  lab reset         start the lab over',
        '  lab exit          leave to the lab menu',
        '',
        'This lab\'s tools:',
      ].filter(Boolean).join('\n');
      try {
        const res = await labsApi.exec(session.id, 'help');
        return { output: `${meta}\n${res.output || ''}`, session: res.session, prompt: res.prompt };
      } catch { return { output: meta }; }
    }
    return labsApi.exec(session.id, raw);
  }, [session, lab, reset, navigate]);

  const results = session?.validation_results || [];
  const passedCount = useMemo(() => Object.values(session?.progress || {}).filter(Boolean).length, [session]);
  const total = lab?.objectives.length || 0;

  if (error && !lab) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 text-ink-1">
        <EmptyState
          icon={error.toLowerCase().includes('unauth') ? Lock : SearchX}
          title={error.toLowerCase().includes('unauth') ? 'Sign in to start labs' : 'Lab unavailable'}
          text={error}
          to="/practice"
          action="Back to Practice"
        />
      </div>
    );
  }
  if (!lab || !session) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-ink-2">Starting lab environment…</div>;
  }

  if (!subLoading && !subscribed && !isLabFree(labId)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 text-ink-1">
        <UpgradePrompt what="This lab" />
      </div>
    );
  }

  const usesTerminal = !!lab.terminal;
  const done = session.status === 'COMPLETED';
  const expired = session.status === 'EXPIRED';

  const banner = lab.terminal?.banner || [];
  const prompt = lab.terminal?.prompt || 'student@lab:~$ ';
  // Console tabs only for shells that support `connect <device>` (e.g. Cisco IOS labs).
  const devices = lab.terminal?.multi_device ? (lab.targets || []) : [];

  return (
    <div className="min-h-[100dvh] text-ink-1">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-1 mx-auto flex max-w-6xl items-center gap-3 rounded-card px-3 py-2 sm:px-4">
          <FlaskConical size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body font-semibold">{lab.title}</span>
          <LabTimer expiresAt={session.expires_at} />
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset} disabled={busy}>Reset</Button>
          <Button size="sm" variant="secondary" to="/practice">Exit</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <Card level={2}>
            <h1 className="text-heading text-ink-1">{lab.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{lab.difficulty}</Badge>
              <Badge>{lab.estimated_minutes} min</Badge>
              {lab.environment?.deny_internet_egress && <Badge icon={ShieldCheck}>isolated</Badge>}
            </div>
            <p className="mt-3 text-small text-ink-2">{lab.description}</p>
          </Card>
          <Card level={2}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-heading text-ink-1">Objectives</h2>
              <span className="text-small text-ink-2">{passedCount}/{total}</span>
            </div>
            <ProgressBar value={total ? Math.round((passedCount / total) * 100) : 0} label="Objectives complete" showValue={false} />
            {/* Scrollable so a long mission (e.g. the 9-step Docker+SIEM lab) never overflows the card. */}
            <div className="mt-4 max-h-[22rem] overflow-y-auto pr-1 [scrollbar-width:thin]">
              <LabObjectives objectives={lab.objectives} results={results} attestable={isLive} onAttest={attest} busy={busy} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {usesTerminal ? (
            <Card level={2}>
              <div className="mb-3 flex items-center gap-2">
                <TerminalSquare size={18} className="text-ink-2" aria-hidden="true" />
                <h2 className="text-heading text-ink-1">Terminal</h2>
                <span className="ml-auto text-caption text-ink-3">{isLive ? 'live container — real commands, real output' : 'simulated — nothing is really executed'}</span>
              </div>
              {devices.length > 1 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-caption text-ink-3">Consoles:</span>
                  {devices.map((d) => (
                    <button
                      key={d.hostname}
                      type="button"
                      onClick={() => connectTo(d.hostname)}
                      title={d.role}
                      disabled={expired}
                      className={`rounded-control border px-2.5 py-1 text-caption font-semibold transition disabled:opacity-50 ${
                        activeDevice === d.hostname
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                          : 'border-white/10 text-ink-2 hover:border-white/25 hover:text-ink-1'
                      }`}
                    >
                      {d.hostname}
                    </button>
                  ))}
                </div>
              )}
              <LabTerminal
                key={`${session.id}:${epoch}`}
                ref={termRef}
                sessionId={session.id}
                runner={runner}
                banner={banner}
                prompt={prompt}
                disabled={expired}
                onSession={setSession}
                onError={setError}
                onPrompt={onPrompt}
              />
              <p className="mt-3 text-caption text-ink-3">
                {isLive ? (
                  <>Run each step for real in the container, then press <span className="font-semibold text-ink-1">I did this</span> on the objective and check your work.</>
                ) : (
                  <>Objectives check automatically as you run commands. Type <code className="font-mono text-ink-2">help</code> for the command list.</>
                )}
              </p>
            </Card>
          ) : (
            <Card level={2}>
              <h2 className="text-heading text-ink-1">Record your findings</h2>
              <p className="mt-1 text-small text-ink-2">
                Mark the configuration state you achieved. &ldquo;Check my work&rdquo; validates the result.
              </p>
              <div className="mt-4">
                <NetworkWorkbench draft={draft} setDraft={setDraft} />
              </div>
            </Card>
          )}

          {(done || expired || error) && (
            <Card level={2} className={done ? 'border-success/30' : ''}>
              {done && <p className="flex items-center gap-2 text-body font-semibold text-success"><Check size={18} aria-hidden="true" /> Lab complete. Every objective validated.</p>}
              {expired && <p className="flex items-center gap-2 text-body font-semibold text-warning"><Clock size={18} aria-hidden="true" /> This session expired. Reset to continue.</p>}
              {error && <p className="flex items-center gap-2 text-body text-danger"><X size={18} aria-hidden="true" /> {error}</p>}
            </Card>
          )}

          {!usesTerminal && (
            <div className="sticky bottom-3 flex items-center gap-3">
              <Button size="lg" icon={ShieldCheck} onClick={check} loading={busy} disabled={expired} className="flex-1">Check my work</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
