import React from 'react';
import { Flame, Target, Star } from 'lucide-react';
import { useAcademy, levelInfo, liveStreak, xpToday, DAILY_GOAL_XP } from '@/lib/academy';
import ProgressRing from '@/components/ProgressRing';

export default function PlayerHud({ compact = false }) {
  const state = useAcademy();
  const lvl = levelInfo(state.xp);
  const streak = liveStreak(state);
  const today = xpToday(state);
  const goalPct = Math.min(100, Math.round((today / DAILY_GOAL_XP) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
          <Star size={13} /> Lv {lvl.level}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-orange-400">
          <Flame size={13} /> {streak}
        </span>
        <span className="text-slate-400">{state.xp.toLocaleString()} XP</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="glass col-span-2 rounded-2xl p-4 sm:col-span-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Level {lvl.level}</p>
        <p className="mt-0.5 text-lg font-bold text-white">{lvl.rank}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all" style={{ width: `${lvl.pct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          {lvl.into.toLocaleString()} / {lvl.needed.toLocaleString()} XP to level {lvl.level + 1} · {state.xp.toLocaleString()} total
        </p>
      </div>
      <div className="flex items-center gap-4 glass rounded-2xl p-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${streak ? 'bg-orange-500/15 text-orange-400' : 'bg-white/5 text-slate-300'}`}>
          <Flame size={28} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Streak</p>
          <p className="text-xl font-bold text-white sm:text-2xl">{streak} day{streak === 1 ? '' : 's'}</p>
          <p className="hidden text-[11px] text-slate-400 sm:block">{today > 0 ? 'Studied today. Keep it going.' : 'Study today to keep your streak.'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 glass rounded-2xl p-4">
        <ProgressRing percent={goalPct} size={48} stroke={5} color="#22C55E" />
        <div>
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            <Target size={12} /> Daily goal
          </p>
          <p className="text-xl font-bold text-white sm:text-2xl">
            {today} <span className="text-sm font-medium text-slate-300">/ {DAILY_GOAL_XP} XP</span>
          </p>
          <p className="hidden text-[11px] text-slate-400 sm:block">{goalPct >= 100 ? 'Goal complete!' : 'About one deck a day.'}</p>
        </div>
      </div>
    </div>
  );
}
