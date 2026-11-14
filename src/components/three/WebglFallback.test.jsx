import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import WebglFallback from './WebglFallback';

describe('WebglFallback', () => {
  it('shows the blueprint image above the unavailable notice', () => {
    const html = renderToString(
      <WebglFallback image="/blueprint-network-switch-48-port.jpg" imageAlt="Switch blueprint" />,
    );
    expect(html).toContain('src="/blueprint-network-switch-48-port.jpg"');
    expect(html).toContain('alt="Switch blueprint"');
    expect(html).toContain('Visual preview unavailable');
    expect(html).toContain('hardware acceleration or WebGL support');
  });

  it('without an image it is exactly the old text-only notice', () => {
    const html = renderToString(<WebglFallback />);
    expect(html).not.toContain('<img');
    expect(html).toContain('Visual preview unavailable');
    expect(html).toContain('hardware acceleration or WebGL support');
  });
});
