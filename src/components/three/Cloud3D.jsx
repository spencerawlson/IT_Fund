import GltfSubject, { labModelUrl } from './GltfSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// 3D cloud architecture panel — Spencer's own Meshy model, slimmed for the
// web (see GltfSubject.jsx). The model IS the blueprint sheet as a
// standing panel, so it carries no floating labels: the diagram already
// names every part. Replaces no procedural builder: the Lab never had a
// cloud subject before.
export default function Cloud3D() {
  return (
    <GltfSubject
      modelUrl={labModelUrl('lab-cloud.glb')}
      cameraPos={[10, 8, 18]}
      target={[0, 7, 0]}
      fallbackImage={FALLBACK_BLUEPRINT_FOR_SUBJECT.cloud}
      label="Cloud Architecture"
      desc="The cloud architecture sheet in 3D — virtual network, subnets, firewall, load balancer, and the services that run on top."
      annotations={[]}
    />
  );
}
