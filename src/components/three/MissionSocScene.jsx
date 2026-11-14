import React, { useCallback, useRef } from 'react';
import * as THREE from 'three';
import ModelViewer from '@/components/three/ModelViewer';
import { makeLabel } from '@/components/three/labels';
import {
  modelKeyFor, fallbackBuilderFor, loadDeviceModel, fitAndPlace,
} from '@/components/three/deviceModels';
import { loadRobotCharacter } from '@/components/three/RobotCharacter';
import { attachCypherNameTag, faceTagToCamera } from '@/components/three/nameTag';

// The three Meshy robots live in the data-center room (public/models/
// datacenter.glb, 4.85 x 5.21 m, ceiling 2.70 m), at 5.0x scale — the
// room reads at device scale, so the real-scale 1.70 m robots are scaled
// 5x to stand beside the 4-unit devices. The layout was found by a joint
// optimizer over the real room mesh (ray-triangle sightlines through the
// room's own triangles, projected-rect framing on the 706x400 frame) and
// verified by a Blender render from the scene camera: the camera sits
// south-west of the room, high (3.2 m), looking down over the south wall
// into the open-topped data center. A low camera north of the room is
// blocked by the solid north wall, and a south-east camera grazes a
// wall-top edge at Cypher's chest — both were rejected by the render
// check. The robots face the camera (the learner) so their fronts — and
// Cypher's chest tag — read square-on at room distance.
// The data center has no door, so there is no walk-in any more: the
// robots start at their spots and greet on load (as reduced motion did).
// The old kit-built room (floor slab, walls, desk row, monitor wall,
// east-wall door) is gone with it, and so is the monitor-wall alert
// pulse — the room's own screens are part of its merged mesh and cannot
// be pulsed. The alert state still shows in the 2D topology, the
// terminal and the objectives; the 3D room is ambient only.
// The camera is fixed (interactive={false} creates no OrbitControls):
// nothing orbits or hides them.
export const CYPHER_SPAWN = { x: 0, z: 7, scale: 5.0, rotationY: Math.atan2(-10 - 0, 17.5 - 7) };
export const SENTINEL_SPAWN = { x: -2, z: 2, scale: 5.0, rotationY: Math.atan2(-10 - -2, 17.5 - 2) };
export const PATCH_SPAWN = { x: 8, z: 5, scale: 5.0, rotationY: Math.atan2(-10 - 8, 17.5 - 5) };
export const ROBOT_SPAWNS = {
  cypher: CYPHER_SPAWN,
  sentinel: SENTINEL_SPAWN,
  patch: PATCH_SPAWN,
};

// Fixed presenter camera for the video frame; the name tag yaws to face it.
export const SOC_CAMERA_POS = [-10, 16, 17.5];
export const SOC_CAMERA_TARGET = [0, 4.25, 7];

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
export function socPositions() {
  return {
    R1: { x: 6, z: -6 },
    PC1: { x: 4, z: 2 },
    GUEST: { x: 7, z: 10 },
    SRV: { x: -1, z: -5 },
  };
}

const FOOTPRINT = 4;
const ROOM_SCALE = 5.0;

/** Stand the data-center room on y=0, centred on the origin, at ROOM_SCALE. */
function placeRoom(room) {
  const box = new THREE.Box3().setFromObject(room);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  room.scale.setScalar(ROOM_SCALE);
  room.position.set(-center.x * ROOM_SCALE, -box.min.y * ROOM_SCALE, -center.z * ROOM_SCALE);
  return room;
}

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
}) {
  // tick() closes over the mount-time scene, so live alert state travels
  // through a ref the tick reads every frame (ModelViewer builds once).
  // The 3D room no longer pulses with the alert state (the data-center
  // mesh has no separable screens) — incidentActive/contained are kept
  // in the API because the 2D topology and the mission flow still use
  // them; the 3D room is ambient only.
  const stateRef = useRef({ incidentActive, contained, cypherVoiceRef });
  stateRef.current = { incidentActive, contained, cypherVoiceRef };

  const buildScene = useCallback((scene) => {
    const pos = socPositions();
    let cypher = null;
    let sentinel = null;
    let patch = null;
    let lastT = null;

    // The data-center room itself: the environment the robots live in.
    // If it fails to load, the robots and devices still stand on the
    // void floor — the mission still works.
    loadDeviceModel('datacenter')
      .then((room) => {
        placeRoom(room);
        scene.add(room);
      })
      .catch(() => { /* room missing/unparseable — robots still present */ });

    // The three robots stand in the SOC (the real models — no
    // placeholders). If a GLB fails to load that robot is simply absent;
    // the mission still works. They start at their spots and greet on
    // load; Cypher then presents, driven by the voice ref. Patch is not
    // a humanoid — his clips (bob/rock walk, smaller arm swing) are
    // driven as-is, never forced into humanoid poses.
    const loadRobot = (key, spawn, onLoad) => {
      loadRobotCharacter(key)
        .then((controller) => {
          controller.group.scale.setScalar(spawn.scale);
          controller.group.position.set(spawn.x, 0, spawn.z);
          controller.group.rotation.y = spawn.rotationY;
          scene.add(controller.group);
          controller.play('greeting');
          onLoad(controller);
        })
        .catch(() => { /* robot absent — the SOC keeps the rest */ });
    };

    let cypherTag = null;
    loadRobot('cypher', CYPHER_SPAWN, (controller) => {
      cypher = controller;
      // His name tag, pinned to his chest bone and facing the camera —
      // the greeting is the tag; everything else he says is voice only.
      cypherTag = attachCypherNameTag(controller.group, SOC_CAMERA_POS);
    });
    loadRobot('sentinel', SENTINEL_SPAWN, (controller) => { sentinel = controller; });
    loadRobot('patch', PATCH_SPAWN, (controller) => { patch = controller; });

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
    // interactive={false} — never raycasts.
    const parts = [];
    devices.forEach((d) => {
      const p = pos[d.id];
      if (!p) return;
      const role = d.role || '';

      const fallback = new THREE.Group();
      try { fallbackBuilderFor(role)(fallback); } catch { /* keep empty group */ }
      fitAndPlace(fallback, p, FOOTPRINT);
      scene.add(fallback);

      const label = makeLabel(d.id, { height: 1.1 });
      label.position.set(p.x, FOOTPRINT + 1.6, p.z);
      scene.add(label);

      loadDeviceModel(modelKeyFor(role))
        .then((model) => {
          fitAndPlace(model, p, FOOTPRINT);
          scene.remove(fallback);
          scene.add(model);
        })
        .catch(() => { /* asset missing/unparseable — fallback stays */ });
    });

    // --- Robot animation: Cypher talks with the voice; all three idle
    // otherwise. The tag rides Cypher's chest bone; keep it yawed at the
    // fixed camera (under reduced motion the tick never runs, so the
    // orientation set at attach time stands).
    const tick = (t) => {
      const { cypherVoiceRef: voiceRef } = stateRef.current;
      const dt = lastT === null ? 0 : Math.min(t - lastT, 0.1);
      lastT = t;
      if (cypher) {
        const voice = voiceRef?.current;
        if (voice) {
          cypher.setTalkLevel(voice.level || 0);
          if (voice.talking && !cypher.isTalking()) {
            // Speech starts: talk, and point once at the explanation.
            cypher.setTalking(true);
            cypher.play('point');
          }
          if (!voice.talking && cypher.isTalking()) cypher.setTalking(false);
        }
        cypher.update(dt);
        if (cypherTag) faceTagToCamera(cypherTag, SOC_CAMERA_POS);
      }
      if (sentinel) sentinel.update(dt);
      if (patch) patch.update(dt);
    };

    return { parts, tick };
  }, [devices]);

  return (
    // Video card: the SOC presents like a 16:9 video player frame.
    <div className="aspect-video w-full">
      <ModelViewer
        buildScene={buildScene}
        cameraPos={SOC_CAMERA_POS}
        target={SOC_CAMERA_TARGET}
        background={background}
        reducedMotion={reducedMotion}
        quality={quality}
        onRendererFailed={onRendererFailed}
        interactive={false}
      />
    </div>
  );
}
