// Milestone celebrations: pure detection of "alive moments" from academy state,
// plus a hook that queues them one at a time and remembers what was shown.
//
// Fires for: level-ups, streak milestones (3/7/30/60/100), newly earned badges,
// passed practice exams (CISSP, Security+, and any per-cert exams), and first-time
// lab completions. Every celebration id is persisted in the academy store
// (see markCelebrationSeen in academy.js) so a refresh never replays one.

import { useCallback, useEffect, useRef, useState } from 'react';
import { BADGES, levelInfo, markCelebrationSeen, useAcademy } from './academy';
import { getLabProgress } from './labProgress';

export const STREAK_MILESTONES = [3, 7, 30, 60, 100];

const EXAM_LABELS = {
  cissp: 'CISSP',
  secplus: 'Security+',
  'aws-saa': 'AWS Solutions Architect',
  cysa: 'CySA+',
  'aws-security': 'AWS Security Specialty',
  'network-plus': 'Network+',
  'linux-plus': 'Linux+',
};

const prettify = (key) => (EXAM_LABELS[key] || String(key).replace(/-/g, ' '));

/**
 * Pure diff: which celebrations did `next` earn that `prev` had not?
 * Returns descriptors in show order: exam-pass, levelup, streak, badge.
 * Each descriptor: { id, kind, title, subtitle, accent }.
 */
export function detectMilestones(prev, next) {
  const out = [];
  const p = prev || {};
  const n = next || {};

  // --- passed exams -----------------------------------------------------------
  const examSlots = [
    ['cissp', p.exam, n.exam],
    ['secplus', p.secplusExam, n.secplusExam],
    ...Object.keys(n.certExams || {}).map((key) => [key, (p.certExams || {})[key], n.certExams[key]]),
  ];
  for (const [key, prevExam, nextExam] of examSlots) {
    if (nextExam?.finishedAt && !prevExam?.finishedAt && nextExam?.result?.passed) {
      const pct = nextExam.result.pct;
      out.push({
        id: `exam-pass-${key}-${nextExam.id}`,
        kind: 'exam-pass',
        title: 'You passed!',
        subtitle: `${prettify(key)} practice exam — ${pct}%`,
        accent: '#10b981',
      });
    }
  }

  // --- level-ups ---------------------------------------------------------------
  const prevLevel = levelInfo(p.xp || 0).level;
  const nextLevel = levelInfo(n.xp || 0).level;
  if (nextLevel > prevLevel) {
    const { rank } = levelInfo(n.xp || 0);
    out.push({
      id: `levelup-${nextLevel}`,
      kind: 'levelup',
      title: `Level ${nextLevel} — ${rank}!`,
      subtitle: 'Your XP just ranked you up. The grind is paying off.',
      accent: '#8b5cf6',
    });
  }

  // --- streak milestones --------------------------------------------------------
  const prevStreak = p.streak?.count || 0;
  const nextStreak = n.streak?.count || 0;
  for (const m of STREAK_MILESTONES) {
    if (nextStreak >= m && prevStreak < m) {
      out.push({
        id: `streak-${m}`,
        kind: 'streak',
        title: `${m}-day streak!`,
        subtitle: m >= 30
          ? 'A full month of showing up. That is how CISSPs are made.'
          : 'Consistency beats intensity. Keep the flame lit.',
        accent: '#f97316',
      });
    }
  }

  // --- new badges ---------------------------------------------------------------
  const prevBadges = new Set(p.badges || []);
  for (const id of n.badges || []) {
    if (!prevBadges.has(id) && BADGES[id]) {
      out.push({
        id: `badge-${id}`,
        kind: 'badge',
        title: `Badge earned: ${BADGES[id].title}`,
        subtitle: BADGES[id].desc,
        accent: '#f59e0b',
      });
    }
  }

  return out;
}

/**
 * Pure lab check: first completion of each lab earns one celebration.
 * `progressMap` is the shape from getLabProgress(); `seenIds` a Set of ids.
 */
export function detectLabMilestones(progressMap, seenIds) {
  const out = [];
  for (const [labId, entry] of Object.entries(progressMap || {})) {
    const id = `lab-complete-${labId}`;
    if ((entry?.completions || 0) >= 1 && !seenIds.has(id)) {
      out.push({
        id,
        kind: 'lab-complete',
        title: 'Lab complete!',
        subtitle: `You finished ${prettify(labId)}. Every objective validated.`,
        accent: '#3b82f6',
      });
    }
  }
  return out;
}

/**
 * Watches academy state and lab completions; returns the current celebration
 * (one at a time) plus a dismiss that advances the queue. Newly detected
 * celebrations are marked seen immediately so they can never replay —
 * not on refresh, not on remount.
 */
export function useMilestoneCelebrations() {
  const state = useAcademy();
  const prevRef = useRef(null);
  const seenRef = useRef(null);
  const [queue, setQueue] = useState([]);

  const enqueue = useCallback((items) => {
    if (!seenRef.current || !items.length) return;
    const fresh = items.filter((m) => !seenRef.current.has(m.id));
    if (!fresh.length) return;
    for (const m of fresh) {
      seenRef.current.add(m.id);
      markCelebrationSeen(m.id);
    }
    setQueue((q) => [...q, ...fresh]);
  }, []);

  useEffect(() => {
    if (!seenRef.current) seenRef.current = new Set(state.seenCelebrations || []);
    const prev = prevRef.current;
    prevRef.current = state;
    if (!prev) return; // first paint: baseline only, never a flood
    enqueue(detectMilestones(prev, state));
  }, [state, enqueue]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onLab = (e) => {
      if (!e?.detail?.labId) return;
      try {
        enqueue(detectLabMilestones(getLabProgress(), seenRef.current || new Set()));
      } catch {
        // Lab progress unreadable: skip the celebration, never crash the app.
      }
    };
    window.addEventListener('itfund-lab-complete', onLab);
    return () => window.removeEventListener('itfund-lab-complete', onLab);
  }, [enqueue]);

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);
  return { current: queue[0] || null, dismiss, pending: queue.length };
}
