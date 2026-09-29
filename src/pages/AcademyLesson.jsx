import React from 'react';
import { useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { EmptyState } from '@/components/ui-glass';
import LessonPlayer from '@/components/academy/lesson/LessonPlayer';
import { getTrack, getDeck } from '@/data/academy';
import { useAcademy } from '@/lib/academy';
import { isLessonUnlocked, continueLearning } from '@/lib/progress/engine';
import { playerHref } from '@/data/catalog';

export default function AcademyLesson() {
  const { trackId, deckId } = useParams();
  const state = useAcademy();
  const track = getTrack(trackId);
  const deck = getDeck(deckId);

  let body;
  if (!track || !deck || deck.trackId !== track.id) {
    body = <Message title="Lesson not found" href="/" link="Back to Home" />;
  } else if (!isLessonUnlocked(state, deck.id)) {
    const next = continueLearning(state)?.lesson;
    body = (
      <Message
        title="Not yet: one step at a time"
        text={next ? `Your next open lesson is “${next.title}”. Lessons open in order so every one builds on the last.` : undefined}
        href={next ? playerHref(next) : '/'}
        link={next ? 'Go to your current lesson' : 'Back to Home'}
      />
    );
  } else {
    // key: a "Next lesson" link reuses this route, so remount for a fresh session.
    body = <LessonPlayer key={deck.id} track={track} deck={deck} />;
  }

  return <div className="min-h-[100dvh] text-ink-1">{body}</div>;
}

function Message({ title, text, href, link }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <EmptyState icon={Lock} title={title} text={text} to={href} action={link} />
    </div>
  );
}
