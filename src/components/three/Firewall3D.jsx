import GltfSubject, { labModelUrl } from './GltfSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// 3D next-generation firewall — Spencer's own Meshy model, slimmed for the
// web (see GltfSubject.jsx). The model ships untextured (Meshy generated
// it without a texture pass), so its look is pure geometry — ports, vents,
// and the module bay. Distinct subject id from the animated 'firewall'
// (Firewall Rules) subject.
export default function Firewall3D() {
  return (
    <GltfSubject
      modelUrl={labModelUrl('lab-firewall.glb')}
      cameraPos={[13, 8, 15]}
      target={[0, 1, 0]}
      fallbackImage={FALLBACK_BLUEPRINT_FOR_SUBJECT['firewall-3d']}
      label="Next-Gen Firewall"
      desc="A next-generation firewall inspects traffic between the trusted LAN and the internet, enforcing the rule set before packets reach the router."
      annotations={[
        { text: 'LAN / WAN Ports', at: [-0.3, 0.75, 1.08] },
        { text: 'SFP+ Uplinks', at: [0.7, 0.75, 1.08] },
      ]}
    />
  );
}
