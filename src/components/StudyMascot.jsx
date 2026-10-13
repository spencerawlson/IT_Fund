import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, HelpCircle, RefreshCw, X, Eye } from 'lucide-react';
import { getMascotItems, MASCOT_NAME } from '@/data/mascotFacts';

/** Cipher, the study buddy: a tiny SVG robot who pops in with a fun fact or a pop-quiz prompt. */
export function MascotArt({ color = '#7dd3fc', size = 56, mood = 'neutral', blink = false }) {
  // Mood is drawn, not animated: celebrating gets a party hat, raised arms and a
  // big grin; thinking looks sideways with a flat mouth; happy/encouraging smile.
  const pupils = mood === 'thinking'
    ? { left: [28, 33], right: [40, 33] }
    : { left: [26, 33], right: [38, 33] };
  const mouth = {
    neutral: <path d="M26 40 Q32 44 38 40" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />,
    happy: <path d="M24 39 Q32 47 40 39" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />,
    encouraging: <path d="M27 40 Q32 43.5 37 40" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />,
    thinking: <path d="M28 41.5 L36 41.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />,
    celebrating: <path d="M23 39 Q32 49 41 39" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />,
  }[mood] || null;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${MASCOT_NAME} the study mascot`}>
      {mood === 'celebrating' && (
        <g>
          <line x1="15" y1="30" x2="7" y2="17" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <line x1="49" y1="30" x2="57" y2="17" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <polygon points="32,1 23,17 41,17" fill={color} opacity="0.9" />
          <circle cx="32" cy="3.5" r="2.6" fill="#f472b6" />
        </g>
      )}
      <line x1="32" y1="12" x2="32" y2="20" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="9" r="4" fill={color} opacity="0.9" />
      <rect x="13" y="20" width="38" height="28" rx="11" fill="#1e293b" stroke={color} strokeWidth="2.5" />
      <rect x="13" y="20" width="38" height="28" rx="11" fill={color} opacity="0.08" />
      <circle cx="25" cy="32" r="5" fill="#fff" />
      <circle cx="39" cy="32" r="5" fill="#fff" />
      <g className={blink ? 'mascot-blink' : undefined}>
        <circle cx={pupils.left[0]} cy={pupils.left[1]} r="2.4" fill="#0f172a" />
        <circle cx={pupils.right[0]} cy={pupils.right[1]} r="2.4" fill="#0f172a" />
        <circle cx={pupils.left[0] + 1} cy={pupils.left[1] - 1} r="0.9" fill="#fff" />
        <circle cx={pupils.right[0] + 1} cy={pupils.right[1] - 1} r="0.9" fill="#fff" />
      </g>
      {mouth}
      <rect x="22" y="48" width="20" height="9" rx="4.5" fill="#1e293b" stroke={color} strokeWidth="2" />
      <circle cx="32" cy="52.5" r="2" fill={color} />
    </svg>
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
