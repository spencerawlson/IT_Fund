import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useBgTint } from '@/components/academy/LiquidBackground';
import LessonPlayer from '@/components/academy/lesson/LessonPlayer';
import { getTrack, getDeck } from '@/data/academy';
import { useAcademy, isTierUnlocked } from '@/lib/academy';

export default function AcademyLesson() {
  const { trackId, deckId } = useParams();
  const state = useAcademy();
  const track = getTrack(trackId);
  const deck = getDeck(deckId);
  useBgTint(track?.color);
  const tierIndex = track && deck ? track.tiers.findIndex((t) => t.id === deck.tierId) : -1;

  let body;
  if (!track || !deck || deck.trackId !== track.id) {
    body = <Message title="Lesson not found" href="/academy" />;
  } else if (!isTierUnlocked(state, track, tierIndex)) {
    body = <Message title="This lesson is locked" text="Finish the previous tier or beat its boss first." href={`/academy/${track.id}`} />;
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

function Message({ title, text, href }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="glass max-w-sm rounded-3xl p-8 text-center">
        <Lock className="mx-auto text-slate-400" size={30} />
        <p className="mt-3 text-lg font-bold">{title}</p>
        {text && <p className="mt-1 text-sm text-slate-300">{text}</p>}
        <Link to={href} className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:underline">Back to the path</Link>
      </div>
    </div>
  );
}
