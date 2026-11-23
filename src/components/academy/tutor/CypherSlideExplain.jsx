// "Explain this slide" — the Cypher integration point of the lesson slide
// deck (LessonSlideCarousel `renderExplain`), 2026-11-23.
//
// Real tutor only, never canned text: it reuses useTutor (POST /ai/tutor,
// "explain" mode) grounded on THIS slide's own lesson text (title + caption)
// so Cypher explains what the slide says and nothing invented. The backend
// caches by question + grounding text, so each slide's answer is generated
// once and shared. Renders nothing while the tutor is switched off
// (/ai/status not enabled); a signed-out learner gets a sign-in link (the
// tutor spends OpenAI money, so it is never anonymous).

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Square } from 'lucide-react';
import { TutorText, useTutor, useTutorEnabled } from './TutorAssist';
import { useOptionalAuth } from '@/lib/AuthContext';

const LESSON_TEXT_MAX = 6000;

/** The tutor request for one slide (exported for tests). */
export function slideExplainRequest(slide, lessonTitle) {
  const title = String(slide?.title || '').slice(0, 120);
  return {
    mode: 'explain',
    topic: String(lessonTitle || title).slice(0, 120),
    question: `Explain the slide "${title}" from this lesson in plain words, with a short example.`.slice(0, 600),
    lesson_text: `${title}\n\n${slide?.caption || ''}`.slice(0, LESSON_TEXT_MAX),
  };
}

export default function CypherSlideExplain({ slide, lessonTitle }) {
  const enabled = useTutorEnabled();
  const auth = useOptionalAuth();
  const signedOut = Boolean(auth && auth.authChecked && !auth.isAuthenticated);
  const { text, loading, error, ask, stop, reset } = useTutor();

  // A new slide starts clean: an answer belongs to the slide it was asked on.
  useEffect(() => { reset(); }, [slide?.title, reset]);

  if (!enabled || !slide) return null;
  return (
    <div className="space-y-2.5 border-t border-[var(--sd-border)] pt-3">
      <p className="flex items-center gap-2 text-small font-bold text-[var(--sd-accent)]">
        <Sparkles size={15} aria-hidden="true" />
        Cypher AI Tutor
      </p>
      {signedOut ? (
        <p className="text-small text-[var(--sd-muted)]">
          <Link to="/signin" className="font-semibold text-[var(--sd-text)] underline underline-offset-2">Sign in</Link>{' '}
          to ask Cypher to explain this slide.
        </p>
      ) : (
        <>
          {!text && !loading && (
            <p className="text-small text-[var(--sd-muted)]">Need it explained another way? Ask about this slide.</p>
          )}
          {text && (
            <div className="max-h-72 overflow-y-auto rounded-lg bg-[var(--sd-panel)] p-3 text-small leading-relaxed text-[var(--sd-text)]" aria-live="polite">
              <TutorText text={text} />
            </div>
          )}
          {error && <p role="alert" className="text-small text-[var(--sd-danger)]">{error}</p>}
          {loading ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--sd-border)] bg-[var(--sd-panel)] px-3 text-small font-bold text-[var(--sd-text)]"
            >
              <Square size={14} aria-hidden="true" /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => ask(slideExplainRequest(slide, lessonTitle))}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--sd-accent-line)] bg-[var(--sd-accent-soft)] px-3 text-small font-bold text-[var(--sd-text)] hover:border-[var(--sd-accent)]"
            >
              <Sparkles size={15} aria-hidden="true" />
              {text ? 'Explain it again' : 'Explain this slide'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
