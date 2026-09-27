// "What should I do next?" helpers that walk the course path.
import { tracks, getTrack, ROADMAP } from '@/data/academy';
import { isTierUnlocked } from '@/lib/academy';

const isDone = (state, deck) => !!state.lessons?.[deck.id];

/** First unfinished lesson in an unlocked tier of this track, or null when the track is complete. */
export function nextLessonInTrack(state, track) {
  for (let i = 0; i < track.tiers.length; i++) {
    if (!isTierUnlocked(state, track, i)) return null;
    const deck = track.tiers[i].decks.find((d) => !isDone(state, d));
    if (deck) return deck;
  }
  return null;
}

/** Next lesson following the CISSP roadmap order across all tracks. */
export function nextLessonOverall(state) {
  for (const step of ROADMAP) {
    for (const [trackId, tierId] of step.tiers) {
      const track = getTrack(trackId);
      const tierIndex = track.tiers.findIndex((t) => t.id === tierId);
      if (!isTierUnlocked(state, track, tierIndex)) continue;
      const deck = track.tiers[tierIndex].decks.find((d) => !isDone(state, d));
      if (deck) return { track, deck, step };
    }
  }
  return null;
}

export const lessonsDone = (state) => Object.keys(state.lessons || {}).length;
export const lessonsTotal = tracks.reduce((s, t) => s + t.tiers.reduce((n, tier) => n + tier.decks.length, 0), 0);
