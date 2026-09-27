import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Map, Award, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { tracks, ROADMAP, CISSP_DOMAINS, decksForDomain, RESOURCES } from '@/data/academy';
import { useAcademy, mastery, grantBadge } from '@/lib/academy';

const READY_PCT = 80;

/** Half from the CISSP capstone deck for the domain, half from every other deck that feeds it. */
function domainReadiness(state, domainId) {
  const decks = decksForDomain(domainId);
  const capstone = decks.filter((d) => d.trackId === 'cissp' && d.id === `cissp-d${domainId}`);
  const support = decks.filter((d) => !capstone.includes(d));
  const cap = mastery(state, capstone.flatMap((d) => d.cards));
  const sup = mastery(state, support.flatMap((d) => d.cards));
  return { pct: Math.round(cap * 0.5 + sup * 0.5), decks: support, capstone: capstone[0] };
}

const tierCards = (trackId, tierId) =>
  tracks.find((t) => t.id === trackId).tiers.find((t) => t.id === tierId).decks.flatMap((d) => d.cards);

export default function CisspRoadmap() {
  const state = useAcademy();
  const domains = CISSP_DOMAINS.map((d) => ({ ...d, ...domainReadiness(state, d.id) }));
  const weighted = Math.round(domains.reduce((s, d) => s + d.pct * d.weight, 0) / 100);
  const allReady = domains.every((d) => d.pct >= READY_PCT);

  useEffect(() => {
    if (allReady) grantBadge('cissp-ready');
  }, [allReady]);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <Navbar />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute -right-40 top-80 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/academy" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={15} /> Academy
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Map size={16} /> Best-of roadmap
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Zero to{' '}
            <span className="bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent">CISSP</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-400">
            Seven steps that follow the path most successful candidates take: technical foundations first, then the CompTIA core,
            hands-on defence, cloud, and AI, and finally the managerial view the CISSP tests. Every deck is tagged with the CISSP
            domains it builds toward, so early study counts toward your final readiness.
          </p>
        </header>

        {/* Steps */}
        <div className="relative">
          <div className="absolute bottom-2 left-[18px] top-2 w-px bg-white/10" />
          <div className="space-y-5">
            {ROADMAP.map((step) => {
              const pct = mastery(state, step.tiers.flatMap(([t, tier]) => tierCards(t, tier)));
              return (
                <div key={step.step} className="relative pl-12">
                  <div className={`absolute left-0 top-1.5 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold ${pct >= READY_PCT ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-white/15 bg-[#0D1117] text-amber-300'}`}>
                    {step.step}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-white">{step.title}</h2>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{step.desc}</p>
                      </div>
                      <p className="shrink-0 text-lg font-bold text-amber-300">{pct}%</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
                      <span className="inline-flex items-center gap-1.5 text-slate-300"><Award size={13} className="text-amber-300" /> {step.milestone}</span>
                      <span className="inline-flex items-center gap-1.5 text-slate-500"><Clock size={13} /> ~{step.months} months</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {step.tiers.map(([t, tier]) => {
                        const track = tracks.find((x) => x.id === t);
                        const tierMeta = track.tiers.find((x) => x.id === tier);
                        return (
                          <Link key={`${t}-${tier}`} to={`/academy/${t}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs transition hover:border-white/25 hover:bg-white/[0.07]">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: track.color }} />
                            <span className="font-semibold text-white">{track.title}</span>
                            <span className="text-slate-400">{tierMeta.label}</span>
                            <span className="text-slate-500">· {mastery(state, tierCards(t, tier))}%</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Domain readiness */}
        <section className="mt-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={18} className="text-amber-300" /> CISSP domain readiness</h2>
              <p className="mt-1 text-[13px] text-slate-400">
                Half from each domain's capstone deck, half from every earlier deck tagged with it. Reach {READY_PCT}% in all eight to earn CISSP-Ready.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Exam-weighted</p>
              <p className="text-2xl font-bold text-amber-300">{weighted}%</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {domains.map((d) => (
              <div key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: d.color }}>Domain {d.id} · {d.weight}% of exam</p>
                    <h3 className="mt-0.5 text-sm font-bold text-white">{d.title}</h3>
                  </div>
                  <span className="text-lg font-bold" style={{ color: d.color }}>{d.pct}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {d.capstone && (
                    <Link to={`/academy/cissp/deck/${d.capstone.id}?mode=learn`} className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20">
                      Capstone deck
                    </Link>
                  )}
                  {d.decks.map((deck) => (
                    <Link key={deck.id} to={`/academy/${deck.trackId}/deck/${deck.id}?mode=learn`} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:border-white/25 hover:text-white">
                      {deck.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-[13px] leading-relaxed text-slate-400">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Exam facts (ISC2 outline effective 15 April 2024)</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>English exam is CAT (adaptive): 100-150 items, 3 hours, 700/1000 to pass.</li>
            <li>Full certification needs 5 years of paid work in 2 or more of the 8 domains. A degree or approved cert waives 1 year.</li>
            <li>Pass without the experience and you become an Associate of ISC2 with 6 years to earn it.</li>
            <li>Start with ISC2 Certified in Cybersecurity (CC): its official training and first exam attempt are free.</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {['cissp-outline', 'isc2-cc', 'isc2-ethics'].map((id) => (
              <a key={id} href={RESOURCES[id].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:border-white/25">
                {RESOURCES[id].title} <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
