import React, { useState } from 'react';
import { Shield, FileText, Terminal, BookOpen, ArrowLeft } from 'lucide-react';
import { REGISTRY_DATA, listSides } from '@/data/registryData';
import { Link } from 'react-router-dom';

export default function RegistryEditor() {
  const sides = listSides();
  const [active, setActive] = useState(sides[0]);
  const data = REGISTRY_DATA[active];

  return (
    <div className="min-h-screen text-ink-1">

      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/library" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-ink-1">
          <ArrowLeft size={15} /> Library
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
            <Shield size={16} /> System Configuration
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Registry / Config Editor</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-2">
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
                  active === s ? 'bg-white/10 text-ink-1' : 'border-white/10 bg-white/[0.06] text-ink-2 hover:bg-white/[0.12]'
                }`}
              >
                {isWin ? 'Windows Registry' : 'Linux Config'}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            <section className="rounded-control glass-1 p-5">
              <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-ink-2">
                <BookOpen size={14} /> Overview
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{data.overview}</p>
            </section>

            <section className="rounded-control glass-1 p-5">
              <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-ink-2">
                <FileText size={14} /> Notes / Key Details
              </div>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-caption leading-relaxed text-ink-2">
                {(data.notes || []).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-control glass-1 p-5">
              <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-ink-2">
                <FileText size={14} /> Roots / Top-Level Locations
              </div>
              <div className="mt-3 grid gap-2">
                {data.roots.map((r) => (
                  <div key={r.root} className="rounded-xl glass-1 p-3">
                    <p className="text-sm font-semibold text-ink-1">{r.root}</p>
                    <p className="text-caption text-ink-2">{r.path}</p>
                    <p className="mt-1 text-caption text-ink-2">{r.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-control glass-1 p-5">
              <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-ink-2">
                <Terminal size={14} /> Important Keys / Files
              </div>
              <div className="mt-3 grid gap-2">
                {data.keys.map((k) => (
                  <div key={k.name} className="rounded-xl glass-1 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink-1">{k.name}</p>
                      <span className="text-caption text-ink-2">{active === 'windows' ? 'REG' : 'PATH'}</span>
                    </div>
                    <p className="text-caption text-indigo-300">{k.path}</p>
                    <p className="mt-1 text-caption text-ink-2">{k.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-control glass-1 p-5">
              <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-ink-2">
                <FileText size={14} /> Value Types / Formats
              </div>
              <div className="mt-3 space-y-2">
                {data.valueTypes.map((v) => (
                  <div key={v.type} className="rounded-xl glass-1 p-3">
                    <p className="text-sm font-semibold text-ink-1">{v.type}</p>
                    <p className="mt-1 text-caption text-ink-2">{v.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-control border border-amber-500/20 bg-amber-500/[0.04] p-5">
              <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-amber-300">
                <Shield size={14} /> Cautions
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-caption text-ink-2">
                {data.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="mt-3 rounded-xl glass-1 p-3">
                <p className="text-caption font-semibold text-ink-1">Safe Practices</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-caption text-ink-2">
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
