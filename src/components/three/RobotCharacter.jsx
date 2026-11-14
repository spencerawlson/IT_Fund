import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { modelUrl } from '@/components/three/deviceModels';

// The three Meshy robots (Cypher, Sentinel, Patch) share one rig shape:
// 1.70 m tall, 24 bones, 1 SkinnedMesh, and exactly the same six animation
// clips. One loader drives all three by clip name — Patch included: his
// walk is a bob/rock (treads stay planted), driven as-is, never forced
// into a humanoid walk. The data center is a static room (no bones, no
// clips) and loads through the device-model loader instead.
//
// If a GLB fails to load, the caller keeps its fallback (the SOC keeps its
// devices, the lesson panel hides the 3D view and keeps the text tutor).

export const ROBOT_CLIPS = ['idle', 'walk', 'talk', 'point', 'greeting', 'thinking'];
export const ROBOT_LOOP_CLIPS = new Set(['idle', 'walk', 'talk', 'thinking']);
// One-shot clips return to idle when they finish.
export const ROBOT_ONE_SHOT_CLIPS = new Set(['point', 'greeting']);

export const ROBOT_KEYS = ['cypher', 'sentinel', 'patch'];
// Everything the mission SOC needs pre-warmed on mount: the three robots
// plus the data-center room they live in.
export const MISSION_MODEL_KEYS = ['cypher', 'sentinel', 'patch', 'datacenter'];

let _loader = null;
function loader() {
  if (!_loader) _loader = new GLTFLoader();
  return _loader;
}

// One fetch promise per model key, so a preload never fetches twice.
const _preloadCache = new Map();

/**
 * Warm the browser cache for one model GLB. Fire-and-forget, never
 * rejects, and fetches at most once per page load per key. `fetchImpl`
 * is injectable for tests; without a fetch implementation (SSR / node)
 * it is a no-op.
 */
export function preloadModel(key, fetchImpl) {
  if (_preloadCache.has(key)) return _preloadCache.get(key);
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  let p;
  if (!doFetch) {
    p = Promise.resolve();
  } else {
    try {
      p = Promise.resolve(doFetch(modelUrl(key)))
        .then(() => undefined)
        .catch(() => undefined);
    } catch {
      p = Promise.resolve();
    }
  }
  _preloadCache.set(key, p);
  return p;
}

/** Warm the browser cache for one robot GLB (see preloadModel). */
export function preloadRobotCharacter(key, fetchImpl) {
  return preloadModel(key, fetchImpl);
}

/**
 * Warm the browser cache for every GLB the mission SOC needs — the three
 * robots plus the data-center room — so the scene loads fast on direct
 * entry, not only on the handoff path. Fire-and-forget, never rejects,
 * and fetches each model at most once per page load.
 */
export function preloadMissionRobots(fetchImpl) {
  return Promise.all(MISSION_MODEL_KEYS.map((key) => preloadModel(key, fetchImpl)))
    .then(() => undefined)
    .catch(() => undefined);
}

/**
 * The seated pose (lesson panel only): Cypher sits on a chair at a desk —
 * no walking, no sliding. Each entry is a rotation DELTA from the bone's
 * rest pose, in the bone's local frame (XYZ euler) — the same numbers
 * Blender's pose bones take, verified by a Blender render of the seated
 * pose. They are NOT absolute bone rotations: three.js bone.rotation
 * REPLACES the bind rotation, and the limbs' bind frames are far from
 * identity (thigh rest is pi about X, shoulder rest is (-pi/2, 0, pi/2)),
 * so an absolute -1.40 on the thigh swings the knee BACKWARD. The
 * controller therefore applies rest-quaternion x delta (see
 * applySeatedPose). The relative form reproduces the Blender pose in
 * three.js to the millimetre (knee 0.564 m, foot 0.275 m, head 1.353 m —
 * asserted in RobotCharacter.test.jsx).
 * SEATED_HIPS_LIFT_M is added to the hips bone's rest height (0.67 m):
 * the standing hip joint (0.52 m) sits below the seat, so the pelvis
 * rises ~0.08 m onto it and the feet dangle ~0.28 m — a short-legged
 * robot perched on an office chair, verified by a Blender render.
 * Bone names are the three.js names (thighL, kneeL, ...): Blender shows
 * the same bones as thigh.L / knee.L, but the GLB joints — and three.js
 * — spell them without the dot. Do not "fix" these back to dotted names.
 */
export const SEATED_POSE = {
  thighL: [-1.40, 0, 0],
  thighR: [-1.40, 0, 0],
  kneeL: [1.40, 0, 0],
  kneeR: [1.40, 0, 0],
  ankleL: [-0.15, 0, 0],
  ankleR: [-0.15, 0, 0],
  spine: [0.10, 0, 0],
  chest: [0.08, 0, 0],
  shoulderL: [-0.35, 0, 0],
  shoulderR: [-0.35, 0, 0],
  elbowL: [-0.90, 0, 0],
  elbowR: [-0.90, 0, 0],
};
export const SEATED_HIPS_LIFT_M = 0.08;

/**
 * Build a clip controller for a parsed robot glTF:
 * { group, mixer, clips, clipNames, play(name), setTalking(bool),
 *   setTalkLevel(0..1), isTalking(), update(dt), dispose() }.
 * - play(name) crossfades to the named clip (one-shots return to idle).
 * - setTalking(true) plays the talk loop; setTalking(false) returns to idle.
 * - setTalkLevel(level) is the audio-reactive face: the voice hook feeds it
 *   the analyser level while audio plays, and the head bobs a little more
 *   with it. It is applied after mixer.update() each frame, so it rides on
 *   top of whatever clip is playing and never fights the mixer.
 * - sit() seats the robot in SEATED_POSE (lesson panel only): the mixer
 *   is stopped and play()/setTalking() stop starting clips, so nothing
 *   can pull him out of the chair; talking still shows through the head
 *   bob. The SOC never calls sit(), so its clip-driven robots are
 *   untouched.
 * The caller owns the group: add it to the scene, remove + dispose() on cleanup.
 */
export function createRobotController(gltf) {
  const group = gltf.scene;
  const clips = {};
  gltf.animations.forEach((clip) => { clips[clip.name] = clip; });
  const mixer = new THREE.AnimationMixer(group);
  let current = null;
  let currentName = null;
  let talking = false;
  let talkLevel = 0;
  let seated = false;
  const bones = {};
  group.traverse((obj) => {
    if (obj.isBone) bones[obj.name] = obj;
  });
  const headBone = bones.head || null;
  // Rest orientations, captured before any clip plays: a seated pose is
  // rest-quaternion x delta (see SEATED_POSE), never an absolute euler.
  const restPose = new Map();
  for (const [name, bone] of Object.entries(bones)) {
    restPose.set(name, {
      quaternion: bone.quaternion.clone(),
      position: bone.position.clone(),
    });
  }

  const applySeatedPose = () => {
    const delta = new THREE.Quaternion();
    const euler = new THREE.Euler();
    for (const [name, [x, y, z]] of Object.entries(SEATED_POSE)) {
      const bone = bones[name];
      const rest = restPose.get(name);
      if (!bone || !rest) continue;
      euler.set(x, y, z, 'XYZ');
      delta.setFromEuler(euler);
      bone.quaternion.copy(rest.quaternion).multiply(delta);
    }
    const hips = bones.hips;
    const hipsRest = restPose.get('hips');
    if (hips && hipsRest) {
      hips.position.copy(hipsRest.position);
      hips.position.y += SEATED_HIPS_LIFT_M;
    }
  };

  /** Seat the robot: stop every clip, hold SEATED_POSE, never walk. */
  const sit = () => {
    seated = true;
    mixer.stopAllAction();
    current = null;
    currentName = null;
    applySeatedPose();
    return true;
  };

  const play = (name) => {
    // Seated, the body stays in its chair pose: no clip can start.
    if (seated) return false;
    const clip = clips[name];
    if (!clip) return false;
    if (currentName === name) return true;
    const next = mixer.clipAction(clip);
    next.setLoop(
      ROBOT_LOOP_CLIPS.has(name) ? THREE.LoopRepeat : THREE.LoopOnce,
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
    if (currentName && ROBOT_ONE_SHOT_CLIPS.has(currentName)) {
      if (talking) play('talk');
      else play('idle');
    }
  });

  const setTalking = (on) => {
    talking = !!on;
    // Seated, talking only drives the head bob in update() — it never
    // starts the talk clip, which would pull him out of the chair pose.
    if (seated) return;
    if (talking) play('talk');
    else if (currentName === 'talk') play('idle');
  };

  const update = (dt) => {
    mixer.update(dt);
    // Seated, the pose is re-applied after the mixer every frame, so no
    // clip (or a stray crossfade) can pull him out of the chair.
    if (seated) applySeatedPose();
    // Audio-reactive head bob, on top of the clip pose (or the seat pose).
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
  return {
    group,
    mixer,
    clips,
    clipNames: Object.keys(clips),
    play,
    sit,
    isSeated: () => seated,
    setTalking,
    setTalkLevel: (level) => { talkLevel = Math.max(0, Math.min(1, level || 0)); },
    isTalking: () => talking,
    update,
    dispose,
  };
}

/**
 * Load a robot GLB by key ('cypher' | 'sentinel' | 'patch') and return its
 * clip controller. Rejects if the asset is missing/unparseable — the
 * caller's cue to keep the scene working without that robot.
 */
export function loadRobotCharacter(key) {
  return new Promise((resolve, reject) => {
    loader().load(
      modelUrl(key),
      (gltf) => resolve(createRobotController(gltf)),
      undefined,
      (err) => reject(err),
    );
  });
}
