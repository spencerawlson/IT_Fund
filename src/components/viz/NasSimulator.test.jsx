import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import NasSimulator from './NasSimulator';
import { SUBJECTS, RENDERERS } from '@/pages/Lab';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node) {
  const children = node.props?.children;
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === 'string' ? c : typeof c === 'number' ? String(c) : '')).join('');
  }
  return '';
}

function buttonWithText(root, text) {
  const buttons = root.findAllByType('button');
  const match = buttons.find((b) => textOf(b).trim() === text);
  expect(match, `button "${text}"`).toBeDefined();
  return match;
}

function buttonsWithText(root, text) {
  return root.findAllByType('button').filter((b) => textOf(b).trim() === text);
}

// Joined text: children may be split across strings, numbers and elements
// ("Bay {i + 1}" renders as ' Bay ' + 1), so join before matching.
function hasText(root, text) {
  return root.findAll((node) => textOf(node).includes(text)).length > 0;
}

// The array-status pill is the only node whose whole text is the status word
// (the exercises below the fold mention the words inside sentences).
function statusIs(root, status) {
  return root.findAll((node) => textOf(node).trim() === status).length > 0;
}

function renderSim() {
  let root;
  act(() => {
    root = TestRenderer.create(<NasSimulator />);
  });
  return root;
}

describe('NAS Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is registered as the nas renderer and keeps kind blueprint', () => {
    const subject = SUBJECTS.find((s) => s.id === 'nas');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Data & Systems');
    expect(RENDERERS['nas']).toBeDefined();
  });

  it('opens on the simulator with all five RAID levels and eight bays', () => {
    const root = renderSim();
    for (const label of ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10']) {
      expect(buttonWithText(root.root, label)).toBeDefined();
    }
    expect(statusIs(root.root, 'OPTIMAL')).toBe(true);
    expect(hasText(root.root, '28 TB')).toBe(true);
    expect(hasText(root.root, 'NVMe cache hit rate')).toBe(true);
    expect(hasText(root.root, 'Storage config — updates live')).toBe(true);
    expect(hasText(root.root, 'Array event log')).toBe(true);
    for (let bay = 1; bay <= 8; bay += 1) {
      expect(hasText(root.root, `Bay ${bay}`)).toBe(true);
    }
    act(() => root.unmount());
  });

  it('switching RAID level updates capacity and tolerance', () => {
    const root = renderSim();
    act(() => {
      buttonWithText(root.root, 'RAID 6').props.onClick();
    });
    expect(hasText(root.root, '24 TB')).toBe(true);
    expect(hasText(root.root, '2 disks')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'RAID 0').props.onClick();
    });
    expect(hasText(root.root, '32 TB')).toBe(true);
    expect(hasText(root.root, '0 disks')).toBe(true);
    const conf = root.root.findByType('pre');
    expect(conf.props.children).toContain('RAID 0');
    act(() => root.unmount());
  });

  it('failing a disk degrades the array and hot-swapping rebuilds it to OPTIMAL', () => {
    const root = renderSim();
    act(() => {
      buttonWithText(root.root, 'Fail disk').props.onClick();
    });
    expect(statusIs(root.root, 'DEGRADED')).toBe(true);
    expect(buttonWithText(root.root, 'Hot-swap disk')).toBeDefined();
    act(() => {
      buttonWithText(root.root, 'Hot-swap disk').props.onClick();
    });
    expect(statusIs(root.root, 'REBUILDING')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(11_000);
    });
    expect(statusIs(root.root, 'OPTIMAL')).toBe(true);
    act(() => root.unmount());
  });

  it('a second failure during a RAID 5 rebuild loses the array', () => {
    const root = renderSim();
    act(() => {
      buttonWithText(root.root, 'Fail disk').props.onClick();
    });
    act(() => {
      buttonWithText(root.root, 'Hot-swap disk').props.onClick();
    });
    expect(statusIs(root.root, 'REBUILDING')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    // Fail a *different* bay than the rebuilding one: the first Fail button
    // is the rebuilding bay itself.
    const failButtons = buttonsWithText(root.root, 'Fail disk');
    expect(failButtons.length).toBeGreaterThan(1);
    act(() => {
      failButtons[1].props.onClick();
    });
    expect(statusIs(root.root, 'LOST')).toBe(true);
    act(() => root.unmount());
  });

  it('RAID 6 survives a second failure during a rebuild', () => {
    const root = renderSim();
    act(() => {
      buttonWithText(root.root, 'RAID 6').props.onClick();
    });
    act(() => {
      buttonWithText(root.root, 'Fail disk').props.onClick();
    });
    act(() => {
      buttonWithText(root.root, 'Hot-swap disk').props.onClick();
    });
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    const failButtons = buttonsWithText(root.root, 'Fail disk');
    expect(failButtons.length).toBeGreaterThan(1);
    act(() => {
      failButtons[1].props.onClick();
    });
    expect(statusIs(root.root, 'LOST')).toBe(false);
    expect(statusIs(root.root, 'REBUILDING')).toBe(true);
    act(() => root.unmount());
  });

  it('turning the NVMe cache off drops the hit rate to zero', () => {
    const root = renderSim();
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(hasText(root.root, 'M.2 NVMe cache: on')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'M.2 NVMe cache: on').props.onClick();
    });
    expect(hasText(root.root, 'M.2 NVMe cache: off')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(hasText(root.root, '0%')).toBe(true);
    act(() => root.unmount());
  });

  it('check-yourself questions reveal their answers', () => {
    const root = renderSim();
    expect(hasText(root.root, '28 TB. One disk')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Reveal answer').props.onClick();
    });
    expect(hasText(root.root, '28 TB. One disk')).toBe(true);
    act(() => root.unmount());
  });
});
