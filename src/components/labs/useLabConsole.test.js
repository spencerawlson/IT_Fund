import { describe, it, expect } from 'vitest';
import {
  getOrderedCategories, buildTrackList, buildTrackLabs, resolveTrack, buildSearchResults,
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
    expect(out).toContain('[1] Networking & Routing   (2 labs)');
    expect(out).toContain('[2] Cloud & IaC   (1 lab)');
    expect(out).toContain('[3] DevOps & IaC   (1 lab)');
    expect(out).toContain('[4] Python Automation   (1 lab)');
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
});
