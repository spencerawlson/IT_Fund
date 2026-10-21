import { describe, it, expect } from 'vitest';
import { getCipherNote } from './cipherNotes';

describe('getCipherNote', () => {
  it('returns a note for seeded lessons', () => {
    expect(getCipherNote('sec-concepts')).toContain('detective, not preventive');
    expect(getCipherNote('net-switch-route')).toContain('Longest prefix match');
    expect(getCipherNote('net-osi')).toContain("Don't call a packet a frame");
  });

  it('returns null for lessons without a note', () => {
    expect(getCipherNote('no-such-lesson')).toBeNull();
  });
});
