import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ModelViewer from './ModelViewer';
import { addLabel } from './labels';
import { fitAndPlace } from './deviceModels';

// Shared loader for Visual Lab subjects built from a real .glb (Spencer's
// Meshy equipment models) instead of the procedural three.js builders.
//
// A subject is a thin wrapper around ModelViewer: the buildScene it passes
// starts the async GLB load, fits the model to the viewer footprint, and
// registers the whole model as ONE clickable part (label + description) plus
// floating feature labels positioned from the fitted bounding box.
//
// The `parts` array is returned empty and filled when the load resolves —
// ModelViewer holds the same array reference and reads it on every click,
// so the part becomes clickable as soon as the model lands. The load runs
// inside ModelViewer's effect (browser-only), so this is SSR-safe: nothing
// here touches the DOM or the network at render time.
//
// Model files live under public/models/ with a `lab-` prefix, deliberately
// distinct from the deviceModels keys (switch/router/server/firewall/cloud)
// that the mission SOC topology view loads — swapping those would change
// the SOC scene, which is a separate decision.

const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
export const labModelUrl = (file) => `${base}models/${file}`;

let _loader = null;
const _cache = new Map(); // url -> Promise<THREE.Object3D>

function loader() {
  if (!_loader) _loader = new GLTFLoader();
  return _loader;
}

/** Load a Lab model by URL, resolving to a fresh clone (shared parse cache). */
export function loadLabModel(url) {
  if (!_cache.has(url)) {
    const p = new Promise((resolve, reject) => {
      loader().load(url, (gltf) => resolve(gltf.scene), undefined, (err) => reject(err));
    });
    _cache.set(url, p);
  }
  return _cache.get(url).then((scene) => scene.clone(true));
}

/**
 * Build a ModelViewer buildScene for a GLB subject.
 *
 * @param {string} url — model URL (labModelUrl(...)).
 * @param {string} label — click-info title for the whole model.
 * @param {string} desc — click-info description for the whole model.
 * @param {Array<{text: string, at: [number, number, number]}>} annotations —
 *   floating labels; `at` is a fraction across the fitted bounding box
 *   (x: left→right, y: bottom→top, z: back→front), values may exceed
 *   [0, 1] to sit just outside the model.
 * @param {number} footprint — the model's longest dimension after fitting.
 */
export function makeGltfBuildScene({ url, label, desc, annotations = [], footprint = 16 }) {
  return (scene) => {
    const parts = [];
    const group = new THREE.Group();
    scene.add(group);
    loadLabModel(url)
      .then((model) => {
        fitAndPlace(model, { x: 0, z: 0 }, footprint);
        model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
        group.add(model);
        parts.push({ mesh: group, label, desc });
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        for (const a of annotations) {
          const [fx, fy, fz] = a.at;
          addLabel(
            scene,
            a.text,
            box.min.x + fx * size.x,
            box.min.y + fy * size.y,
            box.min.z + fz * size.z,
          );
        }
      })
      .catch((err) => {
        // The asset ships in the repo, so a failed load is a real defect —
        // say so loudly in the console instead of failing silently.
        // eslint-disable-next-line no-console
        console.error(`[GltfSubject] failed to load ${url}:`, err);
      });
    return parts;
  };
}

/**
 * Thin ModelViewer wrapper for a GLB subject. Same props contract as the
 * procedural subjects (Switch3D, ServerRack3D): cameraPos / target frame
 * the fitted model, fallbackImage is the blueprint sheet shown when WebGL
 * cannot start.
 */
export default function GltfSubject({ modelUrl, cameraPos, target, fallbackImage, label, desc, annotations }) {
  return (
    <ModelViewer
      buildScene={makeGltfBuildScene({ url: modelUrl, label, desc, annotations })}
      cameraPos={cameraPos}
      target={target}
      fallbackImage={fallbackImage}
    />
  );
}
