import React from 'react';
import { Link } from 'react-router-dom';
<<<<<<< Updated upstream
import { Repeat, Crown, ArrowRight, Flame, Zap, Award, Play } from 'lucide-react';
import { Button, Card, IconTile, PageContainer, PageHeader, ProgressBar, SectionHeader } from '@/components/ui-glass';
import { ContinueLearning, LearningPathCard } from '@/components/academy/ui/cards';
import LandingView from '@/components/academy/LandingView';
import { PATHS, pathsForCourse } from '@/data/catalog';
import { DAILY_GOAL_XP, levelInfo, liveStreak, useAcademy, xpToday } from '@/lib/academy';
import { continueLearning, dueReviewCount, lessonsDone, lessonsTotal, overallProgress, pathStatus } from '@/lib/progress/engine';
import useDocumentTitle from '@/hooks/useDocumentTitle';

/** Streak flame, today's XP vs the daily goal, and current rank. Read-only over the game engine. */
function StreakWidget({ state }) {
  const streak = liveStreak(state);
  const today = xpToday(state);
  const { rank } = levelInfo(state.xp || 0);
  const pct = Math.min(100, Math.round((today / DAILY_GOAL_XP) * 100));

  return (
    <Card level={2} padding="md" aria-label="Your study stats">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-3">
          <IconTile icon={Flame} color={streak > 0 ? '#f97316' : '#64748b'} />
          <div>
            <p className="text-heading text-ink-1">{streak} {streak === 1 ? 'day' : 'days'}</p>
            <p className="text-caption text-ink-2">study streak</p>
          </div>
        </div>
        <div className="min-w-[11rem] flex-1">
          <div className="mb-1.5 flex items-center justify-between text-caption text-ink-2">
            <span className="inline-flex items-center gap-1"><Zap size={12} aria-hidden="true" /> Today&apos;s XP</span>
            <span>{today} / {DAILY_GOAL_XP}</span>
          </div>
          <ProgressBar value={pct} label="Today's XP progress" showValue={false} />
        </div>
        <div className="flex items-center gap-3">
          <IconTile icon={Award} color="#f59e0b" />
          <div>
            <p className="text-heading text-ink-1">{rank}</p>
            <p className="text-caption text-ink-2">current rank</p>
          </div>
        </div>
        <Link to="/academy/badges" className="ml-auto inline-flex items-center gap-1 text-small font-semibold text-ink-2 transition hover:text-ink-1">
          Badges <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}

/** When reviews are due, this takes the top hero slot so the reps actually happen. */
function ReviewHero({ due }) {
  return (
    <Card as="section" padding="lg" aria-labelledby="review-hero-heading" className="mt-6">
      <div className="flex flex-wrap items-center gap-4">
        <IconTile icon={Repeat} color="#f59e0b" size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Spaced repetition</p>
          <h2 id="review-hero-heading" className="mt-1 text-heading text-ink-1">
            {due} {due === 1 ? 'question is' : 'questions are'} due for review
          </h2>
          <p className="mt-1 text-small text-ink-2">Quick reps now beat relearning later. It only takes a few minutes.</p>
        </div>
        <Button to="/academy/review" size="lg" icon={Play}>Start review</Button>
      </div>
    </Card>
  );
}

/** Home: the one next lesson, then review, then where you are on your path. */
const LANDING_TITLE = 'Road to CISSP — Networking, Security, Python, Cloud & Cybersecurity Training';
=======
import { Gamepad2, Repeat, Map, ArrowRight, Lock, Play, FlaskConical, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useBgTint } from '@/components/academy/LiquidBackground';
import PlayerHud from '@/components/academy/PlayerHud';
import { iconFor } from '@/components/academy/icons';
import { tracks, allCards, ROADMAP, RESOURCES, getTrack } from '@/data/academy';
import { useAcademy, mastery, dueCards, isTierUnlocked, BADGES } from '@/lib/academy';
import { nextLessonOverall, lessonsDone, lessonsTotal } from '@/lib/academyPath';
>>>>>>> Stashed changes

/** Feature card for the CyberSecurity_Lab repo and its matching "Detection Lab Drills" deck. */
function HandsOnLabs({ state }) {
  const track = getTrack('cyber');
  const tierIndex = track ? track.tiers.findIndex((t) => t.decks.some((d) => d.id === 'cy-detection-labs')) : -1;
  if (tierIndex < 0) return null;
  const tier = track.tiers[tierIndex];
  const unlocked = isTierUnlocked(state, track, tierIndex);
  return (
    <section className="glass relative mt-3 overflow-hidden rounded-[2rem] p-5 sm:p-6">
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full opacity-40 blur-3xl" style={{ background: track.color }} />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/25" style={{ background: `${track.color}40` }}>
            <FlaskConical size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">Hands-on labs · CyberSecurity_Lab</p>
            <p className="mt-1 text-lg font-bold text-white sm:text-xl">Run the attack, then hunt the traces</p>
            <p className="mt-0.5 text-sm text-slate-300">
              4 safe blue-team labs: web attacks, DDoS, amplification and a gift-card scam chain. Then drill what you found.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={RESOURCES.cyberlab.url}
            target="_blank"
            rel="noreferrer"
            className="glass-btn inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
            style={{ '--tint': track.color }}
          >
            Open the labs <ExternalLink size={15} />
          </a>
          <Link
            to={unlocked ? `/academy/${track.id}/lesson/cy-detection-labs` : `/academy/${track.id}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            {unlocked ? <FlaskConical size={15} /> : <Lock size={15} />} Detection Lab Drills
            {!unlocked && <span className="text-xs font-normal text-slate-400">({tier.label})</span>}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Academy() {
  const state = useAcademy();
  const studied = Object.keys(state.lessons || {}).length > 0;
  useDocumentTitle(studied ? 'Academy · Road to CISSP' : LANDING_TITLE);
  // First-run visitors get the platform landing; returning learners keep the dashboard below.
  if (!studied) {
    return <LandingView />;
  }
  const next = continueLearning(state);
  const due = dueReviewCount(state);
  // The path you're on: the first one that contains your next lesson's course.
  const currentPath =
    (next && pathsForCourse(next.lesson.courseSlug)[0]) ||
    PATHS.find((p) => ['in-progress', 'not-started'].includes(pathStatus(state, p)));

  return (
    <PageContainer>
      <PageHeader
        title={studied ? 'Welcome back' : 'Welcome to Road to CISSP'}
        description={
          studied
            ? 'Your next lesson is ready. Each lesson starts with a few questions from earlier ones, so what you learn sticks.'
            : 'From IT foundations to the CISSP. Follow the recommended path or pick any course at any level, and your place is saved as you go.'
        }
      />

      <StreakWidget state={state} />

      {due > 0 && <ReviewHero due={due} />}

<<<<<<< Updated upstream
      <div className="mt-6">
        <ContinueLearning state={state} next={next} />
=======
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to="/academy/review" className="glass glass-hover flex items-center gap-3 rounded-2xl p-4">
            <Repeat size={20} className={due ? 'text-rose-300' : 'text-slate-400'} />
            <div>
              <p className="text-sm font-bold">Daily Review</p>
              <p className="text-xs text-slate-400">{due ? `${due} cards due` : 'All caught up'}</p>
            </div>
          </Link>
          <Link to="/academy/roadmap" className="glass glass-hover flex items-center gap-3 rounded-2xl p-4">
            <Map size={20} className="text-amber-300" />
            <div>
              <p className="text-sm font-bold">CISSP Roadmap</p>
              <p className="text-xs text-slate-400">Domain readiness</p>
            </div>
          </Link>
          <div className="glass col-span-2 flex items-center justify-between gap-3 rounded-2xl p-4">
            <div>
              <p className="text-sm font-bold">Lessons completed</p>
              <p className="text-xs text-slate-400">{lessonsDone(state)} of {lessonsTotal}</p>
            </div>
            <div className="h-2 w-1/2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400" style={{ width: `${(lessonsDone(state) / lessonsTotal) * 100}%` }} />
            </div>
          </div>
        </div>

        <HandsOnLabs state={state} />

        <div className="mt-6">
          <PlayerHud />
        </div>

        {/* Roadmap strip */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Your route</h2>
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {ROADMAP.map((step) => {
              const cards = step.tiers.flatMap(([tid, tier]) => tracks.find((t) => t.id === tid).tiers.find((x) => x.id === tier).decks.flatMap((d) => d.cards));
              const pct = mastery(state, cards);
              const active = next?.step.step === step.step;
              return (
                <Link
                  key={step.step}
                  to="/academy/roadmap"
                  className={`glass min-w-[140px] flex-1 snap-start rounded-2xl p-3 transition hover:border-white/30 ${active ? 'ring-2 ring-amber-300/60' : ''}`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step {step.step}</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{step.title}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-amber-300" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{pct}% mastered</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Tracks */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Tracks</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => {
              const Icon = iconFor(t.icon);
              const cards = t.tiers.flatMap((tier) => tier.decks.flatMap((d) => d.cards));
              const pct = mastery(state, cards);
              const trackDue = dueCards(state, cards).length;
              return (
                <Link key={t.id} to={`/academy/${t.id}`} className="glass glass-hover group relative overflow-hidden rounded-3xl p-5">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl transition group-hover:opacity-50" style={{ background: t.color }} />
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20" style={{ backgroundColor: `${t.color}33`, color: t.color }}>
                        <Icon size={22} />
                      </div>
                      <span className="text-lg font-bold" style={{ color: t.color }}>{pct}%</span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-white">{t.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{t.tagline}</p>
                    <div className="mt-4 flex gap-1.5">
                      {t.tiers.map((tier, i) => {
                        const unlocked = isTierUnlocked(state, t, i);
                        const tp = mastery(state, tier.decks.flatMap((d) => d.cards));
                        return (
                          <div key={tier.id} className="flex-1">
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full" style={{ width: `${tp}%`, backgroundColor: tier.color }} />
                            </div>
                            <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400">
                              {!unlocked && <Lock size={9} />} {tier.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-200 group-hover:text-white">
                      {trackDue ? `${trackDue} cards due` : `${t.tiers.reduce((n, x) => n + x.decks.length, 0)} lessons`} <ArrowRight size={13} />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Badges */}
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Badges · {state.badges.length}/{Object.keys(BADGES).length}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(BADGES).map(([id, b]) => {
              const Icon = iconFor(b.icon);
              const earned = state.badges.includes(id);
              return (
                <div key={id} className={`glass rounded-2xl p-3 ${earned ? '' : 'opacity-45'}`} style={earned ? { borderColor: 'rgba(252,211,77,0.5)' } : undefined} title={b.desc}>
                  <Icon size={18} className={earned ? 'text-amber-300' : 'text-slate-400'} />
                  <p className="mt-1.5 text-xs font-semibold text-white">{b.title}</p>
                  <p className="text-[11px] leading-snug text-slate-400">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
>>>>>>> Stashed changes
      </div>

      {due === 0 && studied && (
        <Card to="/academy/review" className="mt-4">
          <div className="flex items-center gap-4">
            <IconTile icon={Repeat} />
            <div className="min-w-0 flex-1">
              <p className="text-heading text-ink-1">Review earlier lessons</p>
              <p className="mt-0.5 text-small text-ink-2">
                Nothing due. Practise your weakest questions.
              </p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
          </div>
        </Card>
      )}

      <section aria-labelledby="progress-heading" className="mt-12">
        <SectionHeader
          id="progress-heading"
          title="Your progress"
          action={
            <Link to="/academy/paths" className="text-small font-semibold text-ink-2 hover:text-ink-1">
              All career paths
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          {currentPath && <LearningPathCard state={state} path={currentPath} />}
          <Card to="/academy/roadmap">
            <IconTile icon={Crown} />
            <h3 className="mt-4 text-heading text-ink-1">Road to CISSP</h3>
            <p className="mt-1 text-small text-ink-2">The full journey: seven steps and all eight CISSP domains.</p>
            <p className="mt-3 text-small text-ink-2">{lessonsDone(state)} of {lessonsTotal} lessons complete</p>
            <ProgressBar className="mt-4" value={overallProgress(state)} label="Overall progress" />
          </Card>
        </div>
      </section>
    </PageContainer>
  );
}
