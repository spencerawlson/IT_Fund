import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Layers, HelpCircle, Swords, ExternalLink, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';
import PlayerHud from '@/components/academy/PlayerHud';
import ProgressRing from '@/components/ProgressRing';
import { iconFor } from '@/components/academy/icons';
import { getTrack, trackResources, CISSP_DOMAINS } from '@/data/academy';
import { useAcademy, mastery, dueCards, isTierUnlocked, bossKey, BOSS_PASS_PCT, TIER_UNLOCK_MASTERY } from '@/lib/academy';

export default function AcademyTrack() {
  const { trackId } = useParams();
  const track = getTrack(trackId);
  const state = useAcademy();

  if (!track) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D1117] text-slate-400">
        <Link to="/academy" className="text-blue-400 hover:underline">← Track not found. Back to Academy</Link>
      </div>
    );
  }

  const Icon = iconFor(track.icon);
  const allTrackCards = track.tiers.flatMap((t) => t.decks.flatMap((d) => d.cards));

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <Navbar />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full opacity-10 blur-[120px]" style={{ backgroundColor: track.color }} />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/academy" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={15} /> Academy
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10" style={{ backgroundColor: `${track.color}1a`, color: track.color }}>
              <Icon size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{track.title}</h1>
              <p className="mt-1 text-sm text-slate-400">{track.tagline}</p>
            </div>
          </div>
          <ProgressRing percent={mastery(state, allTrackCards)} size={64} stroke={6} color={track.color} />
        </div>

        <div className="mt-6">
          <PlayerHud compact />
        </div>

        <div className="mt-8 space-y-10">
          {track.tiers.map((tier, ti) => {
            const unlocked = isTierUnlocked(state, track, ti);
            const tierCards = tier.decks.flatMap((d) => d.cards);
            const bestBoss = state.bosses[bossKey(track.id, tier.id)] || 0;
            const beaten = bestBoss >= BOSS_PASS_PCT;
            return (
              <section key={tier.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                    Tier {ti + 1}: {tier.label}
                    {!unlocked && <Lock size={15} className="text-slate-500" />}
                  </h2>
                  <span className="text-sm font-semibold" style={{ color: tier.color }}>{mastery(state, tierCards)}%</span>
                </div>

                {!unlocked && (
                  <p className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">
                    Locked. Reach {TIER_UNLOCK_MASTERY}% mastery in {track.tiers[ti - 1].label}, or beat its boss to skip ahead.
                  </p>
                )}

                <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${unlocked ? '' : 'pointer-events-none select-none opacity-40'}`}>
                  {tier.decks.map((deck) => {
                    const pct = mastery(state, deck.cards);
                    const due = dueCards(state, deck.cards).length;
                    return (
                      <div key={deck.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold leading-snug text-white">{deck.title}</h3>
                          {state.mastered?.[deck.id] && <Trophy size={15} className="shrink-0 text-amber-300" />}
                        </div>
                        <p className="mt-1 flex-1 text-[12px] leading-relaxed text-slate-400">{deck.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(deck.cissp || []).map((d) => {
                            const dom = CISSP_DOMAINS.find((x) => x.id === d);
                            return (
                              <span key={d} title={dom.title} className="rounded-full border px-1.5 py-0.5 text-[9px] font-bold" style={{ color: dom.color, borderColor: `${dom.color}55`, background: `${dom.color}14` }}>
                                CISSP D{d}
                              </span>
                            );
                          })}
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: track.color }} />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {pct}% · {deck.cards.length} cards{due ? ` · ${due} due` : ''}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Link to={`/academy/${track.id}/deck/${deck.id}?mode=learn`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-white transition hover:bg-white/[0.09]">
                            <Layers size={13} /> Learn
                          </Link>
                          <Link to={`/academy/${track.id}/deck/${deck.id}?mode=quiz`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-white transition hover:bg-white/[0.09]">
                            <HelpCircle size={13} /> Quiz
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {unlocked && (
                  <Link
                    to={`/academy/${track.id}/boss/${tier.id}`}
                    className={`mt-3 flex items-center justify-between rounded-2xl border p-4 transition hover:opacity-90 ${beaten ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-rose-500/30 bg-gradient-to-r from-rose-500/[0.10] to-amber-500/[0.06]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Swords size={22} className={beaten ? 'text-emerald-400' : 'text-rose-400'} />
                      <div>
                        <p className="text-sm font-bold text-white">{tier.label} Boss Battle</p>
                        <p className="text-[12px] text-slate-400">
                          15 mixed questions, 3 hearts, {BOSS_PASS_PCT}% to win.{' '}
                          {bestBoss ? `Best: ${bestBoss}%${beaten ? ' (defeated)' : ''}` : 'Not yet attempted.'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-white">{beaten ? 'Rematch' : 'Fight'} →</span>
                  </Link>
                )}
              </section>
            );
          })}
        </div>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Free resources for this track</h2>
          <p className="mt-1 text-[12px] text-slate-500">The decks summarise these sources. Go deeper with the originals.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {trackResources(track).map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:text-white">
                  {r.title} <ExternalLink size={13} className="shrink-0 text-slate-500" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
