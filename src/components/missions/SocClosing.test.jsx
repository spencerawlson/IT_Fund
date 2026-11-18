import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import SocClosing from './SocClosing';
import { closingTurns } from '@/data/missions';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const voiceControl = vi.hoisted(() => ({ plays: [] }));

vi.mock('@/api/voice', async () => {
  const React = await import('react');
  function useCypherVoice() {
    const [playing, setPlaying] = React.useState(false);
    const [subtitle, setSubtitle] = React.useState('');
    const play = React.useCallback(async (text, character, purpose) => {
      voiceControl.plays.push({ text, character, purpose });
      setSubtitle(text);
      setPlaying(true);
      setTimeout(() => { setPlaying(false); setSubtitle(''); }, 2000);
      return text;
    }, []);
    const stop = React.useCallback(() => { setPlaying(false); setSubtitle(''); }, []);
    return { play, stop, playing, loading: false, subtitle };
  }
  return {
    useCypherVoice,
    // Sentinel's and Patch's voices are configured on the server.
    fetchVoiceStatus: async () => ({ characters: { cypher: true, sentinel: true, patch: true } }),
  };
});
vi.mock('@/components/three/MissionSocScene', () => ({ default: () => null }));

function hasText(root, text) {
  return root.findAll((n) => Array.isArray(n.children) && n.children.some((c) => typeof c === 'string' && c.includes(text))).length > 0;
}
async function advance(ms) {
  for (let i = 0; i < ms / 100; i++) {
    await act(async () => { vi.advanceTimersByTime(100); });
  }
}

describe('SocClosing', () => {
  beforeEach(() => { vi.useFakeTimers(); voiceControl.plays.length = 0; });
  afterEach(() => { vi.useRealTimers(); });

  it('plays each robot’s congratulation in his own voice, then the end card with the next mission', async () => {
    const turns = closingTurns('Operation Broken Shield', 'Operation Packet Flood');
    let r;
    await act(async () => {
      r = TestRenderer.create(
        <MemoryRouter>
          <SocClosing turns={turns} nextMission={{ id: 'op-packet-flood', title: 'Operation Packet Flood' }} onReview={() => {}} />
        </MemoryRouter>,
      );
    });
    expect(hasText(r.root, 'Back to the SOC')).toBe(true);
    // 1.8 s establishing shot, then four turns of 2 s audio + 0.4 s gap.
    await advance(2000 + 4 * 2600);
    expect(voiceControl.plays.map((p) => p.character)).toEqual(['cypher', 'sentinel', 'patch', 'cypher']);
    expect(voiceControl.plays.every((p) => p.purpose === 'briefing')).toBe(true);
    expect(voiceControl.plays[3].text).toContain('See you on the next mission');
    expect(hasText(r.root, 'Mission complete — well done!')).toBe(true);
    expect(hasText(r.root, 'Operation Packet Flood')).toBe(true);
    expect(hasText(r.root, 'Start next mission')).toBe(true);
    await act(async () => { r.unmount(); });
  });
});
