import React, { useCallback } from 'react';
import * as THREE from 'three';
import ModelViewer from '@/components/three/ModelViewer';
import { makeLabel } from '@/components/three/labels';
import { buildSwitch } from '@/components/three/Switch3D';
import { buildRack } from '@/components/three/ServerRack3D';
import { buildVpc } from '@/components/three/Vpc3D';
import { buildLoadBalancer } from '@/components/three/LoadBalancer3D';
import { buildMotherboard } from '@/components/three/Motherboard3D';

// Phase 3 of the game layer (docs/GAME_LAB_DESIGN.md): a 3D view of the
// topology the learner builds in TopologyBuilder. Read-only — editing stays in
// the 2D board. It renders the SAME detailed device models used in the Visual
// Lab (Switch3D, ServerRack3D, …) rather than placeholder blocks, each dropped
// into a group, auto-scaled to a uniform footprint and placed on a ring.
// Rendered through the shared ModelViewer, which degrades gracefully where
// WebGL is unavailable (and under SSR the WebGL effect never runs).

// Uniform footprint (world units) every device model is scaled to fit.
const FOOTPRINT = 6;

// The ring radius grows with the device count so the (now full-size) models
// don't collide; larger than the placeholder version because the meshes are big.
export const radiusFor = (n) => Math.max(14, n * 3.4);

// Role -> the Visual-Lab model builder that best represents it. Switches and
// routers share the rack-appliance chassis; the firewall uses the appliance
// model, the internet/cloud uses the VPC model, hosts use the board model.
export function builderFor(role = '') {
  const r = role.toLowerCase();
  if (r.includes('server')) return buildRack;
  if (r.includes('internet') || r.includes('cloud') || r.includes('upstream')) return buildVpc;
  if (r.includes('firewall')) return buildLoadBalancer;
  if (r.includes('switch')) return buildSwitch;
  if (r.includes('router') || r.includes('gateway')) return buildSwitch;
  return buildMotherboard; // workstation / host
}

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

// Build a device model into a group, scale it to FOOTPRINT, centre it in XZ and
// stand it on y=0 at `p`. Returns the scaled height, for label placement.
function placeDevice(scene, build, p) {
  const group = new THREE.Group();
  build(group); // builders just .add() meshes; any returned parts/tick are ignored
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = FOOTPRINT / maxDim;
  group.scale.setScalar(s);
  group.position.set(p.x - center.x * s, -box.min.y * s, p.z - center.z * s);
  scene.add(group);
  return size.y * s;
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
      let height = FOOTPRINT;
      try {
        height = placeDevice(scene, builderFor(roleById[id] || ''), p);
      } catch {
        // If a model fails to build, fall back to a block so the scene still renders.
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(3, 2, 3),
          new THREE.MeshStandardMaterial({ color: 0x64748b }),
        );
        mesh.position.set(p.x, 1, p.z);
        scene.add(mesh);
      }
      const label = makeLabel(id, { height: 1.1 });
      label.position.set(p.x, Math.max(height, 2) + 1.6, p.z);
      scene.add(label);
      parts.push({ label: id, desc: roleById[id] });
    });
    return parts;
  };
}

export default function NetworkScene3D({ devices = [], links = [], roleById = {} }) {
  const build = useCallback((scene) => buildScene(devices, links, roleById)(scene), [devices, links, roleById]);
  // Pull the camera back as the ring grows so the whole network stays framed.
  const r = radiusFor(devices.length);
  const dist = r * 1.5 + 8;
  return <ModelViewer buildScene={build} cameraPos={[dist, dist * 0.7, dist]} target={[0, 2, 0]} />;
}
