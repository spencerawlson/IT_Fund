import React from 'react';
import { Card } from '@/components/ui-glass';
import { MascotArt } from '@/components/StudyMascot';

/**
 * Cipher, pointing at the one thing worth remembering from this lesson.
 * Renders nothing without a note: the pointer never invents content.
 */
export default function CipherNote({ text, className = '' }) {
  if (!text) return null;
  return (
    <Card level={2} className={className}>
      <div className="flex items-start gap-4">
        <span className="shrink-0" aria-hidden="true">
          <MascotArt size={64} mood="pointing" />
        </span>
        <div>
          <p className="text-caption font-bold uppercase tracking-[0.14em] text-ink-2">Cipher points out</p>
          <p className="mt-1 text-body text-ink-1">{text}</p>
        </div>
      </div>
    </Card>
  );
}
