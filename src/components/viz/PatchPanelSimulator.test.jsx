import React from 'react';
import { describe, it, expect } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import PatchPanelSimulator from './PatchPanelSimulator';
import { SUBJECTS, RENDERERS } from '../../pages/Lab';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node) {
  const children = node.props?.children;
  if (typeof children === 'string' || typeof children === 'number') return String(children);
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
    if (typeof children === 'string' || typeof children === 'number') return String(children).includes(text);
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
    root = TestRenderer.create(<PatchPanelSimulator />);
  });
  return root;
}

describe('Patch Panel Visual Lab subject', () => {
  it('is registered as a blueprint subject with a renderer', () => {
    const subject = SUBJECTS.find((s) => s.id === 'patch-panel');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Hardware');
    expect(RENDERERS['patch-panel']).toBeDefined();
  });

  it('opens on the panel with the shipped faults visible', () => {
    const root = renderSim();
    expect(hasText(root.root, 'Drive the panel yourself')).toBe(true);
    expect(hasText(root.root, 'Front — 48 RJ45 ports')).toBe(true);
    expect(hasText(root.root, 'Rear 110 blocks')).toBe(true);
    expect(hasText(root.root, 'Termination schedule — updates live')).toBe(true);
    expect(hasText(root.root, 'Panel log')).toBe(true);
    // Shipped state: 7 of 8 patched, 5 links up, 2 failing.
    expect(hasText(root.root, 'Longest run')).toBe(true);
    expect(hasText(root.root, '88 m')).toBe(true);
    act(() => root.unmount());
  });

  it('re-terminating the mixed-standard run makes it pass', () => {
    const root = renderSim();
    // The simulator opens on port 6, the mixed-standard trap.
    expect(hasText(root.root, 'Crossover — FAIL')).toBe(true);
    expect(hasText(root.root, 'Mixed standard')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Fix: re-terminate to T568B').props.onClick();
    });
    expect(hasText(root.root, 'Crossover — FAIL')).toBe(false);
    expect(hasText(root.root, 'Link up')).toBe(true);
    // The termination schedule now shows the run as passing.
    const schedule = root.root.findByType('pre');
    expect(schedule.props.children).toContain('pass');
    act(() => root.unmount());
  });

  it('the long Cat 6 run fails at 10 Gbps and passes at 1 Gbps', () => {
    const root = renderSim();
    act(() => {
      buttonWithText(root.root, 'Long Cat 6 run').props.onClick();
    });
    expect(hasText(root.root, 'Too long — FAIL')).toBe(true);
    expect(hasText(root.root, '72 m exceeds the 55 m limit')).toBe(true);
    act(() => {
      buttonWithText(root.root, '1 Gbps').props.onClick();
    });
    expect(hasText(root.root, 'Too long — FAIL')).toBe(false);
    expect(hasText(root.root, 'Link up')).toBe(true);
    act(() => root.unmount());
  });

  it('patching in the camera and moving a patch cord work', () => {
    const root = renderSim();
    act(() => {
      const port7 = root.root.findAllByType('button').find((b) => b.props['aria-label']?.startsWith('Port 7 —'));
      expect(port7, 'port 7 button').toBeDefined();
      port7.props.onClick();
    });
    expect(hasText(root.root, 'Unpatched')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Patch in').props.onClick();
    });
    expect(hasText(root.root, 'Link up')).toBe(true);
    // The patch cord list now shows the camera on switch 7.
    expect(hasText(root.root, '→ sw 7')).toBe(true);
    // Moving the cord changes the switch port but not the run.
    const select = root.root.findAllByType('select').find((s) => s.props['aria-label'] === 'Switch port for port 7');
    expect(select).toBeDefined();
    act(() => {
      select.props.onChange({ target: { value: '12' } });
    });
    expect(hasText(root.root, '→ sw 12')).toBe(true);
    expect(hasText(root.root, 'Camera — Lobby')).toBe(true);
    act(() => root.unmount());
  });

  it('check-yourself answers reveal on tap', () => {
    const root = renderSim();
    expect(hasText(root.root, 'Check yourself')).toBe(true);
    expect(hasText(root.root, 'It reports a crossover')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Reveal answer').props.onClick();
    });
    expect(hasText(root.root, 'It reports a crossover')).toBe(true);
    act(() => root.unmount());
  });
});
