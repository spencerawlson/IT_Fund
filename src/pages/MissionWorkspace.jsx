import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, X, Lock, RotateCcw, SearchX, TerminalSquare, ShieldCheck, Map, Boxes } from 'lucide-react';
import { Button, Card, EmptyState } from '@/components/ui-glass';
import LabTerminal from '@/components/labs/LabTerminal';
import { MissionBrief, MissionDossier } from '@/components/labs/Mission';
import MissionTopology, { MISSION_TOPOLOGY_DEVICES } from '@/components/missions/MissionTopology';
import FirewallConsole from '@/components/missions/FirewallConsole';
import IncidentReportForm from '@/components/missions/IncidentReportForm';
import CypherVoiceButton from '@/components/missions/CypherVoiceButton';
import { useTutor, useTutorEnabled, TutorText, Thinking } from '@/components/academy/tutor/TutorAssist';
import { useCypherVoice } from '@/api/voice';
import { logCypherEvent } from '@/api/analytics';
import { buildPingCommands } from '@/components/missions/firewallCommands';
import { missionsApi } from '@/api/missions';
import { labsApi } from '@/api/labs';
import { recordMissionCompletion, recordVerifiedLabCompletion } from '@/lib/academy';
import { LESSONS_FOR_LAB } from '@/data/labLessons';
import UpgradePrompt from '@/components/UpgradePrompt';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useTheme } from '@/components/ThemeProvider';

// The 3D SOC room is lazy-loaded so three.js never enters the main chunk.
// (Static imports of three/ModelViewer must stay out of this file — see
// MissionWorkspace.test.jsx.)
const MissionSocScene = React.lazy(() => import('@/components/three/MissionSocScene'));

// The draft autosave debounce: keystrokes are saved 750ms after the last
// one, and immediately on blur, so a reload restores what was typed.
const DRAFT_SAVE_DELAY_MS = 750;

// Operation Broken Shield runs the net-acl-001 lab; the mission API owns the
// attempt, the lab API owns the terminal session underneath it.
const MISSION_LAB_ID = 'net-acl-001';
const MISSION_LESSON_ID = 'net-security';

// The four mission objectives (the other five are the lab's own). Labels are
// fallbacks — the attempt endpoint returns the authoritative label per id.
const MISSION_OBJECTIVE_LABELS = {
  topology: 'Inspect every device in the topology',
  'firewall-inspect': 'Inspect the firewall',
  document: 'Write up the incident report',
  report: 'File the incident report',
};

const LAB_OBJECTIVE_IDS = ['deny-guest', 'permit-others', 'apply', 'guest-blocked', 'trusted-allowed'];

/** The terminal `objectives` listing: `[x]`/`[ ]` per objective, in order.
 *  The page shows no objectives list — the terminal is the only place the
 *  student checks where they stand — so this is the source of truth the
 *  runner prints, and the unit test asserts it matches the page's state. */
export function formatObjectives(objectives = []) {
  const count = `${objectives.filter((o) => o.passed).length}/${objectives.length} objectives complete`;
  const lines = objectives.map((o) => {
    const label = o.label || MISSION_OBJECTIVE_LABELS[o.id] || o.id;
    return `  [${o.passed ? 'x' : ' '}] ${label}`;
  });
  return `Mission objectives (${count}):\n${lines.join('\n')}`;
}

const readStored = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
};

/** Whether an error means the lab session is gone (the backend's not_found:
 *  "Lab session not found."). Lab sessions live in the backend's memory,
 *  so a backend restart wipes them — after that, every exec against the
 *  dead id 404s until the page is reloaded. */
export function isSessionGoneError(e) {
  if (!e) return false;
  const message = e.message || '';
  return /lab session not found/i.test(message)
    || (e.status === 404 && /session/i.test(message));
}

/** Run one lab exec, recovering from a lost session instead of dying on it.
 *  Regression for the live Apply-after-reset failure (2026-11-13 23:40
 *  EST): after "Reset the lab", the Apply button failed with
 *  "Failed to fetch" and then "Lab session not found." — the in-memory
 *  lab session on the host was gone — and the console had no recovery:
 *  every exec kept dying on the dead id until a manual page reload.
 *  On a gone-session error this re-syncs the session from the attempt
 *  (the attempt outlives the lab session) and retries the command once
 *  with the live id. When no live session comes back it rethrows the
 *  original error — the Reset button's own recovery (re-start the
 *  mission) is the escape hatch from there. Other errors pass straight
 *  through with no re-sync. */
export async function execWithSessionRecovery({ sessionId, exec, refreshSession, onSession, command }) {
  try {
    const res = await exec(sessionId, command);
    if (res && res.session && onSession) onSession(res.session);
    return res;
  } catch (e) {
    if (!isSessionGoneError(e)) throw e;
    const fresh = await refreshSession();
    if (!fresh || !fresh.id || fresh.id === sessionId) throw e;
    if (onSession) onSession(fresh);
    const res = await exec(fresh.id, command);
    if (res && res.session && onSession) onSession(res.session);
    return res;
  }
}

/** Full-screen mission workspace: Sentinel briefing, 3D SOC room (or the 2D
 *  topology when WebGL is unavailable), firewall console, traffic tests, the
 *  real lab terminal, and the incident report — ending in a debrief. The 2D
 *  path is fully playable without WebGL. */
export default function MissionWorkspace() {
  useDocumentTitle('Cyber Mission · Road to CISSP');
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [missionDef, setMissionDef] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [session, setSession] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [error, setError] = useState('');
  const [entitled, setEntitled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [debrief, setDebrief] = useState(null);
  const [reportError, setReportError] = useState('');
  const [traffic, setTraffic] = useState(null); // { host, output }
  const [trafficBusy, setTrafficBusy] = useState(false);
  const [view, setView] = useState(() => (readStored('rtc-mission-view', '3d') === '2d' ? '2d' : '3d'));
  const [quality, setQuality] = useState(() => (readStored('rtc-mission-quality', 'high') === 'low' ? 'low' : 'high'));
  const [reducedMotion, setReducedMotion] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  const termRef = useRef(null);
  // Shared Cypher voice state { talking, level }: the voice hook writes it
  // while audio plays and the SOC scene's tick reads it every frame, so the
  // 3D Cypher talks (talk clip + audio-reactive head bob) without
  // re-rendering the scene. One useCypherVoice instance serves the briefing
  // Listen button and the debrief explanation, so two clips never overlap.
  const cypherVoiceRef = useRef({ talking: false, level: 0 });
  const cypherVoice = useCypherVoice(cypherVoiceRef);
  const tutorEnabled = useTutorEnabled();
  const {
    text: explainText, loading: explainLoading, error: explainError,
    ask: askExplain, stop: stopExplain,
  } = useTutor();
  const debriefLoggedRef = useRef(false);
  // Draft autosave state: the timer for the debounce, the latest unsaved
  // values, and whether a save is in flight (a save that lands while one
  // is in flight is queued and sent right after).
  const draftTimerRef = useRef(null);
  const draftPendingRef = useRef(null);
  const draftSavingRef = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const def = await missionsApi.getMission(missionId);
        const started = await missionsApi.start(missionId);
        if (!live) return;
        setMissionDef(def);
        setAttempt(started.attempt || null);
        setSession(started.session || null);
        if (started.objectives) setObjectives(started.objectives);
      } catch (e) {
        if (!live) return;
        if (e.status === 401 || e.status === 402) {
          setEntitled(false);
          setError(e.message);
        } else {
          setError(e.message || 'Mission unavailable.');
        }
      }
    })();
    return () => { live = false; };
  }, [missionId]);

  // Warm the Cypher GLB cache on mount: on direct entry the SOC scene would
  // otherwise load cypher.glb cold (the lesson handoff path pre-warms it via
  // the lesson panel, which is why Cypher appeared there first). Dynamic
  // import so three.js stays out of the main chunk — this shares the chunk
  // the lazy SOC scene loads, it just starts the fetch earlier.
  useEffect(() => {
    let cancelled = false;
    import('@/components/three/CypherCharacter')
      .then((m) => { if (!cancelled) m.preloadCypherCharacter(); })
      .catch(() => { /* Cypher loads on demand in the SOC scene */ });
    return () => { cancelled = true; };
  }, []);

  // Debrief analytics: one debrief_viewed per completed mission (counts,
  // never conversation content). `debrief` is only set on completion.
  useEffect(() => {
    if (debrief && !debriefLoggedRef.current) {
      debriefLoggedRef.current = true;
      logCypherEvent({ event: 'debrief_viewed', mission_id: missionId });
    }
  }, [debrief, missionId]);

  // "Cipher explains the outcome": the question is built from the
  // server-validated state (score + passed/open objectives + debrief text).
  // The tutor explains from that state — nothing is re-graded client-side.
  const explainOutcome = () => {
    const passed = objectives.filter((o) => o.passed).map((o) => o.label || o.id);
    const open = objectives.filter((o) => !o.passed).map((o) => o.label || o.id);
    const q = `I just completed Operation Broken Shield with a score of ${debrief?.score ?? '—'} out of 100. `
      + `Objectives passed (${passed.length}/${objectives.length}): ${passed.join('; ') || 'none'}. `
      + `Still open: ${open.join('; ') || 'none'}. `
      + `The debrief says: ${debrief?.debrief || '—'}. `
      + `Explain what I did well, what the open objectives mean, and the one concept I should review next. Do not re-grade my work — explain from this state.`;
    askExplain({
      mode: 'chat',
      track: 'net-security',
      topic: 'Operation Broken Shield — mission debrief',
      level: 'intermediate',
      messages: [{ role: 'user', content: q }],
    });
  };

  // Keep reduced-motion in step with the OS while the mission is open.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setViewPersisted = useCallback((next) => {
    setView(next);
    try { localStorage.setItem('rtc-mission-view', next); } catch { /* ignore */ }
  }, []);

  const setQualityPersisted = useCallback((next) => {
    setQuality(next);
    try { localStorage.setItem('rtc-mission-quality', next); } catch { /* ignore */ }
  }, []);

  // WebGL failed: fall back to the 2D topology, which is fully playable.
  const handleRendererFailed = useCallback(() => {
    setViewPersisted('2d');
  }, [setViewPersisted]);

  const applyAttemptState = useCallback((res) => {
    if (!res) return;
    if (res.attempt) setAttempt(res.attempt);
    if (res.session) setSession(res.session);
    if (res.objectives) setObjectives(res.objectives);
  }, []);

  const doAction = useCallback(async (body) => {
    if (!attempt) return null;
    setBusy(true);
    setError('');
    try {
      const res = await missionsApi.action(attempt.id, body);
      applyAttemptState(res);
      return res;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [attempt, applyAttemptState]);

  const onInspect = useCallback((device) => {
    doAction({ type: 'inspect_device', device }).catch(() => {});
  }, [doAction]);

  const onInspectFirewall = useCallback(() => {
    doAction({ type: 'inspect_firewall' }).catch(() => {});
  }, [doAction]);

  // Lab session reached COMPLETED (server-verified): award XP once and mark
  // the related lessons complete — same gate as LabWorkspace.
  const recordedRef = useRef(new Set());
  useEffect(() => {
    if (session?.status === 'COMPLETED' && session.completed_at && !recordedRef.current.has(session.id)) {
      recordedRef.current.add(session.id);
      recordVerifiedLabCompletion(MISSION_LAB_ID, LESSONS_FOR_LAB[MISSION_LAB_ID] || []);
    }
  }, [session]);

  const reset = useCallback(async () => {
    if (!session || !attempt) return;
    setBusy(true);
    setError('');
    try {
      const s = await labsApi.reset(session.id);
      setSession(s);
      setTraffic(null);
      applyAttemptState(await missionsApi.getAttempt(attempt.id));
    } catch (e) {
      if (isSessionGoneError(e)) {
        // The lab session is gone (e.g. the backend restarted and its
        // in-memory sessions were lost): a reset against the dead id can
        // never work, and neither can any console button. Re-start the
        // mission instead — the backend abandons the dead attempt and
        // hands back a fresh session — the same recovery a page reload
        // performs, without making the student figure that out.
        try {
          const started = await missionsApi.start(missionId);
          setAttempt(started.attempt || null);
          setSession(started.session || null);
          if (started.objectives) setObjectives(started.objectives);
          if (started.mission) setMissionDef(started.mission);
          setTraffic(null);
          setError('');
          return;
        } catch {
          // Fall through to the original error below.
        }
      }
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [session, attempt, applyAttemptState, missionId]);

  // Terminal command runner: meta-commands in the browser, everything else
  // is the lab's real IOS shell via labsApi.exec (LabWorkspace's shape, trimmed).
  const runner = useCallback(async (raw) => {
    const trimmed = raw.trim();
    const [cmd, ...args] = trimmed.split(/\s+/);
    const c = cmd.toLowerCase();
    const sub = (args[0] || '').toLowerCase();
    const count = () => `${objectives.filter((o) => o.passed).length}/${objectives.length} objectives complete`;

    if (c === 'objectives') return { output: formatObjectives(objectives) };
    if (c === 'progress' || (c === 'lab' && sub === 'status') || (c === 'status')) return { output: count() };
    if (c === 'hint') {
      const open = objectives.find((o) => !o.passed);
      if (!open) return { output: 'Every objective is complete — file the incident report.' };
      logCypherEvent({ event: 'hint_viewed', mission_id: missionId, meta: { objective_id: open.id } });
      return { output: `Hint for "${open.label || MISSION_OBJECTIVE_LABELS[open.id] || open.id}":\n  ${open.message || 'Work through the mission step by step.'}` };
    }
    if (c === 'check') {
      try {
        const s = await labsApi.validate(session.id);
        setSession(s);
        // Re-read the attempt too: the mission objectives behind the
        // terminal's `objectives` list only refresh from the attempt
        // endpoint, so without this the list stays stale after a validation.
        let missionCount = '';
        if (attempt) {
          try {
            const view = await missionsApi.getAttempt(attempt.id);
            applyAttemptState(view);
            const passed = (view.objectives || []).filter((o) => o.passed).length;
            missionCount = ` ${passed}/${(view.objectives || []).length} mission objectives complete.`;
          } catch { /* keep the lab-only count */ }
        }
        return { output: `Checked. ${Object.values(s.progress || {}).filter(Boolean).length} lab objectives complete.${missionCount}`, session: s };
      } catch (e) { return { output: e.message, exit_code: 1 }; }
    }
    if (c === 'lab' && sub === 'reset') { reset(); return { output: 'Resetting the lab environment...' }; }
    if (c === 'lab' && sub === 'exit') {
      setTimeout(() => navigate('/labs'), 300);
      return { output: 'Leaving the mission. Back to the lab menu...' };
    }
    if (c === 'lab') return { output: 'Usage: lab reset | lab exit   (while in a mission)' };
    if (c === 'help' || c === '?') {
      const meta = [
        'Mission commands:',
        '  objectives        show the mission objectives and your progress',
        '  hint              a hint for the next unfinished objective',
        '  check             re-check your work now',
        '  progress          how many objectives are complete',
        '  lab reset         start the lab over',
        '  lab exit          leave to the lab menu',
        '',
        'This mission\'s tools:',
      ].join('\n');
      try {
        const res = await labsApi.exec(session.id, 'help');
        return { output: `${meta}\n${res.output || ''}`, session: res.session, prompt: res.prompt };
      } catch { return { output: meta }; }
    }
    return labsApi.exec(session.id, raw);
  }, [session, objectives, attempt, applyAttemptState, reset, navigate]);

  // Traffic test: ping the server from a host, then re-validate so the
  // blocked/allowed display comes from the latest validation state — never
  // from parsing the ping text.
  const pingTest = useCallback(async (host) => {
    if (!session || !attempt) return;
    setTrafficBusy(true);
    setTraffic(null);
    try {
      let output = '';
      for (const command of buildPingCommands(host)) {
        const res = await labsApi.exec(session.id, command);
        output += res.output ? `${res.output}\n` : '';
        if (res.session) setSession(res.session);
      }
      const validated = await labsApi.validate(session.id);
      setSession(validated);
      setTraffic({ host, output: output.trim() });
      applyAttemptState(await missionsApi.getAttempt(attempt.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setTrafficBusy(false);
    }
  }, [session, attempt, applyAttemptState]);

  // The firewall console's exec responses carry the refreshed session, so
  // the rules read-back updates after each button instead of lagging until
  // the next validation cycle. A lost session is recovered, not fatal:
  // execWithSessionRecovery re-syncs from the attempt and retries once
  // with the live id (see the helper above).
  const handleFirewallExec = useCallback(async (command) => {
    return execWithSessionRecovery({
      sessionId: session.id,
      exec: (id, cmd) => labsApi.exec(id, cmd),
      refreshSession: async () => {
        const view = await missionsApi.getAttempt(attempt.id);
        return view && view.session ? view.session : null;
      },
      onSession: setSession,
      command,
    });
  }, [session, attempt]);

  const submitReport = useCallback(async ({ summary, root_cause, fix }) => {
    setReportError('');
    await doAction({ type: 'document', summary, root_cause, fix });
    try {
      await doAction({ type: 'submit_report' });
    } catch (e) {
      // The server gates submit_report on the other objectives; surface its
      // missing-objectives error verbatim.
      setReportError(e.message || 'The report could not be filed yet.');
      throw e;
    }
  }, [doAction]);

  const completeMission = useCallback(async () => {
    if (!attempt) return;
    setBusy(true);
    setError('');
    try {
      const res = await missionsApi.complete(attempt.id);
      setDebrief(res);
      if (res.attempt) setAttempt(res.attempt);
      if (res.objectives) setObjectives(res.objectives);
      // The server's xp_awarded is the mission's first-completion award
      // (definition XP, once per mission). Record it in the learner's XP
      // ledger — a debrief number alone never reached the dashboard, which
      // is why the live first completion showed 0 XP awarded.
      if (res.xp_awarded > 0) recordMissionCompletion(missionId, res.xp_awarded);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [attempt, missionId]);

  const total = objectives.length;
  const passed = (id) => objectives.find((o) => o.id === id)?.passed || false;
  // Two findings sources, kept separate: the attempt carries the mission
  // state (topology inspected, firewall inspected, incident report); the lab
  // session carries the simulation state (findings.config — the ACL flags).
  // Do NOT merge them: attempt.findings is always an object, so a fallback
  // chain would silently hide the session's config.
  const missionFindings = attempt?.findings || {};
  const inspected = missionFindings?.topology?.inspected || [];
  const incidentActive = !passed('guest-blocked');
  const contained = passed('guest-blocked') && passed('trusted-allowed');
  const config = session?.findings?.config || {};
  const report = missionFindings?.incident_report || {};
  const reportSubmitted = report.submitted === true || passed('report');
  // 'document' passes as part of filing the report, so the client-side hint
  // counts the other objectives only; the server remains the gate.
  const canSubmitReport = objectives
    .filter((o) => o.id !== 'report' && o.id !== 'document')
    .every((o) => o.passed);

  // The saved draft (server-side, restored on resume/reload) and the filed
  // report share the form's initial values: the filed text wins once a
  // report is filed (the draft is cleared server-side at filing), otherwise
  // the draft is what the learner was typing.
  const draft = missionFindings?.incident_report_draft || {};
  const reportDraftInitial = {
    summary: report.summary || draft.summary || '',
    root_cause: report.root_cause || draft.root_cause || '',
    fix: report.fix || draft.fix || '',
  };

  // Draft autosave: best-effort and silent — a failed save must never show
  // an error banner or touch the objectives; the text stays in the form and
  // is retried on the next keystroke/blur. The server stores it under
  // incident_report_draft, which the document validator never reads.
  const saveDraftNow = useCallback(async (values) => {
    if (!attempt) return;
    if (draftSavingRef.current) { draftPendingRef.current = values; return; }
    draftSavingRef.current = true;
    try {
      const view = await missionsApi.action(attempt.id, { type: 'save_draft', ...values });
      applyAttemptState(view);
    } catch { /* draft saves are best-effort; the text stays in the form */ }
    finally {
      draftSavingRef.current = false;
      if (draftPendingRef.current) {
        const next = draftPendingRef.current;
        draftPendingRef.current = null;
        saveDraftNow(next);
      }
    }
  }, [attempt, applyAttemptState]);
  const handleDraftChange = useCallback((values) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => saveDraftNow(values), DRAFT_SAVE_DELAY_MS);
  }, [saveDraftNow]);
  const flushDraft = useCallback((values) => {
    if (draftTimerRef.current) { clearTimeout(draftTimerRef.current); draftTimerRef.current = null; }
    saveDraftNow(values);
  }, [saveDraftNow]);

  if (error && !missionDef && !entitled) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 text-ink-1">
        <UpgradePrompt what="This mission" />
      </div>
    );
  }
  if (error && !missionDef) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 text-ink-1">
        <EmptyState
          icon={error.toLowerCase().includes('unauth') ? Lock : SearchX}
          title={error.toLowerCase().includes('unauth') ? 'Sign in to start missions' : 'Mission unavailable'}
          text={error}
          to="/labs"
          action="Back to Labs"
        />
      </div>
    );
  }
  if (!missionDef || !attempt || !session) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-ink-2">Starting mission…</div>;
  }
  if (!entitled) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 text-ink-1">
        <UpgradePrompt what="This mission" />
      </div>
    );
  }

  // Briefing lines come from the API; fall back to the mission description.
  const callsign = missionDef.callsign || 'OPERATION BROKEN SHIELD';
  const briefLines = missionDef.brief || missionDef.briefing || missionDef.lines
    || (missionDef.description ? [missionDef.description] : []);
  const missionForBrief = { callsign, brief: briefLines };
  const title = missionDef.title || 'Operation Broken Shield';
  const background = theme === 'dark' ? '#111111' : '#F8F7FF';
  const done = attempt.status === 'COMPLETED' || !!debrief;
  const labObjectives = objectives.filter((o) => LAB_OBJECTIVE_IDS.includes(o.id));
  const labLike = {
    id: MISSION_LAB_ID,
    objectives: labObjectives.map((o) => ({ id: o.id, label: o.label || MISSION_OBJECTIVE_LABELS[o.id] || o.id })),
  };
  const results = session.validation_results || [];
  const missionForDossier = { callsign, brief: briefLines, beats: {}, intelKeys: ['flags'] };

  return (
    <div className="min-h-[100dvh] text-ink-1">
      <header className="sticky top-safe z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-1 nav-solid mx-auto flex max-w-6xl flex-wrap items-center gap-2 rounded-card px-3 py-2 sm:px-4">
          <ShieldCheck size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body font-semibold">{callsign} — {title}</span>
          <label className="flex items-center gap-1.5 text-caption text-ink-2">
            Quality
            <select
              value={quality}
              onChange={(e) => setQualityPersisted(e.target.value === 'low' ? 'low' : 'high')}
              aria-label="3D quality"
              className="rounded-control border border-black/10 bg-white/80 px-1.5 py-1 text-caption font-semibold text-ink-1"
            >
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </label>
          <Button
            size="sm"
            variant="secondary"
            icon={view === '3d' ? Map : Boxes}
            onClick={() => setViewPersisted(view === '3d' ? '2d' : '3d')}
          >
            {view === '3d' ? '2D view' : '3D view'}
          </Button>
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset} disabled={busy}>Reset</Button>
          <Button size="sm" variant="secondary" to={`/academy/lessons/${MISSION_LESSON_ID}`}>Lesson</Button>
          <Button size="sm" variant="secondary" to="/labs">Exit</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <MissionBrief mission={missionForBrief} />
          {typeof missionDef.xp === 'number' && (
            <p className="text-small text-ink-2">
              First completion earns {missionDef.xp} XP — replays earn none.
            </p>
          )}
          {briefLines.length > 0 && (
            <Card level={2}>
              <h2 className="text-heading text-ink-1">Hear the briefing</h2>
              <p className="mt-1 text-small text-ink-2">
                Cipher reads Sentinel’s briefing out loud while he talks in the SOC.
                The words show as subtitles while he speaks.
              </p>
              <div className="mt-3">
                <CypherVoiceButton
                  text={briefLines.join('\n')}
                  label="Listen to the briefing"
                  voice={cypherVoice}
                  eventContext={{ mission_id: missionId }}
                />
              </div>
            </Card>
          )}
          {/* No objectives checklist lives on this page: the terminal is the
              only place the student checks where they stand (run `objectives`
              in the Mission Console). */}
          <Card level={2}>
            <h2 className="text-heading text-ink-1">Where do you stand?</h2>
            <p className="mt-1 text-small text-ink-2">
              Check the Mission Console below: run <code>objectives</code> for the list,{' '}
              <code>progress</code> for the count, and <code>hint</code> when you are stuck.
              After changing the firewall, run <code>check</code> to re-validate first.
            </p>
          </Card>
          <Card level={2}>
            <h2 className="text-heading text-ink-1">Traffic test</h2>
            <p className="mt-1 text-small text-ink-2">
              Ping the server from each host and read the replies. To check whether the
              traffic checks pass, run <code>objectives</code> in the Mission Console.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => pingTest('GUEST')} loading={trafficBusy} disabled={trafficBusy || session.status === 'EXPIRED'}>
                Ping SRV from GUEST
              </Button>
              <Button size="sm" variant="secondary" onClick={() => pingTest('PC1')} loading={trafficBusy} disabled={trafficBusy || session.status === 'EXPIRED'}>
                Ping SRV from PC1
              </Button>
            </div>
            {traffic && (
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-terminal-bg p-3 font-mono text-[12px] leading-relaxed text-terminal-text">
                {`$ ping from ${traffic.host}\n${traffic.output}`}
              </pre>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card level={2} className="mission-console">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <TerminalSquare size={18} className="text-terminal-bright" aria-hidden="true" />
              <h2 className="font-mono text-heading text-terminal-bright">SOC Room</h2>
              <span className="hidden text-caption text-terminal-muted sm:inline">
                {view === '3d'
                  ? 'Cypher presents the SOC — switch to the 2D topology to inspect devices'
                  : '2D topology — fully playable without WebGL'}
              </span>
            </div>
            {view === '3d' ? (
              <React.Suspense fallback={<div className="flex aspect-video items-center justify-center text-ink-2">Loading SOC room…</div>}>
                <MissionSocScene
                  devices={MISSION_TOPOLOGY_DEVICES}
                  incidentActive={incidentActive}
                  contained={contained}
                  onRendererFailed={handleRendererFailed}
                  background={background}
                  reducedMotion={reducedMotion}
                  quality={quality}
                  cypherVoiceRef={cypherVoiceRef}
                />
              </React.Suspense>
            ) : (
              <MissionTopology
                devices={MISSION_TOPOLOGY_DEVICES}
                inspected={inspected}
                onInspect={onInspect}
                guestBlocked={passed('guest-blocked') ? true : null}
                trustedAllowed={passed('trusted-allowed') ? true : null}
                activeDevice={null}
              />
            )}
          </Card>

          <Card level={2}>
            <h2 className="text-heading text-ink-1">Firewall console — R1, access-list 10</h2>
            <p className="mt-1 text-small text-ink-2">
              The buttons issue the real IOS commands on R1. Check the rules read-back after each step.
            </p>
            <div className="mt-4">
              <FirewallConsole
                rules={config}
                onExec={handleFirewallExec}
                onReset={reset}
                onInspectFirewall={onInspectFirewall}
                busy={busy}
                disabled={session.status === 'EXPIRED'}
              />
            </div>
          </Card>

          <Card level={2} className="mission-console">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <TerminalSquare size={18} className="text-terminal-bright" aria-hidden="true" />
              <h2 className="font-mono text-heading text-terminal-bright">Mission Console</h2>
              <span className="hidden text-caption text-terminal-muted sm:inline">type `help` for available operations — run `objectives` to see where you stand</span>
            </div>
            <div className="crt crt-flicker overflow-hidden rounded-xl">
              <LabTerminal
                ref={termRef}
                sessionId={session.id}
                runner={runner}
                banner={['[ MISSION CONSOLE v1 ]', 'establishing uplink ............ OK', 'routing to R1 ............ ONLINE', `objectives: ${total} · callsign: ${callsign}`, 'type `help` for available operations', '']}
                prompt="R1# "
                disabled={session.status === 'EXPIRED'}
                onSession={setSession}
                onError={setError}
              />
            </div>
          </Card>

          {!done && (
            <Card level={2}>
              <h2 className="text-heading text-ink-1">Incident report</h2>
              <p className="mt-1 text-small text-ink-2">
                Write up what happened, why, and the fix — then file it. The server files it only
                once the other objectives pass.
              </p>
              <div className="mt-4">
                <IncidentReportForm
                  initial={reportDraftInitial}
                  onSubmit={submitReport}
                  onDraftChange={handleDraftChange}
                  onDraftBlur={flushDraft}
                  canSubmit={canSubmitReport}
                  busy={busy}
                  disabled={session.status === 'EXPIRED'}
                  serverError={reportError}
                />
              </div>
              {reportSubmitted && (
                <div className="mt-4">
                  <p className="flex items-center gap-2 text-body font-semibold text-success">
                    <Check size={18} aria-hidden="true" /> Incident report filed.
                  </p>
                  <Button size="lg" icon={ShieldCheck} onClick={completeMission} loading={busy} className="mt-3 w-full">
                    Complete mission — debrief
                  </Button>
                </div>
              )}
            </Card>
          )}

          {done && debrief && (
            <Card level={2} className="border-success/30">
              <p className="flex items-center gap-2 text-body font-semibold text-success">
                <Check size={18} aria-hidden="true" /> Mission complete.
              </p>
              <p className="mt-2 text-body text-ink-1">
                Score: <strong>{debrief.score}</strong>
                {typeof debrief.xp_awarded === 'number' && <> · XP awarded: <strong>{debrief.xp_awarded}</strong></>}
              </p>
              {debrief.debrief && <p className="mt-2 whitespace-pre-wrap text-body text-ink-2">{debrief.debrief}</p>}
              {tutorEnabled && (
                <div className="mt-4 border-t border-black/10 pt-4">
                  <p className="text-body font-semibold text-ink-1">Cipher explains the outcome</p>
                  <p className="mt-1 text-small text-ink-2">
                    Cipher reads your validated results — score and which objectives
                    passed — and explains what they mean. He never re-grades your work.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={explainOutcome} loading={explainLoading} disabled={explainLoading}>
                      Ask Cipher to explain the outcome
                    </Button>
                    {explainLoading && (
                      <Button size="sm" variant="ghost" onClick={stopExplain}>Stop</Button>
                    )}
                  </div>
                  {explainError && <p className="mt-3 text-small text-danger">{explainError}</p>}
                  {explainText && (
                    <div className="mt-3 rounded-control border border-violet-700/20 bg-violet-50 p-3.5 text-sm leading-relaxed text-ink-1" aria-live="polite">
                      <TutorText text={explainText} />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => cypherVoice.play(explainText)}
                          disabled={cypherVoice.playing}
                        >
                          {cypherVoice.playing ? 'Speaking…' : 'Hear Cipher say it'}
                        </Button>
                        {cypherVoice.playing && (
                          <Button size="sm" variant="ghost" onClick={cypherVoice.stop}>Stop</Button>
                        )}
                      </div>
                      {cypherVoice.subtitle && (
                        <p className="mt-2 text-small text-ink-2" aria-live="polite">
                          <span className="font-bold text-action-hover">Cipher:</span> {cypherVoice.subtitle}
                        </p>
                      )}
                      {cypherVoice.error && <p className="mt-2 text-small text-danger">{cypherVoice.error}</p>}
                    </div>
                  )}
                  {explainLoading && !explainText && <div className="mt-3"><Thinking /></div>}
                </div>
              )}
            </Card>
          )}
          {done && (
            <MissionDossier lab={labLike} mission={missionForDossier} results={results} findings={session.findings} />
          )}
          {session.status === 'EXPIRED' && (
            <Card level={2}>
              <p className="text-body font-semibold text-warning">This session expired. Reset to continue.</p>
            </Card>
          )}
          {error && (
            <Card level={2}>
              <p className="flex items-center gap-2 text-body text-danger"><X size={18} aria-hidden="true" /> {error}</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
