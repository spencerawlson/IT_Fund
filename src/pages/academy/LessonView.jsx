import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, RotateCcw, Copy, Check, ArrowLeft, ArrowRight, SearchX, Zap, Eye } from 'lucide-react';
import RichText from '@/components/academy/RichText';
import { PrereqNotice } from '@/components/academy/ui/bits';
import {
  Button, Card, EmptyState, ListLink, PageContainer, PageHeader, StatusBadge,
} from '@/components/ui-glass';
import { getCourse, getLesson, getModule, courseHref, moduleHref, lessonHref, playerHref } from '@/data/catalog';
import { useAcademy } from '@/lib/academy';
import { lessonStatus, lessonPrerequisites, PASS_PCT } from '@/lib/progress/engine';
import { useSubscription } from '@/lib/subscription';
import UpgradePrompt from '@/components/UpgradePrompt';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const SAMPLE_QUESTIONS = 4;

// Free-tier sample: this lesson's full content is open to everyone.
const FREE_LESSON_ID = 'net-osi';

// Lessons that have a matching Visual Lab scenario ("Learn → See"). Deep-links straight to it.
const VISUAL_LAB_FOR = {
  'rt-ospf': 'rt-ospf-neighbor',
  'rt-bgp': 'rt-bgp-path',
  'rt-fundamentals': 'rt-link-failure',
  'rt-routing-troubleshooting': 'rt-link-failure',
};

/** One lesson: reading on a glass-2 surface, then practice (the interactive lesson). */
export default function LessonView() {
  const { lessonId } = useParams();
  const state = useAcademy();
  const { subscribed, loading: subLoading } = useSubscription();
  const lesson = getLesson(lessonId);
  const course = lesson && getCourse(lesson.courseSlug);
  useDocumentTitle(lesson ? `${lesson.title} · Road to CISSP` : 'Lesson · Road to CISSP');

  if (!lesson) {
    return (
      <PageContainer>
        <EmptyState icon={SearchX} title="Lesson not found" text="It may have moved. Your progress is safe." to="/academy/courses" action="Browse courses" />
      </PageContainer>
    );
  }

  if (!subLoading && !subscribed && lessonId !== FREE_LESSON_ID) {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={[{ label: 'Home', to: '/' }]} title={lesson.title} />
        <UpgradePrompt what={`The “${lesson.title}” lesson`} />
      </PageContainer>
    );
  }

  const module = getModule(lesson.moduleKey);
  const status = lessonStatus(state, lesson);
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: course.title, to: courseHref(course) },
    { label: `Module ${module.number}`, to: moduleHref(module) },
    { label: `Lesson ${lesson.number}` },
  ];
  const title = <>Lesson {lesson.number}: <RichText text={lesson.title} /></>;

  const c = lesson.content || {};
  const resume = state.resume?.deckId === lesson.id ? state.resume : null;
  const best = state.lessons?.[lesson.id]?.best;
  const i = module.lessons.findIndex((l) => l.id === lesson.id);
  const prev = module.lessons[i - 1];
  const next = module.lessons[i + 1];
  // Recommended background. Nothing blocks the lesson, so this is a short note at the top: the
  // lesson before it, and the module it assumes. Two items at most, and none once it is passed.
  const prereq = lessonPrerequisites(state, lesson);
  const prereqItems = (status === 'completed' ? [] : [
    ...(prereq.previous ? [{ label: `Lesson ${prereq.previous.number}: ${prereq.previous.title}`, to: lessonHref(prereq.previous) }] : []),
    ...prereq.modules.map((m) => ({ label: `${getCourse(m.courseSlug).title} · Module ${m.number}`, to: moduleHref(m) })),
  ]).slice(0, 2);
  const puzzles = lesson.deck.puzzles.length;
  const practiceLabel = resume ? 'Resume practice' : status === 'completed' ? 'Practise again' : 'Start practice';

  const sections = [
    c.learn?.length && { id: 'learn', label: 'Learn' },
    c.architecture && { id: 'architecture', label: 'Architecture' },
    c.examples?.length && { id: 'examples', label: 'Examples' },
    c.cheatSheet?.length && { id: 'cheat-sheet', label: 'Cheat sheet' },
    { id: 'practice', label: 'Practice' },
    lesson.resources.length && { id: 'resources', label: 'Resources' },
  ].filter(Boolean);

  return (
    <PageContainer>
      <PageHeader breadcrumbs={crumbs} eyebrow={`${course.title} · Module ${module.number}: ${module.title}`} title={title} />
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-2">
        <StatusBadge status={status} />
        <span>{lesson.minutes} min</span>
        <span>{lesson.deck.cards.length} questions{puzzles ? ` · ${puzzles} hands-on ${puzzles === 1 ? 'puzzle' : 'puzzles'}` : ''}</span>
        {best !== undefined && <span>Best score {best}%</span>}
      </div>

      <PrereqNotice className="mb-8 max-w-reading" items={prereqItems} />

      {VISUAL_LAB_FOR[lesson.id] && (
        <Card level={2} padding="sm" className="mb-8 max-w-reading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-small text-ink-2">See this concept animated, then configure it yourself.</p>
            <Button to={`/lab?item=${VISUAL_LAB_FOR[lesson.id]}`} variant="secondary" size="sm" icon={Eye}>
              Open in Visual Lab
            </Button>
          </div>
        </Card>
      )}

      {sections.length > 2 && (
        <nav aria-label="On this page" className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-small">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="font-semibold text-ink-2 hover:text-ink-1">{s.label}</a>
          ))}
        </nav>
      )}

      <Card level={2} padding="lg" as="article" className="space-y-12">
        <Section id="overview" title="Overview">
          {(c.overview || [lesson.summary]).map((p) => <Para key={p} text={p} />)}
          {!lesson.content && (
            <div className="mt-2">
              <p className="text-body text-ink-2">This lesson is taught through practice. You’ll work through questions like these:</p>
              <ul className="mt-3 space-y-2">
                {lesson.deck.cards.slice(0, SAMPLE_QUESTIONS).map((card) => (
                  <li key={card.id} className="flex gap-3 text-lesson text-ink-1">
                    <span aria-hidden="true" className="text-ink-3">–</span>
                    <RichText text={card.q} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {c.learn?.length > 0 && (
          <Section id="learn" title="Learn">
            {c.learn.map((part) => (
              <div key={part.heading} className="space-y-3">
                <h3 className="text-heading text-ink-1">{part.heading}</h3>
                {part.body.map((p) => <Para key={p} text={p} />)}
              </div>
            ))}
          </Section>
        )}

        {c.architecture && (
          <Section id="architecture" title="Architecture">
            <figure>
              <pre className="overflow-x-auto rounded-control border border-white/10 bg-black/30 p-5 font-mono text-small leading-relaxed text-ink-1">{c.architecture.diagram}</pre>
              <figcaption className="mt-3 text-small text-ink-2">{c.architecture.caption}</figcaption>
            </figure>
          </Section>
        )}

        {c.examples?.length > 0 && (
          <Section id="examples" title="Examples">
            {c.examples.map((ex) => (
              <div key={ex.title}>
                <h3 className="text-heading text-ink-1">{ex.title}</h3>
                <CodeBlock code={ex.code} />
                {ex.explanation && <p className="mt-3 max-w-reading text-body text-ink-2"><RichText text={ex.explanation} /></p>}
              </div>
            ))}
          </Section>
        )}

        {c.cheatSheet?.length > 0 && (
          <Section id="cheat-sheet" title="Cheat sheet">
            <table className="w-full text-left text-body">
              <thead className="sr-only">
                <tr><th scope="col">Term</th><th scope="col">Meaning</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {c.cheatSheet.map(([term, meaning]) => (
                  <tr key={term}>
                    <th scope="row" className="w-2/5 py-3 pr-4 align-top font-semibold text-ink-1">{term}</th>
                    <td className="py-3 text-ink-2">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}
      </Card>

      <Card as="section" id="practice" aria-labelledby="practice-title" padding="lg" className="mt-6 scroll-mt-28">
        <h2 id="practice-title" className="text-heading text-ink-1">Practice</h2>
        <p className="mt-2 max-w-reading text-body text-ink-2">
          Starts with a few questions from earlier lessons, then this lesson’s {lesson.deck.cards.length} questions
          {puzzles ? ` and ${puzzles} hands-on ${puzzles === 1 ? 'puzzle' : 'puzzles'}` : ''}. Score {PASS_PCT}% on first tries to
          pass and open the next lesson.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button to={playerHref(lesson)} size="lg" icon={resume ? RotateCcw : Play}>{practiceLabel}</Button>
          {status === 'completed' && (
            <Button to={`/academy/${lesson.trackId}/deck/${lesson.id}?mode=quiz`} size="lg" variant="secondary" icon={Zap}>
              Quick quiz (10 questions)
            </Button>
          )}
        </div>
        {status === 'completed' && (
          <p className="mt-3 text-small text-ink-2">A quick quiz refreshes this lesson without replaying it; your results feed your review schedule.</p>
        )}
      </Card>

      {lesson.resources.length > 0 && (
        <section id="resources" aria-labelledby="resources-title" className="mt-10 scroll-mt-28">
          <h2 id="resources-title" className="text-heading text-ink-1">Resources</h2>
          <Card level={2} padding="sm" className="mt-4">
            <ul className="divide-y divide-white/[0.06]">
              {lesson.resources.map((r) => (
                <li key={r.id}><ListLink href={r.url} title={r.title} /></li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <nav aria-label="Lesson navigation" className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
        {prev ? (
          <Button to={lessonHref(prev)} variant="ghost" icon={ArrowLeft}>Lesson {prev.number}</Button>
        ) : <span />}
        {next && <Button to={lessonHref(next)} variant="ghost" iconAfter={ArrowRight}>Lesson {next.number}</Button>}
      </nav>
    </PageContainer>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 space-y-4">
      <h2 id={`${id}-title`} className="text-caption font-semibold uppercase tracking-wider text-ink-2">{title}</h2>
      {children}
    </section>
  );
}

const Para = ({ text }) => (
  <p className="max-w-reading text-lesson text-ink-1">
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
    <div className="mt-3 overflow-hidden rounded-control border border-white/10 bg-black/30">
      <div className="flex justify-end border-b border-white/[0.06] px-2 py-1.5">
        <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copy} aria-live="polite">
          {copied ? 'Copied' : 'Copy code'}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-small leading-relaxed text-ink-1">{code}</pre>
    </div>
  );
}
