import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// 42U Server Rack Cabinet — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'server-rack' so existing links keep working.
// The procedural rack builder the SOC topology uses lives in ./rackBuilder.js.
export default function ServerRack3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['server-rack']}
      alt="R2C 42U server rack cabinet blueprint: front, rear and side views, rack-unit reference, exploded structure, cooling and PDU options"
      label="42U Server Rack Cabinet"
    />
  );
}
