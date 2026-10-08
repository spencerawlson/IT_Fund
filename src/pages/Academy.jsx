import React from 'react';
import { Link } from 'react-router-dom';
import { Repeat, Crown, ArrowRight, Flame, Zap, Award, Play } from 'lucide-react';
import { Button, Card, IconTile, PageContainer, PageHeader, ProgressBar, SectionHeader } from '@/components/ui-glass';
import { ContinueLearning, LearningPathCard } from '@/components/academy/ui/cards';
import LandingView from '@/components/academy/LandingView';
import { PATHS, pathsForCourse } from '@/data/catalog';
import { DAILY_GOAL_XP, levelInfo, liveStreak, useAcademy, xpToday } from '@/lib/academy';
import { continueLearning, dueReviewCount, lessonsDone, lessonsTotal, overallProgress, pathStatus } from '@/lib/progress/engine';
import { useAuth } from '@/lib/AuthContext';
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

export default function Academy() {
  const state = useAcademy();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const studied = Object.keys(state.lessons || {}).length > 0;
  useDocumentTitle(studied ? 'Academy · Road to CISSP' : LANDING_TITLE);
  // The first-run marketing landing (with "Free to start · No account needed") is for logged-OUT
  // visitors only. A signed-in user with no progress yet gets the dashboard's "Welcome to Road to
  // CISSP" state instead — showing them "no account needed" while they're logged in is wrong.
  if (!studied) {
    if (isLoadingAuth) return null;                 // still checking the session; don't flash either view
    if (!isAuthenticated) return <LandingView />;
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

      <div className="mt-6">
        <ContinueLearning state={state} next={next} />
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
