import { describe, it, expect } from 'vitest';
import { getCypherNote } from './cypherNotes';

describe('getCypherNote', () => {
  it('returns a note for seeded lessons', () => {
    expect(getCypherNote('sec-concepts')).toContain('detective, not preventive');
    expect(getCypherNote('net-switch-route')).toContain('Longest prefix match');
    expect(getCypherNote('net-osi')).toContain("Don't call a packet a frame");
  });

  it('returns null for lessons without a note', () => {
    expect(getCypherNote('no-such-lesson')).toBeNull();
  });
});
