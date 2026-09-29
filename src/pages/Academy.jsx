import React from 'react';
import { Link } from 'react-router-dom';
import { Repeat, Crown, ArrowRight } from 'lucide-react';
import { Card, IconTile, PageContainer, PageHeader, ProgressBar, SectionHeader } from '@/components/ui-glass';
import { ContinueLearning, LearningPathCard } from '@/components/academy/ui/cards';
import { allCards } from '@/data/academy';
import { PATHS, pathsForCourse } from '@/data/catalog';
import { useAcademy, dueCards } from '@/lib/academy';
import { continueLearning, lessonsDone, lessonsTotal, overallProgress, pathStatus } from '@/lib/progress/engine';

/** Home: the one next lesson, then review, then where you are on your path. */
export default function Academy() {
  const state = useAcademy();
  const next = continueLearning(state);
  const due = dueCards(state, allCards).length;
  const studied = Object.keys(state.lessons || {}).length > 0;
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
            : 'One lesson at a time, from IT foundations to the CISSP. Lessons open in order, and your place is saved as you go.'
        }
      />

      <ContinueLearning state={state} next={next} />

      {studied && (
        <Card to="/academy/review" className="mt-4">
          <div className="flex items-center gap-4">
            <IconTile icon={Repeat} />
            <div className="min-w-0 flex-1">
              <p className="text-heading text-ink-1">Review earlier lessons</p>
              <p className="mt-0.5 text-small text-ink-2">
                {due ? `${due} ${due === 1 ? 'question is' : 'questions are'} due for review` : 'Nothing due. Practise your weakest questions.'}
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
