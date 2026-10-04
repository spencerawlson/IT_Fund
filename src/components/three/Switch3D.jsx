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
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(o.x, o.y, o.z);
  if (o.ry) mesh.rotation.y = o.ry;
  scene.add(mesh);
  if (o.label) parts.push({ mesh, label: o.label, desc: o.desc });
  return mesh;
}

/**
 * Fill an InstancedMesh from a list of {x,y,z} positions (identity rotation).
 */
function addInstanced(scene, geo, mat, positions) {
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  const m = new THREE.Matrix4();
  positions.forEach((p, i) => {
    m.makeTranslation(p.x, p.y, p.z);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}

function buildSwitch(scene) {
  const parts = [];

  // Chassis
  addBox(scene, parts, {
    w: 18, h: 2.6, d: 9, x: 0, y: 0, z: 0,
    color: 0x252c36, roughness: 0.4, metalness: 0.6,
    label: 'Switch Chassis',
    desc: 'A network switch connects devices in a LAN and forwards frames to the correct port using MAC addresses.',
  });

  // Top panel (slightly lighter)
  addBox(scene, parts, { w: 17.6, h: 0.08, d: 8.6, x: 0, y: 1.34, z: 0, color: 0x2c343f, metalness: 0.5 });

  // Cooling vents (top) — one InstancedMesh instead of 32 individual meshes.
  const ventPositions = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      ventPositions.push({ x: -4.2 + c * 1.2, y: 1.4, z: -2.4 + r * 1.4 });
    }
  }
  addInstanced(
    scene,
    new THREE.BoxGeometry(0.6, 0.04, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.7, metalness: 0.3 }),
    ventPositions,
  );

  // Front panel face (positive Z)
  const frontZ = 4.55;

  // Port block (recessed dark area)
  addBox(scene, parts, { w: 16, h: 1.4, d: 0.1, x: 0, y: -0.1, z: frontZ + 0.02, color: 0x11151b });

  // 16 Ethernet ports (2 rows x 8). Port [0][0] and its LED stay regular meshes so
  // they keep their click tooltips; the other 15 of each are instanced.
  const portPos = [];
  const ledPos = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 8; col++) {
      const px = -6.5 + col * 1.85;
      const py = -0.35 + row * 0.7;
      if (row === 0 && col === 0) {
        // Representative port recess (clickable)
        addBox(scene, parts, {
          w: 1.2, h: 0.5, d: 0.25, x: px, y: py, z: frontZ + 0.08,
          color: 0x05070a,
          label: 'Ethernet Port',
          desc: 'RJ45 port — connects a device via Ethernet cable. The switch learns each port\'s MAC address.',
        });
        // port tab (the clip notch)
        addBox(scene, parts, { w: 0.5, h: 0.12, d: 0.1, x: px, y: py - 0.32, z: frontZ + 0.1, color: 0x111318 });
        // Representative status LED (clickable) — cyan, matching the original (0,0) LED
        addBox(scene, parts, {
          w: 0.16, h: 0.16, d: 0.06, x: px - 0.45, y: py + 0.36, z: frontZ + 0.12,
          color: 0x06b6d4, metalness: 0.1, roughness: 0.3,
          emissive: 0x06b6d4, emissiveIntensity: 0.7,
          label: 'Port Status LEDs',
          desc: 'Green = link active, blinking = data flowing. Amber may indicate speed/duplex mode.',
        });
      } else {
        portPos.push({ x: px, y: py, z: frontZ + 0.08 });
        ledPos.push({ x: px - 0.45, y: py + 0.36, z: frontZ + 0.12 });
      }
    }
  }
  addInstanced(
    scene,
    new THREE.BoxGeometry(1.2, 0.5, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.6, metalness: 0.3 }),
    portPos,
  );
  // LEDs alternate green/cyan like before; bake the color per instance.
  const ledGeo = new THREE.BoxGeometry(0.16, 0.16, 0.06);
  const ledMesh = new THREE.InstancedMesh(ledGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.35 }), ledPos.length);
  {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    ledPos.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      ledMesh.setMatrixAt(i, m);
      // Recreate the original alternating pattern, skipping index 0 (the labeled LED).
      const k = i + 1;
      const row = Math.floor(k / 8);
      const col = k % 8;
      c.set((row + col) % 3 === 0 ? 0x06b6d4 : 0x22c55e);
      ledMesh.setColorAt(i, c);
    });
    ledMesh.instanceMatrix.needsUpdate = true;
    if (ledMesh.instanceColor) ledMesh.instanceColor.needsUpdate = true;
  }
  scene.add(ledMesh);

  // Management/Console port
  addBox(scene, parts, {
    w: 1, h: 0.6, d: 0.25, x: 8, y: -0.1, z: frontZ + 0.08,
    color: 0x23272e,
    label: 'Console Port',
    desc: 'Serial management port for direct configuration access when the network is down.',
  });

  // SFP slots
  addBox(scene, parts, {
    w: 1.8, h: 0.7, d: 0.3, x: -8, y: 0.6, z: frontZ + 0.05,
    color: 0x05070a,
    label: 'SFP Uplink Slots',
    desc: 'Hot-swappable transceiver slots for fiber uplinks to other switches or routers.',
  });

  // Brand / display panel
  addBox(scene, parts, {
    w: 4, h: 0.7, d: 0.1, x: 0, y: 1.0, z: frontZ + 0.02,
    color: 0x12233a, metalness: 0.2,
    label: 'Status Display',
    desc: 'Shows system status, power, and fault indicators at a glance.',
  });

  // Rack ears
  addBox(scene, parts, { w: 0.6, h: 3.2, d: 9, x: -9.3, y: 0, z: 0, color: 0x1a2027, metalness: 0.6, label: 'Rack Mount Ear', desc: 'Bolt the switch into a standard 19-inch equipment rack.' });
  addBox(scene, parts, { w: 0.6, h: 3.2, d: 9, x: 9.3, y: 0, z: 0, color: 0x1a2027, metalness: 0.6 });

  // Power connector (back)
  addBox(scene, parts, {
    w: 1.4, h: 1, d: 0.4, x: 7.5, y: 0, z: -4.6,
    color: 0x1c1c1c,
    label: 'Power Input',
    desc: 'Connects the external power supply. Enterprise switches may have redundant PSUs.',
  });

  // Floating annotations
  addLabel(scene, '16× RJ45 Ports', 0, -1.6, 5.6);
  addLabel(scene, 'SFP+ Uplinks', -8, 1.9, 5.2);
  addLabel(scene, 'Console Port', 8, 1.1, 5.2);
  addLabel(scene, 'Cooling Vents', -4.2, 2.6, -2);

  return parts;
}

export default function Switch3D() {
  return <ModelViewer buildScene={buildSwitch} cameraPos={[14, 9, 16]} target={[0, 0.2, 0]} />;
}