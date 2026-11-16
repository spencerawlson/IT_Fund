import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Rack-Mount UPS (2U) — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'ups' so existing links keep working.
export default function Ups3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['ups']}
      alt="R2C rack-mount UPS blueprint: labeled front and rear panels, internal cutaway, battery module, LCD display and specifications"
      label="Rack-Mount UPS (2U)"
    />
  );
}
