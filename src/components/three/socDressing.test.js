import { describe, it, expect } from 'vitest';
import {
  SOC_DRESSING,
  buildSocDressing,
  makeSign,
  makeScreen,
} from './socDressing';
import { CYPHER_SEAT_M, ROOM_SCALE } from './socLayout';

// Minimal fake 2d context: enough for drawSign/drawScreen to run (the
// repo has no jsdom — the dressing takes an injectable canvas factory).
function fakeCtx() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    save: () => {},
    restore: () => {},
    clip: () => {},
    fillText: () => {},
    measureText: () => ({ width: 400 }),
  };
}

function fakeCanvasFactory() {
  return () => ({
    width: 0,
    height: 0,
    getContext: () => fakeCtx(),
  });
}

function named(group, name) {
  const found = [];
  group.traverse((o) => { if (o.name === name) found.push(o); });
  return found;
}

describe('SOC_DRESSING', () => {
  it('puts the glass in the H-wall doorway with a door gap, never over a robot', () => {
    // Two panes (0.27..1.2 and 1.7..2.13) with a 0.5 m door gap
    // between them — the wide doorway, not a wall. The panes are in
    // the desk room / workshop doorway, clear of all three robots.
    const { panes } = SOC_DRESSING.glass;
    expect(panes).toHaveLength(2);
    expect(panes[0]).toEqual({ xMin: 0.27, xMax: 1.2 });
    expect(panes[1]).toEqual({ xMin: 1.7, xMax: 2.13 });
    expect(panes[1].xMin - panes[0].xMax).toBeCloseTo(0.5, 5);
    expect(SOC_DRESSING.glass.opacity).toBeLessThan(0.2); // barely-there glass
  });

  it('hangs a sign above each robot — Cypher\'s above his chair, not his old work spot', () => {
    expect(SOC_DRESSING.signs).toHaveLength(3);
    expect(SOC_DRESSING.signs.map((s) => s.key)).toEqual(['cypher', 'sentinel', 'patch']);
    const cypher = SOC_DRESSING.signs[0];
    expect(cypher.x).toBe(CYPHER_SEAT_M.x); // above where he sits (-1.20)
    expect(cypher.title).toBe('Cypher');
    expect(cypher.sub).toBe('AI Learning Agent');
    expect(SOC_DRESSING.signCentreZM).toBe(2.0); // above the heads
  });

  it('hangs the R2C screen on the north wall, in front of it and high enough to clear the racks', () => {
    // y = 2.35: the north wall's inner face is 2.44 (ray-cast), so 2.5
    // sat INSIDE the wall and the screen was invisible. z = 2.15,
    // 0.7 m tall: at 0.9 the title sat on the frame's top edge, and at
    // 1.8 the racks hid the text.
    const { screen } = SOC_DRESSING;
    expect(screen.y).toBeLessThan(2.44);
    expect(screen.y).toBeGreaterThan(2.3);
    expect(screen.z).toBe(2.15);
    expect(screen.wM).toBe(1.6);
    expect(screen.hM).toBe(0.7);
  });

  it('carries no LED strips — the partition tops vary, so a straight strip floats', () => {
    expect(SOC_DRESSING.leds).toBeUndefined();
  });
});

describe('buildSocDressing', () => {
  it('builds the glass + frames with no canvas, and drops only the signs/screen', () => {
    const group = buildSocDressing();
    expect(group).toBeTruthy();
    expect(group.name).toBe('soc-dressing');
    // 2 panes + 2 top rails + 4 side stiles.
    expect(named(group, 'soc-glass-pane')).toHaveLength(2);
    expect(named(group, 'soc-glass-frame')).toHaveLength(6);
    // No signs/screen without a canvas — and no LEDs at all.
    expect(named(group, 'soc-led-strip')).toHaveLength(0);
    expect(group.children.some((c) => c.name.startsWith('soc-sign-'))).toBe(false);
    expect(named(group, 'soc-screen')).toHaveLength(0);
    // The panes sit in the doorway (y = -0.18 in scene units: the
    // H-wall at +0.18 m, south is -z) and rise 2.2 m.
    for (const pane of named(group, 'soc-glass-pane')) {
      expect(pane.position.z).toBeCloseTo(-0.18 * ROOM_SCALE, 5);
      expect(pane.position.y).toBeCloseTo(1.1 * ROOM_SCALE, 5);
      expect(pane.material.transparent).toBe(true);
      expect(pane.material.opacity).toBeCloseTo(SOC_DRESSING.glass.opacity, 5);
    }
  });

  it('builds the three signs + the screen with a canvas', () => {
    const group = buildSocDressing({ createCanvas: fakeCanvasFactory() });
    expect(named(group, 'soc-sign-cypher')).toHaveLength(1);
    expect(named(group, 'soc-sign-sentinel')).toHaveLength(1);
    expect(named(group, 'soc-sign-patch')).toHaveLength(1);
    expect(named(group, 'soc-screen')).toHaveLength(1);
    // Each sign is a plate + two rods to the ceiling.
    for (const key of ['cypher', 'sentinel', 'patch']) {
      const sign = named(group, `soc-sign-${key}`)[0];
      expect(named(sign, `soc-sign-plate-${key}`)).toHaveLength(1);
      expect(named(sign, `soc-sign-rod-${key}`)).toHaveLength(2);
      // The plate hangs above the robot, facing south (+Z).
      const plate = named(sign, `soc-sign-plate-${key}`)[0];
      expect(plate.position.y).toBeCloseTo(2.0 * ROOM_SCALE, 5);
    }
    // The screen sits on the north wall (z = -2.35 in scene units),
    // facing south, unlit so the text stays crisp.
    const screen = named(group, 'soc-screen')[0];
    expect(screen.position.z).toBeCloseTo(-2.35 * ROOM_SCALE, 5);
    expect(screen.position.y).toBeCloseTo(2.15 * ROOM_SCALE, 5);
    expect(screen.material.toneMapped).toBe(false);
  });
});

describe('makeSign / makeScreen', () => {
  it('return null (never throw) when no canvas is available', () => {
    expect(makeSign(SOC_DRESSING.signs[0])).toBeNull();
    expect(makeSign(SOC_DRESSING.signs[0], { createCanvas: () => null })).toBeNull();
    expect(makeScreen()).toBeNull();
    expect(makeScreen({ createCanvas: () => { throw new Error('no canvas'); } })).toBeNull();
  });
});
