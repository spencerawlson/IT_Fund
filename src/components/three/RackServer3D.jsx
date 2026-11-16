import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Rack Server (2U) — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'rack-server' so existing links keep working.
export default function RackServer3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['rack-server']}
      alt="R2C 2U rack server blueprint: labeled front and rear panels, top and side views, internal layout, hot-swap drive bay and specifications"
      label="Rack Server (2U)"
    />
  );
}
