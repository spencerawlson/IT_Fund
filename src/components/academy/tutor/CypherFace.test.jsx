import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import CypherFace, {
  CYPHER_EMOTIONS,
  CYPHER_FACE_SRC,
  CYPHER_MOUTH_BOX,
  mouthOpenForLevel,
  mouthOpenRhythm,
} from './CypherFace';

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

describe('CypherFace talking mouth', () => {
  // The mouth box is measured from the 320x320 Happy PNG, not eyeballed:
  // the smile curve is x 133-188, y 188-211; the visor bottom is y 219
  // (68.4%). The overlay is anchored on the smile's top edge and grows
  // down to the visor's bottom edge.
  it('positions the mouth overlay on the measured smile', () => {
    expect(CYPHER_MOUTH_BOX).toEqual({ left: 41.6, top: 58.8, width: 17.2, height: 9.6 });
    const html = renderToString(<CypherFace />);
    expect(html).toContain('data-testid="cypher-mouth"');
    expect(html).toContain('left:41.6%');
    expect(html).toContain('top:58.8%');
    expect(html).toContain('width:17.2%');
    expect(html).toContain('height:9.6%');
    // At rest the mouth is shut: the smile shows, the overlay is invisible.
    expect(html).toContain('scale(0.85, 0)');
  });

  it('renders the mouth only for the Happy (speaking) face', () => {
    const html = renderToString(<CypherFace emotion="sad" />);
    expect(html).toContain('/images/cypher-face-sad.png');
    expect(html).not.toContain('cypher-mouth');
  });

  it('mouthOpenForLevel: a small floor, fully open at full level, clamped', () => {
    expect(mouthOpenForLevel(0)).toBeCloseTo(0.12, 5);
    expect(mouthOpenForLevel(0.5)).toBeCloseTo(0.56, 5);
    expect(mouthOpenForLevel(1)).toBeCloseTo(1, 5);
    expect(mouthOpenForLevel(-3)).toBeCloseTo(0.12, 5);
    expect(mouthOpenForLevel(99)).toBeCloseTo(1, 5);
    expect(mouthOpenForLevel(NaN)).toBeCloseTo(0.12, 5);
    // Monotonic: louder always opens at least as wide.
    expect(mouthOpenForLevel(0.8)).toBeGreaterThan(mouthOpenForLevel(0.2));
  });

  it('mouthOpenRhythm: a gentle 2.2 Hz bob between 0.22 and 0.55', () => {
    for (const t of [0, 50, 100, 200, 300, 1000, 5000]) {
      const v = mouthOpenRhythm(t);
      expect(v).toBeGreaterThanOrEqual(0.22);
      expect(v).toBeLessThanOrEqual(0.55);
    }
    // One full period later it repeats: 1 s / 2.2 Hz ≈ 454.5 ms.
    expect(mouthOpenRhythm(1000)).toBeCloseTo(mouthOpenRhythm(1000 + 1000 / 2.2), 5);
    // Half a period later it is on the opposite side of the swing.
    expect(mouthOpenRhythm(1000)).not.toBeCloseTo(mouthOpenRhythm(1000 + 1000 / 4.4), 5);
  });

  const mouthScaleY = (root) => {
    const t = root.root.findByProps({ 'data-testid': 'cypher-mouth' }).props.style.transform;
    return parseFloat(t.match(/scale\([\d.]+,\s*([\d.]+)\)/)[1]);
  };

  it('opens the mouth while talking from the live level, and settles when speech stops', () => {
    const levelRef = { current: { level: 0.8 } };
    vi.useFakeTimers();
    let root;
    try {
      TestRenderer.act(() => {
        root = TestRenderer.create(<CypherFace emotion="happy" talking levelRef={levelRef} />);
      });
      expect(mouthScaleY(root)).toBe(0);
      TestRenderer.act(() => {
        vi.advanceTimersByTime(300);
      });
      // Three 100 ms ticks at level 0.8, smoothed: open ramps past half.
      expect(mouthScaleY(root)).toBeGreaterThan(0.5);
      // Stop talking: the mouth settles back to the resting smile.
      TestRenderer.act(() => {
        root.update(<CypherFace emotion="happy" talking={false} levelRef={levelRef} />);
      });
      expect(mouthScaleY(root)).toBe(0);
    } finally {
      TestRenderer.act(() => {
        root.unmount();
      });
      vi.useRealTimers();
    }
  });

  it('falls back to the rhythm when the level sits flat (silent speech)', () => {
    const levelRef = { current: { level: 0.25 } };
    vi.useFakeTimers();
    let root;
    try {
      TestRenderer.act(() => {
        root = TestRenderer.create(<CypherFace emotion="happy" talking levelRef={levelRef} />);
      });
      // Flat level for over 600 ms: the rhythm takes over, so the mouth
      // keeps moving instead of freezing half-open for the whole answer.
      TestRenderer.act(() => {
        vi.advanceTimersByTime(800);
      });
      const first = mouthScaleY(root);
      TestRenderer.act(() => {
        vi.advanceTimersByTime(150);
      });
      const second = mouthScaleY(root);
      expect(first).not.toBe(second);
      expect(first).toBeGreaterThanOrEqual(0.2);
      expect(first).toBeLessThanOrEqual(0.6);
    } finally {
      TestRenderer.act(() => {
        root.unmount();
      });
      vi.useRealTimers();
    }
  });

  it('stays still when not talking, even as time passes', () => {
    vi.useFakeTimers();
    let root;
    try {
      TestRenderer.act(() => {
        root = TestRenderer.create(<CypherFace emotion="happy" levelRef={{ current: { level: 0.9 } }} />);
      });
      TestRenderer.act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mouthScaleY(root)).toBe(0);
    } finally {
      TestRenderer.act(() => {
        root.unmount();
      });
      vi.useRealTimers();
    }
  });

  it('stays still under prefers-reduced-motion', () => {
    const prevWindow = globalThis.window;
    globalThis.window = {
      matchMedia: (q) => ({ matches: q === '(prefers-reduced-motion: reduce)' }),
    };
    vi.useFakeTimers();
    let root;
    try {
      TestRenderer.act(() => {
        root = TestRenderer.create(
          <CypherFace emotion="happy" talking levelRef={{ current: { level: 0.9 } }} />,
        );
      });
      TestRenderer.act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mouthScaleY(root)).toBe(0);
    } finally {
      TestRenderer.act(() => {
        root.unmount();
      });
      vi.useRealTimers();
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
    }
  });
});
