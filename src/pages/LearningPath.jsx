import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, GitBranch, Activity, Lock, Container, DollarSign, Map, ArrowLeft, BookOpen } from 'lucide-react';
import { modules } from '@/data/modules';
import { LEARNING_PRINCIPLES } from '@/data/learningPath';
import Navbar from '@/components/Navbar';

const ICONS = { Shield, GitBranch, Activity, Lock, Container, DollarSign };
const accentCls = {
  rose: 'border-rose-500/30 bg-rose-500/[0.06] text-rose-200',
  indigo: 'border-indigo-500/30 bg-indigo-500/[0.06] text-indigo-200',
  emerald: 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-200',
  amber: 'border-amber-500/30 bg-amber-500/[0.06] text-amber-200',
  sky: 'border-sky-500/30 bg-sky-500/[0.06] text-sky-200',
  violet: 'border-violet-500/30 bg-violet-500/[0.06] text-violet-200',
};

export default function LearningPath() {
  const moduleById = React.useMemo(() => {
    const m = {};
    for (const item of modules) m[item.id] = item;
    return m;
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <Navbar />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={15} /> Home
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
            <Map size={16} /> Architect Path
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Learning Path</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Every module, lab, and PDF is tagged to these six mental models. Work through each principle to make cloud-native intuition second nature.
          </p>
        </div>

        <div className="grid gap-5">
          {LEARNING_PRINCIPLES.map((p) => {
            const Icon = ICONS[p.icon] || Activity;
            const cls = accentCls[p.color] || accentCls.indigo;
            return (
              <section key={p.id} className={`rounded-2xl border p-5 ${cls}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="sm:max-w-2xl">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider opacity-80">
                      <Icon size={14} /> {p.title}
                    </div>
                    <p className="mt-1 text-sm opacity-90">{p.tagline}</p>
                    <p className="mt-2 text-sm leading-relaxed opacity-80">{p.summary}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Modules</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.moduleIds.map((mid) => {
                        const m = moduleById[mid];
                        if (!m) return null;
                        return (
                          <Link key={mid} to={`/module/${m.id}`} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-200 transition hover:bg-white/[0.08]">
                            {m.number}. {m.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Labs</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.labIds.map((lab) => (
                        <Link key={lab} to={`/lab?item=${lab}`} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-200 capitalize transition hover:bg-white/[0.08]">
                          {lab.replace('-', ' ')}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Concepts from PDFs</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                      {p.concepts.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Backing Sources</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.sourcePdfs.map((pdf) => (
                        <span key={pdf} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">
                          {pdf}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Module Evidence</p>
                    <div className="mt-2 space-y-2">
                      {p.moduleIds.map((mid) => {
                        const m = moduleById[mid];
                        if (!m) return null;
                        return (
                          <Link key={mid} to={`/module/${m.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 transition hover:bg-white/[0.05]">
                            <span className="text-xs text-slate-300">{m.number}. {m.title}</span>
                            <BookOpen size={12} className="text-indigo-300" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
