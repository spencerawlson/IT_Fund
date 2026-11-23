import React from 'react';
import { Link } from 'react-router-dom';
import { Repeat, Crown, ArrowRight, Zap, Award, Play, Crosshair, Shield, Waves, FlaskConical } from 'lucide-react';
import { Button, Card, IconTile, PageContainer, PageHeader, ProgressBar, SectionHeader } from '@/components/ui-glass';
import { ContinueLearning, LearningPathCard } from '@/components/academy/ui/cards';
import { StreakFlame } from '@/components/Celebration';
import { STREAK_MILESTONES } from '@/lib/milestones';
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
          <StreakFlame streak={streak} />
          <div>
            <p className={`text-heading text-ink-1 ${STREAK_MILESTONES.includes(streak) ? 'count-pop' : ''}`} key={streak}>{streak} {streak === 1 ? 'day' : 'days'}</p>
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

/** When reviews are due, this takes the top hero slot so the reps actually happen.
 *  Stacks on phones: a horizontal row squeezes the copy to one word per line
 *  (icon + button leave ~77px for the text at 430px). Copy unchanged. */
function ReviewHero({ due }) {
  return (
    <Card as="section" padding="lg" aria-labelledby="review-hero-heading" className="mt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <IconTile icon={Repeat} color="#f59e0b" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Spaced repetition</p>
            <h2 id="review-hero-heading" className="mt-1 text-heading text-ink-1">
              {due} {due === 1 ? 'question is' : 'questions are'} due for review
            </h2>
            <p className="mt-1 text-small text-ink-2">Quick reps now beat relearning later. It only takes a few minutes.</p>
          </div>
        </div>
        <Button to="/academy/review" size="lg" icon={Play} className="w-full justify-center sm:w-auto">Start review</Button>
      </div>
    </Card>
  );
}

/** Home: the one next lesson, then review, then where you are on your path. */
const LANDING_TITLE = 'Road to CISSP — Networking, Security & Cloud Training';

// Missions on the home page (audit B-25, Spencer 2026-11-16): until now the
// three missions were reachable only from a lesson handoff, so a signed-in
// learner could not find them from home. Names + descriptions come from
// src/data/missions.js (callsigns + briefs); duration, difficulty and XP
// come from backend/labs/missions.py where recorded — nothing is invented.
// Operation Glasshouse has no backend mission record and no /missions page
// (no op-glasshouse anywhere in src or backend), so it links to its lab
// instead of a mission page that would 404.
const HOME_MISSIONS = [
  {
    to: '/labs/sec-pentest-web-001',
    icon: Crosshair,
    title: 'Operation Glasshouse',
    text: 'Get into the ACME intranet web app and prove how deep it goes.',
    meta: null, // no duration/difficulty recorded for this mission
  },
  {
    to: '/missions/op-broken-shield',
    icon: Shield,
    title: 'Operation Broken Shield',
    text: 'Unauthorized traffic between two network segments at Orion Technologies. Investigate the topology, inspect the firewall policies, and fix the configuration with least privilege — then document the incident and file your report.',
    meta: 'Beginner · 30 min · 80 XP',
  },
  {
    to: '/missions/op-packet-flood',
    icon: Waves,
    title: 'Operation Packet Flood',
    text: 'The Orion intranet barely responds and the link is saturated. Capture the traffic, find which host is flooding it and what kind of flood it is, stop it at its source, then document the incident and file your report.',
    meta: 'Intermediate · 30 min · 80 XP',
  },
];

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

      {/* B-25: missions were invisible from home — no section, no nav link.
          Each card names and describes one mission and links to its page. */}
      <section aria-labelledby="missions-heading" className="mt-12">
        <SectionHeader
          id="missions-heading"
          title="Missions"
          description="Story-driven operations over real labs — investigate, fix, and report. Included with your membership."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_MISSIONS.map(({ to, icon: Icon, title, text, meta }) => (
            <Card key={title} to={to} level={1} padding="lg">
              <IconTile icon={Icon} />
              <h3 className="mt-3 text-heading font-semibold text-ink-1">{title}</h3>
              <p className="mt-2 text-body text-ink-2">{text}</p>
              {meta && <p className="mt-3 text-small font-semibold text-ink-2">{meta}</p>}
            </Card>
          ))}
        </div>
      </section>

      {/* B-25: a way into the labs from home. Link only — the clickable lab
          list itself is B-04 and is not rebuilt here. */}
      <section aria-labelledby="labs-heading" className="mt-12">
        <SectionHeader id="labs-heading" title="Hands-on labs" />
        <Card to="/labs" level={1} padding="lg">
          <div className="flex items-center gap-4">
            <IconTile icon={FlaskConical} />
            <div className="min-w-0 flex-1">
              <p className="text-heading text-ink-1">Open the lab console</p>
              <p className="mt-0.5 text-small text-ink-2">
                Real terminals, real tools: Cisco IOS, Linux triage, Python automation, cloud sandboxes. Type labs in the console to browse the tracks.
              </p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
          </div>
        </Card>
      </section>
    </PageContainer>
  );
}
