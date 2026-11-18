import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
/** The <button> whose rendered text (at any depth) includes `text`. */
function buttonWithText(root, text) {
  const textOf = (n) => (typeof n === 'string' ? n : (n.children || []).map(textOf).join(''));
  return root.findAll((n) => n.type === 'button' && textOf(n).includes(text))[0];
}
async function advance(ms) {
  for (let i = 0; i < ms / 100; i++) {
    await act(async () => { vi.advanceTimersByTime(100); });
  }
}

describe('SocClosing', () => {
  beforeEach(() => { vi.useFakeTimers(); voiceControl.plays.length = 0; });
  afterEach(() => { vi.useRealTimers(); });

  const NEXT = { id: 'op-packet-flood', title: 'Operation Packet Flood' };
  let path = null;
  function Capture() { path = useLocation().pathname; return null; }
  const render = async (explanation, onReview = () => {}) => {
    let r;
    await act(async () => {
      r = TestRenderer.create(
        <MemoryRouter initialEntries={['/missions/op-broken-shield/terminal']}>
          <Capture />
          <SocClosing turns={closingTurns('Operation Broken Shield', 'Operation Packet Flood')} explanation={explanation} nextMission={NEXT} onReview={onReview} />
        </MemoryRouter>,
      );
    });
    return r;
  };

  it('explains the result automatically, then each robot speaks in his own voice, then the end card', async () => {
    const r = await render({ text: 'You found the open path and closed it with least privilege.', loading: false, failed: false, fallback: 'debrief' });
    expect(hasText(r.root, 'Back to the SOC')).toBe(true);
    // 1.8 s establishing shot, then five turns of 2 s audio + 0.4 s gap.
    await advance(2000 + 5 * 2600);
    expect(voiceControl.plays.map((p) => p.character)).toEqual(['cypher', 'cypher', 'sentinel', 'patch', 'cypher']);
    // Nobody asked: the explanation is the second thing Cypher says.
    expect(voiceControl.plays[1].text).toBe('You found the open path and closed it with least privilege.');
    expect(voiceControl.plays[1].purpose).toBe('lesson');
    expect(voiceControl.plays.filter((p, i) => i !== 1).every((p) => p.purpose === 'briefing')).toBe(true);
    expect(voiceControl.plays[4].text).toContain('you helped us solve the problem we had');
    expect(hasText(r.root, 'Mission complete — well done!')).toBe(true);
    expect(hasText(r.root, 'Operation Packet Flood')).toBe(true);
    expect(hasText(r.root, 'Start next mission')).toBe(true);
    await act(async () => { r.unmount(); });
  });

  it('ends on its own: the end card counts down, then the interactive labs', async () => {
    const r = await render({ text: 'Explained.', loading: false, failed: false, fallback: '' });
    await act(async () => { buttonWithText(r.root, 'Skip').props.onClick(); });
    expect(hasText(r.root, 'Taking you to the interactive labs in')).toBe(true);
    expect(path).toBe('/missions/op-broken-shield/terminal');
    await advance(6500);
    expect(path).toBe('/labs');
    await act(async () => { r.unmount(); });
  });

  it('stays put when the learner chooses to review their results', async () => {
    const onReview = vi.fn();
    const r = await render({ text: 'Explained.', loading: false, failed: false, fallback: '' }, onReview);
    await act(async () => { buttonWithText(r.root, 'Skip').props.onClick(); });
    const review = buttonWithText(r.root, 'Review my results');
    await act(async () => { review.props.onClick(); });
    await advance(8000);
    expect(onReview).toHaveBeenCalled();
    expect(path).toBe('/missions/op-broken-shield/terminal');
    await act(async () => { r.unmount(); });
  });

  it('speaks the server debrief when the tutor is off', async () => {
    const r = await render({ text: '', loading: false, failed: true, fallback: 'Great job completing Operation Broken Shield.' });
    await advance(2000 + 2 * 2600);
    expect(voiceControl.plays[1].text).toBe('Great job completing Operation Broken Shield.');
    await act(async () => { r.unmount(); });
  });
});
