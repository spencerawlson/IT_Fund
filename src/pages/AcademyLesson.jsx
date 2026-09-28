import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useBgTint } from '@/components/academy/LiquidBackground';
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
  useBgTint(track?.color);

  let body;
  if (!track || !deck || deck.trackId !== track.id) {
    body = <Message title="Lesson not found" href="/academy" link="Back to your path" />;
  } else if (!isLessonUnlocked(state, deck.id)) {
    const next = continueLearning(state)?.lesson;
    body = (
      <Message
        title="Not yet: one step at a time"
        text={next ? `Your next open lesson is “${next.title}”. Lessons open in order so every one builds on the last.` : undefined}
        href={next ? playerHref(next) : '/academy'}
        link={next ? 'Go to your current lesson' : 'Back to your path'}
      />
    );
  } else {
    // key: a "Next lesson" link reuses this route, so remount for a fresh session.
    body = <LessonPlayer key={deck.id} track={track} deck={deck} />;
  }

  return (
    <div className="relative isolate min-h-[100dvh] text-white">
      {body}
    </div>
  );
}

function Message({ title, text, href, link }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="glass max-w-sm rounded-3xl p-8 text-center">
        <Lock className="mx-auto text-slate-400" size={30} />
        <p className="mt-3 text-lg font-bold">{title}</p>
        {text && <p className="mt-1 text-sm text-slate-300">{text}</p>}
        <Link to={href} className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:underline">{link}</Link>
      </div>
    </div>
  );
}
