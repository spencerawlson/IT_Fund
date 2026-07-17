import React, { useState } from 'react';
import { Shield, FileText, Terminal, BookOpen, ArrowLeft } from 'lucide-react';
import { REGISTRY_DATA, listSides } from '@/data/registryData';
import { Link } from 'react-router-dom';

export default function RegistryEditor() {
  const sides = listSides();
  const [active, setActive] = useState(sides[0]);
  const data = REGISTRY_DATA[active];

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={15} /> All Modules
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
            <Shield size={16} /> System Configuration
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Registry / Config Editor</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Windows stores system and application settings in the Registry. Linux distributes settings across files, sysctl keys, and desktop databases. Examine each model carefully; incorrect edits can break the system.
          </p>
        </div>

        <div className="flex gap-2">
          {sides.map((s) => {
            const isWin = s === 'windows';
            return (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  active === s ? 'bg-white/10 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                {isWin ? 'Windows Registry' : 'Linux Config'}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <BookOpen size={14} /> Overview
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{data.overview}</p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <FileText size={14} /> Notes / Key Details
              </div>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-300">
                {(data.notes || []).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <FileText size={14} /> Roots / Top-Level Locations
              </div>
              <div className="mt-3 grid gap-2">
                {data.roots.map((r) => (
                  <div key={r.root} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-sm font-semibold text-white">{r.root}</p>
                    <p className="text-xs text-slate-400">{r.path}</p>
                    <p className="mt-1 text-xs text-slate-300">{r.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Terminal size={14} /> Important Keys / Files
              </div>
              <div className="mt-3 grid gap-2">
                {data.keys.map((k) => (
                  <div key={k.name} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{k.name}</p>
                      <span className="text-[10px] text-slate-500">{active === 'windows' ? 'REG' : 'PATH'}</span>
                    </div>
                    <p className="text-xs text-indigo-300">{k.path}</p>
                    <p className="mt-1 text-xs text-slate-300">{k.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <FileText size={14} /> Value Types / Formats
              </div>
              <div className="mt-3 space-y-2">
                {data.valueTypes.map((v) => (
                  <div key={v.type} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-sm font-semibold text-white">{v.type}</p>
                    <p className="mt-1 text-xs text-slate-300">{v.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <Shield size={14} /> Cautions
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                {data.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Safe Practices</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                  {data.safePractices.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
