import React from 'react';
import { useParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui-glass';
import LessonPlayer from '@/components/academy/lesson/LessonPlayer';
import { getTrack, getDeck } from '@/data/academy';
import useDocumentTitle from '@/hooks/useDocumentTitle';

export default function AcademyLesson() {
  const { trackId, deckId } = useParams();
  const track = getTrack(trackId);
  const deck = getDeck(deckId);
  useDocumentTitle(deck ? `Lesson: ${deck.title} · Road to CISSP` : 'Lesson · Road to CISSP');

  // Every lesson is open, so a bad URL is the only thing left to handle. The key matters because
  // a "Next lesson" link reuses this route: remount for a fresh session.
  const body =
    !track || !deck || deck.trackId !== track.id ? (
      <Message title="Lesson not found" href="/app" link="Back to Home" />
    ) : (
      <LessonPlayer key={deck.id} track={track} deck={deck} />
    );

  return <div className="min-h-[100dvh] text-ink-1">{body}</div>;
}

function Message({ title, text, href, link }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <EmptyState icon={SearchX} title={title} text={text} to={href} action={link} />
    </div>
  );
}
