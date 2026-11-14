import React from 'react';

// 2D topology for Operation Broken Shield — the fully playable no-WebGL path.
// SVG diagram of the mission network: PC1 + GUEST on the user LAN, R1 in the
// middle, SRV on the server LAN. Click a device to inspect it (same action
// the 3D scene's click-to-inspect sends). Inspected devices get a filled
// marker; the GUEST↔SRV path shows its blocked/allowed state once validated.

export const MISSION_TOPOLOGY_DEVICES = [
  { id: 'PC1', label: 'PC1', role: 'Trusted host', ip: '192.168.1.10' },
  { id: 'GUEST', label: 'GUEST', role: 'Untrusted host', ip: '192.168.1.20' },
  { id: 'R1', label: 'R1', role: 'Router + firewall', ip: '192.168.1.1 / 192.168.2.1' },
  { id: 'SRV', label: 'SRV', role: 'Server', ip: '192.168.2.10' },
];

export const MISSION_TOPOLOGY_LINKS = [
  ['PC1', 'R1'],
  ['GUEST', 'R1'],
  ['R1', 'SRV'],
];

// Segment labels shown under each link.
export const MISSION_TOPOLOGY_SEGMENTS = {
  'PC1-R1': 'User LAN · 192.168.1.0/24',
  'GUEST-R1': 'User LAN · 192.168.1.0/24',
  'R1-SRV': 'Server LAN · 192.168.2.0/24',
};

/** Pure SVG layout: device id -> { x, y }. Fixed viewBox 640x300. */
export function topologyPositions() {
  return {
    PC1: { x: 90, y: 70 },
    GUEST: { x: 90, y: 230 },
    R1: { x: 320, y: 150 },
    SRV: { x: 550, y: 150 },
  };
}

const linkKey = (a, b) => `${a}-${b}`;

export default function MissionTopology({
  devices = MISSION_TOPOLOGY_DEVICES,
  inspected = [],
  onInspect,
  guestBlocked = null,
  trustedAllowed = null,
  activeDevice = null,
}) {
  const pos = topologyPositions();
  const isInspected = (id) => inspected.includes(id);
  const pathState = (a, b) => {
    if (a === 'GUEST' && b === 'R1' && guestBlocked !== null) return guestBlocked ? 'blocked' : 'open';
    if (a === 'PC1' && b === 'R1' && trustedAllowed !== null) return trustedAllowed ? 'open' : 'blocked';
    return null;
  };

  return (
    <div role="group" aria-label="Mission network topology">
      <svg viewBox="0 0 640 300" className="w-full" role="img" aria-label="Network diagram: PC1 and GUEST connect through router R1 to server SRV">
        {MISSION_TOPOLOGY_LINKS.map(([a, b]) => {
          const pa = pos[a];
          const pb = pos[b];
          if (!pa || !pb) return null;
          const state = pathState(a, b);
          const stroke = state === 'blocked' ? '#dc2626' : state === 'open' ? '#16a34a' : '#94a3b8';
          const midX = (pa.x + pb.x) / 2;
          const midY = (pa.y + pb.y) / 2;
          // The R1–SRV segment label sat centred on the line at (435, 142),
          // where its left end overlapped the R1 box (ends x = 372): move
          // it — and its BLOCKED/ALLOWED state — below the line, clear of
          // both boxes. The other two links' labels already clear theirs.
          const isServerLink = linkKey(a, b) === 'R1-SRV';
          const labelY = isServerLink ? midY + 42 : midY - 8;
          const stateY = isServerLink ? midY + 60 : midY + 18;
          return (
            <g key={linkKey(a, b)}>
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={stroke} strokeWidth={state ? 3 : 2} strokeDasharray={state === 'blocked' ? '6 4' : undefined} />
              <text x={midX} y={labelY} textAnchor="middle" fontSize="11" fill="#64748b">
                {MISSION_TOPOLOGY_SEGMENTS[linkKey(a, b)] || ''}
              </text>
              {state && (
                <text x={midX} y={stateY} textAnchor="middle" fontSize="11" fontWeight="700" fill={stroke}>
                  {state === 'blocked' ? 'BLOCKED' : 'ALLOWED'}
                </text>
              )}
            </g>
          );
        })}
        {devices.map((d) => {
          const p = pos[d.id];
          if (!p) return null;
          const inspectedState = isInspected(d.id);
          const active = activeDevice === d.id;
          return (
            <g
              key={d.id}
              transform={`translate(${p.x},${p.y})`}
              onClick={() => onInspect?.(d.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect?.(d.id); } }}
              tabIndex={0}
              role="button"
              aria-label={`Inspect ${d.label} — ${d.role}`}
              style={{ cursor: onInspect ? 'pointer' : 'default' }}
            >
              <rect
                x={-52} y={-28} width={104} height={56} rx={10}
                fill={inspectedState ? '#ede9fe' : '#ffffff'}
                stroke={active ? '#7c3aed' : inspectedState ? '#8b5cf6' : '#cbd5e1'}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <text y={-2} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1e1b2e">{d.label}</text>
              <text y={16} textAnchor="middle" fontSize="10" fill="#64748b">{d.ip}</text>
              {inspectedState && (
                <text x={44} y={-32} textAnchor="middle" fontSize="13" fill="#16a34a" aria-label="inspected">✓</text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="mt-2 space-y-1 text-small text-ink-2">
        {devices.map((d) => (
          <li key={d.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onInspect?.(d.id)}
              disabled={!onInspect}
              className="font-semibold text-ink-1 underline decoration-black/20 underline-offset-2 hover:decoration-black/50 disabled:no-underline disabled:opacity-60"
            >
              {d.label}
            </button>
            <span>{d.role} · {d.ip}</span>
            {isInspected(d.id) && <span className="text-success">inspected ✓</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
