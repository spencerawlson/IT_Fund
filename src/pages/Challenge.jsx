import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useBgTint } from '@/components/academy/LiquidBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, Timer, Play, RotateCcw, CheckCircle2, XCircle, Trophy, Terminal, Calculator, Shield, Zap } from 'lucide-react';
import { CHALLENGES, TYPE_META } from '@/data/challenges';

const CHALLENGE_TIME = 45;
const CATEGORIES = ['All', 'CLI Fix', 'Subnetting', 'Firewall'];
const TYPE_KEY = { 'CLI Fix': 'cli', Subnetting: 'subnet', Firewall: 'firewall' };
const ICONS = { Terminal, Calculator, Shield };

function normalize(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^["']|["']$/g, '');
}

export default function Challenge() {
  useBgTint('#F43F5E');
  const [phase, setPhase] = useState('intro');
  const [category, setCategory] = useState('All');
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_TIME);
  const [results, setResults] = useState([]);

  const current = queue[idx];

  const start = () => {
    let pool = category === 'All' ? CHALLENGES : CHALLENGES.filter((c) => c.type === TYPE_KEY[category]);
    pool = [...pool].sort(() => Math.random() - 0.5);
    setQueue(pool);
    setIdx(0);
    setResults([]);
    setInput('');
    setSelected(null);
    setAnswered(false);
    setWasCorrect(false);
    setTimedOut(false);
    setTimeLeft(CHALLENGE_TIME);
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    if (timeLeft <= 0) {
      lockAnswer(false, true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answered, timeLeft]);

  function lockAnswer(correct, timeout = false) {
    const points = correct ? 100 + timeLeft * 2 : 0;
    setWasCorrect(correct);
    setTimedOut(timeout);
    setResults((r) => [...r, { id: current.id, correct, points, timeout }]);
    setAnswered(true);
  }

  const submit = () => {
    if (answered) return;
    let correct = false;
    if (current.type === 'cli') {
      const norm = normalize(input);
      correct = current.accepts.map(normalize).includes(norm);
    } else {
      correct = selected === current.correct;
    }
    lockAnswer(correct, false);
  };

  const next = () => {
    if (idx + 1 >= queue.length) {
      setPhase('done');
      return;
    }
    setIdx((i) => i + 1);
    setInput('');
    setSelected(null);
    setAnswered(false);
    setWasCorrect(false);
    setTimedOut(false);
    setTimeLeft(CHALLENGE_TIME);
  };

  const totalScore = results.reduce((s, r) => s + r.points, 0);
  const correctCount = results.filter((r) => r.correct).length;
  const timePct = (timeLeft / CHALLENGE_TIME) * 100;

  const meta = current ? TYPE_META[current.type] : null;
  const TypeIcon = meta ? ICONS[meta.icon] : Terminal;

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="relative mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={15} /> Study Hub
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-400">
            <Zap size={16} /> Challenge Mode
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Configure &{' '}
            <span className="bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">Fix Under Time</span>
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-400">
            Race the clock to type the right command, pick the correct subnet mask, or build the right firewall rules.
            Correct answers earn points — plus a bonus for every second left on the timer.
          </p>
        </header>

        {/* INTRO */}
        {phase === 'intro' && (
          <div className="rounded-2xl glass p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Choose a track</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((cat) => {
                const key = TYPE_KEY[cat];
                const count = cat === 'All' ? CHALLENGES.length : CHALLENGES.filter((c) => c.type === key).length;
                const Icon = cat === 'All' ? Zap : ICONS[TYPE_META[key].icon];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      category === cat ? 'border-rose-500/50 bg-rose-500/10' : 'border-white/10 bg-white/[0.06] hover:bg-white/[0.12]'
                    }`}
                  >
                    <Icon size={18} className={category === cat ? 'text-rose-400' : 'text-slate-400'} />
                    <div>
                      <p className="text-sm font-bold text-white">{cat}</p>
                      <p className="text-[11px] text-slate-400">{count} challenges · 45s each</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-xs text-slate-400">
              <p>• CLI Fix: type the exact command (case-insensitive, quotes ignored).</p>
              <p>• Subnetting &amp; Firewall: pick the correct option.</p>
              <p>• Score = 100 + 2 × seconds remaining. Timeout = 0 points.</p>
            </div>
            <button
              onClick={start}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:opacity-90"
            >
              <Play size={16} /> Start Challenge
            </button>
          </div>
        )}

        {/* PLAYING */}
        {phase === 'playing' && current && (
          <div>
            {/* status bar */}
            <div className="mb-4 flex items-center justify-between text-xs">
              <span className="text-slate-400">Challenge {idx + 1} / {queue.length}</span>
              <span className="font-semibold text-amber-300">Score: {totalScore}</span>
            </div>
            <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${timeLeft <= 10 ? 'bg-rose-500' : 'bg-amber-400'}`}
                style={{ width: `${timePct}%` }}
              />
            </div>

            {/* challenge card */}
            <div className="rounded-2xl glass p-6">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  <TypeIcon size={12} /> {meta.label}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${timeLeft <= 10 ? 'text-rose-400' : 'text-slate-400'}`}>
                  <Timer size={12} /> {timeLeft}s
                </span>
              </div>

              <p className="mt-4 text-base font-bold leading-relaxed text-white">{current.prompt}</p>
              {current.context && (
                <p className="mt-2 font-mono text-xs text-slate-400">{current.context}</p>
              )}

              {/* input */}
              {!answered && current.type === 'cli' && (
                <form
                  onSubmit={(e) => { e.preventDefault(); submit(); }}
                  className="mt-4"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="Type the command…"
                    className="w-full rounded-lg border border-white/10 bg-black/55 backdrop-blur-xl px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-rose-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-40"
                  >
                    Submit
                  </button>
                </form>
              )}

              {!answered && current.type !== 'cli' && (
                <div className="mt-4 grid gap-2">
                  {current.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        selected === i ? 'border-rose-500/60 bg-rose-500/10 text-white' : 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    onClick={submit}
                    disabled={selected === null}
                    className="mt-1 inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-40"
                  >
                    Submit
                  </button>
                </div>
              )}

              {/* feedback */}
              {answered && (
                <div className="mt-4">
                  <div className={`flex items-center gap-2 rounded-lg border p-3 ${wasCorrect ? 'border-green-500/30 bg-green-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                    {wasCorrect ? <CheckCircle2 size={18} className="text-green-400" /> : <XCircle size={18} className="text-rose-400" />}
                    <div>
                      <p className={`text-sm font-bold ${wasCorrect ? 'text-green-300' : 'text-rose-300'}`}>
                        {wasCorrect ? 'Correct!' : timedOut ? 'Time’s up!' : 'Not quite.'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {wasCorrect ? `+${100 + (timeLeft * 2)} points (${timeLeft}s bonus)` : 'No points awarded.'}
                      </p>
                    </div>
                  </div>

                  {/* reveal correct for mc */}
                  {current.type !== 'cli' && !wasCorrect && (
                    <p className="mt-3 text-xs text-slate-400">
                      Correct answer: <span className="font-semibold text-green-300">{current.options[current.correct]}</span>
                    </p>
                  )}
                  {current.type === 'cli' && !wasCorrect && (
                    <p className="mt-3 text-xs text-slate-400">
                      Accepted: <span className="font-mono font-semibold text-green-300">{current.accepts[0]}</span>
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{current.explanation}</p>

                  <button
                    onClick={next}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    {idx + 1 >= queue.length ? 'See results' : 'Next challenge'} →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div className="rounded-2xl glass p-6 text-center">
            <Trophy size={32} className="mx-auto text-amber-400" />
            <h2 className="mt-3 text-2xl font-bold text-white">{totalScore} pts</h2>
            <p className="mt-1 text-sm text-slate-400">
              {correctCount} / {queue.length} correct
            </p>
            <div className="mt-5 space-y-1.5 text-left">
              {results.map((r, i) => {
                const ch = CHALLENGES.find((c) => c.id === r.id);
                return (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs">
                    {r.correct ? <CheckCircle2 size={14} className="text-green-400" /> : <XCircle size={14} className="text-rose-400" />}
                    <span className="flex-1 truncate text-slate-300">{ch.prompt}</span>
                    <span className="font-semibold text-slate-400">{r.points}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={start}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:opacity-90"
              >
                <RotateCcw size={16} /> Play again
              </button>
              <button
                onClick={() => setPhase('intro')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
              >
                Change track
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}