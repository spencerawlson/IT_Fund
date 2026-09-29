import React, { useState, useEffect, useRef } from 'react';
import { Check, RotateCcw, X, Volume2, Mic } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

export default function FlashcardSession({ module, onComplete }) {
  const useSpeak = typeof window !== 'undefined' && !!window.speechSynthesis;
  const useListen =
    typeof window !== 'undefined' &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  const [cards, setCards] = useState(() => {
    const conceptCards = (module.concepts || []).map((c) => ({ id: c.id, type: 'concept', front: c.term, back: c.summary, category: c.category || module.category }));
    const sessionCards = (module.sessions || []).map((s) => ({ id: s.id, type: 'session', front: s.q, back: s.a, category: module.category, opts: s.opts }));
    return [...conceptCards, ...sessionCards];
  });

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState('');
  const recognitionRef = useRef(null);

  const current = cards[index];

  const clean = (text) => (text || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

  const speak = (text) => {
    if (!useSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (!useListen) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript.trim().toLowerCase();
      setVoiceResult(result);
      if (!current) return;
      const answer = clean(current.back);
      const optsMatch = (current.opts || []).some((o) => result.includes(clean(o)));
      if (optsMatch || result.includes(answer.slice(0, 12))) {
        handleAnswer(true);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, [ current]);

  const toggleListen = () => {
    if (listening) {
      try { recognitionRef.current && recognitionRef.current.stop(); } catch {}
      setListening(false);
      return;
    }
    setVoiceResult('');
    try {
      recognitionRef.current && recognitionRef.current.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const handleAnswer = (known) => {
    const next = [...results, { id: current.id, known }];
    setResults(next);
    if (index + 1 < cards.length) {
      setIndex((i) => i + 1);
      setFlipped(false);
      setVoiceResult('');
    } else {
      setDone(true);
      const knownCount = next.filter((r) => r.known).length;
      onComplete(knownCount, cards.length);
    }
  };

  const restart = () => {
    setIndex(0);
    setFlipped(false);
    setResults([]);
    setDone(false);
    setVoiceResult('');
  };

  useEffect(() => {
    return () => { if (useSpeak) window.speechSynthesis && window.speechSynthesis.cancel(); };
  }, [useSpeak]);

  if (done) {
    const known = results.filter((r) => r.known).length;
    const pct = cards.length ? Math.round((known / cards.length) * 100) : 0;
    return (
      <div className="mx-auto max-w-md rounded-control glass-1 p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/15 text-3xl font-bold text-blue-400">
          {pct}%
        </div>
        <h3 className="mt-4 text-xl font-bold text-ink-1">Session Complete</h3>
        <p className="mt-1 text-ink-2">
          You marked <span className="font-semibold text-ink-1">{known}</span> of {cards.length} cards as known.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-ink-1 transition hover:bg-white/15"
          >
            <RotateCcw size={15} /> Run Again
          </button>
          {useSpeak && (
            <button
              onClick={() => speak(`You scored ${pct} percent, ${known} out of ${cards.length}`)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-ink-1 transition hover:bg-white/[0.12]"
            >
              <Volume2 size={15} /> {speaking ? 'Speaking…' : 'Read Result'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!current) {
    return <div className="text-center text-sm text-ink-2">No cards found.</div>;
  }

  const hasOptions = current.type === 'session' && (current.opts || []).length;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between text-sm text-ink-2">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span className="text-blue-400">{results.filter((r) => r.known).length} known</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-action transition-all"
          style={{ width: `${((index) / cards.length) * 100}%` }}
        />
      </div>

      <div
        className="flip-card h-72 cursor-pointer"
        onClick={() => setFlipped((f) => !f)}
      >
        <div className={`flip-inner relative h-full w-full ${flipped ? 'flipped' : ''}`}>
          <div className="flip-front absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-control glass-1 p-6 text-center">
            <CategoryBadge category={current.category} />
            <h3 className="text-2xl font-bold text-ink-1">{current.front}</h3>
            <p className="text-caption text-ink-2">Tap to reveal {voiceResult ? `· voice: ${voiceResult}` : ''}</p>
          </div>
          <div className="flip-back absolute inset-0 flex flex-col gap-3 overflow-y-auto rounded-control border border-blue-500/30 bg-gradient-to-br from-blue-500/[0.08] to-teal-500/[0.05] p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-blue-300">{current.front}</h3>
              {useSpeak && (
                <button
                  onClick={(e) => { e.stopPropagation(); speak(current.back); }}
                  className={`inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.08] px-2 py-1 text-caption text-ink-2 transition hover:bg-white/[0.12] ${speaking ? 'animate-pulse text-blue-300' : ''}`}
                >
                  <Volume2 size={14} /> {speaking ? 'Playing' : 'Read'}
                </button>
              )}
            </div>
            {hasOptions ? (
              <div className="space-y-2">
                <p className="text-caption text-ink-2">Answer options:</p>
                <ul className="space-y-1 text-sm text-ink-2">
                  {current.opts.map((o, i) => (
                    <li key={i} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2">{o}</li>
                  ))}
                </ul>
                <p className="text-caption text-ink-2">Answer: <span className="font-semibold text-blue-300">{current.back}</span></p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-ink-2">{current.back}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={() => handleAnswer(false)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-ink-2 transition hover:bg-white/[0.12]"
        >
          <X size={16} /> Review Again
        </button>
        {useListen && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleListen(); }}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${listening ? 'border-rose-500/50 bg-rose-500/15 text-danger' : 'border-white/10 bg-white/[0.06] text-ink-2 hover:bg-white/[0.12]'}`}
          >
            <Mic size={16} /> {listening ? 'Listening…' : 'Speak Answer'}
          </button>
        )}
        <button
          onClick={() => handleAnswer(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-ink-1 transition hover:bg-blue-600"
        >
          <Check size={16} /> Got It
        </button>
      </div>
      <p className="mt-3 text-center text-caption text-ink-2">Flip the card first, then mark your confidence.</p>
    </div>
  );
}
