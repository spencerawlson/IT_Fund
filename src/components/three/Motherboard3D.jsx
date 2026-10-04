import React from 'react';
import * as THREE from 'three';
import ModelViewer from './ModelViewer';
import { addLabel } from './labels';

function addBox(scene, parts, o) {
  const geo = new THREE.BoxGeometry(o.w, o.h, o.d);
  const mat = new THREE.MeshStandardMaterial({
    color: o.color,
    roughness: o.roughness ?? 0.65,
    metalness: o.metalness ?? 0.15,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(o.x, o.y, o.z);
  if (o.ry) mesh.rotation.y = o.ry;
  scene.add(mesh);
  if (o.label) parts.push({ mesh, label: o.label, desc: o.desc });
  return mesh;
}

function addCyl(scene, parts, o) {
  const geo = new THREE.CylinderGeometry(o.r, o.r, o.h, 18);
  const mat = new THREE.MeshStandardMaterial({
    color: o.color,
    roughness: o.roughness ?? 0.5,
    metalness: o.metalness ?? 0.4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(o.x, o.y, o.z);
  scene.add(mesh);
  if (o.label) parts.push({ mesh, label: o.label, desc: o.desc });
  return mesh;
}

function buildMotherboard(scene) {
  const parts = [];

  // PCB
  addBox(scene, parts, {
    w: 18, h: 0.35, d: 13, x: 0, y: 0, z: 0,
    color: 0x1a4d2e, roughness: 0.8, metalness: 0.1,
    label: 'Motherboard (PCB)',
    desc: 'The main circuit board. Every component connects through the copper traces etched into this board.',
  });

  // CPU socket
  addBox(scene, parts, {
    w: 4.4, h: 0.35, d: 4.4, x: -0.5, y: 0.35, z: -1,
    color: 0x9a9a9a, metalness: 0.6,
    label: 'CPU Socket',
    desc: 'Holds the processor. The socket\'s pin layout must match the CPU generation.',
  });
  // CPU
  addBox(scene, parts, {
    w: 3.6, h: 0.35, d: 3.6, x: -0.5, y: 0.7, z: -1,
    color: 0x2a2a2a, metalness: 0.7, roughness: 0.3,
    label: 'CPU',
    desc: 'The Central Processing Unit — executes all instructions. Its speed is measured in GHz.',
  });
  // Heatsink base
  addBox(scene, parts, {
    w: 4, h: 1.6, d: 4, x: -0.5, y: 1.7, z: -1,
    color: 0x556070, metalness: 0.85, roughness: 0.25,
    label: 'CPU Heatsink',
    desc: 'Dissipates heat from the CPU. Fins increase surface area for faster cooling.',
  });
  // Heatsink fins — raised so they protrude above the base (base top is at y=2.5);
  // previously they sat entirely inside the base and were invisible.
  for (let i = -1.5; i <= 1.5; i += 0.6) {
    addBox(scene, parts, { w: 0.18, h: 1.5, d: 3.6, x: -0.5 + i, y: 2.3, z: -1, color: 0x4a5260, metalness: 0.85 });
  }

  // PCB traces — thin copper runs on the board surface in Manhattan bus patterns,
  // suggesting the etched wiring that links CPU → RAM, CPU → chipset, chipset → PCIe.
  const traceMat = { color: 0xb87333, metalness: 0.8, roughness: 0.35 };
  const trace = (x1, z1, x2, z2) => {
    const horiz = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
    if (horiz) {
      const w = Math.abs(x2 - x1);
      if (w < 0.05) return;
      addBox(scene, parts, { w, h: 0.02, d: 0.06, x: (x1 + x2) / 2, y: 0.19, z: z1, ...traceMat });
    } else {
      const d = Math.abs(z2 - z1);
      if (d < 0.05) return;
      addBox(scene, parts, { w: 0.06, h: 0.02, d, x: x1, y: 0.19, z: (z1 + z2) / 2, ...traceMat });
    }
  };
  // CPU (-0.5,-1) → RAM slots (x=5.6): a bus of parallel runs
  for (let k = 0; k < 8; k++) {
    const z = -2.6 + k * 0.45;
    trace(1.8, z, 5.2, z);
    trace(1.8, z, 1.8, -1);
  }
  // CPU → chipset (1.5, 3.5)
  for (let k = 0; k < 6; k++) {
    const x = -0.2 + k * 0.35;
    trace(x, 1.2, x, 2.4);
    trace(x, 1.2, -0.5, 1.2);
  }
  // Chipset → PCIe slots (x=-6.2)
  for (let k = 0; k < 6; k++) {
    const z = 2.6 + k * 0.4;
    trace(0.4, z, -5.8, z);
    trace(0.4, z, 0.4, 3.5);
  }
  // Chipset → M.2 slot (2,-5)
  for (let k = 0; k < 4; k++) {
    const x = 1.0 + k * 0.3;
    trace(x, 2.4, x, -2.8);
    trace(x, -2.8, 2.0, -2.8);
  }

  // RAM slots (4)
  for (let i = 0; i < 4; i++) {
    addBox(scene, parts, {
      w: 0.65, h: 0.6, d: 5, x: 5.6, y: 0.48, z: -3.5 + i * 0.95,
      color: 0x111111, metalness: 0.2,
      label: i === 0 ? 'RAM Slots (DIMM)' : null,
      desc: i === 0 ? 'Hold RAM modules. Volatile working memory — faster than any storage.' : null,
    });
    // gold contacts
    addBox(scene, parts, { w: 0.7, h: 0.1, d: 4.8, x: 5.6, y: 0.18, z: -3.5 + i * 0.95, color: 0xc9a227, metalness: 0.9, roughness: 0.2 });
  }

  // PCIe slots (2)
  for (let i = 0; i < 2; i++) {
    addBox(scene, parts, {
      w: 0.4, h: 0.3, d: 7.5, x: -6.2, y: 0.22, z: 1 + i * 1.2,
      color: 0x0a0a0a,
      label: i === 0 ? 'PCIe Expansion Slot' : null,
      desc: i === 0 ? 'For add-in cards: GPUs, network cards, SSDs. Much faster than older PCI.' : null,
    });
  }

  // Chipset
  addBox(scene, parts, {
    w: 2, h: 0.3, d: 2, x: 1.5, y: 0.25, z: 3.5,
    color: 0x1a1a1a,
    label: 'Chipset',
    desc: 'Manages data flow between the CPU, RAM, storage, and peripherals.',
  });

  // CMOS battery
  addCyl(scene, parts, {
    r: 0.75, h: 0.4, x: -5, y: 0.4, z: 4.5,
    color: 0xc0c0c0, metalness: 0.9, roughness: 0.2,
    label: 'CMOS Battery',
    desc: 'Powers the RTC and keeps BIOS/UEFI settings when the PC is off.',
  });

  // M.2 slot
  addBox(scene, parts, {
    w: 1, h: 0.12, d: 4.2, x: 2, y: 0.22, z: -5,
    color: 0x0d0d0d,
    label: 'M.2 SSD Slot',
    desc: 'Compact high-speed SSD slot. Supports NVMe — far faster than SATA SSDs.',
  });

  // Capacitors
  const capPositions = [
    [3.5, -2], [4, -1], [-3, 2], [-3.5, 1], [4.5, 1.5], [3, 2.5], [-4, -2], [5, -2.5],
  ];
  capPositions.forEach(([cx, cz]) => {
    addCyl(scene, parts, {
      r: 0.22, h: 0.55, x: cx, y: 0.45, z: cz,
      color: 0x0a1a3a, metalness: 0.3,
      label: 'Capacitor',
      desc: 'Stabilizes voltage and filters power noise for nearby components.',
    });
  });

  // I/O shield ports (back edge)
  addBox(scene, parts, {
    w: 5, h: 1.2, d: 0.3, x: 3, y: 0.7, z: -6.4,
    color: 0x2a4d6a, metalness: 0.6,
    label: 'I/O Panel',
    desc: 'Rear ports: USB, Ethernet, audio, display outputs. Pre-installed on the board.',
  });
  // small port cutouts: 2 rows x 3
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 3; i++) {
      addBox(scene, parts, { w: 0.5, h: 0.4, d: 0.2, x: 1.8 + i * 1.1, y: 0.5 + r * 0.55, z: -6.5, color: 0x060606 });
    }
  }

  // 24-pin power
  addBox(scene, parts, {
    w: 2.6, h: 0.8, d: 0.5, x: 7, y: 0.6, z: 5.8,
    color: 0x111111,
    label: '24-pin ATX Power',
    desc: 'Main power connector from the PSU to the motherboard.',
  });

  // Floating annotations
  addLabel(scene, 'CPU + Heatsink', -0.5, 4.4, -1);
  addLabel(scene, 'RAM (DIMM)', 5.6, 2.0, -2.1);
  addLabel(scene, 'PCIe Slot', -6.2, 1.6, 1.6);
  addLabel(scene, 'Chipset', 1.5, 1.6, 3.5);
  addLabel(scene, 'CMOS Battery', -5, 1.7, 4.5);
  addLabel(scene, 'M.2 SSD', 2, 1.5, -5);
  addLabel(scene, '24-pin ATX', 7, 2.0, 5.8);

  return parts;
}

export default function Motherboard3D() {
  return <ModelViewer buildScene={buildMotherboard} cameraPos={[15, 13, 15]} target={[0, 0.5, 0]} />;
}