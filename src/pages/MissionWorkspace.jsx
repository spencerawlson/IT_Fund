import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, X, Lock, RotateCcw, SearchX, TerminalSquare, ShieldCheck } from 'lucide-react';
import { Button, Card, EmptyState } from '@/components/ui-glass';
import LabTerminal from '@/components/labs/LabTerminal';
import { MissionBrief, MissionDossier } from '@/components/labs/Mission';
import MissionTopology, { MISSION_TOPOLOGY_DEVICES } from '@/components/missions/MissionTopology';
import FirewallConsole from '@/components/missions/FirewallConsole';
import IncidentReportForm from '@/components/missions/IncidentReportForm';
import FloodReportForm from '@/components/missions/FloodReportForm';
import CypherVoiceButton from '@/components/missions/CypherVoiceButton';
import { useTutor, useTutorEnabled, TutorText, Thinking } from '@/components/academy/tutor/TutorAssist';
import { useCypherVoice } from '@/api/voice';
import { logCypherEvent } from '@/api/analytics';
import { getMission } from '@/data/missions';
import { buildPingCommands } from '@/components/missions/firewallCommands';
import { missionsApi } from '@/api/missions';
import { labsApi } from '@/api/labs';
import { recordMissionCompletion, recordVerifiedLabCompletion } from '@/lib/academy';
import { LESSONS_FOR_LAB } from '@/data/labLessons';
import UpgradePrompt from '@/components/UpgradePrompt';
import useDocumentTitle from '@/hooks/useDocumentTitle';

// The draft autosave debounce: keystrokes are saved 750ms after the last
// one, and immediately on blur, so a reload restores what was typed.
const DRAFT_SAVE_DELAY_MS = 750;

// Mission shapes. Operation Broken Shield is the SOC mission: it runs the
// net-acl-001 lab in the 3D SOC room, with a topology to inspect and a
// firewall console. Every other mission runs the terminal-only workspace:
// the lab's real shell, attestation buttons, and the report form — no SOC
// room, because there is no topology to walk. The mission id (from the
// route) is the switch: the shape is a property of the mission, not of the
// lab underneath it.
const SOC_MISSION_ID = 'op-broken-shield';

// The mission objectives (the lab's own objectives come from the attempt).
// Labels are fallbacks — the attempt endpoint returns the authoritative
// label per id.
const MISSION_OBJECTIVE_LABELS = {
  topology: 'Inspect every device in the topology',
  'firewall-inspect': 'Inspect the firewall',
  'flood-source': 'Name the flooding host and the flood type',
  document: 'Write up the incident report',
  report: 'File the incident report',
};

// Lab objective ids per lab, for the completion dossier (which lists the
// lab's objectives only) and the terminal workspace's attestation list.
// The attempt's combined objective list carries no lab/mission marker, so
// the workspace carries the split.
const LAB_OBJECTIVE_IDS_BY_LAB = {
  'net-acl-001': ['deny-guest', 'permit-others', 'apply', 'guest-blocked', 'trusted-allowed'],
  'tools-wireshark-001': ['open', 'protocols', 'stream', 'creds', 'exfil', 'writeup'],
};

/** "OPERATION BROKEN SHIELD" -> "Operation Broken Shield" (the API serves no title). */
function titleCase(callsign) {
  return (callsign || '').toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
}

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

/** Lab objectives with live pass/fail from the last validation, for
 *  terminal missions. Live-execution labs can't fabricate findings, so each
 *  open objective gets an "I did this" attestation button that records the
 *  finding and re-validates — the same contract as LabWorkspace's
 *  LabObjectives, trimmed to this page (no device tabs, no draft). */
function MissionLabObjectives({ objectives, results, onAttest, busy = false }) {
  const resultFor = (id) => (results || []).find((r) => r.objective_id === id);
  return (
    <ol className="space-y-2">
      {objectives.map((o) => {
        const r = resultFor(o.id);
        const passed = r?.passed;
        return (
          <li key={o.id} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                passed ? 'border-success/40 bg-success/15 text-success' : 'border-black/15 text-ink-2'
              }`}
            >
              {passed ? <Check size={14} aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body text-ink-1">{o.label}</span>
              {r && !passed && <span className="block text-small text-ink-2">{r.message}</span>}
              {!r && o.hints?.[0] && <span className="block text-small text-ink-2">Hint: {o.hints[0]}</span>}
            </span>
            {!passed && (
              <button
                type="button"
                onClick={() => onAttest(o)}
                disabled={busy}
                title="You ran this step for real — record it as done"
                className="shrink-0 self-start rounded-control border border-black/10 px-2 py-1 text-caption font-semibold text-ink-2 transition hover:border-black/25 hover:text-ink-1 disabled:opacity-50"
              >
                I did this
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
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

/** Full-screen mission workspace: the incoming transmission, the 2D
 *  topology (SOC) or the evidence (flood), the firewall console, traffic
 *  tests, the real lab terminal, and the incident report — ending in a
 *  debrief. The 3D SOC room lives on the briefing screen; this page
 *  never loads it. */
export default function MissionWorkspace() {
  useDocumentTitle('Cyber Mission · Road to CISSP');
  const { missionId } = useParams();
  const isSocMission = missionId === SOC_MISSION_ID;
  const navigate = useNavigate();
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
  const termRef = useRef(null);
  // One useCypherVoice instance serves the briefing replay (the sound
  // controls) and the debrief explanation, so two clips never overlap.
  // The voice hook takes the shared voice ref; the SOC scene that used
  // to read it lives on the briefing screen now.
  const cypherVoiceRef = useRef({ talking: false, level: 0 });
  const cypherVoice = useCypherVoice(cypherVoiceRef);
  // Briefing lines come from the API; fall back to the mission description.
  // The backend serves them under `briefing`; the frontend copy under
  // `brief`. The briefing screen reads the same lines aloud; this page
  // shows them as the incoming transmission (MissionBrief).
  const briefLines = missionDef?.brief || missionDef?.briefing || missionDef?.lines
    || (missionDef?.description ? [missionDef.description] : []);
  // The lab under this mission and the lesson it belongs to (served by the
  // API; the SOC mission predates the lab_id field, so the route-known lab
  // is the fallback — and the only fallback, for test stubs).
  const labId = missionDef?.lab_id || session?.lab_id || (isSocMission ? 'net-acl-001' : null);
  const lessonId = missionDef?.lesson_id || (isSocMission ? 'net-security' : null);
  const callsign = missionDef?.callsign || 'OPERATION BROKEN SHIELD';
  const title = missionDef?.title || titleCase(callsign);
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

  // Debrief analytics: one debrief_viewed per completed mission (counts,
  // never conversation content). `debrief` is only set on completion.
  useEffect(() => {
    if (debrief && !debriefLoggedRef.current) {
      debriefLoggedRef.current = true;
      logCypherEvent({ event: 'debrief_viewed', mission_id: missionId });
    }
  }, [debrief, missionId]);

  // "Cypher explains the outcome": the question is built from the
  // server-validated state (score + passed/open objectives + debrief text).
  // The tutor explains from that state — nothing is re-graded client-side.
  const explainOutcome = () => {
    // A re-ask speaks again: the auto-play guard below remembers the last
    // spoken outcome, so clear it before the new answer arrives.
    explainAutoPlayedRef.current = '';
    const passed = objectives.filter((o) => o.passed).map((o) => o.label || o.id);
    const open = objectives.filter((o) => !o.passed).map((o) => o.label || o.id);
    const q = `I just completed ${title} with a score of ${debrief?.score ?? '—'} out of 100. `
      + `Objectives passed (${passed.length}/${objectives.length}): ${passed.join('; ') || 'none'}. `
      + `Still open: ${open.join('; ') || 'none'}. `
      + `The debrief says: ${debrief?.debrief || '—'}. `
      + `Explain what I did well, what the open objectives mean, and the one concept I should review next. Do not re-grade my work — explain from this state.`;
    askExplain({
      mode: 'chat',
      track: lessonId || 'net-security',
      topic: `${title} — mission debrief`,
      level: 'intermediate',
      messages: [{ role: 'user', content: q }],
    });
  };

  // The spoken outcome: the server debrief first, then Cypher's
  // explanation. The debrief opens with the congratulation ("Great job
  // completing … with a perfect score! …"), so speaking it first
  // guarantees the congratulation is heard — the tutor's answer alone
  // might not open with it. Both parts are shown in this card; the
  // voice reads the whole outcome aloud, in the order it is read.
  const explainSpokenText = [debrief?.debrief, explainText].filter(Boolean).join('\n');
  // Listen-first (PR #78 pattern): when Cypher's explanation finishes
  // arriving, he reads the outcome aloud — one tap on "Ask Cypher to
  // explain the outcome" gives text AND voice together, no second tap.
  // The ref guards against replays on re-renders; explainOutcome resets
  // it so a re-ask speaks again. (cypherVoice.play is a stable
  // callback, so it is safe in the dep array.)
  const explainAutoPlayedRef = useRef('');
  useEffect(() => {
    if (!explainText || explainLoading || explainError) return;
    if (explainAutoPlayedRef.current === explainSpokenText) return;
    explainAutoPlayedRef.current = explainSpokenText;
    cypherVoice.play(explainSpokenText);
  }, [explainText, explainLoading, explainError, explainSpokenText, cypherVoice.play]);

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

  // Terminal missions only: attest a lab objective ("I did this") — the
  // same record-findings + re-validate step LabWorkspace performs for live
  // labs, then refresh the attempt so the mission objectives update too.
  const attestLabObjective = useCallback(async (objective) => {
    if (!session || !objective?.validator) return false;
    setBusy(true);
    setError('');
    try {
      await labsApi.recordFindings(session.id, { [objective.validator]: { attested: true } });
      setSession(await labsApi.validate(session.id));
      if (attempt) applyAttemptState(await missionsApi.getAttempt(attempt.id));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, [session, attempt, applyAttemptState]);

  // Terminal missions only (Operation Packet Flood): report the flooding
  // host + flood type. A wrong report is stored, not an error — the
  // validator's message comes back on the objective (see FloodReportForm).
  const reportFlooder = useCallback(async ({ source_ip, flood_type }) => {
    await doAction({ type: 'report_flooder', source_ip, flood_type });
  }, [doAction]);

  // Lab session reached COMPLETED (server-verified): award XP once and mark
  // the related lessons complete — same gate as LabWorkspace. Attested-only
  // completions earn nothing and mark nothing: the Wireshark lab's
  // objectives are "I did this", so its session is attested and the lab's
  // own XP stays server-verified-only. The mission still pays its own XP
  // on completion (see completeMission) — that award is keyed to the
  // mission, not the lab.
  const recordedRef = useRef(new Set());
  useEffect(() => {
    if (session?.status === 'COMPLETED' && session.completed_at && !recordedRef.current.has(session.id)) {
      recordedRef.current.add(session.id);
      if (!session.attested && labId) {
        recordVerifiedLabCompletion(labId, LESSONS_FOR_LAB[labId] || []);
      }
    }
  }, [session, labId]);

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
      // The written hints live on the mission definition (getMission's
      // public_dict covers lab + mission objectives) — the attempt
      // payload carries no hints, only the last validation message,
      // which is empty before the first `check`, so the old code showed
      // the generic fallback and no hint at all. Show the written hints
      // first; the validation message only fills the gap when the
      // definition has no hint for the objective.
      const written = (missionDef?.objectives || []).find((o) => o.id === open.id)?.hints;
      const hints = Array.isArray(written) ? written.filter(Boolean) : [];
      const body = hints.length ? hints.join('\n  ') : (open.message || 'Work through the mission step by step.');
      return { output: `Hint for "${open.label || MISSION_OBJECTIVE_LABELS[open.id] || open.id}":\n  ${body}` };
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
  }, [session, objectives, attempt, applyAttemptState, reset, navigate, missionDef]);

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

  const missionForBrief = { callsign, brief: briefLines };
  const done = attempt.status === 'COMPLETED' || !!debrief;
  const labObjectiveIds = LAB_OBJECTIVE_IDS_BY_LAB[labId] || [];
  const labObjectives = objectives.filter((o) => labObjectiveIds.includes(o.id));
  const labLike = {
    id: labId,
    objectives: labObjectives.map((o) => ({ id: o.id, label: o.label || MISSION_OBJECTIVE_LABELS[o.id] || o.id })),
  };
  // Lab objectives as the definition serves them (with hints) for the
  // terminal workspace's attestation list; pass/fail comes from the last
  // lab validation (see MissionLabObjectives).
  const labDefObjectives = (missionDef?.objectives || []).filter((o) => labObjectiveIds.includes(o.id));
  const results = session.validation_results || [];
  // The dossier's beats + intel come from the frontend mission framing for
  // this lab. The flood mission's intel is the reported flooder, which lives
  // in the ATTEMPT findings, not the lab session's — so the dossier reads
  // the two merged.
  const missionForDossier = getMission({ id: labId }) || { callsign, brief: briefLines, beats: {}, intelKeys: ['flags'] };
  const dossierFindings = isSocMission
    ? session.findings
    : { ...(session.findings || {}), flood: missionFindings?.flood };

  return (
    <div className="min-h-[100dvh] text-ink-1">
      <header className="sticky top-safe z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-1 nav-solid mx-auto flex max-w-6xl flex-wrap items-center gap-2 rounded-card px-3 py-2 sm:px-4 min-[1810px]:max-w-[112rem]">
          <ShieldCheck size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body font-semibold">{callsign} — {title}</span>
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset} disabled={busy}>Reset</Button>
          <Button size="sm" variant="secondary" to={lessonId ? `/academy/lessons/${lessonId}` : '/labs'}>Lesson</Button>
          <Button size="sm" variant="secondary" to="/labs">Exit</Button>
        </div>
      </header>

      {/* Terminal page: no 3D room — the briefing screen owns it. Wide
          desktops (min 1810 px) get three columns: the transmission +
          brief cluster left, the topology + firewall centre, the console
          + incident report right — so the key cards are all in the first
          viewport and the learner never has to scroll to the bottom to
          find the report. Below the gate the two-column stacked layout
          stands. */}
      <main className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[20rem_1fr] min-[1810px]:max-w-[112rem] min-[1810px]:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        <div className="space-y-4 min-[1810px]:col-start-1 min-[1810px]:row-start-1">
          <MissionBrief mission={missionForBrief} />
          {typeof missionDef.xp === 'number' && (
            <p className="text-small text-ink-2">
              First completion earns {missionDef.xp} XP — replays earn none.
            </p>
          )}
          {/* The briefing plays on the briefing screen (the robots read
              it there, one paragraph at a time), so the "Hear the
              briefing" card's wording and its Listen button are gone
              — Spencer, 2026-11-14: "No need to have any wording there."
              Only the sound controls stay, slim and unobtrusive, so the
              learner can re-listen, mute, or turn Cypher down. */}
          {briefLines.length > 0 && (
            <div className="px-1">
              <CypherVoiceButton
                text={briefLines.join('\n')}
                voice={cypherVoice}
                eventContext={{ mission_id: missionId }}
                controlsOnly
              />
            </div>
          )}
          {/* No objectives checklist lives on this page: the terminal is the
              only place the student checks where they stand (run `objectives`
              in the Mission Console). */}
          <Card level={2}>
            <h2 className="text-heading text-ink-1">Where do you stand?</h2>
            <p className="mt-1 text-small text-ink-2">
              Check the Mission Console: run <code>objectives</code> for the list,{' '}
              <code>progress</code> for the count, and <code>hint</code> when you are stuck.
              {isSocMission ? ' After changing the firewall, run ' : ' After capturing, run '}
              <code>check</code> to re-validate first.
            </p>
          </Card>
          {isSocMission && (
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
          )}
        </div>

        {/* Centre column: the 2D topology (the inspection tool — the 3D
            room lives on the briefing screen now) + the firewall for
            Broken Shield; the evidence + packet analysis for the flood
            mission. Below the wide gate it sits in the right column under
            the brief cluster, as today; on wide desktops it is row 1
            centre. */}
        <div className="space-y-4 lg:col-start-2 lg:row-start-1 min-[1810px]:col-start-2 min-[1810px]:row-start-1">
          {isSocMission && (
          <Card level={2}>
            <h2 className="text-heading text-ink-1">Topology — inspect the devices</h2>
            <p className="mt-1 text-small text-ink-2">
              Click each device to inspect it — the topology objective passes once all four are inspected.
            </p>
            <div className="mt-4">
              <MissionTopology
                devices={MISSION_TOPOLOGY_DEVICES}
                inspected={inspected}
                onInspect={onInspect}
                guestBlocked={passed('guest-blocked') ? true : null}
                trustedAllowed={passed('trusted-allowed') ? true : null}
                activeDevice={null}
              />
            </div>
          </Card>
          )}
          {isSocMission && (
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
          )}

          {/* Terminal missions: the evidence first, then the attestation
              list — the learner records each step here after running it
              for real in the console below. */}
          {!isSocMission && (
          <Card level={2} className="mission-console">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <TerminalSquare size={18} className="text-terminal-bright" aria-hidden="true" />
              <h2 className="font-mono text-heading text-terminal-bright">Your evidence</h2>
              <span className="hidden text-caption text-terminal-muted sm:inline">
                flood.pcap is in your home directory — read it with tshark, tcpdump, or Wireshark
              </span>
            </div>
            <p className="text-small leading-relaxed text-terminal-muted">
              The flood is in <code>flood.pcap</code>: a little ordinary traffic, then a burst of
              packets against the web server from a single internal host. <code>capture.pcap</code> and{' '}
              <code>dns-exfil.pcap</code> are there too, from the lab&apos;s earlier objectives.
              Any tool works — the mission checks your finding, not your tool.
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-terminal-bg p-3 font-mono text-[12px] leading-relaxed text-terminal-text">
{`tshark -r flood.pcap -q -z io,phs
tshark -r flood.pcap -T fields -e ip.src | sort | uniq -c | sort -n`}
            </pre>
          </Card>
          )}
          {!isSocMission && (
            <Card level={2}>
              <h2 className="text-heading text-ink-1">Packet analysis</h2>
              <p className="mt-1 text-small text-ink-2">
                Work the capture in the Mission Console, then record each step — “I did this” is
                how this lab&apos;s objectives are checked.
              </p>
              <div className="mt-4">
                <MissionLabObjectives
                  objectives={labDefObjectives}
                  results={results}
                  onAttest={attestLabObjective}
                  busy={busy}
                />
              </div>
            </Card>
          )}
        </div>

        {/* Right rail: the console and the incident report live beside the
            topology + firewall on wide desktops, so the learner sees both
            in the first viewport instead of scrolling to the bottom.
            Below the wide gate this rail sits under the centre column,
            as today. */}
        <div className="space-y-4 lg:col-start-2 lg:row-start-2 min-[1810px]:col-start-3 min-[1810px]:row-start-1">
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
                banner={isSocMission
                  ? ['[ MISSION CONSOLE v1 ]', 'establishing uplink ............ OK', 'routing to R1 ............ ONLINE', `objectives: ${total} · callsign: ${callsign}`, 'type `help` for available operations', '']
                  : ['[ MISSION CONSOLE v1 ]', 'analyst workstation ............ ONLINE', `objectives: ${total} · callsign: ${callsign}`, 'capture: flood.pcap is in your home directory', 'type `help` for available operations', '']}
                prompt={isSocMission ? 'R1# ' : 'analyst@analyst-ws:~$ '}
                disabled={session.status === 'EXPIRED'}
                onSession={setSession}
                onError={setError}
              />
            </div>
          </Card>

          {/* Terminal missions only: report the flooding host + flood type.
              A wrong report is stored, not an error — the objective's message
              says which half is wrong. */}
          {!isSocMission && !done && (
            <Card level={2}>
              <h2 className="text-heading text-ink-1">Report the flooder</h2>
              <p className="mt-1 text-small text-ink-2">
                Name the flooding host and the kind of flood. Any tool works — tshark, tcpdump,
                Wireshark — this checks your finding, not your tool.
              </p>
              <div className="mt-4">
                <FloodReportForm
                  initial={missionFindings?.flood || {}}
                  feedback={objectives.find((o) => o.id === 'flood-source')?.message || ''}
                  reported={passed('flood-source')}
                  onSubmit={reportFlooder}
                  busy={busy}
                  disabled={session.status === 'EXPIRED'}
                />
              </div>
            </Card>
          )}

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
                  {...(!isSocMission ? {
                    gateHint: 'Finish the other objectives first — the report files once the flood is identified and the capture work is done.',
                    placeholders: {
                      summary: 'e.g. The intranet barely responded — one internal host was flooding the web server with SYNs.',
                      root_cause: 'e.g. One internal host sent a burst of SYNs with no handshake; the server’s backlog filled and it stopped answering.',
                      fix: 'e.g. Blocked the flooding host and rate-limited SYNs, then verified the intranet responds.',
                    },
                  } : {})}
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
        </div>

        {/* Bottom row: outcome cards, full width. */}
        <div className="space-y-4 lg:col-span-2 lg:row-start-3 min-[1810px]:col-span-3 min-[1810px]:row-start-2">
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
                  <p className="text-body font-semibold text-ink-1">Cypher explains the outcome</p>
                  <p className="mt-1 text-small text-ink-2">
                    Cypher reads your validated results — score and which objectives
                    passed — and explains what they mean. He never re-grades your work.
                    He reads it aloud as soon as it arrives.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={explainOutcome} loading={explainLoading} disabled={explainLoading}>
                      Ask Cypher to explain the outcome
                    </Button>
                    {explainLoading && (
                      <Button size="sm" variant="ghost" onClick={stopExplain}>Stop</Button>
                    )}
                  </div>
                  {explainError && <p className="mt-3 text-small text-danger">{explainError}</p>}
                  {explainText && (
                    <div className="mt-3 rounded-control border border-violet-700/20 bg-violet-50 p-3.5 text-sm leading-relaxed text-ink-1" aria-live="polite">
                      <TutorText text={explainText} />
                      {cypherVoice.playing && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { cypherVoice.stop(); }}>Stop</Button>
                        </div>
                      )}
                      {cypherVoice.subtitle && (
                        <p className="mt-2 text-small text-ink-2" aria-live="polite">
                          <span className="font-bold text-action-hover">Cypher:</span> {cypherVoice.subtitle}
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
            <MissionDossier lab={labLike} mission={missionForDossier} results={results} findings={dossierFindings} />
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
