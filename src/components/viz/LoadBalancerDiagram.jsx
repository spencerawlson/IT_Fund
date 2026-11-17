import React from 'react';

// Presentational flow diagram shared by the simulator and the guided
// walkthrough: clients on the left, the load balancer in the middle, the
// server pool on the right, and the requests as dots travelling between
// them. No simulation logic lives here — parents pass dots as {x, y}
// percentages and servers as { name, conns, max, status }.
//
// Colours are the light theme's: white stage, ink text, blue page-view
// dots, amber checkout dots, red for failed/dropped. The only dark surface
// in the subject is the nginx.conf panel, never this diagram.

const DOT_COLORS = {
  page: 'bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.7)]',
  checkout: 'bg-amber-500 shadow-[0_0_8px_rgba(217,119,6,0.7)]',
  failed: 'bg-red-500 shadow-[0_0_8px_rgba(185,28,28,0.7)]',
};

function serverRowTop(index, count) {
  return ((index + 0.5) / count) * 100;
}

// The live counters sit ABOVE the diagram, not inside it: at narrow widths
// the top server's box would otherwise paint over the pills.
export function LoadBalancerCounters({ p95, errors503, healthy }) {
  return (
    <div className="mb-2 flex flex-wrap justify-center gap-2">
      {[
        { label: 'p95', value: `${p95} ms` },
        { label: '503s', value: String(errors503) },
        { label: 'healthy', value: healthy },
      ].map(({ label, value }) => (
        <span key={label} className="rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-ink-1">
          {label} <span className="text-ink-2">{value}</span>
        </span>
      ))}
    </div>
  );
}

export default function LoadBalancerDiagram({ servers, dots = [], balancerLabel = 'LOAD BALANCER' }) {
  return (
    <div className="relative h-72 overflow-hidden rounded-xl border border-black/10 bg-gradient-to-b from-white via-violet-50 to-white sm:h-80">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.06)_1px,transparent_0)] bg-[length:22px_22px]" />

      {/* Client */}
      <div className="absolute left-[3%] top-1/2 z-10 -translate-y-1/2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-center backdrop-blur">
        <p className="text-xs font-bold text-sky-700">CLIENTS</p>
        <p className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-3">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> page view
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> checkout
        </p>
      </div>

      {/* Load balancer */}
      <div className="absolute left-[40%] top-[16%] z-10 -translate-x-1/2 rounded-xl border border-indigo-500/60 bg-indigo-500/15 px-4 py-2.5 text-center shadow-2xl shadow-indigo-500/20 backdrop-blur">
        <p className="text-[11px] font-bold tracking-wide text-indigo-700">LOAD BALANCER</p>
        <p className="mt-0.5 text-[10px] text-indigo-700/80">{balancerLabel}</p>
      </div>

      {/* Servers */}
      {servers.map((server, i) => {
        const isDown = server.status === 'down';
        const isOverloaded = server.status === 'overloaded';
        return (
          <div
            key={server.name}
            className={`absolute right-[4%] z-10 w-[26%] min-w-[92px] -translate-y-1/2 rounded-xl border px-2 py-2 text-center backdrop-blur transition-colors duration-300 ${
              isDown
                ? 'border-red-500/50 bg-red-500/10'
                : isOverloaded
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-black/10 glass-1'
            }`}
            style={{ top: `${serverRowTop(i, servers.length)}%` }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${isDown ? 'bg-red-500' : isOverloaded ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
              <p className={`truncate text-[11px] font-bold ${isDown ? 'text-red-700' : 'text-ink-1'}`}>{server.name}</p>
            </div>
            <p className={`mt-0.5 text-[10px] ${isDown ? 'text-red-600/80' : 'text-ink-3'}`}>
              {isDown ? 'DOWN' : `${server.conns} conns`}
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isDown ? 'bg-red-500' : isOverloaded ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (server.conns / server.max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Connection lines: client → balancer, balancer → each server */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="14%" y1="50%" x2="40%" y2="22%" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
        {servers.map((_, i) => (
          <line
            key={i}
            x1="40%"
            y1="22%"
            x2="76%"
            y2={`${serverRowTop(i, servers.length)}%`}
            stroke="rgba(148,163,184,0.25)"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Request dots */}
      {dots.map((dot) => (
        <span
          key={dot.id}
          className={`absolute z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${DOT_COLORS[dot.type] || DOT_COLORS.page}`}
          style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
        />
      ))}
    </div>
  );
}
