import React from 'react';
import * as THREE from 'three';
import ModelViewer from './ModelViewer';
import { addLabel, makeLabel } from './labels';

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

function addLink(scene, a, b, color = 0x475569, opacity = 0.5) {
  // Solid cylinder link — readable at any zoom, unlike a 1px Line.
  const start = new THREE.Vector3(a[0], a[1], a[2]);
  const end = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.07, 0.07, len, 10);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.2,
    emissive: color,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(start).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  scene.add(mesh);
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
  let pulseRing = null;

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

  // Instances — every one is clickable now, with its own health status.
  INSTANCES.forEach((inst, i) => {
    const healthy = inst.healthy;
    const n = i + 1;
    addBox(scene, parts, {
      w: 2.6, h: 2.6, d: 2.6, x: inst.x, y: 1.7, z: inst.z,
      color: healthy ? 0x0ea5e9 : 0xef4444, metalness: 0.4,
      emissive: healthy ? 0x0c4a6e : 0x7f1d1d, emissiveIntensity: 0.35,
      label: `Target ${n} — ${healthy ? 'Healthy' : 'Unhealthy'}`,
      desc: healthy
        ? `Target instance ${n}: passing health checks and receiving a share of traffic.`
        : `Target instance ${n}: FAILING health checks — the load balancer has removed it from rotation until it recovers. Note the warning marker: health is shown by shape, not color alone.`,
    });
    // health-status LED on top
    addBox(scene, parts, {
      w: 0.5, h: 0.5, d: 0.5, x: inst.x, y: 3.25, z: inst.z,
      color: healthy ? 0x22c55e : 0xef4444,
      emissive: healthy ? 0x16a34a : 0xb91c1c, emissiveIntensity: 0.8, roughness: 0.2,
      label: `Target ${n} Health Check`,
      desc: healthy
        ? 'Passing: this target answers health checks, so it stays in rotation.'
        : 'Failing: this target is not answering health checks, so no traffic is sent here.',
    });

    if (!healthy) {
      // Non-color health cue: a floating warning badge plus a pulsing ring at the base.
      const warn = makeLabel('⚠ UNHEALTHY', { height: 0.85, fg: '#fbbf24' });
      warn.position.set(inst.x, 4.6, inst.z);
      scene.add(warn);
      const ringGeo = new THREE.TorusGeometry(2.1, 0.09, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 });
      pulseRing = new THREE.Mesh(ringGeo, ringMat);
      pulseRing.rotation.x = -Math.PI / 2;
      pulseRing.position.set(inst.x, 0.45, inst.z);
      scene.add(pulseRing);
    }

    // connection link LB → instance
    addLink(scene, [0, 4, -5.4], [inst.x, 3, inst.z - 1.3], healthy ? 0x818cf8 : 0xf87171, healthy ? 0.6 : 0.3);
  });

  addLabel(scene, 'Load Balancer', 0, 7.8, -7, { height: 1.0 });
  addLabel(scene, 'Target Group', 0, 1.3, 9.6);

  // Per-frame animation: pulse the unhealthy ring. Returned alongside parts so
  // ModelViewer drives it; the ring is decorative, never clickable.
  const tick = (t) => {
    if (pulseRing) {
      const s = 1 + 0.12 * Math.sin(t * 4);
      pulseRing.scale.set(s, s, 1);
      pulseRing.material.opacity = 0.55 + 0.3 * Math.sin(t * 4);
    }
  };

  return { parts, tick };
}

export default function LoadBalancer3D() {
  return <ModelViewer buildScene={buildLoadBalancer} cameraPos={[16, 12, 18]} target={[0, 2, 2]} />;
}