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
    transparent: o.opacity !== undefined,
    opacity: o.opacity ?? 1,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(o.x, o.y, o.z);
  scene.add(mesh);
  if (o.label) parts.push({ mesh, label: o.label, desc: o.desc });
  return mesh;
}

function addCyl(scene, parts, o) {
  const geo = new THREE.CylinderGeometry(o.r, o.r, o.h, 24);
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

function addEdges(scene, o) {
  const geo = new THREE.BoxGeometry(o.w, o.h, o.d);
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: o.color ?? 0x3b82f6, transparent: true, opacity: o.opacity ?? 0.5 })
  );
  line.position.set(o.x, o.y, o.z);
  scene.add(line);
}

function addLine(scene, a, b, color = 0x475569) {
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
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(start).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  scene.add(mesh);
}

function buildVpc(scene) {
  const parts = [];

  // VPC boundary (wireframe only — visual, not clickable)
  addEdges(scene, { w: 26, h: 9, d: 16, x: 0, y: 2, z: 0, color: 0x6366f1, opacity: 0.45 });

  // VPC corner tag (clickable)
  addBox(scene, parts, {
    w: 2.4, h: 1, d: 1, x: -12, y: 6.6, z: -7.5,
    color: 0x312e81, emissive: 0x4338ca, emissiveIntensity: 0.4,
    label: 'VPC (Virtual Private Cloud)',
    desc: 'Your isolated virtual network in the cloud. You define IP ranges, subnets, route tables, and gateways. Resources inside are private by default.',
  });

  // Public subnet floor
  addBox(scene, parts, {
    w: 12, h: 0.4, d: 14, x: -6.5, y: 0, z: 0,
    color: 0x064e3b, opacity: 0.85, metalness: 0.2,
    label: 'Public Subnet',
    desc: 'A subnet with a route to the internet via the Internet Gateway. Resources here (load balancers, web servers) can have public IPs.',
  });
  // Private subnet floor
  addBox(scene, parts, {
    w: 12, h: 0.4, d: 14, x: 6.5, y: 0, z: 0,
    color: 0x1e3a8a, opacity: 0.85, metalness: 0.2,
    label: 'Private Subnet',
    desc: 'No direct internet route. Databases and app servers live here, reachable only through the load balancer or a NAT gateway for outbound traffic.',
  });

  // Internet Gateway
  addBox(scene, parts, {
    w: 2.4, h: 2.4, d: 2.4, x: -12.8, y: 2.6, z: 0,
    color: 0xf59e0b, metalness: 0.5, emissive: 0xb45309, emissiveIntensity: 0.3,
    label: 'Internet Gateway',
    desc: 'Connects the VPC to the public internet. It allows public-subnet resources to send and receive traffic to and from the outside world.',
  });

  // Load Balancer (in public subnet)
  addBox(scene, parts, {
    w: 2.6, h: 2.6, d: 2.6, x: -6.5, y: 2.7, z: 0,
    color: 0x4f46e5, metalness: 0.4, emissive: 0x4338ca, emissiveIntensity: 0.45,
    label: 'Load Balancer',
    desc: 'Distributes incoming internet traffic across multiple targets. It lives in the public subnet and forwards requests to app servers in the private subnet.',
  });

  // Web server (public subnet)
  addBox(scene, parts, {
    w: 2.2, h: 2.2, d: 2.2, x: -6.5, y: 2.6, z: 5,
    color: 0x0ea5e9, metalness: 0.4,
    label: 'Web Server',
    desc: 'A public-facing instance in the public subnet. Can be reached directly from the internet for static content or APIs.',
  });

  // NAT Gateway (between subnets)
  addBox(scene, parts, {
    w: 2.2, h: 2.2, d: 2.2, x: 0, y: 2.6, z: 0,
    color: 0x14b8a6, metalness: 0.4, emissive: 0x0d9488, emissiveIntensity: 0.3,
    label: 'NAT Gateway',
    desc: 'Lets private-subnet instances reach the internet for updates/API calls while staying unreachable from inbound connections. Outbound only.',
  });

  // App servers (private subnet)
  addBox(scene, parts, {
    w: 2.2, h: 2.2, d: 2.2, x: 4.5, y: 2.6, z: -4,
    color: 0x2563eb, metalness: 0.4,
    label: 'App Server',
    desc: 'Application instance in the private subnet. It processes business logic and is reachable only via the load balancer — never directly from the internet.',
  });
  addBox(scene, parts, {
    w: 2.2, h: 2.2, d: 2.2, x: 4.5, y: 2.6, z: 4,
    color: 0x2563eb, metalness: 0.4,
  });

  // Database (private subnet)
  addCyl(scene, parts, {
    r: 1.4, h: 2.8, x: 9.8, y: 2.6, z: 0,
    color: 0x7c3aed, metalness: 0.5,
    label: 'Database',
    desc: 'Managed database in the private subnet. Only the app servers can reach it — no internet exposure, keeping data secure.',
  });

  // Connectivity lines
  addLine(scene, [-12.8, 2.6, 0], [-6.5, 2.7, 0], 0xf59e0b);          // IGW → LB
  addLine(scene, [-6.5, 2.7, 0], [-6.5, 2.6, 5], 0x38bdf8);           // LB → Web
  addLine(scene, [-6.5, 2.7, 0], [4.5, 2.6, -4], 0x818cf8);           // LB → App1
  addLine(scene, [-6.5, 2.7, 0], [4.5, 2.6, 4], 0x818cf8);            // LB → App2
  addLine(scene, [0, 2.6, 0], [4.5, 2.6, -4], 0x2dd4bf);              // NAT → App1
  addLine(scene, [0, 2.6, 0], [4.5, 2.6, 4], 0x2dd4bf);               // NAT → App2
  addLine(scene, [4.5, 2.6, -4], [9.8, 2.6, 0], 0xa78bfa);            // App1 → DB
  addLine(scene, [4.5, 2.6, 4], [9.8, 2.6, 0], 0xa78bfa);             // App2 → DB

  // Floating annotations
  addLabel(scene, 'VPC', 0, 8.2, -7.5, { height: 1.1 });
  addLabel(scene, 'Internet Gateway', -12.8, 4.6, 0);
  addLabel(scene, 'Load Balancer', -6.5, 4.7, 0);
  addLabel(scene, 'Web Server', -6.5, 4.6, 5);
  addLabel(scene, 'NAT Gateway', 0, 4.6, 0);
  addLabel(scene, 'App Servers', 4.5, 4.6, 0);
  addLabel(scene, 'Database', 9.8, 4.9, 0);
  addLabel(scene, 'Public Subnet', -6.5, 1.1, -6.2, { height: 0.75 });
  addLabel(scene, 'Private Subnet', 6.5, 1.1, -6.2, { height: 0.75 });

  return parts;
}

export default function Vpc3D() {
  return <ModelViewer buildScene={buildVpc} cameraPos={[20, 14, 24]} target={[0, 2, 0]} />;
}