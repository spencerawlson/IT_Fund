import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import SwitchSimulator from './SwitchSimulator';
import { SUBJECTS, RENDERERS } from '../../pages/Lab';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node) {
  const children = node.props?.children;
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.filter((c) => typeof c === 'string' || typeof c === 'number').join('');
  return '';
}

function buttonWithText(root, text) {
  const buttons = root.findAllByType('button');
  const match = buttons.find((b) => textOf(b).trim() === text);
  expect(match, `button "${text}"`).toBeDefined();
  return match;
}

function hasText(root, text) {
  return root.findAll((node) => {
    const children = node.props?.children;
    if (typeof children === 'string') return children.includes(text);
    if (typeof children === 'number') return String(children).includes(text);
    if (Array.isArray(children)) return children.some((c) => (typeof c === 'string' || typeof c === 'number') && String(c).includes(text));
    return false;
  }).length > 0;
}

function selectByLabel(root, label) {
  const match = root.findAllByType('select').find((s) => s.props['aria-label'] === label);
  expect(match, `select "${label}"`).toBeDefined();
  return match;
}

function cliText(root) {
  return root.findByType('pre').props.children;
}

function renderSimulator() {
  let root;
  act(() => {
    root = TestRenderer.create(<SwitchSimulator />);
  });
  return root;
}

describe('Switch Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is registered as the switch renderer and keeps kind blueprint', () => {
    const subject = SUBJECTS.find((s) => s.id === 'switch');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Hardware');
    expect(RENDERERS['switch']).toBeDefined();
    expect(typeof RENDERERS['switch']).toBe('function');
    let rendered;
    act(() => {
      rendered = TestRenderer.create(React.createElement(RENDERERS['switch']));
    });
    expect(hasText(rendered.root, 'Spanning tree')).toBe(true);
    act(() => rendered.unmount());
  });

  it('renders the one-screen simulator: controls, counters, topology, front panel, CLI', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Spanning tree')).toBe(true);
    expect(hasText(root.root, 'Send a frame')).toBe(true);
    expect(buttonWithText(root.root, 'STP on')).toBeDefined();
    expect(buttonWithText(root.root, 'Link P3 up')).toBeDefined();
    expect(buttonWithText(root.root, 'Redundant link P4 up')).toBeDefined();
    expect(buttonWithText(root.root, 'Send frame')).toBeDefined();
    expect(hasText(root.root, 'CAM table — learned live')).toBe(true);
    expect(hasText(root.root, 'Front panel')).toBe(true);
    expect(hasText(root.root, 'Switch CLI — updates live')).toBe(true);
    expect(hasText(root.root, 'Event log')).toBe(true);
    expect(hasText(root.root, 'Lab brief — the managed switch')).toBe(true);
    expect(hasText(root.root, 'Exercises — in order')).toBe(true);
    expect(hasText(root.root, 'Debrief — what you should have seen')).toBe(true);
    expect(cliText(root.root)).toContain('Root bridge: SW1');
    act(() => root.unmount());
  });

  it('sending PC-A → PC-C floods first, then goes to one port once the reply teaches the path', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Nothing learned yet')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Send frame').props.onClick();
    });
    // First frame flooded (unknown destination) and taught both switches;
    // the host's reply taught the reverse path.
    expect(hasText(root.root, '00:1a:2b:00:00:0a')).toBe(true);
    expect(hasText(root.root, 'delivered — flooded first')).toBe(true);
    expect(cliText(root.root)).toContain('00:1a:2b:00:00:0a');
    expect(cliText(root.root)).toContain('00:1a:2b:00:00:0c');
    act(() => {
      buttonWithText(root.root, 'Send frame').props.onClick();
    });
    expect(hasText(root.root, 'delivered via SW1 P3')).toBe(true);
    expect(hasText(root.root, 'one port, no flood')).toBe(true);
    act(() => root.unmount());
  });

  it('a cross-VLAN send is dropped and says why', () => {
    const root = renderSimulator();
    act(() => {
      selectByLabel(root.root, 'Destination MAC').props.onChange({ target: { value: '00:1a:2b:00:00:0d' } });
    });
    act(() => {
      buttonWithText(root.root, 'Send frame').props.onClick();
    });
    expect(hasText(root.root, 'different VLAN — needs a router')).toBe(true);
    act(() => root.unmount());
  });

  it('an unknown destination floods inside its VLAN only', () => {
    const root = renderSimulator();
    act(() => {
      selectByLabel(root.root, 'Destination MAC').props.onChange({ target: { value: '00:1a:2b:00:00:ff' } });
    });
    act(() => {
      buttonWithText(root.root, 'Send frame').props.onClick();
    });
    expect(hasText(root.root, 'flooded in VLAN 10 — no host answered')).toBe(true);
    act(() => root.unmount());
  });

  it('flipping SW2 to priority 0 re-elects it as root bridge', () => {
    const root = renderSimulator();
    expect(cliText(root.root)).toContain('Root bridge: SW1');
    act(() => {
      selectByLabel(root.root, 'SW2 STP priority').props.onChange({ target: { value: '0' } });
    });
    expect(cliText(root.root)).toContain('Root bridge: SW2');
    expect(hasText(root.root, 'Root bridge is now SW2')).toBe(true);
    act(() => root.unmount());
  });

  it('dropping the P3 trunk reconverges: SW2 P4 unblocks and becomes the root port', () => {
    const root = renderSimulator();
    expect(cliText(root.root)).toMatch(/P4\s+trunk vlans 10,20 native 1\s+blocked\s+blocked/);
    act(() => {
      buttonWithText(root.root, 'Link P3 up').props.onClick();
    });
    expect(buttonWithText(root.root, 'Link P3 DOWN')).toBeDefined();
    expect(cliText(root.root)).toMatch(/P4\s+trunk vlans 10,20 native 1\s+root\s+forwarding/);
    expect(cliText(root.root)).toMatch(/P3\s+trunk vlans 10,20 native 1\s+designated\s+down/);
    act(() => root.unmount());
  });

  it('turning STP off with both trunks up starts a broadcast storm at 14,800 frames/s', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'STP on').props.onClick();
    });
    expect(buttonWithText(root.root, 'STP OFF')).toBeDefined();
    expect(hasText(root.root, 'Broadcast storm')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(hasText(root.root, '14,800 /s')).toBe(true);
    expect(hasText(root.root, 'LOOP DETECTED')).toBe(true);
    // Re-enabling STP breaks the loop and the storm stops.
    act(() => {
      buttonWithText(root.root, 'STP OFF').props.onClick();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(hasText(root.root, '14,800 /s')).toBe(false);
    expect(hasText(root.root, 'Loop broken')).toBe(true);
    act(() => root.unmount());
  });

  it('the fan-fault control turns the FAN LED amber and back', () => {
    const root = renderSimulator();
    expect(hasText(root.root, '— fault')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Simulate fan fault').props.onClick();
    });
    expect(hasText(root.root, '— fault')).toBe(true);
    expect(hasText(root.root, 'fan fault / overheating')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Clear fan fault').props.onClick();
    });
    expect(hasText(root.root, '— fault')).toBe(false);
    act(() => root.unmount());
  });

  it('check-yourself answers reveal on tap', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Flooding is how the switch finds the destination')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Reveal answer').props.onClick();
    });
    expect(hasText(root.root, 'Flooding is how the switch finds the destination')).toBe(true);
    act(() => root.unmount());
  });

  it('reset clears the learned CAM table and the counters', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Send frame').props.onClick();
    });
    expect(hasText(root.root, '00:1a:2b:00:00:0a')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Reset').props.onClick();
    });
    expect(hasText(root.root, 'Nothing learned yet')).toBe(true);
    expect(cliText(root.root)).toContain('Root bridge: SW1');
    act(() => root.unmount());
  });
});
