import React, { useCallback, useRef } from 'react';
import * as THREE from 'three';
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
  ROBOT_SPOTS_M,
  FACING,
  spotToScene,
  placeDataCenterRoom,
  patrolX,
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
 * A small standalone Cypher viewer for the lesson panel: Cypher in his
 * room in the data center (the desk/computer room, at real scale — the
 * room is his environment here, not a bare background), idle/working at
 * his desk, walking his patrol while he explains, driven by the voice
 * hook. `voiceRef` is a shared mutable ref { talking, level } the parent
 * also hands to the voice hook — the tick reads it every frame, so
 * talking starts/stops without re-rendering. Renders nothing (keeps the
 * text tutor) when the GLB cannot load. No name tag here: the tag is
 * SOC-only.
 *
 * Presenter-only: the viewer is NOT interactive (no drag, no zoom, no
 * click-for-info — the camera is fixed). Cypher animates as a teacher
 * instead, driven by the dialogue state: he greets when the panel opens,
 * walks while he speaks, and works at his desk otherwise. The camera
 * tracks his patrol x so he stays centred while he walks — the same
 * wide-shot geometry as the SOC, scaled to the room's real size.
 */

// Panel camera: the SOC wide-shot geometry at the room's real scale
// (camera south of the room, high enough to see over the south wall
// through its opening — the same sightline the SOC wide shot ray-cast
// clear). Target tracks Cypher's patrol x (see the tick).
const PANEL_CAMERA_POS = [ROBOT_SPOTS_M.cypher.work.x, 3.4, 6.0];
const PANEL_TARGET = [ROBOT_SPOTS_M.cypher.work.x, 1.0, -ROBOT_SPOTS_M.cypher.patrol.y];

export default function CypherViewer({ voiceRef, className = '' }) {
  const controllerRef = useRef(null);
  const lastTRef = useRef(null);
  const mountedRef = useRef(true);
  const cameraRef = useRef(null);
  // Cypher's patrol clock: only advances while he speaks, so he resumes
  // his walk where he left off instead of jumping.
  const patrolClockRef = useRef(0);
  const cypherXRef = useRef(ROBOT_SPOTS_M.cypher.work.x);

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
    // If it fails to load Cypher still stands on the void floor and the
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
        // In his desk room, at his desk work spot, facing the learner
        // (south): real scale is 1.70 m, feet on the room floor (y = 0).
        // The panel is the room at real size (scale 1.0), not the SOC's 5x.
        const work = spotToScene(ROBOT_SPOTS_M.cypher.work, 1.0);
        controller.group.position.set(work.x, 0, work.z);
        controller.group.rotation.y = FACING.south;
        scene.add(controller.group);
        // Presenter greeting on open: a one-shot that returns to idle
        // (the mixer's 'finished' handler) once it plays through.
        controller.play('greeting');
        state.ready = true;
      })
      .catch(() => { /* GLB missing/unparseable — the panel hides the view */ });

    // The camera target the tick damps toward (tracks Cypher's patrol x).
    const currentTarget = new THREE.Vector3(PANEL_TARGET[0], PANEL_TARGET[1], PANEL_TARGET[2]);

    const tick = (t) => {
      const controller = controllerRef.current;
      if (!controller || !state.ready) return;
      const last = lastTRef.current;
      lastTRef.current = t;
      const dt = last === null ? 0 : Math.min(t - last, 0.1);
      const voice = voiceRef?.current;
      if (voice) {
        controller.setTalkLevel(voice.level || 0);
        if (voice.talking) {
          if (!controller.isTalking()) controller.setTalking(true);
          // Walk his patrol while he explains; the audio-reactive head
          // bob (setTalkLevel) carries the speaking.
          controller.play('walk');
          patrolClockRef.current += dt;
          cypherXRef.current = patrolX(patrolClockRef.current);
          const p = spotToScene({ x: cypherXRef.current, y: ROBOT_SPOTS_M.cypher.patrol.y }, 1.0);
          controller.group.position.x = p.x;
          controller.group.position.z = p.z;
          controller.group.rotation.y = FACING.south;
        } else {
          if (controller.isTalking()) {
            controller.setTalking(false);
            controller.play('idle');
          }
          // Ease back to his desk work spot.
          const work = spotToScene(ROBOT_SPOTS_M.cypher.work, 1.0);
          controller.group.position.x = THREE.MathUtils.damp(controller.group.position.x, work.x, 2.5, dt);
          controller.group.position.z = THREE.MathUtils.damp(controller.group.position.z, work.z, 2.5, dt);
          controller.group.rotation.y = THREE.MathUtils.damp(controller.group.rotation.y, FACING.south, 2.5, dt);
        }
      }
      controller.update(dt);
      // The camera tracks his patrol x so he stays centred while he walks.
      const camera = cameraRef.current;
      if (camera && dt > 0) {
        const cx = cypherXRef.current;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, 2.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, PANEL_CAMERA_POS[1], 2.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, PANEL_CAMERA_POS[2], 2.5, dt);
        currentTarget.x = THREE.MathUtils.damp(currentTarget.x, cx, 2.5, dt);
        currentTarget.y = THREE.MathUtils.damp(currentTarget.y, PANEL_TARGET[1], 2.5, dt);
        currentTarget.z = THREE.MathUtils.damp(currentTarget.z, PANEL_TARGET[2], 2.5, dt);
        camera.lookAt(currentTarget);
      }
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
        cameraRef={cameraRef}
      />
    </div>
  );
}
