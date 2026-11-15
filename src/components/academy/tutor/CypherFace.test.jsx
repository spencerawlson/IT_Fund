import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import CypherFace, {
  CYPHER_EMOTIONS,
  CYPHER_FACE_SRC,
  MOUTH_SMILE_Y,
  MOUTH_XS,
  mouthGeometry,
  mouthInnerPath,
  mouthOuterPath,
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
  // The mouth geometry is measured from the 320x320 PNGs, not eyeballed:
  // the Happy smile centreline is MOUTH_SMILE_Y at MOUTH_XS (x 131-189,
  // y 191 at the ends, 208 in the middle); the open D is the Excited
  // face's mouth (top y 182, bottom bowl to y 215). The fix for PR #75's
  // split (a dark ellipse nested inside the white smile, a second mouth):
  // the mouth IS the white line — one shape that morphs from the smile
  // into the D, so the white smile is never visible beside it.

  it('closed, the outer mouth covers the whole smile — ends included', () => {
    const g = mouthGeometry(0);
    // Interior points: the crescent sits ~1 px clear of the smile's
    // ~7 px stroke on each side (top <= centreline - 4, bottom >=
    // centreline + 4), so the original white line is fully covered.
    for (let i = 1; i < MOUTH_XS.length - 1; i++) {
      expect(g.outerTop[i]).toBeLessThanOrEqual(MOUTH_SMILE_Y[i] - 4);
      expect(g.outerBottom[i]).toBeGreaterThanOrEqual(MOUTH_SMILE_Y[i] + 4);
    }
    // Pointed ends sit on the centreline, so the smile's rounded caps
    // are covered too — this is the part PR #75 missed (its ellipse
    // tapered to nothing at the ends, leaving the whole smile showing).
    expect(g.outerTop[0]).toBe(MOUTH_SMILE_Y[0]);
    expect(g.outerBottom[0]).toBe(MOUTH_SMILE_Y[0]);
    expect(g.outerTop[MOUTH_XS.length - 1]).toBe(MOUTH_SMILE_Y[MOUTH_XS.length - 1]);
    expect(g.outerBottom[MOUTH_XS.length - 1]).toBe(MOUTH_SMILE_Y[MOUTH_XS.length - 1]);
    // Closed, the inner mouth is a zero-area line on the centreline:
    // invisible, so the resting face is just the smile — one mouth.
    for (let i = 0; i < MOUTH_XS.length; i++) {
      expect(g.innerTop[i]).toBe(g.innerBottom[i]);
      expect(g.innerTop[i]).toBe(MOUTH_SMILE_Y[i]);
    }
  });

  it('fully open, the mouth is the Excited D — and the inner mouth sits inside the outer', () => {
    const g = mouthGeometry(1);
    expect(g.outerTop.every((y) => y === 182)).toBe(true);
    expect(g.outerBottom[3]).toBe(215);
    expect(Math.min(...g.outerTop, ...g.outerBottom)).toBe(182);
    expect(Math.max(...g.outerTop, ...g.outerBottom)).toBe(215);
    // The inner (visor) mouth is strictly inside the white outer mouth
    // at every x, so the open mouth reads as a white outline with the
    // visor showing through — exactly the Excited face's mouth.
    for (let i = 0; i < MOUTH_XS.length; i++) {
      expect(g.innerTop[i]).toBeGreaterThanOrEqual(g.outerTop[i]);
      expect(g.innerBottom[i]).toBeLessThanOrEqual(g.outerBottom[i]);
    }
    expect(g.innerTop[3]).toBe(187);
    expect(g.innerBottom[3]).toBe(209);
  });

  it('the mouth morphs monotonically: the top flattens and the bowl deepens as it opens', () => {
    const closed = mouthGeometry(0);
    const half = mouthGeometry(0.5);
    const open = mouthGeometry(1);
    expect(half.outerTop[3]).toBeLessThan(closed.outerTop[3]);
    expect(open.outerTop[3]).toBeLessThan(half.outerTop[3]);
    expect(half.outerBottom[3]).toBeGreaterThan(closed.outerBottom[3]);
    expect(open.outerBottom[3]).toBeGreaterThan(half.outerBottom[3]);
    // The dark interior stays shut while the mouth is still essentially
    // a smile (below open 0.5): a slit appearing there would cut the
    // white crescent into two stacked arcs — a second mouth. It only
    // grows once the mouth is genuinely open.
    const third = mouthGeometry(0.3);
    for (let i = 0; i < MOUTH_XS.length; i++) {
      expect(third.innerTop[i]).toBe(third.innerBottom[i]);
    }
    expect(half.innerBottom[3] - half.innerTop[3]).toBe(0);
    const mostly = mouthGeometry(0.75);
    expect(mostly.innerBottom[3]).toBeGreaterThan(mostly.innerTop[3]);
    expect(open.innerBottom[3] - open.innerTop[3]).toBeGreaterThan(
      mostly.innerBottom[3] - mostly.innerTop[3],
    );
  });

  it('mouth paths are deterministic closed loops in the 320x320 face space', () => {
    expect(mouthOuterPath(0)).toBe(mouthOuterPath(0));
    expect(mouthInnerPath(0.5)).toBe(mouthInnerPath(0.5));
    expect(mouthOuterPath(0)).not.toBe(mouthOuterPath(1));
    expect(mouthInnerPath(0)).not.toBe(mouthInnerPath(1));
    for (const d of [mouthOuterPath(0), mouthOuterPath(1), mouthInnerPath(0), mouthInnerPath(1)]) {
      expect(d.startsWith('M ')).toBe(true);
      expect(d.endsWith(' Z')).toBe(true);
    }
  });

  it('renders the mouth only for the Happy (speaking) face', () => {
    const html = renderToString(<CypherFace emotion="happy" />);
    expect(html).toContain('data-testid="cypher-mouth"');
    expect(html).toContain('<svg');
    const sad = renderToString(<CypherFace emotion="sad" />);
    expect(sad).toContain('/images/cypher-face-sad.png');
    expect(sad).not.toContain('cypher-mouth');
  });

  it('at rest the mouth is the closed smile path', () => {
    const html = renderToString(<CypherFace />);
    expect(html).toContain(`d="${mouthOuterPath(0)}"`);
    expect(html).toContain(`d="${mouthInnerPath(0)}"`);
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

  const mouthDs = (root) => {
    const svg = root.root.findByProps({ 'data-testid': 'cypher-mouth' });
    return svg.findAllByType('path').map((p) => p.props.d);
  };

  it('morphs the mouth while talking from the live level, and settles when speech stops', () => {
    const levelRef = { current: { level: 0.8 } };
    vi.useFakeTimers();
    let root;
    try {
      TestRenderer.act(() => {
        root = TestRenderer.create(<CypherFace emotion="happy" talking levelRef={levelRef} />);
      });
      expect(mouthDs(root)).toEqual([mouthOuterPath(0), mouthInnerPath(0)]);
      TestRenderer.act(() => {
        vi.advanceTimersByTime(300);
      });
      // Three 100 ms ticks at level 0.8, smoothed: the mouth is well
      // open — a different shape from the resting smile, not a second one.
      const [outer] = mouthDs(root);
      expect(outer).not.toBe(mouthOuterPath(0));
      expect(outer).not.toBe(mouthOuterPath(1));
      // Stop talking: the mouth settles back to the resting smile.
      TestRenderer.act(() => {
        root.update(<CypherFace emotion="happy" talking={false} levelRef={levelRef} />);
      });
      expect(mouthDs(root)).toEqual([mouthOuterPath(0), mouthInnerPath(0)]);
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
      const first = mouthDs(root);
      TestRenderer.act(() => {
        vi.advanceTimersByTime(150);
      });
      const second = mouthDs(root);
      expect(first).not.toEqual(second);
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
      expect(mouthDs(root)).toEqual([mouthOuterPath(0), mouthInnerPath(0)]);
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
      expect(mouthDs(root)).toEqual([mouthOuterPath(0), mouthInnerPath(0)]);
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
