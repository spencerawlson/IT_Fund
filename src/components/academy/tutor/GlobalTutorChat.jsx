import React from 'react';
import { useLocation } from 'react-router-dom';
import { getTrack } from '@/data/academy';
import { modules, resolveModuleId } from '@/data/modules';
import TutorChat from './TutorChat';

/** One "Ask the tutor" button for the whole app, given context from the current page. */
export default function GlobalTutorChat() {
  const { pathname } = useLocation();
  // Lessons have their own tutor buttons in the bottom sheet; a floating button would cover them.
  if (/^\/academy\/[^/]+\/lesson\//.test(pathname)) return null;

  const trackMatch = pathname.match(/^\/academy\/([^/]+)/);
  const track = trackMatch ? getTrack(trackMatch[1]) : null;
  const moduleMatch = pathname.match(/^\/module\/([^/]+)/);
  const mod = moduleMatch ? modules.find((m) => m.id === resolveModuleId(moduleMatch[1])) : null;

  const title = track?.title || mod?.title || 'the Road to CISSP curriculum';
  return <TutorChat key={track?.id || mod?.id || 'app'} trackId={track?.id} trackTitle={title} color={track?.color || '#F59E0B'} />;
}
