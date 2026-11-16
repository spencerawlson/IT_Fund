import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TerminalSquare, ShieldCheck, Map, Boxes, Lock, SearchX } from 'lucide-react';
import { Button, Card, EmptyState } from '@/components/ui-glass';
import { MissionBrief } from '@/components/labs/Mission';
import MissionTopology, { MISSION_TOPOLOGY_DEVICES } from '@/components/missions/MissionTopology';
import { useCypherVoice } from '@/api/voice';
import { SHOWCASE_ORDER } from '@/components/three/socLayout';
import { splitBriefing } from '@/data/missions';
import { missionsApi } from '@/api/missions';
import UpgradePrompt from '@/components/UpgradePrompt';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useTheme } from '@/components/ThemeProvider';

// The 3D SOC room is lazy-loaded so three.js never enters the main chunk —
// and so the terminal page never loads it at all: this briefing screen is
// the only route that imports the scene.
const MissionSocScene = React.lazy(() => import('@/components/three/MissionSocScene'));

const SOC_MISSION_ID = 'op-broken-shield';

const readStored = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
};

function titleCase(callsign) {
  return (callsign || '').toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
}

// Mission opening timings (seconds). The opening plays like a video on
// entry (fresh attempt only): a short cinematic establishing shot, then
// the split briefing — each robot reads their paragraph with the camera
// on them — then a tour of the four devices. The tour dwells 4 s per
// device (was 2.5 s): the live check found the 2.5 s tour unreadable —
// the camera was still gliding to each device for half the dwell, and
// the tour was over before the check looked up from the briefing. The
// scene also settles faster during the showcase (CAMERA_DAMP_SHOWCASE).
// Safety caps: a briefing turn advances on its own if the voice stalls
// (the hook's suspended-context fallback guarantees playing ends), so
// no phase can hang.
const OPEN_OPEN_S = 1.8;
const OPEN_SHOWCASE_S = 4.0;
const OPEN_BRIEFING_CAP_S = 60;

/** The mission briefing screen: the 3D SOC room delivers the incoming
 *  transmission — Cypher, Sentinel and Patch read the mission objective,
 *  spoken, with the transmission text visible below the room. When the
 *  briefing finishes (all turns played + the device tour, or the learner
 *  skips it) the screen closes and redirects to the mission terminal page
 *  (/missions/:missionId/terminal), which has no 3D room at all.
 *  Terminal missions and resumed attempts never see this screen — they go
 *  straight to the terminal (the old "opening skipped" behaviour, now a
 *  redirect instead of a silent phase change). The heavy 3D code loads
 *  ONLY here: the terminal page must never import the scene. */
export default function MissionBriefing() {
  useDocumentTitle('Mission Briefing · Road to CISSP');
  const { missionId } = useParams();
  const isSocMission = missionId === SOC_MISSION_ID;
  const navigate = useNavigate();
  const { theme } = useTheme();
  const terminalUrl = `/missions/${missionId}/terminal`;
  const [missionDef, setMissionDef] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [error, setError] = useState('');
  const [entitled, setEntitled] = useState(true);
  const [view, setView] = useState(() => (readStored('rtc-mission-view', '3d') === '2d' ? '2d' : '3d'));
  const [quality, setQuality] = useState(() => (readStored('rtc-mission-quality', 'high') === 'low' ? 'low' : 'high'));
  const [reducedMotion, setReducedMotion] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  // Shared Cypher voice state { talking, level }: the voice hook writes it
  // while audio plays and the SOC scene's tick reads it every frame, so the
  // 3D Cypher talks (talk clip + audio-reactive head bob) without
  // re-rendering the scene.
  const cypherVoiceRef = useRef({ talking: false, level: 0 });
  const cypherVoice = useCypherVoice(cypherVoiceRef);
  // Briefing lines come from the API; fall back to the mission description.
  // (Computed here, before the opening effects below, because the turn
  // split feeds them.) The backend serves them under `briefing`; the
  // frontend copy under `brief`.
  const briefLines = missionDef?.brief || missionDef?.briefing || missionDef?.lines
    || (missionDef?.description ? [missionDef.description] : []);
  const callsign = missionDef?.callsign || 'OPERATION BROKEN SHIELD';
  const title = missionDef?.title || titleCase(callsign);
  // The briefing, split into spoken turns — one per robot, from the
  // existing text only (see splitBriefing in src/data/missions.js):
  // Cypher opens with the introduction, Sentinel reads the servers part,
  // Patch reads the security part, Cypher closes with the console
  // instructions. All four turns are read by Cypher's voice: it is the
  // only character voice configured (/api/voice/status: cypher true,
  // sentinel/patch false), so until per-character voices exist the camera
  // and the caption — not the voice — say who is speaking.
  const briefingTurns = useMemo(
    () => splitBriefing(briefLines),
    [briefLines],
  );
  // Who is talking, for the SOC camera: during the opening each briefing
  // turn's speaker drives it (the camera is on whoever is speaking). The
  // scene reads speakerRef every frame.
  const speakerRef = useRef('wide');
  // --- Mission opening (plays like a video, on entry, fresh attempt only).
  // Phases: 'open' (cinematic establishing shot) -> 'briefing' (the split
  // briefing, one turn at a time: each robot reads their paragraph with
  // the camera on them) -> 'showcase' (the four devices, one at a time,
  // each shown + labelled in 3D) -> 'done' (redirect to the terminal).
  // The phase lives in state (it drives the SOC card's caption + Skip
  // button); the speaker/showcase refs are what the scene tick reads
  // every frame.
  const [openingPhase, setOpeningPhase] = useState('open');
  const [briefingTurnIdx, setBriefingTurnIdx] = useState(0);
  const [showcaseDevice, setShowcaseDevice] = useState(null);
  const showcaseRef = useRef(null);
  // Index of the briefing turn already started (-1: none yet). The ref
  // keeps a turn from re-speaking when the effect re-runs on a playing
  // flip; the state advances the turn once the voice ends.
  const briefingTurnSpokenRef = useRef(-1);
  // The 60 s per-turn briefing safety cap, held in a ref so the phase
  // machine's cleanup can't clear it on a voice flip (see the phase
  // machine below). Cleared by the dedicated effect when the turn advances
  // or the briefing ends.
  const briefingCapRef = useRef(null);
  // Wall-clock start of the device showcase (Date.now()), so the tour
  // runs on deadlines, not fresh timeouts (see the showcase effect).
  const showcaseStartRef = useRef(null);
  const voicePlayRef = useRef(null);
  voicePlayRef.current = cypherVoice.play;
  const voiceStopRef = useRef(null);
  voiceStopRef.current = cypherVoice.stop;

  useEffect(() => {
    speakerRef.current = openingPhase === 'briefing'
      ? (briefingTurns[briefingTurnIdx]?.speaker || 'cypher')
      : 'wide';
  }, [openingPhase, briefingTurnIdx, briefingTurns]);
  useEffect(() => { showcaseRef.current = showcaseDevice; }, [showcaseDevice]);

  // Opening phase machine — split in two, on purpose. This effect owns
  // 'open' + 'briefing' only, and it is the only one that watches the
  // voice. The 'briefing' step plays the split briefing one turn at a
  // time: it starts the current turn's read-aloud once (the ref keeps it
  // from re-speaking when the effect re-runs on a playing flip) and
  // advances to the next turn when the voice ends after having played;
  // the hook's suspended-context fallback guarantees playing ends even
  // when Safari blocks audio, and the 60 s cap advances it regardless
  // (per turn, so a stalled turn never hangs the sequence). A mission
  // with no briefing lines skips straight to the showcase; the
  // 'briefing' step waits for the mission to load rather than skipping
  // on an empty turn list (the 'open' timer can fire before the API
  // answers). SPLIT: the showcase effect below does not watch the voice,
  // because a voice flip re-running the showcase timer was the
  // 2026-11-14 defect — each flip cleared the pending 4 s timeout and
  // started a fresh one, stretching dwells to ~10-12 s live.
  useEffect(() => {
    if (openingPhase === 'done' || openingPhase === 'showcase') return undefined;
    if (openingPhase === 'open') {
      const t = setTimeout(() => setOpeningPhase('briefing'), OPEN_OPEN_S * 1000);
      return () => clearTimeout(t);
    }
    if (openingPhase === 'briefing') {
      if (!missionDef) return undefined;
      const turns = briefingTurns;
      if (!turns.length) {
        setOpeningPhase('showcase');
        return undefined;
      }
      if (briefingTurnIdx >= turns.length) {
        setOpeningPhase('showcase');
        return undefined;
      }
      const turn = turns[briefingTurnIdx];
      if (briefingTurnSpokenRef.current !== briefingTurnIdx) {
        briefingTurnSpokenRef.current = briefingTurnIdx;
        voicePlayRef.current?.(turn.text);
        // Safety cap: if the voice stalls, the opening still advances.
        // The cap lives in a ref, NOT in this effect's cleanup: the
        // effect re-runs on every voice flip, and a cleanup here cleared
        // the cap on the first flip — so a turn whose voice actually
        // started was never guarded (the 2026-11-14 defect). The
        // dedicated effect below clears it when the turn advances or
        // the briefing ends.
        if (briefingCapRef.current) clearTimeout(briefingCapRef.current);
        briefingCapRef.current = setTimeout(() => setBriefingTurnIdx((i) => i + 1), OPEN_BRIEFING_CAP_S * 1000);
        return undefined;
      }
      if (!cypherVoice.loading && !cypherVoice.playing) {
        const t = setTimeout(() => setBriefingTurnIdx((i) => i + 1), 400);
        return () => clearTimeout(t);
      }
      return undefined;
    }
    return undefined;
  }, [openingPhase, missionDef, briefingTurns, briefingTurnIdx, cypherVoice.loading, cypherVoice.playing]);
  // Briefing safety-cap cleanup: the cap guards one turn, so it is
  // cleared when the turn advances or the briefing ends (a new turn
  // sets its own). Without this the cap would fire into a later turn
  // and advance it early. Cleanups run before the phase machine above
  // sets the next turn's cap (effects run in declaration order), so a
  // fresh cap is never cleared by its predecessor's cleanup.
  useEffect(() => () => {
    if (briefingCapRef.current) {
      clearTimeout(briefingCapRef.current);
      briefingCapRef.current = null;
    }
  }, [openingPhase, briefingTurnIdx]);
  // Showcase timer — voice-free on purpose. The tour runs on a
  // wall-clock deadline, not a fresh timeout per device:
  // showcaseStartRef records when the showcase phase began, and device
  // idx's slot ends at start + (idx + 1) x 4 s. The effect depends only
  // on [openingPhase, showcaseDevice] — a voice flip mid-tour cannot
  // re-run it, and if it does re-run (device change) it reschedules
  // only the *remaining* time to the same deadline. Main-thread
  // saturation can only shrink a later slot, never stretch the tour
  // past 16 s total.
  useEffect(() => {
    if (openingPhase !== 'showcase') {
      showcaseStartRef.current = null;
      return undefined;
    }
    if (showcaseStartRef.current === null) showcaseStartRef.current = Date.now();
    if (!showcaseDevice) {
      setShowcaseDevice(SHOWCASE_ORDER[0]);
      return undefined;
    }
    const idx = SHOWCASE_ORDER.indexOf(showcaseDevice);
    if (idx < 0) {
      setShowcaseDevice(SHOWCASE_ORDER[0]);
      return undefined;
    }
    const deadline = showcaseStartRef.current + (idx + 1) * OPEN_SHOWCASE_S * 1000;
    const remaining = Math.max(0, deadline - Date.now());
    const t = setTimeout(() => {
      if (idx + 1 >= SHOWCASE_ORDER.length) {
        setShowcaseDevice(null);
        setOpeningPhase('done');
      } else {
        setShowcaseDevice(SHOWCASE_ORDER[idx + 1]);
      }
    }, remaining);
    return () => clearTimeout(t);
  }, [openingPhase, showcaseDevice]);
  // The briefing is over (all turns played + the device tour, or the
  // learner skipped it): stop the voice so no briefing audio bleeds into
  // the terminal page, then close this screen and hand the learner to
  // the mission terminal.
  useEffect(() => {
    if (openingPhase !== 'done') return;
    voiceStopRef.current?.();
    navigate(terminalUrl, { replace: true });
  }, [openingPhase, terminalUrl, navigate]);
  // Leaving mid-briefing (Exit, back): stop the voice too.
  useEffect(() => () => { voiceStopRef.current?.(); }, []);

  // Load the mission + start the attempt. Terminal missions have no
  // briefing screen, and a resumed attempt is mid-mission, not watching
  // an intro — both go straight to the terminal page.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const def = await missionsApi.getMission(missionId);
        const started = await missionsApi.start(missionId);
        if (!live) return;
        if (!isSocMission || started.resumed) {
          navigate(terminalUrl, { replace: true });
          return;
        }
        setMissionDef(def);
        setAttempt(started.attempt || null);
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
  }, [missionId, isSocMission, terminalUrl, navigate]);

  // Warm the mission GLB cache on mount: on direct entry the SOC scene
  // would otherwise load cypher.glb cold (the lesson handoff path
  // pre-warms it via the lesson panel, which is why Cypher appeared there
  // first). The SOC now needs all four mission models — the three robots
  // plus the data-center room — so preload them all. Dynamic import so
  // three.js stays out of the main chunk — this shares the chunk the lazy
  // SOC scene loads, it just starts the fetches earlier. This effect lives
  // ONLY on the briefing screen: the terminal page must never load the
  // 3D bundle.
  useEffect(() => {
    let cancelled = false;
    import('@/components/three/RobotCharacter')
      .then((m) => { if (!cancelled) m.preloadMissionRobots(); })
      .catch(() => { /* The robots load on demand in the SOC scene */ });
    return () => { cancelled = true; };
  }, []);

  // Keep reduced-motion in step with the OS while the briefing is open.
  // Reduced motion does NOT skip the opening: speech is not motion, and
  // the SOC scene gentles its own camera (cuts, no tour) — skipping the
  // whole opening under reduced motion froze the mission and silenced
  // the briefing, which reads as a broken page (2026-11-16 live report).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReducedMotion(e.matches);
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
    if (res.objectives) setObjectives(res.objectives);
  }, []);

  // Device inspection from the 2D fallback view: the same server action
  // the terminal page sends, so an inspection here counts there too.
  const doAction = useCallback(async (body) => {
    if (!attempt) return null;
    try {
      const res = await missionsApi.action(attempt.id, body);
      applyAttemptState(res);
      return res;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [attempt, applyAttemptState]);

  const onInspect = useCallback((device) => {
    doAction({ type: 'inspect_device', device }).catch(() => {});
  }, [doAction]);

  // Skip the opening: stop the voice and hand the mission over — the
  // 'done' effect above redirects to the terminal.
  const skipOpening = () => {
    cypherVoice.stop();
    setShowcaseDevice(null);
    setOpeningPhase('done');
  };

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
  if (!missionDef || !attempt) {
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
  const background = theme === 'dark' ? '#111111' : '#F8F7FF';
  const passed = (id) => objectives.find((o) => o.id === id)?.passed || false;
  const missionFindings = attempt?.findings || {};
  const inspected = missionFindings?.topology?.inspected || [];
  const incidentActive = !passed('guest-blocked');
  const contained = passed('guest-blocked') && passed('trusted-allowed');
  // Opening caption: a label for the current moment (not dialogue — the
  // spoken lines are only the existing briefing text, read by Cypher's
  // voice). While a turn plays, the subtitle is the spoken words; before
  // it starts, the label names the speaker and their room.
  const briefingTurn = openingPhase === 'briefing' ? briefingTurns[briefingTurnIdx] : null;
  const briefingTurnLabel = briefingTurn?.speaker === 'sentinel' ? 'Sentinel — server room'
    : briefingTurn?.speaker === 'patch' ? 'Patch — workshop'
    : 'Cypher reads the briefing…';
  const openingCaption = openingPhase === 'open' ? 'Opening the SOC…'
    : openingPhase === 'briefing' ? (cypherVoice.subtitle || briefingTurnLabel)
    : openingPhase === 'showcase' ? (showcaseDevice ? `Equipment tour — ${showcaseDevice}` : 'Equipment tour')
    : null;
  const openingActive = openingPhase !== 'done';

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
          <Button size="sm" variant="secondary" to="/labs">Exit</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-6">
        {/* SOC room: the 3D frame is the briefing's centrepiece, and its
            camera focuses on whoever is talking. When WebGL is unavailable
            the 2D topology stands in — the briefing still plays. */}
        <Card level={2} className={`mission-console${openingActive ? ' soc-open' : ''}`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <TerminalSquare size={18} className="text-terminal-bright" aria-hidden="true" />
            <h2 className="font-mono text-heading text-terminal-bright">SOC Room</h2>
            <span className="hidden text-caption text-terminal-muted sm:inline">
              {view === '3d'
                ? 'Cypher presents the SOC — the briefing plays itself, then hands you to the terminal'
                : '2D topology — fully playable without WebGL'}
            </span>
            {openingActive && (
              <button type="button" onClick={skipOpening} className="ml-auto rounded-control border border-black/10 bg-white/80 px-2.5 py-1 text-caption font-semibold text-ink-1">
                Skip intro
              </button>
            )}
          </div>
          {openingCaption && (
            <p className="mb-3 text-small text-terminal-muted" aria-live="polite">{openingCaption}</p>
          )}
          {view === '3d' ? (
            <React.Suspense fallback={<div className="flex aspect-[16/10] items-center justify-center text-ink-2">Loading SOC room…</div>}>
              <MissionSocScene
                devices={MISSION_TOPOLOGY_DEVICES}
                incidentActive={incidentActive}
                contained={contained}
                onRendererFailed={handleRendererFailed}
                background={background}
                reducedMotion={reducedMotion}
                quality={quality}
                cypherVoiceRef={cypherVoiceRef}
                speakerRef={speakerRef}
                showcaseRef={showcaseRef}
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

        {/* The incoming transmission, as text — the same words the robots
            are speaking, so the objective is readable as well as heard. */}
        <MissionBrief mission={missionForBrief} />
      </main>
    </div>
  );
}
