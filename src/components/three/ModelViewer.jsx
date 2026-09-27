import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function ModelViewer({ buildScene, cameraPos = [14, 12, 14], target = [0, 0.5, 0] }) {
  const mountRef = useRef(null);
  const buildRef = useRef(buildScene);
  const [info, setInfo] = useState(null);
  const [rendererFailed, setRendererFailed] = useState(false);

  useEffect(() => {
    buildRef.current = buildScene;
  }, [buildScene]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0e14');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(...cameraPos);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    try {
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (err) {
      setRendererFailed(true);
      return () => {};
    }

    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(12, 20, 10);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x3b82f6, 0.5);
    fill.position.set(-12, 6, -8);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x06b6d4, 0.3);
    rim.position.set(0, 4, -15);
    scene.add(rim);

    // Grid floor
    const grid = new THREE.GridHelper(60, 60, 0x1e2a3a, 0x141a24);
    grid.position.y = -2;
    scene.add(grid);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(...target);
    controls.minDistance = 6;
    controls.maxDistance = 45;
    controls.maxPolarAngle = Math.PI * 0.85;

    // Build scene
    const interactives = buildRef.current(scene) || [];

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = interactives.map((i) => i.mesh);
      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length > 0) {
        let hitMesh = hits[0].object;
        // resolve to a registered interactive (in case of nested meshes)
        while (hitMesh && !interactives.find((i) => i.mesh === hitMesh)) {
          hitMesh = hitMesh.parent;
        }
        const item = interactives.find((i) => i.mesh === hitMesh);
        if (item) {
          setInfo({
            label: item.label,
            desc: item.desc,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            cw: rect.width,
            ch: rect.height,
          });
          return;
        }
      }
      setInfo(null);
    };
    renderer.domElement.addEventListener('click', onClick);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <div ref={mountRef} className="h-full w-full" />
      {rendererFailed && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-6">
          <div className="text-center text-sm text-slate-400">
            <p className="font-semibold text-white">Visual preview unavailable</p>
            <p className="mt-2">This lab requires hardware acceleration or WebGL support.</p>
          </div>
        </div>
      )}
      {info && !rendererFailed && (
        <div
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg border border-blue-500/40 bg-black/55 backdrop-blur-xl px-3 py-2 text-xs shadow-xl"
          style={{
            left: Math.min(info.x + 14, info.cw - 230),
            top: Math.min(info.y + 14, info.ch - 70),
          }}
        >
          <p className="font-bold text-blue-300">{info.label}</p>
          <p className="mt-0.5 leading-relaxed text-slate-300">{info.desc}</p>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/40 px-2 py-1 text-[10px] text-slate-400">
        Drag to rotate · Scroll to zoom · Click parts for info
      </div>
    </div>
  );
}
