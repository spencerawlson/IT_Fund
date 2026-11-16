import React, { useCallback, useRef } from 'react';
import * as THREE from 'three';
import ModelViewer from '@/components/three/ModelViewer';
import { makeLabel } from '@/components/three/labels';
import {
  modelKeyFor, fallbackBuilderFor, loadDeviceModel, fitAndPlace,
} from '@/components/three/deviceModels';
import { loadRobotCharacter } from '@/components/three/RobotCharacter';
import { seatRobot } from '@/components/three/socSeating';
import { buildSocDressing } from '@/components/three/socDressing';
import {
  ROOM_SCALE,
  ROBOT_SPOTS_M,
  ROBOT_WORK_FACING,
  FACING,
  CYPHER_SEAT_M,
  spotToScene,
  socPositions,
  placeSocRoom,
  SOC_CAMERA_FOV,
  SOC_DEVICE_FOOTPRINT,
  SOC_DEVICE_LABEL_Y,
  shotForSpeaker,
  deviceShot,
  ambientClipFor,
  CAMERA_SHOTS,
} from '@/components/three/socLayout';

// The three Meshy robots live IN the SOC room. Since 2026-11-16 that room
// is public/models/soc-room.glb, built in Blender (assets/blender/soc-room/)
// to the same measured layout as the original Meshy data center
// (4.85 x 5.21 m, ceiling 2.70 m, partitions at y 0.18 / x 0.42 m) and
// extended 2.4 m south so the eye-level cameras can stand back. Below is
// the original description of the layout, which still holds; at 5.0x scale — the
// room reads at device scale, so the real-scale 1.70 m robots are scaled
// 5x to stand beside the 4-unit devices. The data center itself HAS
// three rooms (Spencer's correction, verified against the real mesh):
// the desk/computer room is Cypher's, the workshop (workbench, soldering
// equipment, 3D printer) is Patch's, the server room (racks) is
// Sentinel's. The GLB stays exactly as created — the robots stay in it,
// nowhere else — and the room's own glass partitions and doorways are
// what let each focus camera see the other two working in the background.
// The layout (spots, devices, cameras) was measured from the real room
// mesh (ray-triangle sightlines, floor-height map) and lives in
// socLayout.js, with its own tests. The concept look on top — glass in
// the H-wall doorway, hanging nameplate signs, the R2C screen — is
// separate scene dressing (socDressing.js), never the GLB.
// The camera focuses on whoever is talking (speakerRef, owned by
// MissionWorkspace: a briefing turn's speaker, debrief -> Cypher,
// otherwise wide) and glides smoothly between shots; on load it takes a
// short greeting tour (Cypher -> Sentinel -> Patch, ~2.5 s each) that any
// speaker change interrupts. During the mission opening's device
// showcase, showcaseRef (owned by MissionWorkspace: null, or a device
// id) overrides the speaker — the camera CUTS to that device's close-up
// (a snap, not a glide: damping cannot settle inside a 4 s dwell at a
// low frame rate) and its label is emphasised — and a showcase change
// interrupts the tour the same way. Under reduced motion the tick never runs, so the
// camera holds the wide shot and the tour never happens.
// Cypher SITS on the chair at his desk the whole mission (Spencer
// 2026-11-14: "Cypher can simply sit on the chair ... because now he
// [is] sliding") — no patrol, no walk clip, no sliding. He is seated
// in the load callback via the controller's own sit() (RobotCharacter,
// PR #64 — the same seat pose the lesson panel uses, so the two can
// never drift apart); talking shows through the audio-reactive head
// bob only. On a Sentinel or Patch turn they do the talking (talk clip
// + head bob) in their rooms while Cypher sits — the other two keep
// working in their rooms (ambient loops) the whole time otherwise.
// The old kit-built room (floor slab, walls, desk row, monitor wall,
// east-wall door) is gone with it, and so is the monitor-wall alert
// pulse — the room's own screens are part of its merged mesh and cannot
// be pulsed. The alert state still shows in the 2D topology, the
// terminal and the objectives; the 3D room is ambient only.
// The camera is fixed (interactive={false} creates no OrbitControls):
// nothing orbits or hides them.
export const CYPHER_SPAWN = {
  ...spotToScene(CYPHER_SEAT_M), scale: ROOM_SCALE, rotationY: FACING.south,
};
export const SENTINEL_SPAWN = {
  ...spotToScene(ROBOT_SPOTS_M.sentinel.work), scale: ROOM_SCALE, rotationY: ROBOT_WORK_FACING.sentinel,
};
export const PATCH_SPAWN = {
  ...spotToScene(ROBOT_SPOTS_M.patch.work), scale: ROOM_SCALE, rotationY: ROBOT_WORK_FACING.patch,
};
export const ROBOT_SPAWNS = {
  cypher: CYPHER_SPAWN,
  sentinel: SENTINEL_SPAWN,
  patch: PATCH_SPAWN,
};

// The wide "look across" shot is the scene's default camera; the focus
// shots live in socLayout.js (CAMERA_SHOTS + cypherShot).
export const SOC_CAMERA_POS = CAMERA_SHOTS.wide.pos;
export const SOC_CAMERA_TARGET = CAMERA_SHOTS.wide.target;

// The 3D SOC room for Operation Broken Shield: the real data-center room
// plus the three robots plus the four mission device GLBs.
//
// Presenter-only: the robots present — the camera is fixed and nothing in
// the room is clickable. Inspecting devices happens in the 2D topology
// (MissionTopology, "fully playable without WebGL"), which sends the same
// inspect action; the 3D scene keeps no hitboxes or click handling.
//
// Rendered through the shared ModelViewer (lazy-loaded by MissionWorkspace,
// so three.js never enters the main chunk) and safe under SSR: the WebGL
// effect never runs server-side.

export const SOC_DEVICES = [
  { id: 'R1', label: 'R1', role: 'Gateway router', ip: '192.168.1.1' },
  { id: 'PC1', label: 'PC1', role: 'Workstation', ip: '192.168.1.10' },
  { id: 'GUEST', label: 'GUEST', role: 'Workstation', ip: '192.168.1.20' },
  { id: 'SRV', label: 'SRV', role: 'DMZ web server', ip: '192.168.2.10' },
];

/** Pure layout: device id -> { x, z } on the room floor (scene units). */
export { socPositions } from '@/components/three/socLayout';

// Device size: SOC_DEVICE_FOOTPRINT (socLayout.js — 0.52 m, a real
// desktop tower). Labels sit at SOC_DEVICE_LABEL_Y.
const FOOTPRINT = SOC_DEVICE_FOOTPRINT;


// The room's own light rig (ModelViewer stage="none": no studio lights,
// grid or fog). Bright, cool office light from the ceiling panels, a key
// light for soft robot shadows, and a little blue bounce from the LEDs.
export function addSocLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d4e3, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(6, 40, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  for (const [x, z, color, intensity] of [
    [-6, 8, 0xffffff, 14], [6, 8, 0xffffff, 12], // desk room
    [0, 18, 0xffffff, 10], // south (camera side)
    [-5, -7, 0xdbeafe, 14], [7, -7, 0xffffff, 12], // server room / workshop
    [-9, 2, 0x60a5fa, 10], // blue bounce by the desk LEDs
  ]) {
    const l = new THREE.PointLight(color, intensity, 30, 1.6);
    l.position.set(x, 12.5, z);
    scene.add(l);
  }
}

// Material fix-ups on the loaded room: real see-through glass, glossy
// floor, shadows on furniture (the room loads after ModelViewer's own
// cast/receive pass, so it is done here).
export function prepareSocRoom(room) {
  room.traverse((obj) => {
    if (!obj.isMesh) return;
    const name = obj.material?.name || '';
    obj.receiveShadow = true;
    obj.castShadow = !/^(Glass|LED|LightPanel|Floor|FloorServer|Ceiling|CeilingGrid|Wall)$/.test(name);
    if (name === 'Glass') {
      obj.material.transparent = true;
      obj.material.opacity = 0.12;
      obj.material.depthWrite = false;
      obj.material.roughness = 0.05;
      obj.material.metalness = 0.1;
      obj.renderOrder = 2;
    } else if (name === 'LightPanel') {
      // Bright white, not blown out (it would read as a hole in the ceiling).
      obj.material.emissiveIntensity = 1.6;
    } else if (name === 'Floor') {
      obj.material.roughness = 0.14;
      obj.material.envMapIntensity = 1.3;
    }
  });
  return room;
}
// Seconds per robot on the greeting tour, and the greeting clip's window:
// ambient work only starts once each robot has had time to greet.
const TOUR_PHASE_S = 2.5;
const GREETING_WINDOW_S = 3;
// Camera glide: damped toward the current shot at this rate. During
// the device showcase the camera CUTS onto each shot (see the tick);
// the faster showcase damp only settles any residual offset.
const CAMERA_DAMP = 2.5;
const CAMERA_DAMP_SHOWCASE = 4;

export default function MissionSocScene({
  devices = SOC_DEVICES,
  incidentActive = true,
  contained = false,
  onRendererFailed,
  background,
  reducedMotion = false,
  quality = 'high',
  // Shared mutable ref { talking, level } the voice hook writes: the SOC
  // tick reads it every frame so Cypher talks while audio plays, without
  // re-rendering the scene.
  cypherVoiceRef,
  // Shared mutable ref { current: 'wide' | 'cypher' | 'sentinel' |
  // 'patch' } owned by MissionWorkspace: the tick focuses the camera on
  // whoever is talking. When absent the scene holds the wide shot.
  speakerRef,
  // Shared mutable ref { current: null | deviceId } owned by
  // MissionWorkspace: while the opening showcases a device, the tick
  // focuses the camera on that device's close-up and emphasises its
  // label. Null the rest of the time.
  showcaseRef,
}) {
  // tick() closes over the mount-time scene, so live alert state travels
  // through a ref the tick reads every frame (ModelViewer builds once).
  // The 3D room no longer pulses with the alert state (the data-center
  // mesh has no separable screens) — incidentActive/contained are kept
  // in the API because the 2D topology and the mission flow still use
  // them; the 3D room is ambient only.
  const stateRef = useRef({ incidentActive, contained, cypherVoiceRef, speakerRef, showcaseRef, reducedMotion });
  stateRef.current = { incidentActive, contained, cypherVoiceRef, speakerRef, showcaseRef, reducedMotion };
  // The live camera, filled by ModelViewer: the tick damps it toward the
  // current shot.
  const cameraRef = useRef(null);

  const buildScene = useCallback((scene, { camera: sceneCamera } = {}) => {
    const pos = socPositions();
    // Eye-level shots inside the room need a wider lens than the studio's 42°.
    if (sceneCamera) {
      sceneCamera.fov = SOC_CAMERA_FOV;
      sceneCamera.updateProjectionMatrix();
    }
    addSocLights(scene);
    let cypher = null;
    let sentinel = null;
    let patch = null;
    let lastT = null;
    // The clock time when each robot may stop greeting and start ambient
    // work; set at load (clock time then + the greeting window). Cypher
    // has none — he is seated, never greeted.
    let sentinelGreetUntil = GREETING_WINDOW_S;
    let patchGreetUntil = GREETING_WINDOW_S;
    // Greeting tour state.
    let tourStart = null;
    let tourDone = false;
    // The showcase device the camera last cut to (null when not in the
    // showcase): a change cuts the camera straight onto the new shot.
    let lastShowcase = null;
    // The camera target the tick is damping toward.
    const currentTarget = new THREE.Vector3(...SOC_CAMERA_TARGET);

    // The nameplate signs are procedural and need no asset: they go in
    // immediately, even if the room GLB fails to load.
    scene.add(buildSocDressing());

    // The room itself (public/models/soc-room.glb, built in Blender from
    // assets/blender/soc-room/ to the measured layout): walls, glass,
    // desk, monitors, racks, workshop. If it fails to load, the robots and
    // devices still stand in the lit void — the mission still works.
    loadDeviceModel('soc-room')
      .then((room) => {
        placeSocRoom(room, ROOM_SCALE);
        prepareSocRoom(room);
        scene.add(room);
      })
      .catch(() => { /* room missing/unparseable — robots still present */ });

    // The three robots stand in their rooms in the data center (the real
    // models — no placeholders). If a GLB fails to load that robot is
    // simply absent; the mission still works. Sentinel and Patch start
    // at their spots and greet on load; Cypher is SEATED on his chair
    // in the load callback (no greeting clip — a wave would pull him out
    // of the chair pose) and never walks. Patch is not a humanoid — his
    // clips (bob/rock walk, smaller arm swing) are driven as-is, never
    // forced into humanoid poses.
    const loadRobot = (key, spawn, onLoad, greet = true) => {
      loadRobotCharacter(key)
        .then((controller) => {
          controller.group.scale.setScalar(spawn.scale);
          controller.group.position.set(spawn.x, 0, spawn.z);
          controller.group.rotation.y = spawn.rotationY;
          scene.add(controller.group);
          if (greet) controller.play('greeting');
          onLoad(controller);
        })
        .catch(() => { /* robot absent — the SOC keeps the rest */ });
    };

    loadRobot('cypher', CYPHER_SPAWN, (controller) => {
      cypher = controller;
      // Seat him before the tick ever calls update() on him: sit()
      // captures the bind pose as "rest" (see RobotCharacter).
      seatRobot(controller);
    }, false);
    loadRobot('sentinel', SENTINEL_SPAWN, (controller) => {
      sentinel = controller;
      sentinelGreetUntil = (lastT ?? 0) + GREETING_WINDOW_S;
    });
    loadRobot('patch', PATCH_SPAWN, (controller) => {
      patch = controller;
      patchGreetUntil = (lastT ?? 0) + GREETING_WINDOW_S;
    });

    // --- Cables between the lab devices, at ankle height.
    const cableMat = new THREE.LineBasicMaterial({ color: 0x64748b });
    [['PC1', 'R1'], ['GUEST', 'R1'], ['R1', 'SRV']].forEach(([a, b]) => {
      const pa = pos[a];
      const pb = pos[b];
      if (!pa || !pb) return;
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pa.x, 0.15, pa.z),
          new THREE.Vector3(pb.x, 0.15, pb.z),
        ]),
        cableMat,
      ));
    });

    // --- The four lab devices: procedural fallback now, real GLB when it loads.
    // No interactives: the 3D room is presenter-only (inspection lives in
    // the 2D topology), so parts stays empty and ModelViewer — called with
    // interactive={false} — never raycasts. The label sprites are kept
    // (device id -> { sprite, baseScale }) so the showcase can emphasise
    // the device on camera: its label grows 1.6x while the others stay.
    const parts = [];
    const labels = {};
    devices.forEach((d) => {
      const p = pos[d.id];
      if (!p) return;
      const role = d.role || '';

      const fallback = new THREE.Group();
      try { fallbackBuilderFor(role)(fallback); } catch { /* keep empty group */ }
      fitAndPlace(fallback, p, FOOTPRINT);
      scene.add(fallback);

      const label = makeLabel(d.id, { height: 1.1 });
      label.position.set(p.x, SOC_DEVICE_LABEL_Y, p.z);
      // Device tags only show while the opening tours the devices; the
      // rest of the time the room stays uncluttered.
      label.visible = false;
      labels[d.id] = { sprite: label, baseScale: label.scale.clone() };
      scene.add(label);

      loadDeviceModel(modelKeyFor(role))
        .then((model) => {
          fitAndPlace(model, p, FOOTPRINT);
          scene.remove(fallback);
          scene.add(model);
        })
        .catch(() => { /* asset missing/unparseable — fallback stays */ });
    });

    // --- Animation: Cypher sits at his desk and talks with the voice;
    // Sentinel and Patch keep working in their rooms; the camera glides
    // to whoever is speaking (or tours the three on load). Under reduced
    // motion the tick still runs (tickUnderReducedMotion on ModelViewer):
    // the robots keep moving and the briefing keeps advancing — only the
    // camera is gentled (cuts instead of glides, no greeting tour).
    // Freezing the tick here would freeze the whole mission, which reads
    // as a broken page (2026-11-16 live report).
    const tick = (t) => {
      const { cypherVoiceRef: voiceRef, speakerRef: spkRef, showcaseRef: showRef, reducedMotion: rm } = stateRef.current;
      const dt = lastT === null ? 0 : Math.min(t - lastT, 0.1);
      lastT = t;

      // --- Speaker + camera. A speaker change interrupts the tour; so
      // does a showcase change (the opening's device tour). Reduced
      // motion skips the greeting tour outright — the camera cuts to the
      // shot instead of gliding through the three rooms.
      const speaker = spkRef?.current || 'wide';
      const showcase = showRef?.current || null;
      if (rm) tourDone = true;
      if (!tourDone && (speaker !== 'wide' || showcase)) tourDone = true;
      let shot;
      if (!tourDone) {
        if (tourStart === null) tourStart = t;
        const phase = Math.floor((t - tourStart) / TOUR_PHASE_S);
        if (phase >= 3) {
          tourDone = true;
          shot = showcase ? deviceShot(showcase) : shotForSpeaker(speaker);
        } else {
          shot = shotForSpeaker(['cypher', 'sentinel', 'patch'][phase]);
        }
      } else {
        shot = showcase ? deviceShot(showcase) : shotForSpeaker(speaker);
      }
      // --- Showcase label emphasis: the device on camera reads larger;
      // the others stay at their base size. The scale is re-asserted
      // every frame (cheap, and the sprite is recreated on a remount).
      for (const [id, { sprite, baseScale }] of Object.entries(labels)) {
        const s = id === showcase ? 1.6 : 1;
        sprite.scale.set(baseScale.x * s, baseScale.y * s, baseScale.z);
        sprite.visible = Boolean(showcase);
      }
      const camera = cameraRef.current;
      // --- Showcase cuts, not glides. A showcase change snaps the camera
      // straight onto the device shot: the opening plays like a video,
      // and a cut reads the instant its dwell starts at ANY frame rate.
      // Damping could not do that — dt is clamped to 0.1 s, so at 1 fps
      // a 4 s dwell is four 33%-of-the-way frames and the camera never
      // arrives (the two live checks saw a slow orbit, never a dwell).
      // Speaker shots and the return to wide keep damping: they last
      // long enough to settle.
      if (camera && showcase && showcase !== lastShowcase) {
        camera.position.set(shot.pos[0], shot.pos[1], shot.pos[2]);
        currentTarget.set(shot.target[0], shot.target[1], shot.target[2]);
        camera.lookAt(currentTarget);
      }
      lastShowcase = showcase;
      if (camera && dt > 0) {
        if (rm) {
          // Reduced motion: cut, never glide — the camera jumps straight
          // to the shot each frame (no damping, no tour).
          camera.position.set(shot.pos[0], shot.pos[1], shot.pos[2]);
          currentTarget.set(shot.target[0], shot.target[1], shot.target[2]);
          camera.lookAt(currentTarget);
        } else {
          // The showcase settles faster so each device reads, not glides.
          const damp = showcase ? CAMERA_DAMP_SHOWCASE : CAMERA_DAMP;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, shot.pos[0], damp, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, shot.pos[1], damp, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, shot.pos[2], damp, dt);
          currentTarget.x = THREE.MathUtils.damp(currentTarget.x, shot.target[0], damp, dt);
          currentTarget.y = THREE.MathUtils.damp(currentTarget.y, shot.target[1], damp, dt);
          currentTarget.z = THREE.MathUtils.damp(currentTarget.z, shot.target[2], damp, dt);
          camera.lookAt(currentTarget);
        }
      }

      // --- Cypher: seated at his desk, talking shows through the
      // audio-reactive head bob only — never a clip, never a walk.
      // seatRobot() calls the controller's own sit() (RobotCharacter,
      // PR #64): the mixer is stopped, the pose is re-applied inside
      // update() after the mixer, and setTalking() starts no clip while
      // seated — so the pose needs no re-assertion here, and the head
      // bob (setTalkLevel, applied inside update()) still shows. Only
      // his own turns bob him: during a Sentinel or Patch turn the same
      // voice is playing (Cypher's is the only configured voice), but
      // he is not the speaker — he sits still while they talk.
      if (cypher) {
        const voice = voiceRef?.current;
        const talking = !!voice?.talking;
        const cypherSpeaking = talking && speaker === 'cypher';
        cypher.setTalking(cypherSpeaking);
        cypher.setTalkLevel(cypherSpeaking ? (voice?.level || 0) : 0);
        cypher.update(dt);
      }

      // --- Sentinel and Patch keep working in their rooms: a point at
      // the racks / thinking at the bench, idle between — except on their
      // own briefing turn, when they do the talking (talk clip +
      // audio-reactive head bob, driven by the same voice level Cypher
      // uses; the voice itself is Cypher's until per-character voices
      // are configured). play() is a no-op while the clip is already
      // current. The greeting one-shot is never cut: talking starts
      // only after the greet window, like the ambient work.
      if (sentinel) {
        const sentinelSpeaking = !!voiceRef?.current?.talking && speaker === 'sentinel' && t > sentinelGreetUntil;
        if (sentinelSpeaking) {
          if (!sentinel.isTalking()) sentinel.setTalking(true);
          sentinel.setTalkLevel(voiceRef.current.level || 0);
        } else {
          if (sentinel.isTalking()) sentinel.setTalking(false);
          sentinel.setTalkLevel(0);
          if (t > sentinelGreetUntil) sentinel.play(ambientClipFor('sentinel', t));
        }
        sentinel.update(dt);
      }
      if (patch) {
        const patchSpeaking = !!voiceRef?.current?.talking && speaker === 'patch' && t > patchGreetUntil;
        if (patchSpeaking) {
          if (!patch.isTalking()) patch.setTalking(true);
          patch.setTalkLevel(voiceRef.current.level || 0);
        } else {
          if (patch.isTalking()) patch.setTalking(false);
          patch.setTalkLevel(0);
          if (t > patchGreetUntil) patch.play(ambientClipFor('patch', t));
        }
        patch.update(dt);
      }
    };

    return { parts, tick };
  }, [devices]);

  return (
    // Video card: the SOC presents like a video player frame — full width
    // of the mission content area, taller than the old 16:9 box.
    <div className="aspect-[16/10] w-full">
      <ModelViewer
        buildScene={buildScene}
        cameraPos={SOC_CAMERA_POS}
        target={SOC_CAMERA_TARGET}
        background={background}
        reducedMotion={reducedMotion}
        // The tick is what makes the robots move and the briefing advance:
        // under reduced motion it MUST keep running (the scene itself
        // gentles the camera — cuts instead of glides, no greeting tour).
        // Freezing the tick would freeze the whole mission, which reads
        // as a broken page (2026-11-16 live report).
        tickUnderReducedMotion
        quality={quality}
        onRendererFailed={onRendererFailed}
        interactive={false}
        cameraRef={cameraRef}
        stage="none"
        exposure={0.95}
      />
    </div>
  );
}
