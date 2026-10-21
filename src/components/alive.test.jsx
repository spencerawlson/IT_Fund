import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MascotArt, MascotReaction } from './StudyMascot';
import ProgressRing from './ProgressRing';

describe('MascotArt moods', () => {
  // Since 2026-10-20 Cipher is the rendered portrait, not the drawn SVG: every
  // mood renders the same happy/waving portrait; only `pointing` animates.
  it('renders the portrait by default (the calm lesson look)', () => {
    const html = renderToString(<MascotArt />);
    expect(html).toContain('aria-label="Cipher the study mascot"');
    expect(html).toContain('cipher-mascot.jpg');
    expect(html).toContain('mascot-idle');
    expect(html).not.toContain('mascot-blink');
    expect(html).not.toContain('mascot-point');
  });

  it('renders the same portrait for celebrating, thinking, happy and encouraging', () => {
    for (const mood of ['celebrating', 'thinking', 'happy', 'encouraging']) {
      const html = renderToString(<MascotArt mood={mood} />);
      expect(html).toContain('cipher-mascot.jpg');
      expect(html).not.toContain('<polygon');
    }
  });

  it('blink is accepted but no longer animates the portrait', () => {
    const html = renderToString(<MascotArt blink />);
    expect(html).toContain('cipher-mascot.jpg');
    expect(html).not.toContain('mascot-blink');
  });
});

describe('MascotReaction', () => {
  it('renders the reaction line with the mascot', () => {
    const html = renderToString(<MascotReaction mood="happy" text="3 in a row — nice!" />);
    expect(html).toContain('3 in a row — nice!');
    expect(html).toContain('aria-label="Cipher the study mascot"');
  });

  it('renders nothing without text', () => {
    expect(renderToString(<MascotReaction text="" />)).toBe('');
  });
});

describe('ProgressRing', () => {
  it('renders the percent and marks 100% complete', () => {
    const html = renderToString(<ProgressRing percent={100} />);
    expect(html).toContain('100<!-- -->%');
    expect(html).toContain('ring-complete');
  });

  it('does not glow below 100%', () => {
    const html = renderToString(<ProgressRing percent={62} />);
    expect(html).toContain('62<!-- -->%');
    expect(html).not.toContain('ring-complete');
  });
});
