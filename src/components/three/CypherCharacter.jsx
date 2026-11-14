import React, { useCallback, useRef } from 'react';
import ModelViewer from '@/components/three/ModelViewer';
import {
  ROBOT_CLIPS as CYPHER_CLIPS,
  ROBOT_LOOP_CLIPS as CYPHER_LOOP_CLIPS,
  ROBOT_ONE_SHOT_CLIPS as CYPHER_ONE_SHOT_CLIPS,
  loadRobotCharacter,
  preloadRobotCharacter,
} from '@/components/three/RobotCharacter';
import { loadDeviceModel } from '@/components/three/deviceModels';
import {
  CYPHER_CHAIR_M,
  FACING,
  spotToScene,
  placeDataCenterRoom,
} from '@/components/three/socLayout';

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
 * A small standalone Cypher viewer for the lesson panel: Cypher SEATED
 * on the chair at his desk in the desk/computer room (the data center
 * itself, at real scale — the room is his environment here, not a bare
 * background), facing the learner. He does not walk: the walk clip made
 * him slide across the floor, so he sits — the seat pose is procedural
 * (see sit() in RobotCharacter), the mixer is stopped, and talking shows
 * only as the audio-reactive head bob. `voiceRef` is a shared mutable ref
 * { talking, level } the parent also hands to the voice hook — the tick
 * reads it every frame, so talking starts/stops without re-rendering.
 * Renders nothing (keeps the text tutor) when the GLB cannot load. No
 * name tag: Spencer removed Cypher's chest tag (2026-11-14) — his
 * greeting is spoken, never shown as text.
 *
 * Presenter-only: the viewer is NOT interactive (no drag, no zoom, no
 * click-for-info — the camera is fixed).
 */

// Panel camera: fixed on the seated Cypher at his desk. The Blender
// render (cypher-seat/seat_desktop.png, seat_mobile.png) framed him
// head-and-shoulders above the south-desk monitors at this position, on
// the desktop (224x256) and mobile (full-width x 224) panel aspects.
const CHAIR_SCENE = spotToScene(CYPHER_CHAIR_M, 1.0);
const PANEL_CAMERA_POS = [CHAIR_SCENE.x, 3.0, 6.0];
const PANEL_TARGET = [CHAIR_SCENE.x, 1.05, CHAIR_SCENE.z];

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
    // His room: the data center itself, at real scale, floor at y = 0.
    // If it fails to load Cypher still sits on the void floor and the
    // panel keeps working.
    loadDeviceModel('datacenter')
      .then((room) => {
        if (!mountedRef.current) return;
        placeDataCenterRoom(room, 1.0);
        scene.add(room);
      })
      .catch(() => { /* room missing/unparseable — Cypher still present */ });

    loadCypherCharacter()
      .then((controller) => {
        if (!mountedRef.current) {
          controller.dispose();
          return;
        }
        controllerRef.current = controller;
        // Seated on his chair at the desk, facing the learner (south):
        // real scale is 1.70 m, the chair seat is ~0.60 m, and sit()
        // holds the pose — no walk clip, no translation, no sliding.
        controller.group.position.set(CHAIR_SCENE.x, 0, CHAIR_SCENE.z);
        controller.group.rotation.y = FACING.south;
        controller.sit();
        scene.add(controller.group);
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
        // Seated, setTalking only toggles the head bob — it starts no clip.
        controller.setTalking(!!voice.talking);
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
        cameraPos={PANEL_CAMERA_POS}
        target={PANEL_TARGET}
        reducedMotion={false}
        quality="high"
        interactive={false}
      />
    </div>
  );
}
