// "How do you want to learn this?" — Read | Slides (2026-11-23).
//
// Spencer: the slides and the full text were stacked on one page and the
// slide captions are the sections' own opening paragraphs, so a learner read
// them twice. The lesson now shows ONE view at a time: Read (the full text)
// or Slides (the visual summary deck). A Watch view joins these when the
// per-lesson videos ship (see the lesson-sections-collapsible-for-video plan).
//
// The choice is remembered per browser (a per-viewer convenience: if storage
// is unavailable the page simply opens on Read). The server-rendered /
// prerendered page is always Read, so search engines get the full text.

import React, { useCallback, useState } from 'react';
import { BookOpen, Presentation } from 'lucide-react';

export const LESSON_VIEW_KEY = 'itfund-lesson-view';
export const LESSON_VIEWS = [
  { id: 'read', label: 'Read', hint: 'Full lesson text', icon: BookOpen },
  { id: 'slides', label: 'Slides', hint: 'Visual summary', icon: Presentation },
];
const VALID = new Set(LESSON_VIEWS.map((v) => v.id));

function readStored() {
  try {
    if (typeof window === 'undefined') return 'read';
    const v = window.localStorage.getItem(LESSON_VIEW_KEY);
    return VALID.has(v) ? v : 'read';
  } catch {
    return 'read';
  }
}

/** [view, setView]: the learner's chosen lesson view, remembered across lessons. */
export function useLessonView() {
  const [view, setViewState] = useState(readStored);
  const setView = useCallback((next) => {
    if (!VALID.has(next)) return;
    setViewState(next);
    try {
      window.localStorage.setItem(LESSON_VIEW_KEY, next);
    } catch {
      // storage blocked (private mode): the choice lasts for this page only
    }
  }, []);
  return [view, setView];
}

export default function LessonViewSwitch({ view, onChange }) {
  // Radio-group keyboard pattern: arrows move (and select) between views.
  const onKeyDown = (event) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!dir) return;
    event.preventDefault();
    const i = LESSON_VIEWS.findIndex((v) => v.id === view);
    const next = LESSON_VIEWS[(i + dir + LESSON_VIEWS.length) % LESSON_VIEWS.length];
    onChange(next.id);
    event.currentTarget.querySelector(`[data-view="${next.id}"]`)?.focus();
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p id="lesson-view-label" className="text-small font-semibold text-ink-2">
        How do you want to learn this?
      </p>
      <div
        role="radiogroup"
        aria-labelledby="lesson-view-label"
        onKeyDown={onKeyDown}
        className="inline-flex rounded-control border border-violet-700/15 bg-white/70 p-1"
      >
        {LESSON_VIEWS.map(({ id, label, hint, icon: Icon }) => {
          const on = view === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              data-view={id}
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              title={hint}
              onClick={() => onChange(id)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-[10px] px-4 text-small font-semibold transition ${
                on ? 'bg-action-surface text-action-surface-ink shadow-sm' : 'text-ink-2 hover:bg-violet-50 hover:text-ink-1'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
