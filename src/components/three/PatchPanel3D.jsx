import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Patch Panel (48-Port, Cat6) — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'patch-panel' so existing links keep working.
export default function PatchPanel3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['patch-panel']}
      alt="R2C 48-port Cat6 patch panel blueprint: labeled front ports 1–48, rear 110 punch-down termination, T568A/T568B wiring and specifications"
      label="Patch Panel (48-Port, Cat6)"
    />
  );
}
