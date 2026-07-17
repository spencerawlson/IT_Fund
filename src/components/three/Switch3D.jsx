import React from 'react';
import * as THREE from 'three';
import ModelViewer from './ModelViewer';

function addBox(scene, parts, o) {
  const geo = new THREE.BoxGeometry(o.w, o.h, o.d);
  const mat = new THREE.MeshStandardMaterial({
    color: o.color,
    roughness: o.roughness ?? 0.6,
    metalness: o.metalness ?? 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(o.x, o.y, o.z);
  if (o.ry) mesh.rotation.y = o.ry;
  scene.add(mesh);
  if (o.label) parts.push({ mesh, label: o.label, desc: o.desc });
  return mesh;
}

function buildSwitch(scene) {
  const parts = [];

  // Chassis
  addBox(scene, parts, {
    w: 18, h: 2.6, d: 9, x: 0, y: 0, z: 0,
    color: 0x15181d, roughness: 0.4, metalness: 0.6,
    label: 'Switch Chassis',
    desc: 'A network switch connects devices in a LAN and forwards frames to the correct port using MAC addresses.',
  });

  // Top panel (slightly lighter)
  addBox(scene, parts, { w: 17.6, h: 0.08, d: 8.6, x: 0, y: 1.34, z: 0, color: 0x1c2026, metalness: 0.5 });

  // Cooling vents (top)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      addBox(scene, parts, {
        w: 0.6, h: 0.04, d: 0.12, x: -4.2 + c * 1.2, y: 1.4, z: -2.4 + r * 1.4,
        color: 0x05070a,
      });
    }
  }

  // Front panel face (positive Z)
  const frontZ = 4.55;

  // Port block (recessed dark area)
  addBox(scene, parts, { w: 16, h: 1.4, d: 0.1, x: 0, y: -0.1, z: frontZ + 0.02, color: 0x0a0c0f });

  // 16 Ethernet ports (2 rows x 8)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 8; col++) {
      const px = -6.5 + col * 1.85;
      const py = -0.35 + row * 0.7;
      // port recess
      addBox(scene, parts, {
        w: 1.2, h: 0.5, d: 0.25, x: px, y: py, z: frontZ + 0.08,
        color: 0x000000,
        label: row === 0 && col === 0 ? 'Ethernet Port' : null,
        desc: row === 0 && col === 0 ? 'RJ45 port — connects a device via Ethernet cable. The switch learns each port\'s MAC address.' : null,
      });
      // port tab (the clip notch)
      addBox(scene, parts, { w: 0.5, h: 0.12, d: 0.1, x: px, y: py - 0.32, z: frontZ + 0.1, color: 0x080808 });
      // status LED (green) above port
      addBox(scene, parts, {
        w: 0.16, h: 0.16, d: 0.06, x: px - 0.45, y: py + 0.36, z: frontZ + 0.12,
        color: (row + col) % 3 === 0 ? 0x06b6d4 : 0x22c55e,
        metalness: 0.1, roughness: 0.3,
        label: row === 0 && col === 0 ? 'Port Status LEDs' : null,
        desc: row === 0 && col === 0 ? 'Green = link active, blinking = data flowing. Amber may indicate speed/duplex mode.' : null,
      });
    }
  }

  // Management/Console port
  addBox(scene, parts, {
    w: 1, h: 0.6, d: 0.25, x: 8, y: -0.1, z: frontZ + 0.08,
    color: 0x1a1a1a,
    label: 'Console Port',
    desc: 'Serial management port for direct configuration access when the network is down.',
  });

  // SFP slots
  addBox(scene, parts, {
    w: 1.8, h: 0.7, d: 0.3, x: -8, y: 0.6, z: frontZ + 0.05,
    color: 0x000000,
    label: 'SFP Uplink Slots',
    desc: 'Hot-swappable transceiver slots for fiber uplinks to other switches or routers.',
  });

  // Brand / display panel
  addBox(scene, parts, {
    w: 4, h: 0.7, d: 0.1, x: 0, y: 1.0, z: frontZ + 0.02,
    color: 0x0d1b2a, metalness: 0.2,
    label: 'Status Display',
    desc: 'Shows system status, power, and fault indicators at a glance.',
  });

  // Rack ears
  addBox(scene, parts, { w: 0.6, h: 3.2, d: 9, x: -9.3, y: 0, z: 0, color: 0x101317, metalness: 0.6, label: 'Rack Mount Ear', desc: 'Bolt the switch into a standard 19-inch equipment rack.' });
  addBox(scene, parts, { w: 0.6, h: 3.2, d: 9, x: 9.3, y: 0, z: 0, color: 0x101317, metalness: 0.6 });

  // Power connector (back)
  addBox(scene, parts, {
    w: 1.4, h: 1, d: 0.4, x: 7.5, y: 0, z: -4.6,
    color: 0x111111,
    label: 'Power Input',
    desc: 'Connects the external power supply. Enterprise switches may have redundant PSUs.',
  });

  return parts;
}

export default function Switch3D() {
  return <ModelViewer buildScene={buildSwitch} cameraPos={[14, 9, 16]} target={[0, 0.2, 0]} />;
}