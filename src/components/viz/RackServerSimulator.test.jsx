import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import RackServerSimulator from './RackServerSimulator';
import { SUBJECTS, RENDERERS } from '@/pages/Lab';
import { BOOT_MS, REBUILD_MS } from '@/lib/rackServer';

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
    if (typeof children === 'number') return String(children).includes(text);
    if (Array.isArray(children)) {
      const joined = children.filter((c) => typeof c === 'string' || typeof c === 'number').join('');
      return joined.includes(text);
    }
    return false;
  }).length > 0;
}

function renderSim() {
  let root;
  act(() => {
    root = TestRenderer.create(<RackServerSimulator />);
  });
  return root;
}

describe('Rack Server Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the simulator: BMC controls, 8 bays, PSUs, fans, console and log', () => {
    const root = renderSim();
    expect(hasText(root.root, 'Out-of-band management')).toBe(true);
    expect(buttonWithText(root.root, 'Power on (BMC)')).toBeDefined();
    expect(buttonWithText(root.root, 'Power off (BMC)')).toBeDefined();
    expect(buttonWithText(root.root, 'Restart OS')).toBeDefined();
    for (let bay = 1; bay <= 8; bay += 1) {
      expect(hasText(root.root, `Bay ${bay}`)).toBe(true);
    }
    expect(hasText(root.root, 'PSU 1')).toBe(true);
    expect(hasText(root.root, 'PSU 2')).toBe(true);
    expect(hasText(root.root, 'Fan 1')).toBe(true);
    expect(hasText(root.root, 'power draw')).toBe(true);
    expect(hasText(root.root, 'thermal headroom')).toBe(true);
    expect(hasText(root.root, 'BMC console — updates live')).toBe(true);
    expect(hasText(root.root, 'Health-check log')).toBe(true);
    expect(hasText(root.root, 'Lab brief — Rack Server')).toBe(true);
    expect(hasText(root.root, 'Drill 1 — Hot-swap a drive')).toBe(true);
    expect(hasText(root.root, 'Check yourself')).toBe(true);
    act(() => root.unmount());
  });

  it('failing a PSU degrades health and replacing it restores redundancy', () => {
    const root = renderSim();
    act(() => {
      buttonWithLabel(root.root, 'Fail PSU 1').props.onClick();
    });
    expect(hasText(root.root, 'degraded')).toBe(true);
    expect(hasText(root.root, 'PSU 1 FAILED — the redundant PSU carries the full load.')).toBe(true);
    expect(buttonWithLabel(root.root, 'Replace PSU 1')).toBeDefined();
    act(() => {
      buttonWithLabel(root.root, 'Replace PSU 1').props.onClick();
    });
    expect(hasText(root.root, 'healthy')).toBe(true);
    expect(hasText(root.root, 'PSU 1 replaced — power redundancy restored.')).toBe(true);
    act(() => root.unmount());
  });

  it('failing both PSUs kills power and the BMC refuses to power on until one is replaced', () => {
    const root = renderSim();
    act(() => {
      buttonWithLabel(root.root, 'Fail PSU 1').props.onClick();
      buttonWithLabel(root.root, 'Fail PSU 2').props.onClick();
    });
    expect(hasText(root.root, 'lost power')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Power on (BMC)').props.onClick();
    });
    expect(hasText(root.root, 'no working PSU')).toBe(true);
    act(() => {
      buttonWithLabel(root.root, 'Replace PSU 2').props.onClick();
      buttonWithText(root.root, 'Power on (BMC)').props.onClick();
    });
    expect(hasText(root.root, 'power on — the OS is booting')).toBe(true);
    act(() => root.unmount());
  });

  it('the BMC powers the server off and back on while the OS is down', () => {
    const root = renderSim();
    act(() => {
      buttonWithText(root.root, 'Power off (BMC)').props.onClick();
    });
    expect(hasText(root.root, 'BMC: power off')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Power on (BMC)').props.onClick();
    });
    expect(hasText(root.root, 'booting')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(BOOT_MS);
    });
    expect(hasText(root.root, 'OS is up')).toBe(true);
    act(() => root.unmount());
  });

  it('hot-swap: fail, pull, insert, and the replacement rebuilds to online', () => {
    const root = renderSim();
    act(() => {
      buttonWithLabel(root.root, 'Fail drive in bay 3').props.onClick();
    });
    expect(hasText(root.root, 'Drive in bay 3 FAILED')).toBe(true);
    act(() => {
      buttonWithLabel(root.root, 'Pull drive in bay 3').props.onClick();
    });
    expect(hasText(root.root, 'keeps serving')).toBe(true);
    act(() => {
      buttonWithLabel(root.root, 'Insert drive in bay 3').props.onClick();
    });
    expect(hasText(root.root, 'rebuild started')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(REBUILD_MS);
    });
    expect(hasText(root.root, 'finished rebuilding and is online')).toBe(true);
    act(() => root.unmount());
  });

  it('check-yourself answers reveal on tap', () => {
    const root = renderSim();
    expect(hasText(root.root, '1U is 44.45 mm')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Reveal answer').props.onClick();
    });
    expect(hasText(root.root, '1U is 44.45 mm')).toBe(true);
    act(() => root.unmount());
  });

  it('registers rack-server in the Lab gallery as a blueprint with a renderer', () => {
    const subject = SUBJECTS.find((s) => s.id === 'rack-server');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Hardware');
    expect(RENDERERS['rack-server']).toBeDefined();
  });
});
