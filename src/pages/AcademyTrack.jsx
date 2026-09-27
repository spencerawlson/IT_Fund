import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Layers, HelpCircle, Swords, ExternalLink, Check, Play, Star } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useBgTint } from '@/components/academy/LiquidBackground';
import PlayerHud from '@/components/academy/PlayerHud';
import ProgressRing from '@/components/ProgressRing';
import { iconFor } from '@/components/academy/icons';
import { getTrack, trackResources, CISSP_DOMAINS } from '@/data/academy';
import { useAcademy, mastery, dueCards, isTierUnlocked, bossKey, BOSS_PASS_PCT, TIER_UNLOCK_MASTERY } from '@/lib/academy';
import { nextLessonInTrack } from '@/lib/academyPath';

// Horizontal offsets (in node widths) that make the path wind like a river.
const WIND = [0, 0.9, 1.3, 0.9, 0, -0.9, -1.3, -0.9];

export default function AcademyTrack() {
  const { trackId } = useParams();
  const track = getTrack(trackId);
  const state = useAcademy();
  const [open, setOpen] = useState(null);
  useBgTint(track?.color);

  if (!track) {
    return (
      <div className="relative isolate flex min-h-screen items-center justify-center text-slate-300">
        <Link to="/academy" className="glass rounded-2xl px-5 py-3 hover:text-white">← Track not found. Back to Academy</Link>
      </div>
    );
  }

  const Icon = iconFor(track.icon);
  const allTrackCards = track.tiers.flatMap((t) => t.decks.flatMap((d) => d.cards));
  const next = nextLessonInTrack(state, track);
  let nodeIndex = 0;

  return (
    <div className="relative isolate min-h-screen text-white">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
        <Link to="/academy" className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white">
          <ArrowLeft size={15} /> Academy
        </Link>

        <header className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20" style={{ background: `${track.color}33`, color: track.color }}>
              <Icon size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold sm:text-3xl">{track.title}</h1>
              <p className="mt-0.5 text-sm text-slate-300">{track.tagline}</p>
            </div>
            <div className="hidden sm:block">
              <ProgressRing percent={mastery(state, allTrackCards)} size={64} stroke={6} color={track.color} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <PlayerHud compact />
            {next && (
              <Link to={`/academy/${track.id}/lesson/${next.id}`} className="glass-btn inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold" style={{ '--tint': track.color }}>
                <Play size={15} className="fill-current" /> Continue: {next.title}
              </Link>
            )}
          </div>
        </header>

        {track.tiers.map((tier, ti) => {
          const unlocked = isTierUnlocked(state, track, ti);
          const tierCards = tier.decks.flatMap((d) => d.cards);
          const bestBoss = state.bosses[bossKey(track.id, tier.id)] || 0;
          const beaten = bestBoss >= BOSS_PASS_PCT;
          const bossWind = WIND[nodeIndex % WIND.length];
          return (
            <section key={tier.id} className="mt-10">
              <div className="glass mx-auto flex max-w-md items-center justify-between rounded-full px-5 py-2.5">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.color, boxShadow: `0 0 10px ${tier.color}` }} />
                  Tier {ti + 1} · {tier.label}
                  {!unlocked && <Lock size={14} className="text-slate-400" />}
                </span>
                <span className="text-sm font-bold" style={{ color: tier.color }}>{mastery(state, tierCards)}%</span>
              </div>
              {!unlocked && (
                <p className="mx-auto mt-3 max-w-md text-center text-xs text-slate-400">
                  Reach {TIER_UNLOCK_MASTERY}% mastery in {track.tiers[ti - 1].label}, or beat its boss to skip ahead.
                </p>
              )}

              <div className="mt-10 flex flex-col items-center gap-10">
                {tier.decks.map((deck) => {
                  const wind = WIND[nodeIndex++ % WIND.length];
                  const done = !!state.lessons?.[deck.id];
                  const current = next?.id === deck.id;
                  const isOpen = open === deck.id;
                  return (
                    <div key={deck.id} className="flex w-full flex-col items-center">
                      <div className="relative" style={{ transform: `translateX(calc(${wind} * min(18vw, 88px)))` }}>
                        {current && !isOpen && (
                          <span className="glass absolute -top-9 left-1/2 -translate-x-1/2 animate-bounce whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: track.color }}>
                            Start
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={!unlocked}
                          onClick={() => setOpen(isOpen ? null : deck.id)}
                          aria-label={`${deck.title}${done ? ' (completed)' : ''}`}
                          aria-expanded={isOpen}
                          className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 transition active:scale-95 disabled:cursor-not-allowed ${current ? 'ring-4 ring-offset-0' : ''}`}
                          style={
                            done
                              ? { background: `radial-gradient(circle at 30% 25%, #ffffff66, ${track.color} 55%)`, borderColor: 'rgba(255,255,255,0.45)', boxShadow: `0 10px 30px -8px ${track.color}` }
                              : unlocked
                                ? { background: 'rgba(255,255,255,0.08)', borderColor: current ? track.color : 'rgba(255,255,255,0.25)', backdropFilter: 'blur(16px)', '--tw-ring-color': `${track.color}44` }
                                : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }
                          }
                        >
                          {done ? <Check size={30} strokeWidth={3} /> : unlocked ? <Star size={26} style={{ color: current ? track.color : '#cbd5e1' }} /> : <Lock size={22} className="text-slate-600" />}
                        </button>
                      </div>
                      <p className={`mt-2 max-w-[220px] text-center text-xs font-semibold ${unlocked ? 'text-slate-200' : 'text-slate-600'}`} style={{ transform: `translateX(calc(${wind} * min(18vw, 88px)))` }}>
                        {deck.title}
                      </p>
                      {isOpen && <DeckPanel deck={deck} track={track} state={state} done={done} />}
                    </div>
                  );
                })}

                {unlocked && (
                  <Link
                    to={`/academy/${track.id}/boss/${tier.id}`}
                    className="flex flex-col items-center"
                    style={{ transform: `translateX(calc(${bossWind} * min(18vw, 88px)))` }}
                  >
                    <span
                      className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 transition active:scale-95"
                      style={
                        beaten
                          ? { background: 'radial-gradient(circle at 30% 25%, #ffffff66, #10B981 60%)', borderColor: 'rgba(255,255,255,0.4)' }
                          : { background: 'radial-gradient(circle at 30% 25%, #ffffff44, #E11D48 60%)', borderColor: 'rgba(255,255,255,0.35)', boxShadow: '0 12px 34px -8px #E11D48' }
                      }
                    >
                      <Swords size={32} />
                    </span>
                    <span className="mt-2 text-xs font-bold text-white">{tier.label} Boss</span>
                    <span className="text-[11px] text-slate-400">{bestBoss ? `Best ${bestBoss}%${beaten ? ' ✓' : ''}` : `${BOSS_PASS_PCT}% to win`}</span>
                  </Link>
                )}
              </div>
            </section>
          );
        })}

        <section className="glass mt-14 rounded-3xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Free resources for this track</h2>
          <p className="mt-1 text-xs text-slate-400">The lessons summarise these sources. Go deeper with the originals.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {trackResources(track).map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 transition hover:border-white/30 hover:bg-white/[0.08]">
                  {r.title} <ExternalLink size={13} className="shrink-0 text-slate-400" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function DeckPanel({ deck, track, state, done }) {
  const pct = mastery(state, deck.cards);
  const due = dueCards(state, deck.cards).length;
  const best = state.lessons?.[deck.id]?.best;
  return (
    <div className="glass-strong animate-pop mt-4 w-full max-w-sm rounded-3xl p-5">
      <h3 className="text-base font-bold text-white">{deck.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{deck.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(deck.cissp || []).map((d) => {
          const dom = CISSP_DOMAINS.find((x) => x.id === d);
          return (
            <span key={d} title={dom.title} className="rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ color: dom.color, borderColor: `${dom.color}66`, background: `${dom.color}1a` }}>
              CISSP D{d}
            </span>
          );
        })}
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{deck.cards.length} questions</span>
        {deck.puzzles.length > 0 && <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{deck.puzzles.length} puzzles</span>}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: track.color }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {pct}% mastered{due ? ` · ${due} due` : ''}{best !== undefined ? ` · best lesson ${best}%` : ''}
      </p>
      <Link to={`/academy/${track.id}/lesson/${deck.id}`} className="glass-btn mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold" style={{ '--tint': track.color }}>
        <Play size={15} className="fill-current" /> {done ? 'Replay lesson' : 'Start lesson'}
      </Link>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link to={`/academy/${track.id}/deck/${deck.id}?mode=learn`} className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10">
          <Layers size={14} /> Flashcards
        </Link>
        <Link to={`/academy/${track.id}/deck/${deck.id}?mode=quiz`} className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10">
          <HelpCircle size={14} /> Quiz
        </Link>
      </div>
    </div>
  );
}
