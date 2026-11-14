import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import ModelViewer from './ModelViewer';

// The hint bar is plain JSX (not the WebGL effect), so SSR can assert it.
// The WebGL effect never runs under SSR — no renderer, no controls.

// Presenter-only scenes (Cypher) pass interactive={false}: fixed camera,
// no drag/zoom/click, and the "Drag to rotate · Scroll to zoom · Click
// parts for info" hint must be gone. Every other viewer keeps the
// default interactive behaviour and the hint.
describe('ModelViewer interactive prop', () => {
  it('shows the manipulation hint by default', () => {
    const html = renderToString(<ModelViewer buildScene={() => []} />);
    expect(html).toContain('Drag to rotate');
    expect(html).toContain('Scroll to zoom');
    expect(html).toContain('Click parts for info');
  });

  it('hides the manipulation hint when interactive={false}', () => {
    const html = renderToString(<ModelViewer buildScene={() => []} interactive={false} />);
    expect(typeof html).toBe('string');
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });
});
