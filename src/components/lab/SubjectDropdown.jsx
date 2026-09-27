import React, { useState, useRef, useEffect } from 'react';

export default function SubjectDropdown({ items, active, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = items.find((it) => it.id === active);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition hover:border-white/20 focus:border-blue-500/60"
      >
        <span className={selected ? '' : 'text-slate-400'}>{selected ? selected.label : 'Select a subject'}</span>
        <svg className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-white/10 glass-strong shadow-xl">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                onChange(it.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                it.id === active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <it.icon size={14} className="text-slate-400" />
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
