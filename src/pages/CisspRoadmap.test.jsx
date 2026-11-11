import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readSrc = (p) => readFileSync(join(ROOT, p), 'utf8');

// Source-level checks: rendering CisspRoadmap needs the full academy store,
// but the production build + check-prerender render this page for real, so
// these assertions guard the copy while the build guards the render.
describe('CisspRoadmap exam facts (audit F-03)', () => {
  const src = readSrc('src/pages/CisspRoadmap.jsx');

  it('states the real CISSP exam as 100–150 adaptive items, 3 hours, 700/1000 scaled', () => {
    expect(src).toContain('100–150 questions (adaptive CAT), 3 hours, 700/1000 scaled score to pass');
    expect(src).toContain('700/1000');
  });

  it('does not present "70% to pass" as an exam fact', () => {
    expect(src).not.toContain('70% to pass');
  });

  it('links the ISC2 exam outline next to the exam facts', () => {
    expect(src).toContain("RESOURCES['cissp-outline']");
  });
});

describe('PracticeExam simulator labelling (audit F-03)', () => {
  const src = readSrc('src/pages/academy/PracticeExam.jsx');

  it('labels the 70% rule as the simulator’s own, not the real exam’s', () => {
    expect(src).toContain('passes this simulator');
    expect(src).toContain('to pass this simulator');
    expect(src).toContain('700/1000 scaled score, not a percentage');
  });

  it('never states 70% as the real CISSP pass mark', () => {
    expect(src).not.toMatch(/real CISSP.*70%/);
  });
});
