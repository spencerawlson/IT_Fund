import { describe, it, expect } from 'vitest';
import { LAB_FOR_LESSON, LESSONS_FOR_LAB, labForLesson, labsForLesson, EXTRA_LABS_FOR_LESSON } from './labLessons';
import { LAB_TITLES } from './deckLabs';

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

  it('covers 105 of 222 lessons — sibling lessons share the lab that teaches their skill', () => {
    // 66 mapped before the coverage pass (2026-11-18) + 39 strict-fit
    // additions: docker 4, k8s 5, terraform 4, cysa 7, secplus scenarios 9,
    // plus py-flow, lx-packages, net-ports, net-devices-media, net-ops,
    // sec-iam, cy-net-arch, cy-cloud-arch, awss-monitor-analyze,
    // saa-network-security. The remaining 117 stay unmapped on purpose:
    // CISSP theory/capstones (19), C++/Go/Rust (25), AI (9), SQL (8),
    // git (8), and theory-only lessons have no matching backend lab —
    // a forced fit would put a misleading Launch Lab button on the page.
    expect(Object.keys(LAB_FOR_LESSON)).toHaveLength(105);
    expect(labForLesson('docker-images')).toBe('docker-fundamentals-001');
    expect(labForLesson('k8s-config')).toBe('k8s-fundamentals-001');
    expect(labForLesson('tf-modules')).toBe('terraform-fundamentals-001');
    expect(labForLesson('cysa-threat-hunting')).toBe('siem-hunting-001');
    expect(labForLesson('secplus-malware-scenarios')).toBe('sec-ransomware-001');
    expect(labForLesson('sec-iam')).toBe('aws-iam-001');
    expect(labForLesson('cy-net-arch')).toBe('net-topology-003');
    expect(labForLesson('net-ports')).toBe('cyber-portblast-001');
    // Deliberately unmapped: no backend lab teaches these yet.
    expect(labForLesson('cissp-d1')).toBeUndefined();
    expect(labForLesson('cpp-basics')).toBeUndefined();
    expect(labForLesson('go-basics')).toBeUndefined();
    expect(labForLesson('rust-basics')).toBeUndefined();
    expect(labForLesson('ai-ml-basics')).toBeUndefined();
    expect(labForLesson('sql-basics')).toBeUndefined();
    expect(labForLesson('git-basics')).toBeUndefined();
    expect(labForLesson('k8s-storage')).toBeUndefined(); // k8s lab has no storage objectives
    expect(labForLesson('py-oop')).toBeUndefined(); // py-basics-001 has no classes
    expect(labForLesson('cysa-reporting')).toBeUndefined(); // reporting is one phase of the pentest lab, not its skill
    expect(labForLesson('rt-isis')).toBeUndefined(); // no IS-IS lab
    expect(labForLesson('net-security')).toBeUndefined(); // ACL lab stays mission-only
  });

  it('every lab a lesson can launch has a display title (LessonView never shows a raw id)', () => {
    const launched = new Set([
      ...Object.values(LAB_FOR_LESSON),
      ...Object.values(EXTRA_LABS_FOR_LESSON).flat(),
    ]);
    for (const labId of launched) {
      expect(LAB_TITLES[labId], labId).toBeDefined();
    }
    expect(launched.size).toBeGreaterThan(38);
  });

  it('lists the second-angle extras beside the untouched primary', () => {
    expect(labsForLesson('tf-prod-security')).toEqual(['cloud-terraform-001', 'iac-policy-001']);
    expect(labsForLesson('rt-routing-troubleshooting')).toEqual([
      'net-ospf-tshoot-001', 'net-rip-tshoot-001', 'net-eigrp-tshoot-001',
    ]);
    expect(labsForLesson('cy-web')).toEqual(['sec-webapp-001', 'py-sqli-001']);
  });
});
