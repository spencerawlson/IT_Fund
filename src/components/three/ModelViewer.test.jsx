import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// tickUnderReducedMotion — a scene whose tick IS the activity (the mission
// SOC: robots moving, the briefing advancing) opts back in, so reduced
// motion freezes only the camera glide, never the scene. The WebGL effect
// never runs under SSR, so this pins the gate in source; the behaviour is
// covered by the MissionSocScene reduced-motion test.
describe('ModelViewer tickUnderReducedMotion prop', () => {
  it('keeps calling tick under reduced motion when a scene opts in', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ModelViewer.jsx'), 'utf8');
    expect(src).toContain('if (tick && (!reducedMotion || tickUnderReducedMotion)) tick(t);');
    // Default stays frozen: without the opt-in the tick never runs.
    expect(src).toContain('tickUnderReducedMotion = false');
  });
});

// cameraRef — an optional ref the viewer fills with the live camera, so
// a scene whose camera moves (the SOC focus shots) can aim things at it
// every frame. The WebGL effect never runs under SSR, so this only
// proves the prop is accepted and left alone server-side; the fill is
// covered by the scene tests' geometry (the tick damps the live camera
// toward its shot).
describe('ModelViewer cameraRef prop', () => {
  it('accepts a cameraRef without throwing (SSR: the effect never runs)', () => {
    const cameraRef = { current: null };
    const html = renderToString(
      <ModelViewer buildScene={() => []} interactive={false} cameraRef={cameraRef} />,
    );
    expect(typeof html).toBe('string');
    expect(cameraRef.current).toBe(null);
  });
});
