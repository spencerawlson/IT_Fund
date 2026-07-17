import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ACCENT_CLS = {
  rose: 'border-rose-500/30 bg-rose-500/[0.06] text-rose-300',
  amber: 'border-amber-500/30 bg-amber-500/[0.06] text-amber-300',
  blue: 'border-blue-500/30 bg-blue-500/[0.06] text-blue-300',
  purple: 'border-purple-500/30 bg-purple-500/[0.06] text-purple-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300',
};

export const BREAK_SCENARIOS = [
  { id: 'none', label: 'Normal', icon: null, description: 'Baseline operation' },
];

export function useBreakScenarios(overrides = []) {
  return [...BREAK_SCENARIOS, ...overrides];
}

export default function BreakItControls({ scenarios, scenario, onScenarioChange, accent = 'rose' }) {
  const cls = ACCENT_CLS[accent] ?? ACCENT_CLS.rose;

  return (
    <div className={`mt-4 rounded-xl border px-3 py-2.5 ${cls}`}>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider opacity-80">
        <AlertTriangle size={12} />
        Break It
      </div>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => {
          const Icon = s.icon;
          const active = scenario === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onScenarioChange(s.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/5'
              }`}
              title={s.description}
            >
              {Icon && <Icon size={12} />}
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
