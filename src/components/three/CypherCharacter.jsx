import React, { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ModelViewer from '@/components/three/ModelViewer';
import { modelUrl } from '@/components/three/deviceModels';

// Cypher, the 3D AI tutor robot (Cyber Missions Phase 2). The model is the
// real Blender build (public/models/cypher.glb, source assets/blender/) —
// 1.70 m tall, 26 bones, 6 animation clips. No placeholder: if the GLB
// fails to load, the caller keeps its fallback (the SOC keeps its devices,
// the lesson panel hides the 3D view and keeps the text tutor).

export const CYPHER_CLIPS = ['idle', 'walk', 'talk', 'point', 'greeting', 'thinking'];
export const CYPHER_LOOP_CLIPS = new Set(['idle', 'walk', 'talk', 'thinking']);
// One-shot clips return to idle when they finish.
export const CYPHER_ONE_SHOT_CLIPS = new Set(['point', 'greeting']);

let _loader = null;
function loader() {
  if (!_loader) _loader = new GLTFLoader();
  return _loader;
}

let _cypherPreload = null;
/**
 * Warm the browser cache for cypher.glb so the SOC scene's load resolves
 * fast on direct entry, not only on the handoff path (whose lesson panel
 * already warmed the cache by loading the same GLB — which is why Cypher
 * appeared there first). Fire-and-forget, never rejects, and fetches at
 * most once per page load. `fetchImpl` is injectable for tests; without a
 * fetch implementation (SSR / node) it is a no-op.
 */
export function preloadCypherCharacter(fetchImpl) {
  if (_cypherPreload) return _cypherPreload;
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) {
    _cypherPreload = Promise.resolve();
    return _cypherPreload;
  }
  try {
    _cypherPreload = Promise.resolve(doFetch(modelUrl('cypher')))
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    _cypherPreload = Promise.resolve();
  }
  return _cypherPreload;
}

/**
 * Load cypher.glb and return a controller for the rig:
 * { group, mixer, clips, play(name), setTalking(bool), setTalkLevel(0..1),
 *   update(dt), dispose() }.
 * - play(name) crossfades to the named clip (one-shots return to idle).
 * - setTalking(true) plays the talk loop; setTalking(false) returns to idle.
 * - setTalkLevel(level) is the audio-reactive face: the voice hook feeds it
 *   the analyser level while audio plays, and the head bobs a little more
 *   with it. It is applied after mixer.update() each frame, so it rides on
 *   top of whatever clip is playing and never fights the mixer.
 * The caller owns the group: add it to the scene, remove + dispose() on cleanup.
 */
export function loadCypherCharacter() {
  return new Promise((resolve, reject) => {
    loader().load(
      modelUrl('cypher'),
      (gltf) => {
        const group = gltf.scene;
        const clips = {};
        gltf.animations.forEach((clip) => { clips[clip.name] = clip; });
        const mixer = new THREE.AnimationMixer(group);
        let current = null;
        let currentName = null;
        let talking = false;
        let talkLevel = 0;
        let headBone = null;
        group.traverse((obj) => {
          if (!headBone && obj.name === 'head' && obj.isBone) headBone = obj;
        });

        const play = (name) => {
          const clip = clips[name];
          if (!clip) return false;
          if (currentName === name) return true;
          const next = mixer.clipAction(clip);
          next.setLoop(
            CYPHER_LOOP_CLIPS.has(name) ? THREE.LoopRepeat : THREE.LoopOnce,
            Infinity,
          );
          next.clampWhenFinished = true;
          if (current) current.fadeOut(0.2);
          next.reset().fadeIn(0.2).play();
          current = next;
          currentName = name;
          return true;
        };

        mixer.addEventListener('finished', () => {
          if (currentName && CYPHER_ONE_SHOT_CLIPS.has(currentName)) {
            if (talking) play('talk');
            else play('idle');
          }
        });

        const setTalking = (on) => {
          talking = !!on;
          if (talking) play('talk');
          else if (currentName === 'talk') play('idle');
        };

        const update = (dt) => {
          mixer.update(dt);
          // Audio-reactive head bob, on top of the clip pose.
          if (talking && headBone && talkLevel > 0.02) {
            headBone.rotation.x += talkLevel * 0.06 * Math.sin(performance.now() / 90);
          }
        };

        const dispose = () => {
          mixer.stopAllAction();
          mixer.uncacheRoot(group);
          group.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
              else obj.material.dispose();
            }
          });
        };

        play('idle');
        resolve({
          group,
          mixer,
          clips,
          clipNames: Object.keys(clips),
          play,
          setTalking,
          setTalkLevel: (level) => { talkLevel = Math.max(0, Math.min(1, level || 0)); },
          isTalking: () => talking,
          update,
          dispose,
        });
      },
      undefined,
      (err) => reject(err),
    );
  });
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
