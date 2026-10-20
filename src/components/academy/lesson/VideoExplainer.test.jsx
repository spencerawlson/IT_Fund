import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import VideoExplainer from './VideoExplainer';

describe('VideoExplainer', () => {
  it('announces the coming video explainer, with Cipher present', () => {
    const html = renderToString(<VideoExplainer />);
    expect(html).toContain('Video explainer coming soon');
    expect(html).toContain('aria-label="Cipher the study mascot"');
    expect(html).toContain('guided lesson below is the');
  });

  it('has no fake player controls — nothing clickable until a real video exists', () => {
    const html = renderToString(<VideoExplainer />);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<video');
    expect(html).not.toContain('<a ');
  });
});
