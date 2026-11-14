import GltfSubject, { labModelUrl } from './GltfSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// 3D NAS storage appliance — Spencer's own Meshy model, slimmed for the
// web (see GltfSubject.jsx). Replaces no procedural builder: the Lab never
// had a NAS subject before.
export default function Nas3D() {
  return (
    <GltfSubject
      modelUrl={labModelUrl('lab-nas.glb')}
      cameraPos={[13, 9, 15]}
      target={[0, 2.5, 0]}
      fallbackImage={FALLBACK_BLUEPRINT_FOR_SUBJECT.nas}
      label="NAS Storage Appliance"
      desc="A NAS appliance serves shared storage over the network — hot-swap drive bays in front, network and power in back, running 24/7."
      annotations={[
        { text: 'Drive Bays', at: [-0.25, 0.7, 1.08] },
        { text: 'Power Button', at: [0.72, 0.8, 1.08] },
      ]}
    />
  );
}
