import GltfSubject, { labModelUrl } from './GltfSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// 3D enterprise router — Spencer's own Meshy model, slimmed for the web
// (see GltfSubject.jsx). Replaces no procedural builder: the Lab never had
// a router subject before. The whole model is one clickable part; the
// floating labels call out its ports from the fitted bounding box.
export default function Router3D() {
  return (
    <GltfSubject
      modelUrl={labModelUrl('lab-router.glb')}
      cameraPos={[13, 8, 15]}
      target={[0, 1, 0]}
      fallbackImage={FALLBACK_BLUEPRINT_FOR_SUBJECT.router}
      label="Enterprise Router"
      desc="An edge router forwards packets between networks — WAN uplinks on one side, LAN and management ports on the other. It is where a packet leaves the local network."
      annotations={[
        { text: 'LAN Ports', at: [-0.1, 0.7, 1.08] },
        { text: 'WAN Uplink', at: [0.45, 0.7, 1.08] },
        { text: 'Console Port', at: [0.78, 0.7, 1.08] },
      ]}
    />
  );
}
