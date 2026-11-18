import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import UpsSimulator from './UpsSimulator';
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

function nodeText(node) {
  const children = node.props?.children;
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map((c) => {
    if (typeof c === 'string' || typeof c === 'number') return String(c);
    if (c && typeof c === 'object' && c.props) return nodeText(c);
    return '';
  }).join('');
  if (children && typeof children === 'object' && children.props) return nodeText(children);
  return '';
}

function hasText(root, text) {
  // Join descendant text: JSX splits "7 of 7 on" into [7, " of 7 on"],
  // so a plain child-string search never matches what the user sees.
  return root.findAll((node) => nodeText(node).includes(text)).length > 0;
}

function inputByLabel(root, label) {
  const match = root.findAllByType('input').find((s) => s.props['aria-label'] === label);
  expect(match, `input "${label}"`).toBeDefined();
  return match;
}

function configText(root) {
  return root.findByType('pre').props.children;
}

function renderSimulator() {
  let root;
  act(() => {
    root = TestRenderer.create(<UpsSimulator />);
  });
  return root;
}

describe('UPS Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is registered as the ups renderer and keeps kind blueprint', () => {
    const subject = SUBJECTS.find((s) => s.id === 'ups');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Hardware');
    expect(RENDERERS['ups']).toBeDefined();
    expect(typeof RENDERERS['ups']).toBe('function');
    let rendered;
    act(() => {
      rendered = TestRenderer.create(React.createElement(RENDERERS['ups']));
    });
    expect(hasText(rendered.root, 'UPS topology')).toBe(true);
    act(() => rendered.unmount());
  });

  it('renders the one-screen simulator starting at the LCD example: 32% load, 58 min', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'UPS topology')).toBe(true);
    expect(hasText(root.root, 'Simulate blackout')).toBe(true);
    expect(hasText(root.root, 'Start generator')).toBe(true);
    expect(hasText(root.root, 'Emergency power off')).toBe(true);
    expect(hasText(root.root, 'Hot-swap battery')).toBe(true);
    expect(hasText(root.root, 'Mains → UPS → PDU → servers')).toBe(true);
    expect(hasText(root.root, 'UPS front panel')).toBe(true);
    expect(hasText(root.root, 'Protected servers')).toBe(true);
    expect(hasText(root.root, 'UPS config — updates live')).toBe(true);
    expect(hasText(root.root, 'Event log')).toBe(true);
    expect(hasText(root.root, 'Lab brief — the rack UPS')).toBe(true);
    expect(hasText(root.root, 'Exercises — in order')).toBe(true);
    expect(hasText(root.root, 'Debrief — what you should have seen')).toBe(true);
    expect(hasText(root.root, '720 VA')).toBe(true);
    expect(hasText(root.root, '32%')).toBe(true);
    expect(hasText(root.root, '58 min')).toBe(true);
    expect(hasText(root.root, '0 ms')).toBe(true);
    expect(configText(root.root)).toContain('transfer time   0 ms');
    expect(configText(root.root)).toContain('2,250 VA / 1,800 W');
    act(() => root.unmount());
  });

  it('raising the load shortens the runtime reading', () => {
    const root = renderSimulator();
    expect(hasText(root.root, '58 min')).toBe(true);
    act(() => {
      inputByLabel(root.root, 'Extra load in volt-amps').props.onChange({ target: { value: '400' } });
    });
    expect(hasText(root.root, '37 min')).toBe(true);
    // The static lab copy below the fold also says "58 min", so the
    // no-longer-58-min check reads the live config, not the page text.
    expect(configText(root.root)).toContain('runtime left    37 min');
    expect(configText(root.root)).not.toContain('58 min');
    act(() => root.unmount());
  });

  it('pushing the load past the 2,250 VA rating is blocked, not applied', () => {
    const root = renderSimulator();
    act(() => {
      inputByLabel(root.root, 'Extra load in volt-amps').props.onChange({ target: { value: '1700' } });
    });
    expect(hasText(root.root, 'Overload blocked')).toBe(true);
    expect(hasText(root.root, '720 VA')).toBe(true);
    expect(hasText(root.root, '58 min')).toBe(true);
    act(() => root.unmount());
  });

  it('switching topology changes the transfer time and the sine wave', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Standby').props.onClick();
    });
    expect(hasText(root.root, '10 ms')).toBe(true);
    expect(hasText(root.root, 'Simulated sine wave')).toBe(true);
    expect(configText(root.root)).toContain('standby (Offline)');
    act(() => {
      buttonWithText(root.root, 'Line-interactive').props.onClick();
    });
    expect(hasText(root.root, '4 ms')).toBe(true);
    expect(hasText(root.root, 'Pure sine wave')).toBe(true);
    act(() => root.unmount());
  });

  it('a blackout drains the battery and ends in a graceful shutdown that preserves charge', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Simulate blackout').props.onClick();
    });
    expect(hasText(root.root, 'On battery power')).toBe(true);
    expect(hasText(root.root, 'Mains failed — Online: 0 ms transfer')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(40000);
    });
    expect(hasText(root.root, 'Graceful shutdown in progress')).toBe(false);
    expect(hasText(root.root, 'All 7 servers shut down cleanly')).toBe(true);
    expect(hasText(root.root, 'battery preserved at 17%')).toBe(true);
    expect(hasText(root.root, '0 of 7 on')).toBe(true);
    act(() => root.unmount());
  });

  it('the generator takes over during a blackout and the battery recharges', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Simulate blackout').props.onClick();
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(hasText(root.root, 'On battery power')).toBe(true);
    // The static lab copy also says "100%", so the drained/recharged check
    // reads the live config runtime, not the page text.
    const drained = configText(root.root).match(/runtime left\s+(\d+) min/);
    expect(drained, 'drained runtime').not.toBeNull();
    expect(Number(drained[1])).toBeLessThan(58);
    act(() => {
      buttonWithText(root.root, 'Start generator').props.onClick();
    });
    expect(hasText(root.root, 'On generator power')).toBe(true);
    expect(hasText(root.root, 'Generator started')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(configText(root.root)).toContain('runtime left    58 min');
    act(() => root.unmount());
  });

  it('failing one module at 32% load changes nothing; restoring it brings N+1 back', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Fail module').props.onClick();
    });
    expect(hasText(root.root, 'carries the full 720 VA load')).toBe(true);
    expect(hasText(root.root, '7 of 7 on')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Restore module').props.onClick();
    });
    expect(hasText(root.root, 'N+1 redundancy back in place')).toBe(true);
    act(() => root.unmount());
  });

  it('failing one module past 1,500 VA overloads the survivor', () => {
    const root = renderSimulator();
    act(() => {
      inputByLabel(root.root, 'Extra load in volt-amps').props.onChange({ target: { value: '1080' } });
    });
    expect(hasText(root.root, '1,800 VA')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Fail module').props.onClick();
    });
    expect(hasText(root.root, 'OVERLOAD — shed load now')).toBe(true);
    expect(hasText(root.root, 'Overload.')).toBe(true);
    act(() => root.unmount());
  });

  it('EPO kills everything at once, with no graceful shutdown', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Emergency power off').props.onClick();
    });
    expect(hasText(root.root, 'EMERGENCY POWER OFF')).toBe(true);
    expect(hasText(root.root, '0 of 7 on')).toBe(true);
    expect(hasText(root.root, 'All 7 servers shut down cleanly')).toBe(false);
    act(() => root.unmount());
  });

  it('check-yourself answers reveal on tap', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'It roughly halves, to about 29 minutes')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Reveal answer').props.onClick();
    });
    expect(hasText(root.root, 'It roughly halves, to about 29 minutes')).toBe(true);
    act(() => root.unmount());
  });

  it('reset restores the LCD example: 32% load, 58 min, mains live', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Simulate blackout').props.onClick();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(hasText(root.root, 'On battery power')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Reset').props.onClick();
    });
    expect(hasText(root.root, 'On battery power')).toBe(false);
    expect(hasText(root.root, '720 VA')).toBe(true);
    expect(hasText(root.root, '58 min')).toBe(true);
    expect(hasText(root.root, 'Restore mains')).toBe(false);
    act(() => root.unmount());
  });
});
