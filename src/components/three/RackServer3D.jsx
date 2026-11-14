import GltfSubject, { labModelUrl } from './GltfSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// 3D 2U rack server — Spencer's own Meshy model, slimmed for the web
// (see GltfSubject.jsx). The model ships untextured (Meshy generated it
// without a texture pass), so its look is pure geometry — drive bays,
// power supplies, and cooling. Distinct from the 'server-rack' subject,
// which is the whole 42U rack.
export default function RackServer3D() {
  return (
    <GltfSubject
      modelUrl={labModelUrl('lab-rack-server.glb')}
      cameraPos={[13, 8, 15]}
      target={[0, 1, 0]}
      fallbackImage={FALLBACK_BLUEPRINT_FOR_SUBJECT['rack-server']}
      label="2U Rack Server"
      desc="A 2U rack server — compute, memory, and storage packed into a shallow chassis that slides into the rack on rails."
      annotations={[
        { text: 'Drive Bays', at: [0.72, 0.6, 1.08] },
      ]}
    />
  );
}
