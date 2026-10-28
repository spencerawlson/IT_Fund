import React, { useCallback } from 'react';
import * as THREE from 'three';
import ModelViewer from '@/components/three/ModelViewer';
import { makeLabel } from '@/components/three/labels';
import {
  modelKeyFor, fallbackBuilderFor, loadDeviceModel, fitAndPlace,
} from '@/components/three/deviceModels';

// Phase 3 of the game layer (docs/GAME_LAB_DESIGN.md): a 3D view of the
// topology the learner builds in TopologyBuilder. Read-only — editing stays in
// the 2D board. Each device loads a real glTF/GLB model (public/models/*.glb)
// via GLTFLoader; until an asset is present it renders the procedural
// Visual-Lab model as a fallback, so the scene is never empty. Rendered through
// the shared ModelViewer, which degrades gracefully where WebGL is unavailable
// (and under SSR the WebGL effect never runs).

const FOOTPRINT = 6;

// Ring radius grows with device count so the full-size models don't collide.
export const radiusFor = (n) => Math.max(14, n * 3.4);

/** Circular layout in the XZ plane. Pure (no THREE), so it is unit-testable. */
export function layoutPositions(devices) {
  const pos = {};
  const n = devices.length;
  const radius = radiusFor(n);
  devices.forEach((id, i) => {
    if (n === 1) { pos[id] = { x: 0, y: 0, z: 0 }; return; }
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    pos[id] = { x: radius * Math.cos(a), y: 0, z: radius * Math.sin(a) };
  });
  return pos;
}

function buildScene(devices, links, roleById) {
  return (scene) => {
    const pos = layoutPositions(devices);

    // Cables first, at mid height, so they read as links between the models.
    links.forEach(([a, b]) => {
      const pa = pos[a]; const pb = pos[b];
      if (!pa || !pb) return;
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pa.x, 2, pa.z),
        new THREE.Vector3(pb.x, 2, pb.z),
      ]);
      scene.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x94a3b8 })));
    });

    const parts = [];
    devices.forEach((id) => {
      const p = pos[id];
      const role = roleById[id] || '';

      // Procedural fallback immediately, so nothing is blank while the GLB loads.
      const fallback = new THREE.Group();
      try { fallbackBuilderFor(role)(fallback); } catch { /* keep empty group */ }
      fitAndPlace(fallback, p, FOOTPRINT);
      scene.add(fallback);

      const label = makeLabel(id, { height: 1.1 });
      label.position.set(p.x, FOOTPRINT + 1.8, p.z);
      scene.add(label);
      parts.push({ label: id, desc: role });

      // Swap in the real model when it loads; keep the fallback if it doesn't.
      loadDeviceModel(modelKeyFor(role))
        .then((model) => {
          fitAndPlace(model, p, FOOTPRINT);
          scene.remove(fallback);
          scene.add(model);
        })
        .catch(() => { /* asset missing/unparseable — fallback stays */ });
    });
    return parts;
  };
}

export default function NetworkScene3D({ devices = [], links = [], roleById = {} }) {
  const build = useCallback((scene) => buildScene(devices, links, roleById)(scene), [devices, links, roleById]);
  const r = radiusFor(devices.length);
  const dist = r * 1.5 + 8;
  return <ModelViewer buildScene={build} cameraPos={[dist, dist * 0.7, dist]} target={[0, 2, 0]} />;
}
