import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import LoadBalancerAnimation from './LoadBalancerAnimation';

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

function hasText(root, text) {
  return root.findAll((node) => {
    const children = node.props?.children;
    if (typeof children === 'string') return children.includes(text);
    if (Array.isArray(children)) return children.some((c) => typeof c === 'string' && c.includes(text));
    return false;
  }).length > 0;
}

describe('Load Balancer Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the interactive simulator with all six strategies', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<LoadBalancerAnimation />);
    });
    expect(hasText(root.root, 'Interactive simulator')).toBe(true);
    for (const label of ['No balancer', 'Round robin', 'Least connections', 'Weighted round robin', 'IP hash', 'Random']) {
      expect(buttonWithText(root.root, label)).toBeDefined();
    }
    expect(hasText(root.root, 'nginx.conf — updates live')).toBe(true);
    expect(hasText(root.root, 'Health-check log')).toBe(true);
    act(() => root.unmount());
  });

  it('switching strategy rewrites the live nginx.conf', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<LoadBalancerAnimation />);
    });
    act(() => {
      buttonWithText(root.root, 'Least connections').props.onClick();
    });
    const conf = root.root.findByType('pre');
    expect(conf.props.children).toContain('least_conn;');
    act(() => root.unmount());
  });

  it('killing a server marks it DOWN and offers a revive', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<LoadBalancerAnimation />);
    });
    expect(hasText(root.root, 'Kill server')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Kill server').props.onClick();
    });
    expect(hasText(root.root, 'DOWN')).toBe(true);
    expect(hasText(root.root, 'Revive server')).toBe(true);
    // The dead server shows up as down in the live config.
    const conf = root.root.findByType('pre');
    expect(conf.props.children).toContain('down;');
    act(() => root.unmount());
  });

  it('the guided walkthrough plays the Reel story in four beats', () => {
    let root;
    act(() => {
      root = TestRenderer.create(<LoadBalancerAnimation />);
    });
    act(() => {
      buttonWithText(root.root, 'Guided walkthrough').props.onClick();
    });
    expect(hasText(root.root, 'Step 1 · One server, too much traffic')).toBe(true);
    expect(hasText(root.root, 'One server. It is already dropping requests.')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(hasText(root.root, 'Step 2 · Round robin')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(hasText(root.root, 'Step 3 · Least connections')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(hasText(root.root, 'Step 4 · A server dies')).toBe(true);
    expect(hasText(root.root, 'Server 2 dies. 3 fails → it is skipped.')).toBe(true);
    act(() => root.unmount());
  });
});
