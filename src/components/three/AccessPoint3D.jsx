import GltfSubject, { labModelUrl } from './GltfSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// 3D wireless access point — Spencer's own Meshy model, slimmed for the
// web (see GltfSubject.jsx). The AP is a flat disc, so the camera looks
// down at it and the labels sit just above its top face.
export default function AccessPoint3D() {
  return (
    <GltfSubject
      modelUrl={labModelUrl('lab-access-point.glb')}
      cameraPos={[10, 13, 13]}
      target={[0, 0.5, 0]}
      fallbackImage={FALLBACK_BLUEPRINT_FOR_SUBJECT['access-point']}
      label="Wireless Access Point"
      desc="A wireless access point bridges Wi-Fi clients onto the wired network — one PoE uplink carries both its power and its traffic."
      annotations={[
        { text: 'Status Ring', at: [0.5, 1.08, 0.5] },
        { text: 'PoE Uplink', at: [-0.5, 1.08, 0.5] },
      ]}
    />
  );
}
