import React, { useCallback, useRef } from 'react';
import ModelViewer from '@/components/three/ModelViewer';
import {
  ROBOT_CLIPS as CYPHER_CLIPS,
  ROBOT_LOOP_CLIPS as CYPHER_LOOP_CLIPS,
  ROBOT_ONE_SHOT_CLIPS as CYPHER_ONE_SHOT_CLIPS,
  loadRobotCharacter,
  preloadRobotCharacter,
} from '@/components/three/RobotCharacter';

// Cypher, the 3D AI tutor robot (Cyber Missions Phase 2). The model is the
// real Meshy build (public/models/cypher.glb) — 1.70 m tall, 24 bones,
// 1 SkinnedMesh, 6 animation clips. No placeholder: if the GLB fails to
// load, the caller keeps its fallback (the SOC keeps its devices, the
// lesson panel hides the 3D view and keeps the text tutor).
//
// The loader itself lives in RobotCharacter.jsx — Cypher, Sentinel and
// Patch share one rig shape and one clip set, so one loader drives all
// three. This module keeps Cypher's public API (clip names, preload,
// loader, viewer) so existing imports keep working.

export { CYPHER_CLIPS, CYPHER_LOOP_CLIPS, CYPHER_ONE_SHOT_CLIPS };

/** Load cypher.glb and return its clip controller (see RobotCharacter). */
export function loadCypherCharacter() {
  return loadRobotCharacter('cypher');
}

/**
 * Warm the browser cache for cypher.glb so the SOC scene's load resolves
 * fast on direct entry, not only on the handoff path (whose lesson panel
 * already warmed the cache by loading the same GLB — which is why Cypher
 * appeared there first). Fire-and-forget, never rejects, and fetches at
 * most once per page load. `fetchImpl` is injectable for tests; without a
 * fetch implementation (SSR / node) it is a no-op.
 */
export function preloadCypherCharacter(fetchImpl) {
  return preloadRobotCharacter('cypher', fetchImpl);
}

/**
 * A small standalone Cypher viewer for the lesson panel: Cypher standing
 * alone, idle animation, optional talking state driven by the voice hook.
 * `voiceRef` is a shared mutable ref { talking, level } the parent also
 * hands to the voice hook — the tick reads it every frame, so talking
 * starts/stops without re-rendering. Renders nothing (keeps the text tutor)
 * when the GLB cannot load.
 *
 * Presenter-only: the viewer is NOT interactive (no drag, no zoom, no
 * click-for-info — the camera is fixed). Cypher animates as a teacher
 * instead, driven by the dialogue state: he greets when the panel opens,
 * points once when he starts speaking, talks while the voice plays, and
 * idles otherwise. The walk cycle belongs to the SOC, where he enters
 * through the door (see MissionSocScene).
 */
export default function CypherViewer({ voiceRef, className = '' }) {
  const controllerRef = useRef(null);
  const lastTRef = useRef(null);
  const mountedRef = useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);

  const buildScene = useCallback((scene) => {
    const state = { ready: false };
    loadCypherCharacter()
      .then((controller) => {
        if (!mountedRef.current) {
          controller.dispose();
          return;
        }
        controllerRef.current = controller;
        // Centre Cypher in the frame: real scale is 1.70 m, so lift him so
        // his feet sit on y=0 and the camera frames head to toe.
        controller.group.position.set(0, 0, 0);
        controller.group.rotation.y = 0;
        scene.add(controller.group);
        // Presenter greeting on open: a one-shot that returns to idle
        // (the mixer's 'finished' handler) once it plays through.
        controller.play('greeting');
        state.ready = true;
      })
      .catch(() => { /* GLB missing/unparseable — the panel hides the view */ });

    const tick = (t) => {
      const controller = controllerRef.current;
      if (!controller || !state.ready) return;
      const last = lastTRef.current;
      lastTRef.current = t;
      const dt = last === null ? 0 : Math.min(t - last, 0.1);
      const voice = voiceRef?.current;
      if (voice) {
        controller.setTalkLevel(voice.level || 0);
        if (voice.talking && !controller.isTalking()) {
          // Speech starts: talk, and point once at the explanation —
          // the one-shot returns to the talk loop (or idle) when it
          // finishes, and isTalking() stays true, so it never re-fires
          // mid-speech.
          controller.setTalking(true);
          controller.play('point');
        }
        if (!voice.talking && controller.isTalking()) controller.setTalking(false);
      }
      controller.update(dt);
    };

    // ModelViewer disposes the scene's geometries/materials on unmount;
    // the mixer itself stops when the RAF loop is cancelled.
    return { parts: [], tick };
  }, [voiceRef]);

  return (
    <div className={`h-56 w-full sm:h-64 ${className}`}>
      <ModelViewer
        buildScene={buildScene}
        cameraPos={[0, 1.6, 5.2]}
        target={[0, 0.85, 0]}
        reducedMotion={false}
        quality="high"
        interactive={false}
      />
    </div>
  );
}
