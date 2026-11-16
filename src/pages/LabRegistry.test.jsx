import { describe, it, expect } from 'vitest';
import { SUBJECTS, RENDERERS } from './Lab';

// The Visual Lab gallery registry: every 3D subject id must resolve to a
// renderer, ids must be unique, and the ten equipment subjects must be
// present with kind 'blueprint' in their categories (2026-11-16: the Visual
// Lab shows Spencer's R2C blueprint sheets instead of the Meshy 3D models). Importing the page module only — nothing renders.
const BLUEPRINT_SUBJECTS = [
  ['switch', 'Hardware'],
  ['server-rack', 'Hardware'],
  ['rack-server', 'Hardware'],
  ['ups', 'Hardware'],
  ['patch-panel', 'Hardware'],
  ['osi', 'Networking'],
  ['router', 'Networking'],
  ['access-point', 'Networking'],
  ['cloud', 'Cloud & Scale'],
  ['firewall-3d', 'Security'],
  ['nas', 'Data & Systems'],
];

describe('Lab subject registry', () => {
  it('has unique subject ids', () => {
    const ids = SUBJECTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists the ten equipment subjects and OSI as blueprints in their categories', () => {
    for (const [id, category] of BLUEPRINT_SUBJECTS) {
      const subject = SUBJECTS.find((s) => s.id === id);
      expect(subject, id).toBeDefined();
      expect(subject.kind, id).toBe('blueprint');
      expect(subject.category).toBe(category);
    }
  });


  it('has a renderer for every 3D and blueprint subject', () => {
    for (const subject of SUBJECTS) {
      if (subject.kind !== '3d' && subject.kind !== 'blueprint') continue;
      expect(RENDERERS[subject.id], subject.id).toBeDefined();
    }
  });
});
