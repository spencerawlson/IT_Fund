import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, HelpCircle, Cpu, HardDrive, Network, Share2, Cloud, Boxes, Database, ShieldCheck, Workflow, Terminal, Lock, GitBranch, Trophy } from 'lucide-react';
import { modules, categoryColors, resolveModuleId } from '@/data/modules';
import { getLabForModule } from '@/data/labLinks';
import { getProgress, saveFlashcardProgress, saveQuizScore } from '@/lib/progress';
import ConceptCard from '@/components/ConceptCard';
import StudySheet from '@/components/StudySheet';
import FlashcardSession from '@/components/FlashcardSession';
import QuizSession from '@/components/QuizSession';
import ProgressRing from '@/components/ProgressRing';
import LevelBadge from '@/components/LevelBadge';
import ModuleSources from '@/components/ui/ModuleSources';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const icons = { Cpu, HardDrive, Network, Share2, Cloud, Boxes, Database, ShieldCheck, Workflow, Terminal, Lock, GitBranch, Trophy };

const TABS = [
  { id: 'browse', label: 'Browse', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
];

export default function Module() {
  useDocumentTitle('Module · Road to CISSP');
  const { moduleId: rawId } = useParams();
  // Merged duplicate modules keep their old URLs working.
  const moduleId = resolveModuleId(rawId);
  const module = modules.find((m) => m.id === moduleId);
  const [tab, setTab] = useState('browse');
  // ?concept=<id> (from library search) opens that concept's study notes straight away.
  const [params] = useSearchParams();
  const [reading, setReading] = useState(() => {
    const i = module?.concepts.findIndex((c) => c.id === params.get('concept')) ?? -1;
    return i >= 0 ? i : null;
  });
  const [progress, setProgress] = useState(() => getProgress(moduleId));

  useEffect(() => {
    setProgress(getProgress(moduleId));
  }, [moduleId]);

  if (rawId !== moduleId) return <Navigate to={`/module/${moduleId}?${params}`} replace />;

  if (!module) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-ink-2">
        <div>
          <p className="text-lg font-semibold text-ink-1">Module not found</p>
          <Link to="/library" className="mt-3 inline-block text-sm text-blue-400 hover:underline">
            ← Back to the library
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
    <div className="min-h-screen text-ink-1">

      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/library" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-ink-1">
          <ArrowLeft size={15} /> Library
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control border border-white/10"
              style={{ backgroundColor: `${cat.dot}15`, color: cat.dot }}
            >
              <Icon size={28} />
            </div>
            <div>
              <LevelBadge level={module.level} />
              <h1 className="mt-0.5 text-2xl font-bold leading-tight sm:text-3xl">{module.title}</h1>
              <p className="mt-1 text-sm text-ink-2">{module.subtitle}</p>
            </div>
          </div>
          <ProgressRing percent={overall} size={64} stroke={6} color={cat.dot} />
        </div>

        {/* Progress detail */}
        <div className="mt-5 flex flex-wrap gap-3 text-caption">
          <div className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2">
            <span className="text-ink-2">Flashcards: </span>
            <span className="font-semibold text-ink-1">
              {progress.flashcards ? `${progress.flashcards.known}/${progress.flashcards.total}` : 'Not started'}
            </span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2">
            <span className="text-ink-2">Quiz best: </span>
            <span className="font-semibold text-ink-1">
              {progress.quiz ? `${progress.quiz.bestScore}/${progress.quiz.total}` : 'Not attempted'}
            </span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2">
            <span className="text-ink-2">Concepts: </span>
            <span className="font-semibold text-ink-1">{module.concepts.length}</span>
          </div>
        </div>

        {/* Related Lab items */}
        {(() => {
          const labs = getLabForModule(module.id);
          if (!labs.length) return null;
          return (
            <div className="mt-5 rounded-xl glass-1 p-4">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">See it in the Visual Lab</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {labs.map((l) => (
                  <Link
                    key={l.labId}
                    to={`/lab?item=${l.labId}`}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-caption transition hover:border-white/25 hover:bg-white/[0.12]"
                  >
                    <span className="font-semibold text-ink-1">{l.label}</span>
                    <span className="text-blue-400">→</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        <ModuleSources moduleId={module.id} />

        {/* Tabs */}
        <div className="mt-7 flex gap-1 rounded-xl glass-1 p-1">
          {TABS.map((t) => {
            const TabIcon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  active ? 'bg-white/10 text-ink-1 shadow-sm' : 'text-ink-2 hover:text-ink-1'
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
              {module.concepts.map((c, i) => (
                <ConceptCard key={c.id} concept={c} onOpen={() => setReading(i)} />
              ))}
            </div>
          )}
          {reading !== null && (
            <StudySheet
              concepts={module.concepts}
              index={reading}
              moduleId={module.id}
              moduleTitle={module.title}
              color={cat.dot}
              onClose={() => setReading(null)}
              onNavigate={setReading}
            />
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