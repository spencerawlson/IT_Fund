import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import ServerRackSimulator from './ServerRackSimulator';
import { SUBJECTS, RENDERERS } from '../../pages/Lab';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node) {
  const children = node.props?.children;
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.filter((c) => typeof c === 'string').join('');
  return '';
}

function buttonWithText(root, text) {
  const buttons = root.findAllByType('button');
  const match = buttons.find((b) => textOf(b).trim() === text);
  expect(match, `button "${text}"`).toBeDefined();
  return match;
}

function buttonWithLabel(root, label) {
  const buttons = root.findAllByType('button');
  const match = buttons.find((b) => b.props['aria-label'] === label);
  expect(match, `button aria-label "${label}"`).toBeDefined();
  return match;
}

function hasText(root, text) {
  return root.findAll((node) => {
    const children = node.props?.children;
    if (typeof children === 'string') return children.includes(text);
    if (Array.isArray(children)) return children.some((c) => typeof c === 'string' && c.includes(text));
    return false;
  }).length > 0;
}

function configText(root) {
  return root.findByType('pre').props.children;
}

describe('42U Rack Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is registered as the server-rack blueprint subject with a renderer', () => {
    const subject = SUBJECTS.find((s) => s.id === 'server-rack');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Hardware');
    expect(RENDERERS['server-rack']).toBeDefined();
  });

  it('opens on the drill: controls, rack, config and log all render', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<ServerRackSimulator />);
    });
    for (const label of ['Trip setup — all on feed A', 'Split feeds A / B', 'Shed 1,000 W', 'Reset breaker A', 'Reset breaker B', 'Fans on', 'Tidy cabling']) {
      expect(buttonWithText(root.root, label)).toBeDefined();
    }
    expect(hasText(root.root, '42U cabinet')).toBe(true);
    expect(hasText(root.root, 'Breaker headroom')).toBe(true);
    expect(hasText(root.root, 'Rack config — updates live')).toBe(true);
    expect(hasText(root.root, 'Power event log')).toBe(true);
    expect(hasText(root.root, 'Lab brief — the 42U rack')).toBe(true);
    expect(hasText(root.root, 'Check yourself')).toBe(true);
    act(() => root.unmount());
  });

  it('feed A trips at 2,575 W on its 1,840 W breaker', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<ServerRackSimulator />);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(hasText(root.root, 'TRIPPED')).toBe(true);
    expect(hasText(root.root, 'Feed A breaker TRIPPED')).toBe(true);
    expect(configText(root.root)).toContain('feed A breaker 1840 W — load 2575 W — TRIPPED');
    act(() => root.unmount());
  });

  it('a reset refuses while overloaded, then holds after the feeds are split', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<ServerRackSimulator />);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      buttonWithText(root.root, 'Reset breaker A').props.onClick();
    });
    expect(hasText(root.root, 'TRIPPED')).toBe(true);
    expect(hasText(root.root, 'reset refused')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Split feeds A / B').props.onClick();
    });
    act(() => {
      buttonWithText(root.root, 'Reset breaker A').props.onClick();
    });
    // The reset button goes disabled once the breaker is back (the log keeps
    // the original trip event, so assert on the button, not on the word).
    expect(buttonWithText(root.root, 'Reset breaker A').props.disabled).toBe(true);
    expect(hasText(root.root, '465 W on feed A')).toBe(true);
    expect(configText(root.root)).toContain('feed A breaker 1840 W — load 1375 W — 465 W headroom');
    act(() => root.unmount());
  });

  it('shedding 1,000 W drops the load to 1,575 W', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<ServerRackSimulator />);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      buttonWithText(root.root, 'Shed 1,000 W').props.onClick();
    });
    expect(hasText(root.root, '1575 W')).toBe(true);
    expect(configText(root.root)).toContain('load 1575 W');
    act(() => root.unmount());
  });

  it('a per-device feed toggle actually moves the load', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<ServerRackSimulator />);
    });
    act(() => {
      buttonWithLabel(root.root, 'Server 1 on feed B').props.onClick();
    });
    expect(configText(root.root)).toContain('feed B breaker 1840 W — load 600 W');
    act(() => root.unmount());
  });

  it('the Fans Off toggle actually changes the thermal outcome', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<ServerRackSimulator />);
    });
    expect(configText(root.root)).toContain('fans: on');
    act(() => {
      buttonWithText(root.root, 'Fans on').props.onClick();
    });
    expect(buttonWithText(root.root, 'Fans off')).toBeDefined();
    expect(configText(root.root)).toContain('fans: OFF (+6 C)');
    expect(hasText(root.root, 'Fans off — cabinet will settle 6 °C hotter.')).toBe(true);
    act(() => root.unmount());
  });

  it('the Messy cabling toggle actually changes the thermal outcome', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<ServerRackSimulator />);
    });
    expect(configText(root.root)).toContain('cabling: tidy');
    act(() => {
      buttonWithText(root.root, 'Tidy cabling').props.onClick();
    });
    expect(buttonWithText(root.root, 'Messy cabling')).toBeDefined();
    expect(configText(root.root)).toContain('cabling: messy (+3 C)');
    expect(hasText(root.root, 'Cabling messy — blocked airflow')).toBe(true);
    act(() => root.unmount());
  });

  it('the temperature falls while the rack is dark after the trip', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<ServerRackSimulator />);
    });
    expect(hasText(root.root, '38.5 °C')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    // The live temperature fell (the brief copy still mentions 38.5 °C, so
    // assert on the config panel's live reading, not on the bare number).
    expect(configText(root.root)).toContain('cabinet 24.9 C (cool)');
    expect(hasText(root.root, '24.9 °C')).toBe(true);
    act(() => root.unmount());
  });
});
