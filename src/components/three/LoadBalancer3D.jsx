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

function addLine(scene, a, b, color = 0x475569, opacity = 0.5) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a[0], a[1], a[2]),
    new THREE.Vector3(b[0], b[1], b[2]),
  ]);
  scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
}

const INSTANCES = [
  { x: -10, z: 5, healthy: true },
  { x: -5, z: 5, healthy: true },
  { x: 0, z: 5, healthy: true },
  { x: 5, z: 5, healthy: false },
  { x: 10, z: 5, healthy: true },
];

function buildLoadBalancer(scene) {
  const parts = [];

  // Load Balancer (back center, tall + glowing)
  addBox(scene, parts, {
    w: 3.2, h: 6, d: 3.2, x: 0, y: 4, z: -7,
    color: 0x4f46e5, metalness: 0.4, emissive: 0x4338ca, emissiveIntensity: 0.5,
    label: 'Load Balancer',
    desc: 'Receives all incoming traffic and distributes it across the target group. It runs periodic health checks and stops sending traffic to any unhealthy target.',
  });

  // Target group platform
  addBox(scene, parts, {
    w: 25, h: 0.4, d: 7, x: 0, y: 0.2, z: 5,
    color: 0x1e293b, metalness: 0.3, opacity: undefined,
    label: 'Target Group',
    desc: 'The set of registered instances the load balancer can forward requests to. Only healthy targets receive traffic.',
  });

  // Instances
  INSTANCES.forEach((inst, i) => {
    const healthy = inst.healthy;
    addBox(scene, parts, {
      w: 2.6, h: 2.6, d: 2.6, x: inst.x, y: 1.7, z: inst.z,
      color: healthy ? 0x0ea5e9 : 0xef4444, metalness: 0.4,
      emissive: healthy ? 0x0c4a6e : 0x7f1d1d, emissiveIntensity: 0.35,
      label: i === 0 ? 'Target Instance' : null,
      desc: i === 0
        ? healthy
          ? 'A registered backend server. The load balancer forwards requests here. Green = passing health checks.'
          : 'This target is failing health checks — the load balancer has removed it from rotation until it recovers.'
        : null,
    });
    // health-status LED on top
    addBox(scene, parts, {
      w: 0.5, h: 0.5, d: 0.5, x: inst.x, y: 3.25, z: inst.z,
      color: healthy ? 0x22c55e : 0xef4444,
      emissive: healthy ? 0x16a34a : 0xb91c1c, emissiveIntensity: 0.8, roughness: 0.2,
      label: i === 0 ? 'Health Status LED' : null,
      desc: i === 0 ? 'Green = the target is passing health checks and receiving traffic. Red = failing checks — traffic is routed elsewhere.' : null,
    });
    // connection line LB → instance
    addLine(scene, [0, 4, -5.4], [inst.x, 3, inst.z - 1.3], healthy ? 0x818cf8 : 0xf87171, healthy ? 0.5 : 0.25);
  });

  return parts;
}

export default function LoadBalancer3D() {
  return <ModelViewer buildScene={buildLoadBalancer} cameraPos={[16, 12, 18]} target={[0, 2, 2]} />;
}