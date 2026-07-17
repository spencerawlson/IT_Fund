import React from 'react';
import * as THREE from 'three';
import ModelViewer from './ModelViewer';

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
  scene.add(mesh);
  if (o.label) parts.push({ mesh, label: o.label, desc: o.desc });
  return mesh;
}

// Bottom (L1) to top (L7)
const LAYERS = [
  { n: 1, name: 'Physical', color: 0x64748b, ex: 'Cables, bits, signals', desc: 'Raw bit transmission over a physical medium — electrical, optical, or radio signals.' },
  { n: 2, name: 'Data Link', color: 0x06b6d4, ex: 'MAC, Ethernet, frames', desc: 'Node-to-node delivery on the same local network using MAC addresses. The layer switches operate on.' },
  { n: 3, name: 'Network', color: 0x3b82f6, ex: 'IP, routing', desc: 'Routes packets across networks using IP addresses. The layer routers operate on.' },
  { n: 4, name: 'Transport', color: 0x6366f1, ex: 'TCP, UDP, ports', desc: 'End-to-end delivery. Segments data and uses port numbers to reach the correct application.' },
  { n: 5, name: 'Session', color: 0xa855f7, ex: 'Sockets, RPC', desc: 'Opens, manages, and closes communication sessions between two applications.' },
  { n: 6, name: 'Presentation', color: 0xec4899, ex: 'TLS, JPEG, ASCII', desc: 'Translates, encrypts, and compresses data. TLS encryption and character encoding happen here.' },
  { n: 7, name: 'Application', color: 0xf59e0b, ex: 'HTTP, DNS, SMTP', desc: 'Network services for user applications — browsers, email clients. The layer users actually interact with.' },
];

function buildOsi(scene) {
  const parts = [];
  LAYERS.forEach((l, i) => {
    const y = -7.5 + i * 2.5;
    addBox(scene, parts, {
      w: 13, h: 2.2, d: 8, x: 0, y, z: 0,
      color: l.color, metalness: 0.4, roughness: 0.5,
      emissive: l.color, emissiveIntensity: 0.18,
      label: `Layer ${l.n}: ${l.name}`,
      desc: `${l.desc} Example protocols: ${l.ex}.`,
    });
  });
  return parts;
}

export default function Osi3D() {
  return <ModelViewer buildScene={buildOsi} cameraPos={[16, 6, 18]} target={[0, 0, 0]} />;
}