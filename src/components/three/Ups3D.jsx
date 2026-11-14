import GltfSubject, { labModelUrl } from './GltfSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// 3D rack-mounted UPS — Spencer's own Meshy model, slimmed for the web
// (see GltfSubject.jsx). Replaces no procedural builder: the Lab never had
// a UPS subject before.
export default function Ups3D() {
  return (
    <GltfSubject
      modelUrl={labModelUrl('lab-ups.glb')}
      cameraPos={[13, 8, 15]}
      target={[0, 1, 0]}
      fallbackImage={FALLBACK_BLUEPRINT_FOR_SUBJECT.ups}
      label="Rack-Mounted UPS"
      desc="A rack-mounted UPS keeps servers running through a power cut — batteries and an inverter bridge the gap until the generator starts or systems shut down cleanly."
      annotations={[
        { text: 'Ventilation Grille', at: [-0.55, 0.7, 1.08] },
        { text: 'Status Display', at: [0.3, 0.7, 1.08] },
        { text: 'Power Button', at: [0.55, 0.7, 1.08] },
      ]}
    />
  );
}
