import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui-glass';
import { useCypherVoice, fetchVoiceStatus } from '@/api/voice';
import { splitBriefing } from '@/data/missions';
import { missionsApi } from '@/api/missions';
import { friendlyErrorMessage } from '@/lib/errors';
import UpgradePrompt from '@/components/UpgradePrompt';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useTheme } from '@/components/ThemeProvider';

// The 3D SOC room is lazy-loaded so three.js never enters the main chunk —
// and so the terminal page never loads it at all: this briefing screen is
// the only route that imports the scene.
const MissionSocScene = React.lazy(() => import('@/components/three/MissionSocScene'));

// The SOC room holds no mission equipment (Spencer, 2026-11-17): the
// router, server and the two PCs live only in the terminal page's 2D
// topology, where the learner works with them. A stable empty list keeps
// the scene from re-building on every render.
const NO_DEVICES = [];

// Mission opening timings (seconds). The opening plays like a video on
// entry (fresh attempt only): a short cinematic establishing shot, then
// the split briefing — each robot reads their paragraph with the camera
// on them — then the hand-off to the terminal. (The device tour that
// followed the briefing was removed 2026-11-17 with the devices.)
// Safety caps: a briefing turn advances on its own if the voice stalls
// (the hook's suspended-context fallback guarantees playing ends), so
// no phase can hang.
const OPEN_OPEN_S = 1.8;
const OPEN_BRIEFING_CAP_S = 60;
// The hand-off to the mission terminal is a visible transition, not a
// jump: "Connecting to the mission portal…" (1.2 s), then "Connection
// established" (0.8 s) — 2.0 s total — then the terminal page.
const CONNECT_S = 1.2;
const ESTABLISHED_S = 0.8;

/** The mission briefing screen — full-screen 3D lab, nothing else.
 * Standing structure rule (2026-11-16, all missions): this page is just
 * the 3D lab with the three robots in it talking and explaining what the
 * mission is about. No transmission panel (the text lives on the terminal
 * page), no 3D/2D toggle and no 2D topology (the topology is the terminal
 * page's inspection tool, and only there), no header, no cards. The
 * caption stays — it is the only text on the page — at the BOTTOM of the
 * screen. When the briefing finishes (all turns played, or the learner
 * skips it) the screen shows the connecting transition and
 * hands the learner to the mission terminal page (/missions/:missionId/terminal),
 * which has no 3D room at all. EVERY mission starts here (Spencer,
 * 2026-11-17: "every single mission starts in the SOC room — that is where
 * you get your instructions"): the robots read that mission's briefing.
 * The room holds the three robots only: the mission's devices (router,
 * server, PCs) are worked with in the terminal page's 2D topology, never
 * shown here. A resumed
 * attempt is mid-mission, not starting it, so it goes straight to the
 * terminal.
 * The heavy 3D code loads ONLY here: the terminal page must never import
 * the scene. If the 3D renderer fails, there is no 2D fallback on this
 * page anymore — the learner goes straight to the terminal, where the
 * topology is. */
export default function MissionBriefing() {
  useDocumentTitle('Mission Briefing · Road to CISSP');
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const terminalUrl = `/missions/${missionId}/terminal`;
  const [missionDef, setMissionDef] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [error, setError] = useState('');
  const [entitled, setEntitled] = useState(true);
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
  // The briefing, split into spoken turns — one per robot, from the
  // existing text only (see splitBriefing in src/data/missions.js):
  // Cypher opens with the introduction, Sentinel reads the servers part,
  // Patch reads the security part, Cypher closes with the console
  // instructions. Each turn is read in its speaker's own voice when the
  // backend has that character's voice configured — otherwise it falls
  // back to Cypher's voice (see voiceCharsRef below and the status fetch
  // in the load effect), so the briefing is never silent: today only
  // Cypher is configured, so all four turns read in his voice, and the
  // camera and the caption — not the voice — say who is speaking. Once
  // Sentinel/Patch voice IDs are live on the server, their turns switch
  // to their own voices automatically, with no re-deploy.
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
  // the camera on them) -> 'done' (connecting transition, then the
  // terminal). The phase lives in state (it drives the caption + Skip
  // button); the speaker ref is what the scene tick reads every frame.
  const [openingPhase, setOpeningPhase] = useState('open');
  const [briefingTurnIdx, setBriefingTurnIdx] = useState(0);
  // Index of the briefing turn already started (-1: none yet). The ref
  // keeps a turn from re-speaking when the effect re-runs on a playing
  // flip; the state advances the turn once the voice ends.
  const briefingTurnSpokenRef = useRef(-1);
  // The 60 s per-turn briefing safety cap, held in a ref so the phase
  // machine's cleanup can't clear it on a voice flip (see the phase
  // machine below). Cleared by the dedicated effect when the turn advances
  // or the briefing ends.
  const briefingCapRef = useRef(null);
  const voicePlayRef = useRef(null);
  voicePlayRef.current = cypherVoice.play;
  // Which characters have a voice configured, from GET /voice/status
  // (null until the status answers). A briefing turn is read in its
  // speaker's own voice when configured, else in Cypher's — the fallback
  // is what keeps the briefing audible today, when only Cypher is
  // configured. A ref, not state: the phase machine reads it at turn
  // start and no re-render is needed when the status lands.
  const voiceCharsRef = useRef(null);
  const voiceStopRef = useRef(null);
  voiceStopRef.current = cypherVoice.stop;
  // Hand-off step once the opening is done: null | 'connecting' |
  // 'established'. Drives the transition overlay (see the 'done' effect).
  const [connectStep, setConnectStep] = useState(null);

  useEffect(() => {
    speakerRef.current = openingPhase === 'briefing'
      ? (briefingTurns[briefingTurnIdx]?.speaker || 'cypher')
      : 'wide';
  }, [openingPhase, briefingTurnIdx, briefingTurns]);

  // Opening phase machine: 'open' -> 'briefing' -> 'done'. The 'briefing' step plays the split briefing one turn at a
  // time: it starts the current turn's read-aloud once (the ref keeps it
  // from re-speaking when the effect re-runs on a playing flip) and
  // advances to the next turn when the voice ends after having played;
  // the hook's suspended-context fallback guarantees playing ends even
  // when Safari blocks audio, and the 60 s cap advances it regardless
  // (per turn, so a stalled turn never hangs the sequence). A mission
  // with no briefing lines goes straight to the hand-off; the 'briefing'
  // step waits for the mission to load rather than skipping on an empty
  // turn list (the 'open' timer can fire before the API answers).
  useEffect(() => {
    if (openingPhase === 'done') return undefined;
    if (openingPhase === 'open') {
      const t = setTimeout(() => setOpeningPhase('briefing'), OPEN_OPEN_S * 1000);
      return () => clearTimeout(t);
    }
    if (openingPhase === 'briefing') {
      if (!missionDef) return undefined;
      const turns = briefingTurns;
      if (!turns.length) {
        setOpeningPhase('done');
        return undefined;
      }
      if (briefingTurnIdx >= turns.length) {
        setOpeningPhase('done');
        return undefined;
      }
      const turn = turns[briefingTurnIdx];
      if (briefingTurnSpokenRef.current !== briefingTurnIdx) {
        briefingTurnSpokenRef.current = briefingTurnIdx;
        // The speaker's own voice when the backend has it configured,
        // else Cypher's (voiceCharsRef is null until the status fetch
        // below answers, so an early turn still reads in Cypher's).
        const voice = voiceCharsRef.current?.[turn.speaker] ? turn.speaker : 'cypher';
        voicePlayRef.current?.(turn.text, voice, 'briefing');
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
  // The briefing is over (all turns played, or the learner skipped it): stop the voice so no briefing audio bleeds into
  // the terminal page, then show the connecting transition — "Connecting
  // to the mission portal…" (1.2 s), "Connection established" (0.8 s) —
  // and hand the learner to the mission terminal. The transition is a
  // visible beat, not a jump: the old code navigated the instant the
  // tour ended, which read as the page vanishing.
  useEffect(() => {
    if (openingPhase !== 'done') return undefined;
    voiceStopRef.current?.();
    setConnectStep('connecting');
    const t1 = setTimeout(() => setConnectStep('established'), CONNECT_S * 1000);
    const t2 = setTimeout(() => navigate(terminalUrl, { replace: true }), (CONNECT_S + ESTABLISHED_S) * 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [openingPhase, terminalUrl, navigate]);
  // Leaving mid-briefing (back): stop the voice too.
  useEffect(() => () => { voiceStopRef.current?.(); }, []);

  // Load the mission + start the attempt. Terminal missions have no
  // briefing screen, and a resumed attempt is mid-mission, not watching
  // an intro — both go straight to the terminal page.
  useEffect(() => {
    let live = true;
    // Per-character voices (best-effort — fetchVoiceStatus never throws):
    // which robots have a voice configured. Fires in parallel with the
    // mission load, and the opening's 1.8 s cinematic runs before the
    // first turn speaks, so the status is in the ref by then. Until it
    // answers, voiceCharsRef stays null and every turn reads in Cypher's
    // voice — the briefing is never silent.
    fetchVoiceStatus().then((status) => {
      if (live) voiceCharsRef.current = status?.characters || {};
    });
    (async () => {
      try {
        const def = await missionsApi.getMission(missionId);
        const started = await missionsApi.start(missionId);
        if (!live) return;
        if (started.resumed) {
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
          setError(friendlyErrorMessage(e));
        } else {
          setError(friendlyErrorMessage(e, { fallback: 'Mission unavailable.' }));
        }
      }
    })();
    return () => { live = false; };
  }, [missionId, terminalUrl, navigate]);

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

  // WebGL failed: there is no 2D fallback on this page anymore — the
  // briefing is the 3D lab, and the 2D topology lives on the terminal
  // page. Go straight there; the mission is fully playable from it.
  const handleRendererFailed = useCallback(() => {
    voiceStopRef.current?.();
    navigate(terminalUrl, { replace: true });
  }, [terminalUrl, navigate]);

  // Skip the opening: stop the voice and hand the mission over — the
  // 'done' effect above runs the connecting transition, then redirects.
  const skipOpening = () => {
    cypherVoice.stop();
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

  const background = theme === 'dark' ? '#111111' : '#F8F7FF';
  const passed = (id) => objectives.find((o) => o.id === id)?.passed || false;
  const incidentActive = !passed('guest-blocked');
  const contained = passed('guest-blocked') && passed('trusted-allowed');
  // Opening caption: a label for the current moment (not dialogue — the
  // spoken lines are only the existing briefing text, read by Cypher's
  // voice). While a turn plays, the subtitle is the spoken words; before
  // it starts, the label names the speaker and their room. The caption
  // sits at the BOTTOM of the screen, over the 3D lab — it is the only
  // text on this page.
  const briefingTurn = openingPhase === 'briefing' ? briefingTurns[briefingTurnIdx] : null;
  const briefingTurnLabel = briefingTurn?.speaker === 'sentinel' ? 'Sentinel — server room'
    : briefingTurn?.speaker === 'patch' ? 'Patch — workshop'
    : 'Cypher reads the briefing…';
  const openingCaption = openingPhase === 'open' ? 'Opening the SOC…'
    : openingPhase === 'briefing' ? (cypherVoice.subtitle || briefingTurnLabel)
    : null;
  const openingActive = openingPhase !== 'done';

  return (
    <div className={`fixed inset-0 overflow-hidden bg-black text-ink-1${openingActive ? ' soc-open' : ''}`}>
      {/* The 3D room fills the screen on landscape screens. On a phone in
          portrait it sits in a square window centred on black (letterbox):
          the shots are framed for a wide frame, and a full-height portrait
          view showed mostly floor. The lens widens to match (socFovForAspect). */}
      <div className="flex h-full w-full items-center justify-center">
      <div className="h-full w-full portrait:h-auto portrait:aspect-square">
      <React.Suspense fallback={<div className="flex h-full items-center justify-center text-ink-2">Loading SOC room…</div>}>
        <MissionSocScene
          devices={NO_DEVICES}
          incidentActive={incidentActive}
          contained={contained}
          onRendererFailed={handleRendererFailed}
          background={background}
          reducedMotion={reducedMotion}
          cypherVoiceRef={cypherVoiceRef}
          speakerRef={speakerRef}
        />
      </React.Suspense>
      </div>
      </div>
      {openingCaption && (
        <p className="absolute inset-x-0 bottom-0 z-10 bg-black/60 px-4 py-3 text-center text-body text-white" aria-live="polite">{openingCaption}</p>
      )}
      {openingActive && (
        <button type="button" onClick={skipOpening} className="absolute right-4 top-4 z-10 rounded-control border border-white/20 bg-black/60 px-2.5 py-1 text-caption font-semibold text-white">
          Skip intro
        </button>
      )}
      {connectStep && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <p className="px-4 text-center text-title font-semibold text-white" aria-live="polite">
            {connectStep === 'connecting' ? 'Connecting to the mission portal…' : 'Connection established'}
          </p>
        </div>
      )}
    </div>
  );
}
