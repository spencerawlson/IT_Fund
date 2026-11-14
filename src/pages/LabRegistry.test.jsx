import { describe, it, expect } from 'vitest';
import { SUBJECTS, RENDERERS } from './Lab';

// The Visual Lab gallery registry: every 3D subject id must resolve to a
// renderer, ids must be unique, and the nine Meshy GLB subjects (the two
// replacements + the seven new ones) must be present with kind '3d' in
// their categories. Importing the page module only — nothing renders.
const GLB_SUBJECTS = [
  ['switch', 'Hardware'],
  ['server-rack', 'Hardware'],
  ['rack-server', 'Hardware'],
  ['ups', 'Hardware'],
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

  it('lists all nine Meshy GLB subjects as 3D in their categories', () => {
    for (const [id, category] of GLB_SUBJECTS) {
      const subject = SUBJECTS.find((s) => s.id === id);
      expect(subject, id).toBeDefined();
      expect(subject.kind).toBe('3d');
      expect(subject.category).toBe(category);
    }
  });

  it('has a renderer for every 3D subject', () => {
    for (const subject of SUBJECTS) {
      if (subject.kind !== '3d') continue;
      expect(RENDERERS[subject.id], subject.id).toBeDefined();
    }
  });
});
