import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Managed Network Switch (48-Port) — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'switch' so existing links keep working.
// The procedural switch builder the SOC topology uses lives in ./switchBuilder.js.
export default function Switch3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['switch']}
      alt="R2C managed 48-port network switch blueprint: front, rear, side and top views, internal cutaway, port and LED detail and specifications"
      label="Managed Network Switch (48-Port)"
    />
  );
}
