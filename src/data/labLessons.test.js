import { describe, it, expect } from 'vitest';
import { labForLesson, labsForLesson, EXTRA_LABS_FOR_LESSON } from './labLessons';

describe('labLessons', () => {
  it('keeps the primary lab per lesson — the DNS lab still owns net-troubleshoot', () => {
    expect(labForLesson('net-troubleshoot')).toBe('net-dns-connectivity-001');
    expect(labForLesson('net-security')).toBe('net-acl-001');
    expect(labForLesson('no-such-lesson')).toBeUndefined();
  });

  it('lists every lab for a lesson, primary first', () => {
    expect(labsForLesson('net-troubleshoot')).toEqual([
      'net-dns-connectivity-001',
      'tools-wireshark-001',
    ]);
    expect(labsForLesson('net-security')).toEqual(['net-acl-001']);
    expect(labsForLesson('no-such-lesson')).toEqual([]);
  });

  it('never moves the primary when extras are added', () => {
    for (const [lessonId, extras] of Object.entries(EXTRA_LABS_FOR_LESSON)) {
      const all = labsForLesson(lessonId);
      expect(all[0]).toBe(labForLesson(lessonId));
      expect(all.slice(1)).toEqual(extras);
      expect(new Set(all).size).toBe(all.length); // no duplicates
    }
  });
});
