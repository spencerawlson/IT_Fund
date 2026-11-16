import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Enterprise Network Router — shown as Spencer's R2C blueprint sheet rather than a 3D model
// (2026-11-16, Spencer's call: the Visual Lab equipment subjects are
// blueprints). The subject id stays 'router' so existing links keep working.
export default function Router3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['router']}
      alt="R2C enterprise network router blueprint: labeled front and rear panels, side and top views, internal cutaway and specifications"
      label="Enterprise Network Router"
    />
  );
}
