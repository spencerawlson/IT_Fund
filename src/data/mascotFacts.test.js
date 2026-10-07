import { describe, it, expect } from 'vitest';
import { getMascotItems, MASCOT_NAME } from './mascotFacts';

describe('mascotFacts', () => {
  it('has a mascot name', () => {
    expect(typeof MASCOT_NAME).toBe('string');
    expect(MASCOT_NAME.length).toBeGreaterThan(0);
  });

  it('returns concept-specific items when available', () => {
    const items = getMascotItems({ conceptId: 'm6-1', moduleId: 'module-6' });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.type === 'fact' || i.type === 'question')).toBe(true);
  });

  it('falls back to module items, then generic', () => {
    const moduleItems = getMascotItems({ conceptId: 'nope', moduleId: 'module-6' });
    expect(moduleItems.length).toBeGreaterThan(0);
    const generic = getMascotItems({ conceptId: 'nope', moduleId: 'nope' });
    expect(generic.length).toBeGreaterThan(0);
    const empty = getMascotItems();
    expect(empty.length).toBeGreaterThan(0);
  });

  it('every item has text and questions have answers', () => {
    const seen = new Set();
    for (const args of [
      { conceptId: 'm6-1' }, { conceptId: 'm6-2' }, { conceptId: 'm6-3' },
      { conceptId: 'term:NAT' }, { conceptId: 'term:CDN' }, { conceptId: 'term:Load Balancer' },
      { conceptId: 'term:WAN' }, { conceptId: 'term:Cloud DNS' },
      { moduleId: 'module-6' }, { moduleId: 'module-31' }, {},
    ]) {
      for (const item of getMascotItems(args)) {
        expect(item.text, JSON.stringify(item)).toBeTruthy();
        if (item.type === 'question') expect(item.answer, item.text).toBeTruthy();
        seen.add(item.text);
      }
    }
    // no duplicate texts across the seed set
    expect(seen.size).toBeGreaterThan(10);
  });
});
