import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Square } from 'lucide-react';
import { streamTutor } from '@/api/tutor';
import { useTutorEnabled, TutorText, Thinking } from './TutorAssist';

// The backend accepts at most 8 turns; keep the most recent ones.
const MAX_TURNS = 8;

const STARTERS = {
  default: ['How should I study for Security+?', 'Explain subnetting like I’m new', 'IDS vs IPS: what’s the difference?'],
  python: ['When should I use a dict vs a list?', 'Explain decorators simply', 'How do I start automating tasks?'],
  network: ['How do I subnet quickly in my head?', 'Explain VLANs with an analogy', 'What’s the OSI model really for?'],
  security: ['What’s the easiest way to remember control types?', 'Explain PKI simply', 'How do I calculate ALE?'],
  cyber: ['What does a SOC analyst do all day?', 'Explain the MITRE ATT&CK matrix', 'How do I start with TryHackMe?'],
  cloud: ['Explain the shared responsibility model', 'Security groups vs NACLs?', 'What should I learn first in AWS?'],
  ai: ['What is RAG, simply?', 'How does prompt injection work?', 'How do I evaluate an LLM app?'],
  cissp: ['How do I "think like a manager"?', 'Which CISSP domain is hardest?', 'Explain due care vs due diligence'],
};

/**
 * Glass chat panel for the AI tutor. Opened from the app navigation (see AppShell), so it never
 * floats over page content. Renders nothing when the tutor is off or the panel is closed.
 */
export default function TutorChat({ trackId, trackTitle, open, onOpenChange, color = '#F59E0B' }) {
  const enabled = useTutorEnabled();
  const setOpen = onOpenChange;
  const [turns, setTurns] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, streaming]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!enabled) return null;

  const send = async (content) => {
    const text = content.trim().slice(0, 1500);
    if (!text || streaming) return;
    const history = [...turns, { role: 'user', content: text }];
    setTurns([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setError('');
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamTutor(
        { mode: 'chat', track: trackTitle, messages: history.slice(-MAX_TURNS) },
        {
          signal: controller.signal,
          onToken: (_t, sofar) => setTurns((ts) => [...ts.slice(0, -1), { role: 'assistant', content: sofar }]),
        }
      );
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message);
        setTurns((ts) => (ts[ts.length - 1]?.content ? ts : ts.slice(0, -1)));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const starters = STARTERS[trackId] || STARTERS.default;

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="AI tutor chat"
          className="glass-3 animate-rise fixed inset-x-3 bottom-3 z-50 flex max-h-[78dvh] flex-col rounded-card sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px]"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-1">
              <Sparkles size={16} className="text-amber-300" /> AI tutor
              {trackTitle && <span className="font-medium text-ink-2">· {trackTitle}</span>}
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close tutor" className="rounded-full p-1.5 text-ink-2 transition hover:bg-white/10 hover:text-ink-1">
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
            {turns.length === 0 && (
              <div>
                <p className="text-ink-2">Ask anything about what you’re studying. Try:</p>
                <div className="mt-3 flex flex-col gap-2">
                  {starters.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-control border border-white/15 bg-white/5 px-3.5 py-2.5 text-left text-sm text-ink-1 transition hover:bg-white/10">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) =>
              t.role === 'user' ? (
                <div key={i} className="ml-8 rounded-control rounded-br-md border border-white/15 px-3.5 py-2.5 text-ink-1" style={{ background: `${color}33` }}>
                  {t.content}
                </div>
              ) : (
                <div key={i} className="mr-4 rounded-control rounded-bl-md border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-ink-1">
                  {t.content ? <TutorText text={t.content} /> : <Thinking />}
                </div>
              )
            )}
            {error && <p className="text-danger">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1500}
              placeholder="Ask a question…"
              aria-label="Ask the tutor a question"
              className="min-w-0 flex-1 rounded-control border border-white/15 bg-black/30 px-3.5 py-3 text-base text-ink-1 outline-none placeholder:text-ink-2 focus:border-white/40 sm:text-sm"
            />
            {streaming ? (
              <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop" className="glass-btn rounded-control p-3" style={{ '--tint': '#64748B' }}>
                <Square size={16} className="fill-current" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} aria-label="Send" className="glass-btn rounded-control p-3" style={{ '--tint': color }}>
                <Send size={16} />
              </button>
            )}
          </form>
          <p className="px-4 pb-3 text-caption text-ink-3">AI can make mistakes. Check important facts against the official exam objectives.</p>
        </div>
      )}
    </>
  );
}
