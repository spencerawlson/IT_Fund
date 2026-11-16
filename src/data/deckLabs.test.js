import { describe, it, expect } from 'vitest';
import { getLabsForDeck, labTitle, LAB_TITLES } from './deckLabs';

describe('deckLabs', () => {
  it('returns deck-specific labs', () => {
    const labs = getLabsForDeck('net-ip-subnet', 'network');
    expect(labs.length).toBeGreaterThan(0);
    expect(labs[0].labId).toBe('net-subnetting-001');
    expect(labs[0].blurb).toBeTruthy();
  });

  it('falls back to track labs for unmapped decks', () => {
    const labs = getLabsForDeck('lx-cli', 'linux');
    expect(labs.length).toBeGreaterThan(0);
    // deck-specific wins over track fallback
    const trackOnly = getLabsForDeck('nonexistent-deck', 'linux');
    expect(trackOnly[0].labId).toBe('linux-terminal-001');
  });

  it('returns empty for unknown deck and track', () => {
    expect(getLabsForDeck('nope', 'nope')).toEqual([]);
    expect(getLabsForDeck(null, null)).toEqual([]);
  });

  it('has a title for every mapped lab', () => {
    // spot check a sample of deck mappings
    const samples = ['sec-iam', 'saa-iam', 'cysa-threat-hunting', 'awss-iam-advanced', 'cissp-d5', 'net-troubleshoot'];
    for (const deckId of samples) {
      for (const l of getLabsForDeck(deckId, null)) {
        expect(labTitle(l.labId), l.labId).not.toBe(l.labId);
      }
    }
  });

  it('LAB_TITLES covers the new labs', () => {
    for (const id of ['aws-cli-001', 'linux-terminal-001', 'siem-hunting-001', 'net-subnetting-001', 'aws-iam-001', 'vuln-scanning-001', 'terraform-aws-001', 'terraform-azure-001', 'terraform-gcp-001', 'terraform-proxmox-001', 'terraform-k8s-docker-001']) {
      expect(LAB_TITLES[id], id).toBeTruthy();
    }
  });

  it('never recommends the mission-only ACL lab (Spencer, 2026-11-16)', () => {
    // Operation Broken Shield is mission-only everywhere: net-acl-001 runs
    // inside the mission and is not a standalone lab anywhere. Decks that
    // used to point at it fall back to their track labs instead, and decks
    // that listed it alongside another lab keep only the other one.
    const ids = (labs) => labs.map((l) => l.labId);
    expect(ids(getLabsForDeck('net-security', 'network'))).not.toContain('net-acl-001');
    expect(ids(getLabsForDeck('net-security', 'network'))).toEqual(['net-subnetting-001', 'net-vlan-001']);
    expect(ids(getLabsForDeck('rt-acls', 'routing'))).not.toContain('net-acl-001');
    expect(ids(getLabsForDeck('rt-acls', 'routing'))).toEqual(['net-ospf-001', 'net-static-routing-001']);
    expect(ids(getLabsForDeck('awss-network-security', null))).toEqual(['net-vlan-001']);
    expect(ids(getLabsForDeck('cissp-d4', null))).toEqual(['net-vlan-001']);
  });
});
