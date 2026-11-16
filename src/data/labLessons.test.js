import { describe, it, expect } from 'vitest';
import { LAB_FOR_LESSON, LESSONS_FOR_LAB, labForLesson, labsForLesson, EXTRA_LABS_FOR_LESSON } from './labLessons';

describe('labLessons', () => {
  it('keeps the primary lab per lesson — the DNS lab still owns net-troubleshoot', () => {
    expect(labForLesson('net-troubleshoot')).toBe('net-dns-connectivity-001');
    expect(labForLesson('no-such-lesson')).toBeUndefined();
  });

  it('lists every lab for a lesson, primary first', () => {
    expect(labsForLesson('net-troubleshoot')).toEqual([
      'net-dns-connectivity-001',
      'tools-wireshark-001',
    ]);
    expect(labsForLesson('no-such-lesson')).toEqual([]);
  });

  it('has no entry for the mission-only ACL lab (Spencer, 2026-11-16)', () => {
    // Operation Broken Shield is mission-only everywhere: the ACL lab
    // (net-acl-001) runs inside the mission, so no lesson shows a
    // Launch Lab card for it — net-security and rt-routing-security
    // launch no lab at all (LessonView renders nothing when
    // labsForLesson is empty and there is no Visual Lab for the lesson,
    // which neither of these has).
    expect(labForLesson('net-security')).toBeUndefined();
    expect(labForLesson('rt-routing-security')).toBeUndefined();
    expect(labsForLesson('net-security')).toEqual([]);
    expect(labsForLesson('rt-routing-security')).toEqual([]);
    expect(LESSONS_FOR_LAB['net-acl-001']).toBeUndefined();
    expect(Object.values(LAB_FOR_LESSON)).not.toContain('net-acl-001');
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
