import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// Next-generation firewall — shown as Spencer's R2C blueprint sheet rather
// than a 3D model (2026-11-16, Spencer's call). The Meshy firewall could not
// be slimmed cleanly: its fragmented texture atlas smeared below ~189k tris,
// and the version that held up weighed 3.5 MB. The sheet is ~0.4 MB, needs
// no WebGL, and labels every port, LED and module. The subject id stays
// 'firewall-3d' so existing lesson links keep working.
export default function Firewall3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT['firewall-3d']}
      alt="R2C next-generation firewall blueprint: perspective, labeled front and rear views, top and side views, internal cutaway, specifications and use cases"
      label="Next-Gen Firewall"
    />
  );
}
