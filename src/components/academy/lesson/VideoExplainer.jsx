import React from 'react';
import { Card } from '@/components/ui-glass';
import { MascotArt } from '@/components/StudyMascot';

/**
 * Honest placeholder for the avatar-tutor video that will one day open every lesson.
 * No fake player and no dead controls: until a real video exists for a lesson, this
 * card says so plainly and points at the guided lesson, which is the full treatment.
 */
export default function VideoExplainer({ className = '' }) {
  return (
    <Card level={2} className={className}>
      <div className="flex items-start gap-4">
        <span className="shrink-0" aria-hidden="true">
          <MascotArt size={52} mood="happy" />
        </span>
        <div>
          <h2 className="text-body font-semibold text-ink-1">Video explainer coming soon</h2>
          <p className="mt-1 text-body text-ink-2">
            Soon, a tutor will walk you through this lesson on video — the key ideas explained
            out loud, not just read off the page. Until then, the guided lesson below is the
            complete treatment.
          </p>
        </div>
      </div>
    </Card>
  );
}
