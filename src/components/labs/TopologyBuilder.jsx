import React, { useMemo, useState } from 'react';
import { Monitor, Network, Router, Server, X, Cable } from 'lucide-react';

// Phase 4 of the game layer (docs/GAME_LAB_DESIGN.md): the cabling puzzle.
// The learner places devices and runs cables; the graph is written into the
// lab `draft` as { devices: [...ids], links: [[a,b],...] } and validated by the
// net-topology validators when they press "Check my work". Click-to-connect
// (not drag) keeps it robust on touch and desktop alike.

const iconFor = (role = '') => {
  const r = role.toLowerCase();
  if (r.includes('router') || r.includes('gateway')) return Router;
  if (r.includes('switch')) return Network;
  if (r.includes('server')) return Server;
  return Monitor;
};

const linkKey = (a, b) => [a, b].sort().join('::');

export default function TopologyBuilder({ draft, setDraft, targets = [], gameMode = false }) {
  const devices = draft.devices || [];
  const links = draft.links || [];
  const [selected, setSelected] = useState(null); // id of the device awaiting a cable partner

  const placedSet = new Set(devices);
  const available = targets.filter((t) => !placedSet.has(t.hostname));
  const roleById = useMemo(() => Object.fromEntries(targets.map((t) => [t.hostname, t.role])), [targets]);

  // Deterministic circular layout so no position state is needed.
  const positions = useMemo(() => {
    const pos = {};
    const n = devices.length;
    devices.forEach((id, i) => {
      if (n === 1) { pos[id] = { x: 50, y: 50 }; return; }
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      pos[id] = { x: 50 + 36 * Math.cos(angle), y: 50 + 36 * Math.sin(angle) };
    });
    return pos;
  }, [devices]);

  const commit = (next) => setDraft({ ...draft, devices: next.devices ?? devices, links: next.links ?? links });

  const addDevice = (id) => { commit({ devices: [...devices, id] }); };

  const removeDevice = (id) => {
    if (selected === id) setSelected(null);
    commit({
      devices: devices.filter((d) => d !== id),
      links: links.filter(([a, b]) => a !== id && b !== id),
    });
  };

  const tapDevice = (id) => {
    if (selected === null) { setSelected(id); return; }
    if (selected === id) { setSelected(null); return; }
    // Toggle the cable between `selected` and `id`.
    const key = linkKey(selected, id);
    const exists = links.some(([a, b]) => linkKey(a, b) === key);
    commit({ links: exists ? links.filter(([a, b]) => linkKey(a, b) !== key) : [...links, [selected, id]] });
    setSelected(null);
  };

  const removeLink = (a, b) => commit({ links: links.filter(([x, y]) => linkKey(x, y) !== linkKey(a, b)) });

  return (
    <div className={gameMode ? 'mission-console space-y-4' : 'space-y-4'}>
      {/* Palette */}
      <div>
        <div className={`mb-2 text-caption font-semibold ${gameMode ? 'text-terminal-muted' : 'text-ink-3'}`}>Devices</div>
        {available.length === 0 ? (
          <p className={`text-small ${gameMode ? 'text-terminal-muted' : 'text-ink-3'}`}>All devices placed.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {available.map((t) => {
              const Icon = iconFor(t.role);
              return (
                <button
                  key={t.hostname}
                  type="button"
                  onClick={() => addDevice(t.hostname)}
                  title={t.role}
                  className="flex items-center gap-1.5 rounded-control border border-black/10 px-2.5 py-1 text-caption font-semibold text-ink-2 transition hover:border-black/25 hover:text-ink-1"
                >
                  <Icon size={14} aria-hidden="true" /> {t.hostname}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Board */}
      <div
        className={`relative h-80 w-full overflow-hidden rounded-xl border ${
          gameMode ? 'crt border-terminal-border bg-terminal-bg' : 'border-black/10 bg-black/5'
        }`}
        role="group"
        aria-label="Network topology board"
      >
        {devices.length === 0 && (
          <div className={`absolute inset-0 flex items-center justify-center text-small ${gameMode ? 'text-terminal-muted' : 'text-ink-3'}`}>
            Add devices from above, then click two to cable them.
          </div>
        )}
        {/* Cables */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {links.map(([a, b]) => {
            const pa = positions[a]; const pb = positions[b];
            if (!pa || !pb) return null;
            return (
              <line
                key={linkKey(a, b)}
                x1={`${pa.x}%`} y1={`${pa.y}%`} x2={`${pb.x}%`} y2={`${pb.y}%`}
                stroke={gameMode ? 'rgb(var(--terminal-text-rgb))' : 'rgb(var(--action-rgb))'}
                strokeWidth="2" strokeOpacity="0.6"
              />
            );
          })}
        </svg>
        {/* Device nodes */}
        {devices.map((id) => {
          const p = positions[id];
          const Icon = iconFor(roleById[id]);
          const isSel = selected === id;
          return (
            <div key={id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <div className="group relative flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => tapDevice(id)}
                  aria-pressed={isSel}
                  className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 transition ${
                    isSel
                      ? 'border-action bg-action/15 text-action'
                      : gameMode
                        ? 'border-terminal-border bg-terminal-bg text-terminal-bright hover:border-terminal-bright/60'
                        : 'border-black/15 bg-white text-ink-1 hover:border-action/50'
                  }`}
                  title={isSel ? 'Click another device to cable (or click again to cancel)' : roleById[id]}
                >
                  <Icon size={22} aria-hidden="true" />
                </button>
                <span className={`mt-1 font-mono text-caption ${gameMode ? 'text-terminal-text' : 'text-ink-2'}`}>{id}</span>
                <button
                  type="button"
                  onClick={() => removeDevice(id)}
                  aria-label={`Remove ${id}`}
                  className="absolute -right-2 -top-2 hidden rounded-full border border-black/15 bg-white p-0.5 text-ink-3 hover:text-danger group-hover:block"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cable list */}
      {links.length > 0 && (
        <div>
          <div className={`mb-2 flex items-center gap-1.5 text-caption font-semibold ${gameMode ? 'text-terminal-muted' : 'text-ink-3'}`}>
            <Cable size={14} aria-hidden="true" /> Cables
          </div>
          <ul className="flex flex-wrap gap-2">
            {links.map(([a, b]) => (
              <li key={linkKey(a, b)} className={`flex items-center gap-1.5 rounded-control border px-2 py-1 text-caption font-mono ${
                gameMode ? 'border-terminal-border text-terminal-text' : 'border-black/10 text-ink-2'
              }`}>
                {a}–{b}
                <button type="button" onClick={() => removeLink(a, b)} aria-label={`Remove cable ${a}–${b}`} className="text-ink-3 hover:text-danger">
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
