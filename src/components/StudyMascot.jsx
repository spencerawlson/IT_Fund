import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, HelpCircle, RefreshCw, X, Eye } from 'lucide-react';
import { getMascotItems, MASCOT_NAME } from '@/data/mascotFacts';

/** Cipher, the study buddy: the rendered robot portrait (public/cipher-mascot.jpg).
 *  Previously a flat SVG with drawn moods; Spencer approved the rendered look on
 *  2026-10-20, so the portrait is now one fixed happy/waving expression. The
 *  `mood` and `blink` props stay for API compatibility — `pointing` gets the
 *  stronger wave, every other mood gets a gentle idle bob, so the portrait is
 *  never a dead image. The white-background portrait sits in a white rounded
 *  tile, which reads as intentional on the light theme. */
export function MascotArt({ color = '#7dd3fc', size = 56, mood = 'neutral', blink = false }) {
  void color;
  void blink;
  return (
    <img
      src="/cipher-mascot.jpg"
      alt=""
      role="img"
      aria-label={`${MASCOT_NAME} the study mascot`}
      width={size}
      height={size}
      className={mood === 'pointing' ? 'mascot-point' : 'mascot-idle'}
      style={{ borderRadius: 14, background: '#fff', objectFit: 'cover', display: 'block' }}
    />
  );
}

/**
 * A tiny mascot plus a one-line reaction. Static (no animation) by design:
 * for answer-feedback and completion contexts only — never on a question
 * screen itself.
 */
export function MascotReaction({ mood = 'happy', text, size = 40, color = '#7dd3fc' }) {
  if (!text) return null;
  return (
    <p className="mt-3 flex items-center gap-2.5">
      <span className="shrink-0" aria-hidden="true">
        <MascotArt color={color} size={size} mood={mood} />
      </span>
      <span className="text-sm font-medium text-ink-1">{text}</span>
    </p>
  );
}

/**
 * A mascot card with rotating fun facts / pop-quiz questions about the lesson
 * being read. `conceptId` re-seeds the rotation whenever the reader moves on.
 */
export default function StudyMascot({ conceptId, moduleId, color = '#7dd3fc', className = '', mood = 'neutral' }) {
  const items = useMemo(
    () => getMascotItems({ conceptId, moduleId }),
    [conceptId, moduleId]
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
    setDismissed(false);
  }, [conceptId, moduleId]);

  if (dismissed || !items.length) return null;
  const item = items[index % items.length];
  const isQuestion = item.type === 'question';
  const HeaderIcon = isQuestion ? HelpCircle : Sparkles;

  const another = () => {
    setIndex((i) => (i + 1 + Math.floor(Math.random() * Math.max(items.length - 1, 1))) % items.length);
    setRevealed(false);
  };

  return (
    <div className={`mt-5 ${className}`}>
      <div
        className="flex gap-3 rounded-control border p-4"
        style={{ borderColor: `${color}44`, background: `${color}0d` }}
      >
        <div className="shrink-0 pt-0.5">
          <MascotArt color={color} mood={mood} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.14em]" style={{ color }}>
            <HeaderIcon size={13} />
            {MASCOT_NAME} {isQuestion ? 'quizzes you' : 'did you know?'}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-1">{item.text}</p>
          {isQuestion && (
            revealed ? (
              <p className="glass-2 mt-2 rounded-lg px-3 py-2 text-sm leading-relaxed text-ink-1">
                <span className="font-semibold" style={{ color }}>Answer: </span>{item.answer}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-black/[0.03] px-3 py-1.5 text-caption font-semibold text-ink-1 transition hover:bg-black/[0.04]"
              >
                <Eye size={13} /> Reveal answer
              </button>
            )
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={another}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-caption font-semibold text-ink-2 transition hover:text-ink-1"
            >
              <RefreshCw size={12} /> Another one
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss mascot"
              className="ml-auto inline-flex items-center rounded-lg px-2 py-1 text-ink-3 transition hover:text-ink-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
