import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildSwitch } from './Switch3D';
import { buildRack } from './ServerRack3D';
import { buildVpc } from './Vpc3D';
import { buildLoadBalancer } from './LoadBalancer3D';
import { buildMotherboard } from './Motherboard3D';

// Realistic device models for the 3D topology view. Each device role maps to a
// glTF/GLB asset under public/models/ (served at /models/*.glb). Those are real
// artist/photogrammetry models — far more lifelike than hand-coded primitives.
// Until an asset is present, we fall back to the Visual-Lab procedural builder,
// so the scene always renders something recognizable.
//
// To add/replace a model: drop a .glb at public/models/<key>.glb (see that
// folder's README for CC0 sources and the expected filenames).

// role -> asset key (the .glb basename under public/models/).
export function modelKeyFor(role = '') {
  const r = role.toLowerCase();
  if (r.includes('server')) return 'server';
  if (r.includes('internet') || r.includes('cloud') || r.includes('upstream')) return 'cloud';
  if (r.includes('firewall')) return 'firewall';
  if (r.includes('router') || r.includes('gateway')) return 'router';
  if (r.includes('switch')) return 'switch';
  return 'pc'; // workstation / host
}

// Fallback procedural builder per role, used when the .glb isn't available.
export function fallbackBuilderFor(role = '') {
  const r = role.toLowerCase();
  if (r.includes('server')) return buildRack;
  if (r.includes('internet') || r.includes('cloud') || r.includes('upstream')) return buildVpc;
  if (r.includes('firewall')) return buildLoadBalancer;
  if (r.includes('switch')) return buildSwitch;
  if (r.includes('router') || r.includes('gateway')) return buildSwitch;
  return buildMotherboard;
}

const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
export const modelUrl = (key) => `${base}models/${key}.glb`;

// One loader; cache each key's loaded scene so repeated devices share a parse.
let _loader = null;
const _cache = new Map(); // key -> Promise<THREE.Object3D>

function loader() {
  if (!_loader) _loader = new GLTFLoader();
  return _loader;
}

/**
 * Load a device model by key, resolving to a fresh clone (so the same asset can
 * be placed at several positions). Rejects if the asset is missing/unparseable,
 * which is the caller's cue to keep the procedural fallback.
 */
export function loadDeviceModel(key) {
  if (!_cache.has(key)) {
    const p = new Promise((resolve, reject) => {
      loader().load(
        modelUrl(key),
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err),
      );
    });
    _cache.set(key, p);
  }
  return _cache.get(key).then((scene) => scene.clone(true));
}

/** Scale `obj` to fit `footprint` and stand it on y=0 centred at `p`; returns its scaled height. */
export function fitAndPlace(obj, p, footprint = 6) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = footprint / maxDim;
  obj.scale.setScalar(s);
  obj.position.set(p.x - center.x * s, -box.min.y * s, p.z - center.z * s);
  return size.y * s;
}
