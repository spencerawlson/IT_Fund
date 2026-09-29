import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Lock, RotateCcw, Clock, FlaskConical, Plus, Trash2, ShieldCheck, SearchX } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ProgressBar } from '@/components/ui-glass';
import { labsApi } from '@/api/labs';

const fmt = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

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

/** Objectives with live pass/fail from the last validation. */
function LabObjectives({ objectives, results }) {
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
            <span className="min-w-0">
              <span className="block text-body text-ink-1">{o.label}</span>
              {r && !passed && <span className="block text-small text-ink-2">{r.message}</span>}
              {!r && o.hints?.[0] && <span className="block text-small text-ink-2">Hint: {o.hints[0]}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Cyber/PortBlast findings recorder: what the student discovered, which the validators check. */
function CyberWorkbench({ target, draft, setDraft, isPortblast }) {
  const [port, setPort] = useState('');
  const [service, setService] = useState('');
  const [version, setVersion] = useState('');
  const ports = draft.ports || [];

  const addPort = () => {
    const num = parseInt(port, 10);
    if (!num) return;
    setDraft({ ...draft, ports: [...ports, { target, port: num, service: service.trim(), version: version.trim() }] });
    setPort(''); setService(''); setVersion('');
  };
  const removePort = (i) => setDraft({ ...draft, ports: ports.filter((_, idx) => idx !== i) });
  const toggle = (key, value) => setDraft({ ...draft, [key]: draft[key] ? undefined : value });

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-3 text-body text-ink-1">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[rgb(var(--action-rgb))]"
          checked={!!draft.hosts?.[target]?.up}
          onChange={(e) => setDraft({ ...draft, hosts: { ...draft.hosts, [target]: { up: e.target.checked } } })}
        />
        {target} is reachable
      </label>

      <div>
        <p className="mb-2 text-small font-semibold text-ink-1">Discovered ports</p>
        <div className="flex flex-wrap items-end gap-2">
          <input aria-label="Port" inputMode="numeric" placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)}
            className="h-10 w-20 rounded-control border border-white/10 bg-white/5 px-3 text-small text-ink-1 placeholder:text-ink-3" />
          <input aria-label="Service" placeholder="Service" value={service} onChange={(e) => setService(e.target.value)}
            className="h-10 w-28 rounded-control border border-white/10 bg-white/5 px-3 text-small text-ink-1 placeholder:text-ink-3" />
          <input aria-label="Version" placeholder="Version" value={version} onChange={(e) => setVersion(e.target.value)}
            className="h-10 w-36 rounded-control border border-white/10 bg-white/5 px-3 text-small text-ink-1 placeholder:text-ink-3" />
          <Button size="sm" variant="secondary" icon={Plus} onClick={addPort}>Add</Button>
        </div>
        {ports.length > 0 && (
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {ports.map((p, i) => (
              <li key={`${p.port}-${i}`} className="flex items-center gap-3 py-2 text-small text-ink-1">
                <span className="tabular-nums">{p.port}/tcp</span>
                <span className="text-ink-2">{p.service || '—'}{p.version ? ` · ${p.version}` : ''}</span>
                <button type="button" onClick={() => removePort(i)} aria-label={`Remove port ${p.port}`} className="ml-auto text-ink-2 hover:text-danger">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isPortblast && (
        <div className="space-y-3 border-t border-white/[0.06] pt-4">
          <label className="flex items-center gap-3 text-body text-ink-1">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--action-rgb))]" checked={!!draft.research}
              onChange={() => toggle('research', [{ note: 'Researched discovered software' }])} />
            I researched the discovered software (SearchSploit / Metasploit modules)
          </label>
          <label className="flex items-center gap-3 text-body text-ink-1">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--action-rgb))]" checked={!!draft.portblast}
              onChange={() => toggle('portblast', { simulated: true, ports })} />
            I ran PortBlast against the target <span className="text-ink-2">(simulated)</span>
          </label>
          <label className="flex items-center gap-3 text-body text-ink-1">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--action-rgb))]" checked={!!draft.comparison}
              onChange={() => toggle('comparison', { done: true })} />
            I compared my manual findings with PortBlast
          </label>
        </div>
      )}
    </div>
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

/** Full-screen lab workspace: instructions and objectives, a findings workbench, and validation. */
export default function LabWorkspace() {
  const { labId } = useParams();
  const [lab, setLab] = useState(null);
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const destroyed = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { labs } = await labsApi.listDefinitions();
        const def = labs.find((l) => l.id === labId);
        if (!def) throw new Error('Lab not found.');
        const s = await labsApi.start(labId);
        if (!live) return;
        setLab(def);
        setSession(s);
        setDraft(s.findings || {});
      } catch (e) {
        if (live) setError(e.message);
      }
    })();
    return () => {
      live = false;
    };
  }, [labId]);

  // Best-effort cleanup when leaving the page.
  useEffect(() => {
    return () => {
      if (session && !destroyed.current) {
        destroyed.current = true;
        labsApi.destroy(session.id).catch(() => {});
      }
    };
  }, [session]);

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

  const reset = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      const s = await labsApi.reset(session.id);
      setSession(s);
      setDraft({});
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [session]);

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

  const target = lab.targets?.[0]?.hostname || 'target.lab';
  const isNetworking = lab.category === 'networking';
  const isPortblast = lab.category === 'portblast';
  const done = session.status === 'COMPLETED';
  const expired = session.status === 'EXPIRED';

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
            <div className="mt-4">
              <LabObjectives objectives={lab.objectives} results={results} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card level={2}>
            <h2 className="text-heading text-ink-1">Record your findings</h2>
            <p className="mt-1 text-small text-ink-2">
              {isNetworking
                ? 'Mark the configuration state you achieved. "Check my work" validates the result.'
                : 'Record what you discovered on the target. Objectives check your findings, not the exact commands you ran.'}
            </p>
            <div className="mt-4">
              {isNetworking
                ? <NetworkWorkbench draft={draft} setDraft={setDraft} />
                : <CyberWorkbench target={target} draft={draft} setDraft={setDraft} isPortblast={isPortblast} />}
            </div>
          </Card>

          {(done || expired || error) && (
            <Card level={2} className={done ? 'border-success/30' : ''}>
              {done && <p className="flex items-center gap-2 text-body font-semibold text-success"><Check size={18} aria-hidden="true" /> Lab complete. Every objective validated.</p>}
              {expired && <p className="flex items-center gap-2 text-body font-semibold text-warning"><Clock size={18} aria-hidden="true" /> This session expired. Reset to continue.</p>}
              {error && <p className="flex items-center gap-2 text-body text-danger"><X size={18} aria-hidden="true" /> {error}</p>}
            </Card>
          )}

          <div className="sticky bottom-3 flex items-center gap-3">
            <Button size="lg" icon={ShieldCheck} onClick={check} loading={busy} disabled={expired} className="flex-1">Check my work</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
