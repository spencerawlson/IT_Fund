import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getTrack } from '@/data/academy';
import { modules, resolveModuleId } from '@/data/modules';
import { useTutorPanel } from '@/components/shell/TutorContext';
import TutorChat from './TutorChat';

/** The app-wide tutor panel, given context from the current page. Opened from the navigation. */
export default function GlobalTutorChat() {
  const { pathname } = useLocation();
  const { open, setOpen } = useTutorPanel();
  // Close on navigation, so the panel never lands on top of a lesson or quiz.
  useEffect(() => setOpen(false), [pathname, setOpen]);

  const trackMatch = pathname.match(/^\/academy\/([^/]+)/);
  const track = trackMatch ? getTrack(trackMatch[1]) : null;
  const moduleMatch = pathname.match(/^\/module\/([^/]+)/);
  const mod = moduleMatch ? modules.find((m) => m.id === resolveModuleId(moduleMatch[1])) : null;

  const title = track?.title || mod?.title || 'the Road to CISSP curriculum';
  return <TutorChat key={track?.id || mod?.id || 'app'} trackId={track?.id} trackTitle={title} open={open} onOpenChange={setOpen} />;
}
