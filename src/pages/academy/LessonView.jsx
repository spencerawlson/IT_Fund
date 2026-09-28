import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, RotateCcw, Lock, ExternalLink, Copy, Check, ArrowLeft, ArrowRight, Puzzle, BookOpen } from 'lucide-react';
import { useBgTint } from '@/components/academy/LiquidBackground';
import AcademyShell from '@/components/academy/ui/AcademyShell';
import RichText from '@/components/academy/RichText';
import { Breadcrumbs, EmptyState, Pill, Prerequisites, StatusBadge } from '@/components/academy/ui/bits';
import { getCourse, getLesson, getModule, courseHref, moduleHref, lessonHref, playerHref } from '@/data/catalog';
import { useAcademy } from '@/lib/academy';
import { lessonStatus, moduleLock, isLessonUnlocked, PASS_PCT } from '@/lib/progress/engine';

/** Reading view for one lesson: the standard sections, then the interactive lesson. */
export default function LessonView() {
  const { lessonId } = useParams();
  const state = useAcademy();
  const lesson = getLesson(lessonId);
  const course = lesson && getCourse(lesson.courseSlug);
  useBgTint(course?.color);

  if (!lesson) {
    return (
      <AcademyShell>
        <EmptyState title="Lesson not found" to="/academy/courses" action="Browse courses" />
      </AcademyShell>
    );
  }

  const module = getModule(lesson.moduleKey);
  const status = lessonStatus(state, lesson);
  const crumbs = [
    { label: 'Academy', to: '/academy' },
    { label: course.title, to: courseHref(course) },
    { label: `Module ${module.number}`, to: moduleHref(module) },
    { label: `Lesson ${lesson.number}` },
  ];

  if (status === 'locked') {
    const lock = moduleLock(state, module);
    const i = module.lessons.findIndex((l) => l.id === lesson.id);
    const previous = i > 0 ? module.lessons[i - 1] : null;
    return (
      <AcademyShell>
        <Breadcrumbs items={crumbs} />
        <div className="glass rounded-[2rem] p-8">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300"><Lock size={15} aria-hidden="true" /> Locked</p>
          <h1 className="mt-2 text-2xl font-bold">Lesson {lesson.number}: <RichText text={lesson.title} /></h1>
          <p className="mt-3 text-slate-300">Lessons open one at a time, in order, so each builds on the last. Complete these first:</p>
          <div className="mt-5">
            <Prerequisites
              items={{
                required: lock.unlocked
                  ? [{ label: `Lesson ${previous.number}: ${previous.title}`, to: lessonHref(previous), met: false }]
                  : lock.blockers.map((m) => ({ label: `${getCourse(m.courseSlug).title} · Module ${m.number}`, to: moduleHref(m), met: false })),
              }}
            />
          </div>
        </div>
      </AcademyShell>
    );
  }

  const c = lesson.content || {};
  const sections = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'learn', label: 'Learn', show: !!c.learn?.length },
    { id: 'architecture', label: 'Architecture', show: !!c.architecture },
    { id: 'examples', label: 'Examples', show: !!c.examples?.length },
    { id: 'practice', label: 'Quiz & practice', show: true },
    { id: 'cheat-sheet', label: 'Cheat sheet', show: !!c.cheatSheet?.length },
    { id: 'resources', label: 'Resources', show: lesson.resources.length > 0 },
  ].filter((s) => s.show);

  const resume = state.resume?.deckId === lesson.id ? state.resume : null;
  const best = state.lessons?.[lesson.id]?.best;
  const i = module.lessons.findIndex((l) => l.id === lesson.id);
  const prev = module.lessons[i - 1];
  const next = module.lessons[i + 1];

  return (
    <AcademyShell>
      <Breadcrumbs items={crumbs} />
      <header>
        <p className="text-sm font-semibold" style={{ color: course.color }}>{course.title} · Module {module.number}: {module.title}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Lesson {lesson.number}: <RichText text={lesson.title} />
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <Pill>{lesson.minutes} min</Pill>
          {best !== undefined && <Pill>Best score {best}%</Pill>}
        </div>
      </header>

      <nav aria-label="Lesson sections" className="mt-8 flex flex-wrap gap-2">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mt-12 space-y-14">
        <Section id="overview" title="Overview">
          {(c.overview || [lesson.summary]).map((p) => <Para key={p} text={p} />)}
          {!lesson.content && (
            <p className="text-sm text-slate-400">This lesson is taught through its interactive questions and puzzles below.</p>
          )}
        </Section>

        {c.learn?.length > 0 && (
          <Section id="learn" title="Learn">
            {c.learn.map((part) => (
              <div key={part.heading} className="space-y-3">
                <h3 className="text-lg font-bold text-white">{part.heading}</h3>
                {part.body.map((p) => <Para key={p} text={p} />)}
              </div>
            ))}
          </Section>
        )}

        {c.architecture && (
          <Section id="architecture" title="Architecture">
            <figure>
              <pre className="glass overflow-x-auto rounded-2xl p-5 font-mono text-[13px] leading-relaxed text-slate-100">{c.architecture.diagram}</pre>
              <figcaption className="mt-3 text-sm text-slate-400">{c.architecture.caption}</figcaption>
            </figure>
          </Section>
        )}

        {c.examples?.length > 0 && (
          <Section id="examples" title="Examples">
            {c.examples.map((ex) => (
              <div key={ex.title}>
                <h3 className="text-base font-bold text-white">{ex.title}</h3>
                <CodeBlock code={ex.code} />
                {ex.explanation && <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{ex.explanation}</p>}
              </div>
            ))}
          </Section>
        )}

        <Section id="practice" title="Quiz & practice">
          <div className="glass rounded-3xl p-6 sm:p-7">
            <div className="flex flex-wrap gap-5 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5"><BookOpen size={15} aria-hidden="true" /> {lesson.deck.cards.length} questions</span>
              {lesson.deck.puzzles.length > 0 && (
                <span className="inline-flex items-center gap-1.5"><Puzzle size={15} aria-hidden="true" /> {lesson.deck.puzzles.length} hands-on puzzles</span>
              )}
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
              Starts with a few review questions from earlier lessons. Score {PASS_PCT}% on first tries to pass and unlock the next lesson.
            </p>
            <Link to={playerHref(lesson)} className="glass-btn mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold" style={{ '--tint': course.color }}>
              {resume ? <RotateCcw size={16} aria-hidden="true" /> : <Play size={16} className="fill-current" aria-hidden="true" />}
              {resume ? 'Resume the lesson' : status === 'completed' ? 'Practise again' : 'Start the interactive lesson'}
            </Link>
          </div>
        </Section>

        {c.cheatSheet?.length > 0 && (
          <Section id="cheat-sheet" title="Cheat sheet">
            <div className="glass overflow-hidden rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="sr-only">
                  <tr><th scope="col">Term</th><th scope="col">Meaning</th></tr>
                </thead>
                <tbody>
                  {c.cheatSheet.map(([term, meaning]) => (
                    <tr key={term} className="border-b border-white/10 last:border-0">
                      <th scope="row" className="w-2/5 px-4 py-3 align-top font-semibold text-white">{term}</th>
                      <td className="px-4 py-3 text-slate-300">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {lesson.resources.length > 0 && (
          <Section id="resources" title="Resources">
            <ul className="grid gap-2 sm:grid-cols-2">
              {lesson.resources.map((r) => (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 transition hover:border-white/30 hover:bg-white/[0.08]">
                    {r.title}
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
                      External <ExternalLink size={13} aria-hidden="true" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <nav aria-label="Lesson navigation" className="mt-16 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
        {prev ? (
          <Link to={lessonHref(prev)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
            <ArrowLeft size={15} aria-hidden="true" /> Lesson {prev.number}
          </Link>
        ) : <span />}
        {next &&
          (isLessonUnlocked(state, next.id) ? (
            <Link to={lessonHref(next)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
              Lesson {next.number} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Lock size={14} aria-hidden="true" /> Lesson {next.number} opens when you pass this one
            </span>
          ))}
      </nav>
    </AcademyShell>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 space-y-4">
      <h2 id={`${id}-title`} className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

const Para = ({ text }) => (
  <p className="max-w-3xl text-[16px] leading-relaxed text-slate-200">
    <RichText text={text} />
  </p>
);

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false); // clipboard blocked: the code is still selectable
    }
  };
  return (
    <div className="relative mt-3">
      <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 pr-24 font-mono text-[13px] leading-relaxed text-emerald-100">{code}</pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
      >
        {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
