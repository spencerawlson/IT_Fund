import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Enterprise Wireless Access Point — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'access-point' so existing links keep working.
export default function AccessPoint3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['access-point']}
      alt="R2C enterprise wireless access point blueprint: top, front, rear and bottom views, internal and exploded views, MIMO antenna layout and status LEDs"
      label="Enterprise Wireless Access Point"
    />
  );
}
