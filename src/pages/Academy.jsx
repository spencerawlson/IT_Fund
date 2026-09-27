import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Repeat, Map, ArrowRight, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import PlayerHud from '@/components/academy/PlayerHud';
import { iconFor } from '@/components/academy/icons';
import { tracks, allCards, allDecks, ROADMAP } from '@/data/academy';
import { useAcademy, mastery, dueCards, isTierUnlocked, BADGES } from '@/lib/academy';

export default function Academy() {
  const state = useAcademy();
  const due = dueCards(state, allCards).length;

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <Navbar />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute -right-40 top-60 h-96 w-96 rounded-full bg-rose-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <Gamepad2 size={16} /> Academy
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              The Road to{' '}
              <span className="bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent">CISSP</span>
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-400">
              {tracks.length} tracks, {allDecks.length} decks, {allCards.length} flashcards, built from free resources. Learn with
              spaced repetition, test yourself in quizzes, beat each tier's boss, and level up from Recruit to CISSP-Ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/academy/review"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                due ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/20 hover:opacity-90' : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              <Repeat size={15} /> Daily Review {due > 0 && <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs">{due} due</span>}
            </Link>
            <Link
              to="/academy/roadmap"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
            >
              <Map size={15} /> CISSP Roadmap
            </Link>
          </div>
        </header>

        <PlayerHud />

        {/* Roadmap strip */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Your route</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {ROADMAP.map((step) => {
              const cards = step.tiers.flatMap(([tid, tier]) => tracks.find((t) => t.id === tid).tiers.find((x) => x.id === tier).decks.flatMap((d) => d.cards));
              const pct = mastery(state, cards);
              return (
                <Link
                  key={step.step}
                  to="/academy/roadmap"
                  className="min-w-[150px] flex-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/25"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step {step.step}</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{step.title}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{pct}% mastered</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Tracks */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Tracks</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => {
              const Icon = iconFor(t.icon);
              const cards = t.tiers.flatMap((tier) => tier.decks.flatMap((d) => d.cards));
              const pct = mastery(state, cards);
              const trackDue = dueCards(state, cards).length;
              return (
                <Link
                  key={t.id}
                  to={`/academy/${t.id}`}
                  className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.color}1f`, color: t.color }}>
                      <Icon size={22} />
                    </div>
                    <span className="text-lg font-bold" style={{ color: t.color }}>{pct}%</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-white">{t.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{t.tagline}</p>
                  <div className="mt-4 flex gap-1.5">
                    {t.tiers.map((tier, i) => {
                      const unlocked = isTierUnlocked(state, t, i);
                      const tp = mastery(state, tier.decks.flatMap((d) => d.cards));
                      return (
                        <div key={tier.id} className="flex-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full" style={{ width: `${tp}%`, backgroundColor: tier.color }} />
                          </div>
                          <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500">
                            {!unlocked && <Lock size={9} />} {tier.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-300 group-hover:text-white">
                    {trackDue ? `${trackDue} cards due` : `${cards.length} cards`} <ArrowRight size={13} />
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Badges */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Badges · {state.badges.length}/{Object.keys(BADGES).length}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(BADGES).map(([id, b]) => {
              const Icon = iconFor(b.icon);
              const earned = state.badges.includes(id);
              return (
                <div
                  key={id}
                  className={`rounded-xl border p-3 ${earned ? 'border-amber-400/40 bg-amber-400/[0.06]' : 'border-white/5 bg-white/[0.015] opacity-50'}`}
                  title={b.desc}
                >
                  <Icon size={18} className={earned ? 'text-amber-300' : 'text-slate-500'} />
                  <p className="mt-1.5 text-xs font-semibold text-white">{b.title}</p>
                  <p className="text-[11px] leading-snug text-slate-400">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
