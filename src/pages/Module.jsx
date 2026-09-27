import React, { useState, useEffect } from 'react';
import { useBgTint } from '@/components/academy/LiquidBackground';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, HelpCircle, Cpu, HardDrive, Network, Share2, Cloud, Boxes, Database, ShieldCheck, Workflow, Terminal, Lock, GitBranch, Trophy } from 'lucide-react';
import { modules, categoryColors } from '@/data/modules';
import { getLabForModule } from '@/data/labLinks';
import { getProgress, saveFlashcardProgress, saveQuizScore } from '@/lib/progress';
import ConceptCard from '@/components/ConceptCard';
import FlashcardSession from '@/components/FlashcardSession';
import QuizSession from '@/components/QuizSession';
import ProgressRing from '@/components/ProgressRing';
import LevelBadge from '@/components/LevelBadge';
import ModuleSources from '@/components/ui/ModuleSources';
import Navbar from '@/components/Navbar';

const icons = { Cpu, HardDrive, Network, Share2, Cloud, Boxes, Database, ShieldCheck, Workflow, Terminal, Lock, GitBranch, Trophy };

const TABS = [
  { id: 'browse', label: 'Browse', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
];

export default function Module() {
  const { moduleId } = useParams();
  const module = modules.find((m) => m.id === moduleId);
  const [tab, setTab] = useState('browse');
  const [progress, setProgress] = useState(() => getProgress(moduleId));
  useBgTint(categoryColors[module?.category]?.dot);

  useEffect(() => {
    setProgress(getProgress(moduleId));
  }, [moduleId]);

  if (!module) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-slate-400">
        <div>
          <p className="text-lg font-semibold text-white">Module not found</p>
          <Link to="/" className="mt-3 inline-block text-sm text-blue-400 hover:underline">
            ← Back to all modules
          </Link>
        </div>
      </div>
    );
  }

  const cat = categoryColors[module.category] || categoryColors.Networking;
  const Icon = icons[module.icon] || Network;

  const handleFlashcardComplete = (known, total) => {
    saveFlashcardProgress(moduleId, known, total);
    setProgress(getProgress(moduleId));
  };
  const handleQuizComplete = (score, total) => {
    saveQuizScore(moduleId, score, total);
    setProgress(getProgress(moduleId));
  };

  const overall = (() => {
    let sum = 0, count = 0;
    if (progress.flashcards) { sum += progress.flashcards.known / progress.flashcards.total; count++; }
    if (progress.quiz) { sum += progress.quiz.bestScore / progress.quiz.total; count++; }
    return count > 0 ? Math.round((sum / count) * 100) : 0;
  })();

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={15} /> All Modules
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10"
              style={{ backgroundColor: `${cat.dot}15`, color: cat.dot }}
            >
              <Icon size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Module {module.number}</p>
                <LevelBadge level={module.level} />
              </div>
              <h1 className="mt-0.5 text-2xl font-bold leading-tight sm:text-3xl">{module.title}</h1>
              <p className="mt-1 text-sm text-slate-400">{module.subtitle}</p>
            </div>
          </div>
          <ProgressRing percent={overall} size={64} stroke={6} color={cat.dot} />
        </div>

        {/* Progress detail */}
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <div className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2">
            <span className="text-slate-400">Flashcards: </span>
            <span className="font-semibold text-white">
              {progress.flashcards ? `${progress.flashcards.known}/${progress.flashcards.total}` : 'Not started'}
            </span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2">
            <span className="text-slate-400">Quiz best: </span>
            <span className="font-semibold text-white">
              {progress.quiz ? `${progress.quiz.bestScore}/${progress.quiz.total}` : 'Not attempted'}
            </span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2">
            <span className="text-slate-400">Concepts: </span>
            <span className="font-semibold text-white">{module.concepts.length}</span>
          </div>
        </div>

        {/* Related Lab items */}
        {(() => {
          const labs = getLabForModule(module.id);
          if (!labs.length) return null;
          return (
            <div className="mt-5 rounded-xl glass p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">See it in the Visual Lab</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {labs.map((l) => (
                  <Link
                    key={l.labId}
                    to={`/lab?item=${l.labId}`}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs transition hover:border-white/25 hover:bg-white/[0.12]"
                  >
                    <span className="font-semibold text-white">{l.label}</span>
                    <span className="text-blue-400">→</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        <ModuleSources moduleId={module.id} />

        {/* Tabs */}
        <div className="mt-7 flex gap-1 rounded-xl glass p-1">
          {TABS.map((t) => {
            const TabIcon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  active ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TabIcon size={16} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="mt-8">
          {tab === 'browse' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {module.concepts.map((c) => (
                <ConceptCard key={c.id} concept={c} />
              ))}
            </div>
          )}
          {tab === 'flashcards' && (
            <FlashcardSession module={module} onComplete={handleFlashcardComplete} />
          )}
          {tab === 'quiz' && <QuizSession module={module} onComplete={handleQuizComplete} />}
        </div>
      </div>
    </div>
  );
}