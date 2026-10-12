// Celebration: the reusable "alive moment" overlay. Confetti burst + Cipher in
// celebrating pose + title/subtitle + dismiss. One instance is mounted at the
// app root (CelebrationHost) and fed by useMilestoneCelebrations(); exam-pass
// moments flow through the same queue, so every exam type celebrates identically.
//
// Honors prefers-reduced-motion: the card renders statically, no confetti.
import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Award, Flame, FlaskConical, PartyPopper, TrendingUp, X } from 'lucide-react';
import { Button, Card } from '@/components/ui-glass';
import { useMilestoneCelebrations, STREAK_MILESTONES } from '@/lib/milestones';
import { MascotArt } from './StudyMascot';
import { cn } from '@/lib/utils';

const KIND = {
  'levelup': { Icon: TrendingUp, fallbackAccent: '#8b5cf6' },
  'streak': { Icon: Flame, fallbackAccent: '#f97316' },
  'badge': { Icon: Award, fallbackAccent: '#f59e0b' },
  'exam-pass': { Icon: PartyPopper, fallbackAccent: '#10b981' },
  'lab-complete': { Icon: FlaskConical, fallbackAccent: '#3b82f6' },
};

function usePrefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Celebration({ celebration, onClose }) {
  const dialogRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!celebration || reduced) return undefined;
    const accent = celebration.accent || '#8b5cf6';
    const t1 = setTimeout(() => {
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors: [accent, '#ffffff', '#fbbf24'] });
    }, 120);
    const t2 = setTimeout(() => {
      confetti({ particleCount: 45, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: [accent, '#ffffff'] });
      confetti({ particleCount: 45, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: [accent, '#ffffff'] });
    }, 450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [celebration, reduced]);

  useEffect(() => {
    if (!celebration) return undefined;
    dialogRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [celebration, onClose]);

  if (!celebration) return null;
  const { Icon, fallbackAccent } = KIND[celebration.kind] || KIND.badge;
  const accent = celebration.accent || fallbackAccent;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={celebration.title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full outline-none sm:max-w-sm"
      >
        <Card
          level={2}
          padding="lg"
          className={cn(
            'relative rounded-b-none border-b-0 text-center sm:rounded-control sm:border-b',
            'pb-safe',
            !reduced && 'animate-pop',
          )}
        >
          <span
            className="mx-auto flex h-20 w-20 items-center justify-center"
            aria-hidden="true"
          >
            <MascotArt color={accent} size={76} mood="celebrating" blink={!reduced} />
          </span>
          <p
            className="mt-3 inline-flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.14em]"
            style={{ color: accent }}
          >
            <Icon size={13} aria-hidden="true" />
            {celebration.kind === 'exam-pass' ? 'Exam passed' : celebration.kind.replace('-', ' ')}
          </p>
          <h2 className="mt-1.5 text-title text-ink-1">{celebration.title}</h2>
          {celebration.subtitle && (
            <p className="mx-auto mt-2 max-w-xs text-body text-ink-2">{celebration.subtitle}</p>
          )}
          <div className="mt-6">
            <Button size="lg" onClick={onClose} className="w-full">
              Keep going
            </Button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss celebration"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-3 transition hover:text-ink-1"
          >
            <X size={16} />
          </button>
        </Card>
      </div>
    </div>
  );
}

/** Mount once near the app root: milestone celebrations fire from anywhere. */
export function CelebrationHost() {
  const { current, dismiss } = useMilestoneCelebrations();
  return <Celebration celebration={current} onClose={dismiss} />;
}

/**
 * The streak flame with ignition: on a streak milestone the flame gets a
 * one-shot glow burst and the count pops. Any other day it sits calm.
 */
export function StreakFlame({ streak, size = 26 }) {
  const ignited = STREAK_MILESTONES.includes(streak);
  return (
    <span
      className={cn('inline-flex', ignited && 'streak-ignited')}
      style={{ color: streak > 0 ? '#f97316' : '#64748b' }}
      role="img"
      aria-label={streak > 0 ? `${streak} day study streak` : 'No active streak'}
    >
      <Flame size={size} aria-hidden="true" fill={streak > 0 ? 'currentColor' : 'none'} />
    </span>
  );
}
