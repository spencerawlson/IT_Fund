import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import CypherFace, { CYPHER_EMOTIONS, CYPHER_FACE_SRC } from './CypherFace';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('CypherFace', () => {
  it('maps all six emotions to their transparent PNG under public/images', () => {
    expect([...CYPHER_EMOTIONS].sort()).toEqual(
      ['angry', 'confused', 'excited', 'happy', 'sad', 'surprised'],
    );
    for (const e of CYPHER_EMOTIONS) {
      expect(CYPHER_FACE_SRC[e]).toBe(`/images/cypher-face-${e}.png`);
    }
  });

  it('renders Happy on the dark chip by default, hidden from assistive tech', () => {
    const html = renderToString(<CypherFace />);
    expect(html).toContain('/images/cypher-face-happy.png');
    expect(html).toContain('bg-[#0D1B2A]');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<video');
  });

  it('renders the requested emotion', () => {
    for (const e of CYPHER_EMOTIONS) {
      const html = renderToString(<CypherFace emotion={e} />);
      expect(html).toContain(`/images/cypher-face-${e}.png`);
    }
  });

  it('falls back to Happy for an unknown emotion', () => {
    const html = renderToString(<CypherFace emotion="nonsense" />);
    expect(html).toContain('/images/cypher-face-happy.png');
    expect(html).not.toContain('nonsense');
  });

  it('cross-fades between emotions: both layers during the fade, only the new one after', async () => {
    let root;
    TestRenderer.act(() => {
      root = TestRenderer.create(<CypherFace emotion="happy" />);
    });
    try {
      let imgs = root.root.findAllByType('img');
      expect(imgs.length).toBe(1);
      expect(imgs[0].props.src).toBe('/images/cypher-face-happy.png');
      // The new layer fades in (the animate-face-fade class); under
      // prefers-reduced-motion index.css disables the animation, so the
      // swap is instant there.
      expect(imgs[0].props.className).toContain('animate-face-fade');

      TestRenderer.act(() => {
        root.update(<CypherFace emotion="sad" />);
      });
      imgs = root.root.findAllByType('img');
      expect(imgs.length).toBe(2);
      expect(imgs.map((i) => i.props.src)).toContain('/images/cypher-face-happy.png');
      expect(imgs.map((i) => i.props.src)).toContain('/images/cypher-face-sad.png');

      await TestRenderer.act(async () => {
        await new Promise((r) => setTimeout(r, 500));
      });
      imgs = root.root.findAllByType('img');
      expect(imgs.length).toBe(1);
      expect(imgs[0].props.src).toBe('/images/cypher-face-sad.png');
    } finally {
      TestRenderer.act(() => {
        root.unmount();
      });
    }
  });
});
