import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer, { act } from 'react-test-renderer';
import CypherVoiceButton from './CypherVoiceButton';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// A fake shared voice instance (the real useCypherVoice is the page's);
// the button only reads these fields, so a stub proves the wiring.
function fakeVoice(overrides = {}) {
  return {
    play: vi.fn(async () => true),
    stop: vi.fn(),
    playing: false,
    error: null,
    subtitle: null,
    muted: false,
    setMuted: vi.fn(),
    volume: 0.8,
    setVolume: vi.fn(),
    ...overrides,
  };
}

describe('CypherVoiceButton', () => {
  it('renders the Listen button (SSR smoke)', () => {
    const html = renderToString(
      <CypherVoiceButton text="Hello" label="Listen" voice={fakeVoice()} />,
    );
    expect(html).toContain('Listen');
    expect(html).toContain('Sound on');
  });

  it('shows Stop while playing', () => {
    const html = renderToString(
      <CypherVoiceButton text="Hello" label="Listen" voice={fakeVoice({ playing: true })} />,
    );
    expect(html).toContain('Stop');
    expect(html).not.toContain('Listen to the briefing');
  });

  it('reports playing changes through onPlayingChange, so the page can focus the camera', async () => {
    // The mission camera focuses on whoever is talking: the briefing
    // button reports its playing state, and MissionWorkspace turns that
    // into the speaker (briefing -> Sentinel). The callback fires from
    // a useEffect on `playing`, so this needs a live renderer, not SSR.
    const onPlayingChange = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <CypherVoiceButton text="Hello" label="Listen" voice={fakeVoice({ playing: false })} onPlayingChange={onPlayingChange} />,
      );
    });
    expect(onPlayingChange).toHaveBeenCalledWith(false);
    await act(async () => {
      renderer.update(
        <CypherVoiceButton text="Hello" label="Listen" voice={fakeVoice({ playing: true })} onPlayingChange={onPlayingChange} />,
      );
    });
    expect(onPlayingChange).toHaveBeenCalledWith(true);
    await act(async () => {
      renderer.update(
        <CypherVoiceButton text="Hello" label="Listen" voice={fakeVoice({ playing: false })} onPlayingChange={onPlayingChange} />,
      );
    });
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
    await act(async () => { renderer.unmount(); });
  });

  it('does not require onPlayingChange — the button works without it', async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <CypherVoiceButton text="Hello" label="Listen" voice={fakeVoice()} />,
      );
    });
    expect(renderer.root.findAllByType('button').length).toBeGreaterThan(0);
    await act(async () => { renderer.unmount(); });
  });

  it('renders only the sound controls in controlsOnly mode — no Listen button, no subtitle', () => {
    // The mission briefing auto-plays on entry now, so the Listen
    // button is redundant; only the sound controls stay (mute + volume),
    // unobtrusive and without the explanatory wording. The subtitle is
    // shown by the opening caption instead.
    const html = renderToString(
      <CypherVoiceButton
        text="Hello"
        label="Listen to the briefing"
        voice={fakeVoice({ subtitle: 'Hello.', error: 'boom' })}
        controlsOnly
      />,
    );
    expect(html).not.toContain('Listen to the briefing');
    expect(html).not.toContain('Listen');
    expect(html).not.toContain('Stop');
    expect(html).not.toContain('Hello.');
    expect(html).not.toContain('boom');
    expect(html).toContain('Sound on');
    expect(html).toContain('Volume');
  });

  it('still reports playing changes in controlsOnly mode, so the camera tracks the auto-play', async () => {
    // The auto-played briefing changes the shared voice's playing state;
    // the controls-only button's onPlayingChange is what tells the page
    // (the button itself no longer has a Listen button to drive it).
    const onPlayingChange = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <CypherVoiceButton text="Hello" voice={fakeVoice({ playing: false })} onPlayingChange={onPlayingChange} controlsOnly />,
      );
    });
    expect(onPlayingChange).toHaveBeenCalledWith(false);
    await act(async () => {
      renderer.update(
        <CypherVoiceButton text="Hello" voice={fakeVoice({ playing: true })} onPlayingChange={onPlayingChange} controlsOnly />,
      );
    });
    expect(onPlayingChange).toHaveBeenCalledWith(true);
    await act(async () => { renderer.unmount(); });
  });
});
