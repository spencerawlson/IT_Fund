import BlueprintSubject from './BlueprintSubject';
import { FALLBACK_BLUEPRINT_FOR_SUBJECT } from '@/data/blueprints';

// OSI Model — shown as Spencer's R2C blueprint sheet (R2C-OSI-001) rather
// than the procedural 3D layer stack (2026-11-16, Spencer's call). The
// subject id stays 'osi' so existing links keep working.
export default function Osi3D() {
  return (
    <BlueprintSubject
      src={FALLBACK_BLUEPRINT_FOR_SUBJECT.osi}
      alt="R2C OSI model blueprint: the seven layers with functions and example protocols, data flow between sender and receiver, encapsulation, PDU by layer and key takeaways"
      label="OSI Model"
    />
  );
}
