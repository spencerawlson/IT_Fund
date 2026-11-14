import React, { useCallback, useRef } from 'react';
import * as THREE from 'three';
import ModelViewer from '@/components/three/ModelViewer';
import { makeLabel } from '@/components/three/labels';
import {
  modelKeyFor, fallbackBuilderFor, loadDeviceModel, fitAndPlace,
} from '@/components/three/deviceModels';
import { loadCypherCharacter } from '@/components/three/CypherCharacter';
import { attachCypherNameTag, faceTagToCamera } from '@/components/three/nameTag';

// Cypher's spot in the SOC: open floor on the camera side of the room,
// facing the camera (the learner) so his chest — and the name tag on it —
// reads square-on at room distance. The model is real scale (1.70 m); the
// room reads at device scale, so he is scaled 3x to stand beside the
// 5-unit devices. Rotation atan2(7, 13) points him from (6, 2) at the
// camera's ground position (13, 15): a presenter facing his audience, the
// room behind him. The old spot (5.5, -5.5) put the 5-unit SRV rack
// between him and the camera — his chest and tag were hidden behind it,
// and at that distance the name rendered ~5px tall.
// The camera is fixed (interactive={false} creates no OrbitControls):
// nothing orbits or hides him. What moved in the live check was Cypher
// himself (the walk-in) plus the 2D/3D view toggles remounting the scene.
export const CYPHER_SPAWN = { x: 6, z: 2, scale: 3.0, rotationY: Math.atan2(13 - 6, 15 - 2) };

// Fixed presenter camera for the video frame; the name tag yaws to face it.
export const SOC_CAMERA_POS = [13, 9, 15];
export const SOC_CAMERA_TARGET = [3, 2, 0];

// The 3D SOC room for Operation Broken Shield. One room, kit-built from
// primitives plus the existing device GLBs: floor + walls, a desk row, a
// monitor wall, a server rack, the router, the firewall and the PCs.
//
// Presenter-only: Cypher walks in through the east-wall door and takes
// his spot, then presents — the camera is fixed and nothing in the room
// is clickable. Inspecting devices happens in the 2D topology
// (MissionTopology, "fully playable without WebGL"), which sends the same
// inspect action; the 3D scene keeps no hitboxes or click handling.
//
// Alert state drives the monitor wall: while the incident is active the
// screens glow red (pulsed by tick, unless reduced motion — ModelViewer then
// never calls tick, so the screens stay static red); once the guest is
// blocked the screens go green. A doorway mesh on the east wall is the seam
// later rooms attach to.
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

/** Pure layout: device id -> { x, z } on the room floor. */
export function socPositions() {
  return {
    R1: { x: 0, z: -1 },
    PC1: { x: -7, z: 3.5 },
    GUEST: { x: -7, z: -4.5 },
    SRV: { x: 7.5, z: -1 },
  };
}

const FOOTPRINT = 5;

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 }),
  );
  m.position.set(x, y, z);
  return m;
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
  const stateRef = useRef({ incidentActive, contained, cypherVoiceRef });
  stateRef.current = { incidentActive, contained, cypherVoiceRef };

  const buildScene = useCallback((scene) => {
    const pos = socPositions();
    const screenMats = [];
    let cypher = null;
    let lastT = null;

    // Cypher stands in the SOC (the real model — no placeholder). If the
    // GLB fails to load he is simply absent; the mission still works.
    // He walks in through the east-wall door and takes his spot by the
    // SOC; reduced motion skips the walk (the tick never runs then, so a
    // walk would strand him at the door) and he starts at his spot.
    const walkFrom = { x: 11.5, z: 4 };
    let cypherWalking = false;
    let cypherTag = null;
    loadCypherCharacter()
      .then((controller) => {
        cypher = controller;
        controller.group.scale.setScalar(CYPHER_SPAWN.scale);
        scene.add(controller.group);
        // His name tag, pinned to his chest bone and facing the camera —
        // the greeting is the tag; everything else he says is voice only.
        cypherTag = attachCypherNameTag(controller.group, SOC_CAMERA_POS);
        if (reducedMotion) {
          controller.group.position.set(CYPHER_SPAWN.x, 0, CYPHER_SPAWN.z);
          controller.group.rotation.y = CYPHER_SPAWN.rotationY;
        } else {
          controller.group.position.set(walkFrom.x, 0, walkFrom.z);
          controller.group.rotation.y = Math.atan2(
            CYPHER_SPAWN.x - walkFrom.x, CYPHER_SPAWN.z - walkFrom.z,
          );
          controller.play('walk');
          cypherWalking = true;
        }
      })
      .catch(() => { /* Cypher absent — the SOC keeps its devices */ });

    // --- Room shell: floor slab + back/side walls (front stays open to the camera).
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 18),
      new THREE.MeshStandardMaterial({ color: 0xdfe3ee, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.96;
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(box(26, 7, 0.4, 0xe8e6f2, 0, 1.5, -9)); // back wall
    scene.add(box(0.4, 7, 18, 0xe8e6f2, -13, 1.5, 0)); // west wall
    scene.add(box(0.4, 7, 18, 0xe8e6f2, 13, 1.5, 0)); // east wall

    // --- Doorway on the east wall: the seam later rooms attach to.
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 1 }),
    );
    door.rotation.y = -Math.PI / 2;
    door.position.set(12.78, 0.35, 4);
    scene.add(door);
    scene.add(box(0.5, 0.35, 3.4, 0x8b5cf6, 12.8, 2.85, 4)); // lintel
    scene.add(box(0.5, 5, 0.35, 0x8b5cf6, 12.8, 0.35, 2.2)); // jamb
    scene.add(box(0.5, 5, 0.35, 0x8b5cf6, 12.8, 0.35, 5.8)); // jamb

    // --- Desk row along the back wall + the monitor wall above it.
    scene.add(box(20, 0.35, 2.4, 0x6b5f8f, 0, 0.2, -7.4));
    scene.add(box(0.3, 1.6, 2.2, 0x544a75, -9.4, -1.1, -7.4));
    scene.add(box(0.3, 1.6, 2.2, 0x544a75, 9.4, -1.1, -7.4));
    [-6.5, 0, 6.5].forEach((x) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0b1020, emissive: 0x38bdf8, emissiveIntensity: 0.7, roughness: 0.4,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3), mat);
      screen.position.set(x, 3.4, -8.7);
      scene.add(screen);
      screenMats.push(mat);
      scene.add(box(5.8, 0.25, 0.25, 0x1e1b2e, x, 1.75, -8.7)); // bezel base
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

    // --- Alert pulse: red while the incident is live, green once contained.
    // Cypher's mixer advances here too, driven by the shared voice ref.
    const tick = (t) => {
      const { incidentActive: active, contained: done, cypherVoiceRef: voiceRef } = stateRef.current;
      const color = done ? 0x22c55e : active ? 0xef4444 : 0x38bdf8;
      const pulse = active && !done ? 0.55 + 0.45 * Math.sin(t * 3) : 0.7;
      screenMats.forEach((m) => {
        m.emissive.setHex(color);
        m.emissiveIntensity = pulse;
      });
      if (cypher) {
        const dt = lastT === null ? 0 : Math.min(t - lastT, 0.1);
        lastT = t;
        if (cypherWalking) {
          // Walk-in: stride toward the spot, facing the direction of
          // travel; on arrival, face the room and greet, then idle.
          const p = cypher.group.position;
          const dx = CYPHER_SPAWN.x - p.x;
          const dz = CYPHER_SPAWN.z - p.z;
          const dist = Math.hypot(dx, dz);
          const step = 4 * dt; // ~4 units/s: door to spot in under 3 s
          if (dist <= step) {
            p.set(CYPHER_SPAWN.x, 0, CYPHER_SPAWN.z);
            cypher.group.rotation.y = CYPHER_SPAWN.rotationY;
            cypherWalking = false;
            cypher.play('greeting');
          } else {
            p.x += (dx / dist) * step;
            p.z += (dz / dist) * step;
            cypher.group.rotation.y = Math.atan2(dx, dz);
          }
        } else {
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
        }
        cypher.update(dt);
        // The tag rides the chest bone; keep it yawed at the fixed camera
        // as he walks in (under reduced motion the tick never runs, so the
        // orientation set at attach time stands).
        if (cypherTag) faceTagToCamera(cypherTag, SOC_CAMERA_POS);
      }
    };

    return { parts, tick };
  }, [devices, reducedMotion]);

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
