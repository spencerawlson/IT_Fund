import { describe, it, expect } from 'vitest';
import {
  SOC_DRESSING,
  buildSocDressing,
  makeSign,
  makeScreen,
} from './socDressing';
import { CYPHER_SEAT_M, ROOM_SCALE, SOC_H_PARTITION_Y_M, SOC_V_PARTITION_X_M } from './socLayout';

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

  it('mounts a sign for each robot — Cypher’s on his desk, the others on the glass in front of their rooms', () => {
    // Since the Blender-built room (2026-11-16) the signs are wall-mounted
    // like the concept render, not hung from the ceiling: hung plates sat
    // in the eye-level wide shot's line of sight.
    expect(SOC_DRESSING.signs).toHaveLength(3);
    expect(SOC_DRESSING.signs.map((s) => s.key)).toEqual(['cypher', 'sentinel', 'patch']);
    const [cypher, sentinel, patch] = SOC_DRESSING.signs;
    expect(cypher.title).toBe('Cypher');
    expect(cypher.sub).toBe('AI Learning Agent');
    // Cypher's plate: on the front of his desk, low, east of his chair.
    expect(cypher.zM).toBeLessThan(0.76);
    expect(cypher.x).toBeGreaterThan(CYPHER_SEAT_M.x);
    expect(cypher.y).toBeLessThan(SOC_H_PARTITION_Y_M);
    // Sentinel's and Patch's: on the H-wall glass (just south of it),
    // high, above their own rooms (enlarged SOC, 2026-11-17: server room
    // west of x 0.63, workshop east).
    for (const sign of [sentinel, patch]) {
      expect(sign.y).toBeLessThan(SOC_H_PARTITION_Y_M);
      expect(SOC_H_PARTITION_Y_M - sign.y).toBeLessThan(0.1);
      expect(sign.zM).toBeGreaterThan(2.0);
    }
    expect(sentinel.x).toBeLessThan(SOC_V_PARTITION_X_M);
    expect(patch.x).toBeGreaterThan(SOC_V_PARTITION_X_M);
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
  it('builds nothing without a canvas — the glass and the R2C display are part of the room now', () => {
    const group = buildSocDressing();
    expect(group).toBeTruthy();
    expect(group.name).toBe('soc-dressing');
    expect(group.children).toHaveLength(0);
    expect(named(group, 'soc-glass-pane')).toHaveLength(0);
    expect(named(group, 'soc-screen')).toHaveLength(0);
    expect(named(group, 'soc-led-strip')).toHaveLength(0);
  });

  it('builds the three wall-mounted signs with a canvas — one plate each, no rods, no screen', () => {
    const group = buildSocDressing({ createCanvas: fakeCanvasFactory() });
    expect(named(group, 'soc-screen')).toHaveLength(0);
    for (const sign of SOC_DRESSING.signs) {
      const built = named(group, `soc-sign-${sign.key}`);
      expect(built).toHaveLength(1);
      expect(named(built[0], `soc-sign-plate-${sign.key}`)).toHaveLength(1);
      expect(named(built[0], `soc-sign-rod-${sign.key}`)).toHaveLength(0);
      // The plate sits where the data says, facing south (+Z), at its size.
      const plate = named(built[0], `soc-sign-plate-${sign.key}`)[0];
      expect(plate.position.x).toBeCloseTo(sign.x * ROOM_SCALE, 5);
      expect(plate.position.y).toBeCloseTo(sign.zM * ROOM_SCALE, 5);
      expect(plate.position.z).toBeCloseTo(-sign.y * ROOM_SCALE, 5);
      expect(plate.geometry.parameters.width).toBeCloseTo(sign.wM * ROOM_SCALE, 5);
    }
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
