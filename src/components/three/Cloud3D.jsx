import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Cloud Computing Architecture — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'cloud' so existing links keep working.
export default function Cloud3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['cloud']}
      alt="R2C cloud computing architecture blueprint: virtual network, subnets, load balancer, firewall and object storage"
      label="Cloud Computing Architecture"
    />
  );
}
