import { describe, it, expect } from 'vitest';
import { SUBJECTS, RENDERERS } from './Lab';

// The Visual Lab gallery registry: every 3D subject id must resolve to a
// renderer, ids must be unique, and the nine Meshy GLB subjects must be
// present with kind '3d' in their categories. The firewall left the GLB set
// on 2026-11-16: it is a 'blueprint' subject (its R2C sheet, no WebGL). Importing the page module only — nothing renders.
const GLB_SUBJECTS = [
  ['switch', 'Hardware'],
  ['server-rack', 'Hardware'],
  ['rack-server', 'Hardware'],
  ['ups', 'Hardware'],
  ['patch-panel', 'Hardware'],
  ['router', 'Networking'],
  ['access-point', 'Networking'],
  ['cloud', 'Cloud & Scale'],
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

  it('shows the firewall as a blueprint subject in Security', () => {
    const fw = SUBJECTS.find((s) => s.id === 'firewall-3d');
    expect(fw.kind).toBe('blueprint');
    expect(fw.category).toBe('Security');
  });

  it('has a renderer for every 3D and blueprint subject', () => {
    for (const subject of SUBJECTS) {
      if (subject.kind !== '3d' && subject.kind !== 'blueprint') continue;
      expect(RENDERERS[subject.id], subject.id).toBeDefined();
    }
  });
});
