import React, { useCallback } from 'react';
import * as THREE from 'three';
import ModelViewer from '@/components/three/ModelViewer';
import { makeLabel } from '@/components/three/labels';

// Phase 3 of the game layer (docs/GAME_LAB_DESIGN.md): a 3D view of the
// topology the learner builds in TopologyBuilder. It is a read-only
// visualization — editing stays in the 2D board — rendered through the shared
// ModelViewer, which degrades gracefully where WebGL is unavailable (and under
// SSR the WebGL effect never runs, so this is safe to render anywhere).

// The ring radius grows with the device count so a big topology (a 7-node DMZ)
// spaces out as cleanly as a 3-node LAN instead of overlapping.
export const radiusFor = (n) => Math.max(9, n * 2.2);

// Colour + shape per device role. Kept deliberately simple (typed blocks, not
// the detailed single-device models) so a whole network reads clearly at a glance.
const STYLE = {
  router: { color: 0x7c3aed, shape: 'box', w: 3.4, h: 1.4, d: 3.4 },
  switch: { color: 0x0ea5a4, shape: 'box', w: 4.0, h: 1.0, d: 2.4 },
  server: { color: 0x334155, shape: 'box', w: 2.2, h: 3.2, d: 2.2 },
  firewall: { color: 0xdc2626, shape: 'box', w: 2.6, h: 2.6, d: 1.2 },
  cloud: { color: 0x3b82f6, shape: 'sphere', r: 1.9 },
  host: { color: 0x64748b, shape: 'box', w: 2.4, h: 2.0, d: 2.4 },
};

export function styleFor(role = '') {
  const r = role.toLowerCase();
  if (r.includes('firewall')) return STYLE.firewall;
  if (r.includes('internet') || r.includes('cloud') || r.includes('upstream')) return STYLE.cloud;
  if (r.includes('router') || r.includes('gateway')) return STYLE.router;
  if (r.includes('switch')) return STYLE.switch;
  if (r.includes('server')) return STYLE.server;
  return STYLE.host;
}

/** Circular layout in the XZ plane. Pure (no THREE), so it is unit-testable. */
export function layoutPositions(devices) {
  const pos = {};
  const n = devices.length;
  const radius = radiusFor(n);
  devices.forEach((id, i) => {
    if (n === 1) { pos[id] = { x: 0, y: 1, z: 0 }; return; }
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    pos[id] = { x: radius * Math.cos(a), y: 1, z: radius * Math.sin(a) };
  });
  return pos;
}

function buildScene(devices, links, roleById) {
  return (scene) => {
    const pos = layoutPositions(devices);

    // Cables first, so device blocks sit on top of them.
    links.forEach(([a, b]) => {
      const pa = pos[a]; const pb = pos[b];
      if (!pa || !pb) return;
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pa.x, pa.y, pa.z),
        new THREE.Vector3(pb.x, pb.y, pb.z),
      ]);
      scene.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x94a3b8 })));
    });

    const parts = [];
    devices.forEach((id) => {
      const p = pos[id];
      const s = styleFor(roleById[id] || '');
      const geo = s.shape === 'sphere'
        ? new THREE.SphereGeometry(s.r, 24, 16)
        : new THREE.BoxGeometry(s.w, s.h, s.d);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: s.color, roughness: 0.5, metalness: 0.3,
      }));
      mesh.position.set(p.x, p.y, p.z);
      scene.add(mesh);
      const label = makeLabel(id, { height: 0.9 });
      label.position.set(p.x, p.y + (s.h ? s.h / 2 + 1.2 : (s.r || 1) + 1.2), p.z);
      scene.add(label);
      parts.push({ mesh, label: id, desc: roleById[id] });
    });
    return parts;
  };
}

export default function NetworkScene3D({ devices = [], links = [], roleById = {} }) {
  const build = useCallback((scene) => buildScene(devices, links, roleById)(scene), [devices, links, roleById]);
  // Pull the camera back as the ring grows so the whole network stays framed.
  const r = radiusFor(devices.length);
  const dist = r * 1.5 + 6;
  return <ModelViewer buildScene={build} cameraPos={[dist, dist * 0.85, dist]} target={[0, 1, 0]} />;
}
