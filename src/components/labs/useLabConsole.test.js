import { describe, it, expect } from 'vitest';
import {
  getOrderedCategories, buildTrackList, buildTrackLabs, resolveTrack, buildSearchResults, standaloneLabs, freeLabel,
  buildLabInfo,
} from './useLabConsole';

const labs = [
  { id: 'net-subnetting-001', slug: 'subnetting', title: 'Subnetting Mastery', category: 'networking', description: 'CIDR and VLSM drills' },
  { id: 'net-vlan-001', slug: 'vlan', title: 'VLANs', category: 'networking', description: 'Switching' },
  { id: 'aws-cli-001', slug: 'aws-cli', title: 'AWS CLI Fundamentals', category: 'cloud', description: 'CLI for EC2 and S3' },
  { id: 'terraform-aws-001', slug: 'tf-aws', title: 'Terraform for AWS', category: 'devops', description: 'HCL for VPC' },
  { id: 'py-basics-001', slug: 'py-basics', title: 'Python Basics', category: 'python', description: 'Scripting' },
  { id: 'linux-terminal-001', slug: 'linux', title: 'Linux Terminal', category: 'linux', description: 'Shell skills' },
];

describe('lab console track navigation', () => {
  const categories = getOrderedCategories(labs);

  it('orders categories: networking, cloud, devops, python, linux', () => {
    expect(categories).toEqual(['networking', 'cloud', 'devops', 'python', 'linux']);
  });

  it('buildTrackList shows numbered tracks with counts and nothing else', () => {
    const out = buildTrackList(labs, categories);
    expect(out).toContain('[1] Networking & Routing   (2 labs · 1 free)');
    expect(out).toContain('[2] Cloud & IaC   (1 lab)');
    expect(out).toContain('[3] DevOps & IaC   (1 lab)');
    expect(out).toContain('[4] Python Automation   (1 lab · 1 free)');
    expect(out).toContain('[5] Linux   (1 lab)');
    // no individual lab titles leak into the track list
    expect(out).not.toContain('Subnetting Mastery');
    expect(out).not.toContain('AWS CLI Fundamentals');
  });

  it('buildTrackLabs shows only that track\'s labs, numbered from 1', () => {
    const out = buildTrackLabs(labs, 'networking');
    expect(out).toContain('NETWORKING & ROUTING');
    expect(out).toContain('[1] Subnetting Mastery');
    expect(out).toContain('[2] VLANs');
    expect(out).not.toContain('AWS CLI Fundamentals');
    expect(out).not.toContain('Terraform for AWS');
  });

  it('marks the free labs in the track list, by id — "Free — no plan needed" (Spencer, 2026-11-16)', () => {
    // A visitor who wants to try a lab must see at a glance which ones need
    // no plan. The marker keys off the lab id (the free set in
    // @/lib/subscription), never the title, so it survives renames.
    expect(freeLabel({ id: 'net-vlan-001' })).toBe('  [Free — no plan needed]');
    expect(freeLabel({ id: 'py-basics-001' })).toBe('  [Free — no plan needed]');
    expect(freeLabel({ id: 'net-subnetting-001' })).toBe('');
    expect(freeLabel({ id: 'terraform-aws-001' })).toBe('');
    const networking = buildTrackLabs(labs, 'networking');
    expect(networking).toContain('[2] VLANs  [Free — no plan needed]');
    expect(networking).not.toContain('[1] Subnetting Mastery  [Free');
    const python = buildTrackLabs(labs, 'python');
    expect(python).toContain('[1] Python Basics  [Free — no plan needed]');
  });

  it('resolveTrack handles numbers, names, and rejects garbage', () => {
    expect(resolveTrack(categories, '1')).toBe('networking');
    expect(resolveTrack(categories, '2')).toBe('cloud');
    expect(resolveTrack(categories, 'networking')).toBe('networking');
    expect(resolveTrack(categories, 'devops')).toBe('devops');
    expect(resolveTrack(categories, '99')).toBeNull();
    expect(resolveTrack(categories, 'nope')).toBeNull();
  });

  it('buildSearchResults finds labs by title, slug, or description', () => {
    expect(buildSearchResults(labs, 'terraform').map((l) => l.id)).toEqual(['terraform-aws-001']);
    expect(buildSearchResults(labs, 'vlan').map((l) => l.id)).toEqual(['net-vlan-001']);
    expect(buildSearchResults(labs, 'CLI').map((l) => l.id)).toEqual(['aws-cli-001']);
    expect(buildSearchResults(labs, 'zzz')).toEqual([]);
  });

  it('merges portblast into the Security & Blue Team track', () => {
    const mixed = [
      ...labs,
      { id: 'cyber-nmap-001', slug: 'nmap', title: 'Nmap', category: 'cybersecurity', description: 'scan' },
      { id: 'cyber-portblast-001', slug: 'portblast', title: 'PortBlast', category: 'portblast', description: 'scan' },
    ];
    const cats = getOrderedCategories(mixed);
    expect(cats).toContain('cybersecurity');
    expect(cats).not.toContain('portblast');
    const out = buildTrackList(mixed, cats);
    const securityRows = out.split('\n').filter((l) => l.includes('Security & Blue Team'));
    expect(securityRows).toHaveLength(1);
    expect(securityRows[0]).toContain('(2 labs)');
    const trackOut = buildTrackLabs(mixed, 'cybersecurity');
    expect(trackOut).toContain('Nmap');
    expect(trackOut).toContain('PortBlast');
    expect(resolveTrack(cats, 'portblast')).toBe('cybersecurity');
  });

  it('standaloneLabs drops mission-only labs (Spencer, 2026-11-16)', () => {
    // Operation Broken Shield is mission-only everywhere: the ACL lab
    // never reaches the console's track lists, counts, search or
    // `lab start` — the hook filters the catalogue through this helper.
    const mixed = [
      ...labs,
      { id: 'net-acl-001', slug: 'acl', title: 'Filtering Traffic with ACLs', category: 'networking', description: 'ACLs' },
    ];
    expect(standaloneLabs(mixed).map((l) => l.id)).not.toContain('net-acl-001');
    expect(standaloneLabs(mixed)).toHaveLength(labs.length);
    expect(standaloneLabs([])).toEqual([]);
    expect(standaloneLabs(null)).toEqual([]);
  });
});

describe('lab info: Phase 0 lab-hours note', () => {
  const base = {
    slug: 'lab', title: 'Some Lab', difficulty: 'Beginner',
    estimated_minutes: 30, objectives: [{ id: 'o1' }], description: 'Do the thing.',
  };
  const dockerLab = { ...base, id: 'lx-docker-001', environment: { live: true } };
  const mockLab = { ...base, id: 'net-subnetting-001', environment: { live: false } };
  const noEnvLab = { ...base, id: 'net-subnetting-001' };

  it('a Docker lab notes it counts toward the 20 included lab-hours', () => {
    const out = buildLabInfo(dockerLab);
    expect(out).toContain('Counts toward your 20 included Docker lab-hours.');
    expect(out).not.toContain("doesn't use your Docker hours");
  });

  it('a mock lab notes it is free and uses no Docker hours', () => {
    expect(buildLabInfo(mockLab)).toContain("Free — doesn't use your Docker hours.");
    expect(buildLabInfo(noEnvLab)).toContain("Free — doesn't use your Docker hours.");
    expect(buildLabInfo(mockLab)).not.toContain('Counts toward');
  });

  it('a free lab keeps only "Free — no plan needed" (the showcase Docker lab is unmetered)', () => {
    // py-basics-001 is Docker AND free: it never counts toward usage, so
    // the counts line must not appear next to the free line.
    const showcase = { ...base, id: 'py-basics-001', environment: { live: true } };
    const out = buildLabInfo(showcase);
    expect(out).toContain('Free — no plan needed.');
    expect(out).not.toContain('Counts toward');
    expect(out).not.toContain("doesn't use your Docker hours");
    const freeMock = { ...base, id: 'net-vlan-001', environment: { live: false } };
    expect(buildLabInfo(freeMock)).toContain('Free — no plan needed.');
    expect(buildLabInfo(freeMock)).not.toContain("doesn't use your Docker hours");
  });

  it('a missing lab still reports "No such lab"', () => {
    expect(buildLabInfo(null)).toContain('No such lab');
  });
});
