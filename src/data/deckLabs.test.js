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
    const samples = ['sec-iam', 'saa-iam', 'cysa-threat-hunting', 'awss-iam-advanced', 'cissp-d5'];
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
});
