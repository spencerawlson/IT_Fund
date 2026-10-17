import { describe, it, expect } from 'vitest';
import { ACRONYMS, findAcronyms, lookupAcronym } from './acronyms';

const keys = (text) => findAcronyms(text).map((m) => m.key);

describe('acronym glossary', () => {
  it('every entry has an expansion and a purpose', () => {
    for (const [key, entry] of Object.entries(ACRONYMS)) {
      expect(entry, key).toHaveLength(2);
      expect(entry[0].length, key).toBeGreaterThan(1);
      expect(entry[1].length, key).toBeGreaterThan(10);
    }
  });

  it('explains CIDR with its expansion and purpose', () => {
    expect(lookupAcronym('CIDR')).toMatchObject({ term: 'CIDR', expansion: 'Classless Inter-Domain Routing' });
    expect(lookupAcronym('CIDR').purpose).toMatch(/prefix/);
  });

  it('prefers the longest compound and accepts plurals', () => {
    expect(keys('Run CI/CD with SSE-KMS on two VPCs')).toEqual(['CI/CD', 'SSE-KMS', 'VPC']);
    expect(findAcronyms('two VPCs')[0]).toMatchObject({ start: 4, end: 8 });
  });

  it('splits slash pairs that are not entries', () => {
    expect(keys('TCP/UDP ports')).toEqual(['TCP', 'UDP']);
  });

  it('ignores acronyms embedded in longer words and lowercase words', () => {
    expect(keys('AWSome IPSEC dns ipsum')).toEqual([]);
  });

  it('does not give away "stand for" quiz answers', () => {
    expect(keys('What does SQL stand for?')).toEqual([]);
    expect(keys('TTP stands for something')).toEqual([]);
  });
});
