import React, { useState, useMemo } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { modules, levelOrder } from '@/data/modules';
import { getOverallProgress } from '@/lib/progress';
import ModuleCard from '@/components/ModuleCard';
import Navbar from '@/components/Navbar';

const LEVELS = ['All', ...levelOrder];

export default function Home() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All');

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
    <div className="min-h-screen bg-[#0D1117] text-white">
      <Navbar onSearch={handleSearch} />

      <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <Sparkles size={16} className="text-blue-400" /> NetOS Study Hub
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Networking & Operating System
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">Fundamentals</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-400">
            A structured path through IT fundamentals: concepts, flashcards, quizzes, and Visual Labs. Start anywhere, track progress, and build durable intuition.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">All Modules</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  level === lvl ? 'bg-white/15 text-white' : 'bg-white/[0.03] text-slate-400 hover:text-white'
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

        <footer className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-slate-600">
          Course 420-ZX6-UM · {modules.length} modules available · More coming soon
        </footer>
      </div>
    </div>
  );
}
