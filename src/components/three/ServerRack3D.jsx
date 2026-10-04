import React from 'react';
import * as THREE from 'three';
import ModelViewer from './ModelViewer';
import { addLabel } from './labels';

function addBox(scene, parts, o) {
  const geo = new THREE.BoxGeometry(o.w, o.h, o.d);
  const mat = new THREE.MeshStandardMaterial({
    color: o.color,
    roughness: o.roughness ?? 0.6,
    metalness: o.metalness ?? 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(o.x, o.y, o.z);
  scene.add(mesh);
  if (o.label) parts.push({ mesh, label: o.label, desc: o.desc });
  return mesh;
}

function buildRack(scene) {
  const parts = [];

  // Build the rack in its own group so it can be lifted as one piece: the rack
  // is 22 units tall but the shared floor sits at y=-2, so without the lift the
  // bottom half (UPS, lower servers) sinks through the floor into the fog.
  const rack = new THREE.Group();
  scene.add(rack);
  rack.position.y = 9;
  const R = rack; // shorthand for addBox targets below

  // 4 corner posts
  const posts = [[-3.2, -3.4], [3.2, -3.4], [-3.2, 3.4], [3.2, 3.4]];
  posts.forEach(([px, pz], i) => {
    addBox(R, parts, {
      w: 0.5, h: 22, d: 0.5, x: px, y: 0, z: pz,
      color: 0x2b3542, metalness: 0.7, roughness: 0.3,
      label: i === 0 ? 'Rack Frame' : null,
      desc: i === 0 ? 'Standard 19-inch server rack frame. Equipment bolts to vertical rails and is measured in rack units (1U = 1.75").' : null,
    });
  });

  // Top & bottom plates
  addBox(R, parts, { w: 7, h: 0.3, d: 8, x: 0, y: 11, z: 0, color: 0x232b36, metalness: 0.6 });
  addBox(R, parts, { w: 7, h: 0.3, d: 8, x: 0, y: -11, z: 0, color: 0x232b36, metalness: 0.6 });

  const frontZ = 3.9;

  // 6 server units (1U)
  for (let i = 0; i < 6; i++) {
    const y = -7.2 + i * 2.4;
    addBox(R, parts, {
      w: 6.2, h: 1.5, d: 7.6, x: 0, y, z: 0,
      color: 0x2b3542, metalness: 0.5, roughness: 0.5,
      label: i === 0 ? 'Server Unit (1U)' : null,
      desc: i === 0 ? 'A rack-mounted server — each 1U slot holds a complete computer (CPU, RAM, storage). Racks pack dozens of these.' : null,
    });
    // front bezel
    addBox(R, parts, { w: 6.0, h: 1.3, d: 0.2, x: 0, y, z: frontZ, color: 0x323e50, metalness: 0.4 });
    // power LED
    addBox(R, parts, {
      w: 0.12, h: 0.12, d: 0.05, x: -2.7, y: y + 0.4, z: frontZ + 0.05,
      color: 0x22c55e, roughness: 0.2,
      label: i === 0 ? 'Status LEDs' : null,
      desc: i === 0 ? 'Green = powered & healthy. Blue = activity. Amber = hardware warning or fault.' : null,
    });
    // disk activity LEDs
    addBox(R, parts, { w: 0.1, h: 0.1, d: 0.05, x: 2.5, y: y + 0.35, z: frontZ + 0.05, color: 0x3b82f6, roughness: 0.2 });
    addBox(R, parts, { w: 0.1, h: 0.1, d: 0.05, x: 2.7, y: y + 0.35, z: frontZ + 0.05, color: 0x06b6d4, roughness: 0.2 });
  }

  // Top-of-rack switch
  addBox(R, parts, {
    w: 6.2, h: 1.0, d: 7.6, x: 0, y: 7, z: 0,
    color: 0x1f2a3d, metalness: 0.5,
    label: 'Top-of-Rack Switch',
    desc: 'A switch at the top of the rack that connects every server below it to the data-center network.',
  });
  addBox(R, parts, { w: 6.0, h: 0.8, d: 0.2, x: 0, y: 7, z: frontZ, color: 0x0d3a5e });
  for (let c = 0; c < 8; c++) {
    addBox(R, parts, { w: 0.12, h: 0.12, d: 0.05, x: -2.4 + c * 0.7, y: 7.25, z: frontZ + 0.05, color: c % 2 ? 0x22c55e : 0x3b82f6, roughness: 0.2 });
  }

  // PDU (right side, vertical)
  addBox(R, parts, {
    w: 1.0, h: 20, d: 1.6, x: 4.6, y: 0, z: 0,
    color: 0x2a2a2a, metalness: 0.4,
    label: 'PDU',
    desc: 'Power Distribution Unit — distributes mains/UPS power to every server in the rack via outlets.',
  });
  for (let i = 0; i < 6; i++) {
    addBox(R, parts, { w: 0.4, h: 0.3, d: 0.1, x: 4.6, y: -7 + i * 2.8, z: 0.85, color: 0x141414 });
  }

  // UPS at bottom
  addBox(R, parts, {
    w: 6.2, h: 1.8, d: 7.6, x: 0, y: -9.8, z: 0,
    color: 0x232323, metalness: 0.4,
    label: 'UPS Battery',
    desc: 'Uninterruptible Power Supply — battery backup that keeps servers running briefly during a power outage.',
  });

  // Cable management arm
  addBox(R, parts, {
    w: 0.3, h: 18, d: 0.8, x: 3.8, y: 0, z: 3.6,
    color: 0x333d4d,
    label: 'Cable Management',
    desc: 'Routes power and network cables neatly to each server, preventing tangles and aiding airflow.',
  });

  // Floating annotations (world coords = rack-local + lift of 9)
  addLabel(scene, '42U Rack', 0, 21.5, 0, { height: 1.1 });
  addLabel(scene, 'Server (1U)', -5.4, 9 + 2.4, 0);
  addLabel(scene, 'Top-of-Rack Switch', 5.6, 9 + 7, 0);
  addLabel(scene, 'PDU', 6.6, 9, 0);
  addLabel(scene, 'UPS', -5.2, 9 - 9.8, 0);

  return parts;
}

export default function ServerRack3D() {
  return <ModelViewer buildScene={buildRack} cameraPos={[22, 16, 26]} target={[0, 9, 0]} />;
}