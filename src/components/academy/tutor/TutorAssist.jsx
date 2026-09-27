import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Square } from 'lucide-react';
import { fetchTutorStatus, streamTutor } from '@/api/tutor';

/** True only when the backend reports a configured tutor; any failure hides AI buttons. */
export function useTutorEnabled() {
  const { data } = useQuery({ queryKey: ['tutor-status'], queryFn: fetchTutorStatus, staleTime: 5 * 60 * 1000, retry: false });
  return data?.enabled === true;
}

/** Streams one tutor answer at a time; a new ask() cancels the previous stream. */
export function useTutor() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const ask = useCallback(async (body) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setText('');
    setError('');
    setLoading(true);
    try {
      const full = await streamTutor(body, { signal: controller.signal, onToken: (_t, sofar) => setText(sofar) });
      return full;
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'The tutor couldn’t answer.');
      return '';
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);
  return { text, loading, error, ask, stop };
}

// react-markdown escapes raw HTML (skipHtml), so model output can never inject markup.
const MD = {
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  ul: (props) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold text-white" {...props} />,
  code: (props) => <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[0.9em] text-amber-200" {...props} />,
  a: ({ children }) => <span className="underline">{children}</span>,
};

export function TutorText({ text }) {
  return (
    <ReactMarkdown skipHtml components={MD}>
      {text}
    </ReactMarkdown>
  );
}

export function Thinking() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Tutor is thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-200" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </span>
  );
}

export const pillClass =
  'inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50';

/**
 * Tutor buttons plus the streamed answer. `actions` = [{ mode, label }]; `context` is sent
 * with every request. Renders nothing when the tutor isn't available.
 */
export default function TutorAssist({ actions, context, className = '', answerClassName = '' }) {
  const enabled = useTutorEnabled();
  const { text, loading, error, ask, stop } = useTutor();
  const [active, setActive] = useState(null);

  if (!enabled) return null;

  const run = (mode) => {
    setActive(mode);
    ask({ ...context, mode });
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.mode}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              run(a.mode);
            }}
            disabled={loading && active === a.mode}
            className={`${pillClass} ${active === a.mode ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : ''}`}
          >
            <Sparkles size={15} className="text-amber-300" /> {a.label}
          </button>
        ))}
        {loading && (
          <button type="button" onClick={stop} className={pillClass} aria-label="Stop the tutor">
            <Square size={13} className="fill-current" /> Stop
          </button>
        )}
      </div>
      {active && (
        <div className={`animate-rise mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-3.5 text-sm leading-relaxed text-slate-100 ${answerClassName}`} aria-live="polite">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
            <Sparkles size={12} /> AI tutor
          </p>
          {error ? <p className="text-rose-300">{error}</p> : text ? <TutorText text={text} /> : <Thinking />}
        </div>
      )}
    </div>
  );
}
