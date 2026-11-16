import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Enterprise NAS Storage Appliance — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'nas' so existing links keep working.
export default function Nas3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['nas']}
      alt="R2C enterprise NAS storage appliance blueprint: 8 hot-swap drive bays, front, rear and side views, internal cutaway, RAID levels and specifications"
      label="Enterprise NAS Storage Appliance"
    />
  );
}
