import React from 'react';
import { Link } from 'react-router-dom';
import { Repeat, ArrowRight, FlaskConical, ExternalLink } from 'lucide-react';
import { useBgTint } from '@/components/academy/LiquidBackground';
import PlayerHud from '@/components/academy/PlayerHud';
import AcademyShell from '@/components/academy/ui/AcademyShell';
import { SectionHeading } from '@/components/academy/ui/bits';
import { ContinueLearning, LearningPathCard } from '@/components/academy/ui/cards';
import { allCards, RESOURCES } from '@/data/academy';
import { PATHS, getCourse } from '@/data/catalog';
import { useAcademy, dueCards } from '@/lib/academy';
import { continueLearning, courseStatus } from '@/lib/progress/engine';

/** Academy dashboard: one clear next step, then reviews, then the career paths. */
export default function Academy() {
  const state = useAcademy();
  const next = continueLearning(state);
  const due = dueCards(state, allCards).length;
  const studied = Object.keys(state.lessons || {}).length > 0;
  useBgTint(next ? getCourse(next.lesson.courseSlug).color : '#F59E0B');
  const cyberStarted = courseStatus(state, getCourse('cybersecurity-operations')) !== 'locked';

  return (
    <AcademyShell>
      <header className="mb-10">
        <p className="text-sm font-semibold text-amber-300">Academy</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{studied ? 'Welcome back.' : 'Start here.'}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Lessons open in order: pass one to unlock the next. Every lesson starts by quizzing you on earlier ones, and
          your place is saved as you go.
        </p>
      </header>

      <ContinueLearning state={state} next={next} />

      {studied && (
        <Link to="/academy/review" className="glass glass-hover mt-5 flex items-center justify-between gap-4 rounded-3xl p-6">
          <span className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
              <Repeat size={22} className={due ? 'text-rose-300' : 'text-slate-300'} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-bold">Review earlier lessons</span>
              <span className="mt-0.5 block text-sm text-slate-400">
                {due ? `${due} ${due === 1 ? 'question is' : 'questions are'} due` : 'Nothing due. Practise your weakest questions anyway.'}
              </span>
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-slate-300" aria-hidden="true" />
        </Link>
      )}

      <section className="mt-16" aria-labelledby="paths-heading">
        <SectionHeading
          action={<Link to="/academy/paths" className="text-sm font-semibold text-slate-300 hover:text-white">All paths</Link>}
        >
          <span id="paths-heading">Career paths</span>
        </SectionHeading>
        <div className="grid gap-5 md:grid-cols-2">
          {PATHS.map((path) => (
            <LearningPathCard key={path.slug} state={state} path={path} />
          ))}
        </div>
      </section>

      {cyberStarted && (
        <section className="glass mt-16 rounded-3xl p-6 sm:p-7">
          <p className="flex items-center gap-3 text-base font-bold">
            <FlaskConical size={20} className="text-rose-300" aria-hidden="true" /> Hands-on labs · CyberSecurity_Lab
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
            Four safe blue-team labs: web attacks, DDoS, amplification and a gift-card scam chain. Run the attack, then hunt the
            traces. They pair with the Detection Lab Drills lesson in Cybersecurity Operations.
          </p>
          <a href={RESOURCES.cyberlab.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-rose-200 hover:text-white">
            Open the labs on GitHub <ExternalLink size={14} aria-hidden="true" /><span className="sr-only">(opens an external site)</span>
          </a>
        </section>
      )}

      <section className="mt-16">
        <SectionHeading>Your progress</SectionHeading>
        <PlayerHud />
      </section>
    </AcademyShell>
  );
}
