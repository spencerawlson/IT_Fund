import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MascotArt, MascotReaction } from './StudyMascot';
import ProgressRing from './ProgressRing';

describe('MascotArt moods', () => {
  it('renders neutral by default (the calm lesson look)', () => {
    const html = renderToString(<MascotArt />);
    expect(html).toContain('aria-label="Cipher the study mascot"');
    expect(html).not.toContain('<polygon');
    expect(html).not.toContain('mascot-blink');
  });

  it('celebrating mood wears a party hat and raises its arms', () => {
    const html = renderToString(<MascotArt mood="celebrating" />);
    expect(html).toContain('<polygon');
    // arms: two raised lines outside the head box
    expect(html).toContain('x1="15" y1="30" x2="7" y2="17"');
    expect(html).toContain('x1="49" y1="30" x2="57" y2="17"');
  });

  it('thinking mood looks sideways with a flat mouth', () => {
    const html = renderToString(<MascotArt mood="thinking" />);
    expect(html).toContain('cx="28" cy="33"');
    expect(html).toContain('M28 41.5 L36 41.5');
  });

  it('blink wraps the pupils in the blink group when enabled', () => {
    const html = renderToString(<MascotArt blink />);
    expect(html).toContain('mascot-blink');
  });

  it('happy and encouraging moods smile', () => {
    expect(renderToString(<MascotArt mood="happy" />)).toContain('M24 39 Q32 47 40 39');
    expect(renderToString(<MascotArt mood="encouraging" />)).toContain('M27 40 Q32 43.5 37 40');
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
