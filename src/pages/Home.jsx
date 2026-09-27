import React, { useState, useMemo } from 'react';
import { useBgTint } from '@/components/academy/LiquidBackground';
import { Link } from 'react-router-dom';
import { BookOpen, Gamepad2, ArrowRight } from 'lucide-react';
import { modules, levelOrder } from '@/data/modules';
import { getOverallProgress } from '@/lib/progress';
import ModuleCard from '@/components/ModuleCard';
import Navbar from '@/components/Navbar';
import { LogoMark } from '@/components/Logo';

const LEVELS = ['All', ...levelOrder];

export default function Home() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All');
  useBgTint('#3B82F6');

  const filteredModules = useMemo(() => {
    if (level === 'All') return modules;
    return modules.filter((m) => m.level === level);
  }, [level]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    modules.forEach((m) => {
      m.concepts.forEach((c) => {
        if (
          c.term.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.detail.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q)
        ) {
          results.push({ ...c, moduleTitle: m.title, moduleId: m.id, moduleNumber: m.number });
        }
      });
    });
    return results;
  }, [query]);

  const totalConcepts = modules.reduce((sum, m) => sum + m.concepts.length, 0);
  const overallPct = Math.round(
    modules.reduce((sum, m) => sum + getOverallProgress(m.id), 0) / modules.length
  );

  const handleSearch = (value) => setQuery(value);

  return (
    <div className="min-h-screen text-white">
      <Navbar onSearch={handleSearch} />

      <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <LogoMark size={18} /> IT Fund Study Hub
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Networking & Operating System
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">Fundamentals</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-400">
            A structured path through IT fundamentals: concepts, flashcards, quizzes, and Visual Labs. Start anywhere, track progress, and build durable intuition.
          </p>
          <Link
            to="/academy"
            className="mt-6 flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/[0.12] to-rose-500/[0.08] p-4 transition hover:border-amber-400/60"
          >
            <div className="flex items-center gap-3">
              <Gamepad2 size={26} className="shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-bold text-white">New: The Academy, a flashcard game on the road to CISSP</p>
                <p className="text-[12px] text-slate-400">Python, Network+, Security+, Cybersecurity, Cloud, and AI Engineering, from beginner to advanced.</p>
              </div>
            </div>
            <ArrowRight size={18} className="shrink-0 text-amber-300" />
          </Link>
        </header>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">All Modules</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  level === lvl ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((m) => (
            <ModuleCard key={m.id} module={m} percent={getOverallProgress(m.id)} />
          ))}
        </div>

        <footer className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-slate-500">
          Course 420-ZX6-UM · {modules.length} modules available · More coming soon
        </footer>
      </div>
    </div>
  );
}
