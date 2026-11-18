import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import CloudSimulator from './CloudSimulator';
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

function trafficSlider(root) {
  const match = root.findAllByType('input').find((i) => i.props['aria-label'] === 'Traffic in requests per second');
  expect(match, 'traffic slider').toBeDefined();
  return match;
}

function configText(root) {
  return root.findByType('pre').props.children;
}

function renderSimulator() {
  let root;
  act(() => {
    root = TestRenderer.create(<CloudSimulator />);
  });
  return root;
}

describe('Cloud Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is registered as the cloud renderer and keeps kind blueprint', () => {
    const subject = SUBJECTS.find((s) => s.id === 'cloud');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Cloud & Scale');
    expect(RENDERERS['cloud']).toBeDefined();
    expect(typeof RENDERERS['cloud']).toBe('function');
    let rendered;
    act(() => {
      rendered = TestRenderer.create(React.createElement(RENDERERS['cloud']));
    });
    expect(hasText(rendered.root, 'Service model')).toBe(true);
    act(() => rendered.unmount());
  });

  it('renders the one-screen simulator: controls, counters, VPC diagram, AZs, DB, storage, config', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Service model')).toBe(true);
    expect(hasText(root.root, 'Shared responsibility drill')).toBe(true);
    expect(hasText(root.root, 'Deployment model')).toBe(true);
    expect(hasText(root.root, 'Pricing')).toBe(true);
    expect(hasText(root.root, 'Multi-AZ on')).toBe(true);
    expect(hasText(root.root, 'VPC 10.0.0.0/16 — two availability zones')).toBe(true);
    expect(hasText(root.root, 'DB primary · AZ-A')).toBe(true);
    expect(hasText(root.root, 'Database — multi-AZ')).toBe(true);
    expect(hasText(root.root, 'Storage')).toBe(true);
    expect(hasText(root.root, 'VPC config — updates live')).toBe(true);
    expect(hasText(root.root, 'Event log')).toBe(true);
    expect(hasText(root.root, 'Lab brief — the cloud')).toBe(true);
    expect(hasText(root.root, 'Exercises — in order')).toBe(true);
    expect(hasText(root.root, 'Debrief — what you should have seen')).toBe(true);
    expect(configText(root.root)).toContain('VPC 10.0.0.0/16');
    expect(configText(root.root)).toContain('internet probe: BLOCKED');
    act(() => root.unmount());
  });

  it('the responsibility drill judges provider vs customer per model', () => {
    const root = renderSimulator();
    // IaaS + operating system belongs to the customer.
    act(() => {
      buttonWithText(root.root, 'Customer').props.onClick();
    });
    expect(hasText(root.root, 'Correct — on IaaS')).toBe(true);
    expect(hasText(root.root, '1/1')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Provider').props.onClick();
    });
    expect(hasText(root.root, 'Not quite — on IaaS')).toBe(true);
    expect(hasText(root.root, '1/2')).toBe(true);
    // SaaS moves the OS to the provider.
    act(() => {
      buttonWithText(root.root, 'SaaS').props.onClick();
    });
    act(() => {
      buttonWithText(root.root, 'Provider').props.onClick();
    });
    expect(hasText(root.root, 'Correct — on SaaS')).toBe(true);
    act(() => root.unmount());
  });

  it('raising traffic to 360 req/s scales the fleet 2 → 8 and the bill follows', () => {
    const root = renderSimulator();
    expect(hasText(root.root, '2 / 2')).toBe(true);
    expect(hasText(root.root, '$0.20')).toBe(true);
    act(() => {
      trafficSlider(root.root).props.onChange({ target: { value: '360' } });
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(hasText(root.root, '8 / 8')).toBe(true);
    expect(hasText(root.root, '$0.80')).toBe(true);
    expect(hasText(root.root, 'Auto-scaling: fleet → 8 instances')).toBe(true);
    // Dropping traffic back scales the fleet in again.
    act(() => {
      trafficSlider(root.root).props.onChange({ target: { value: '60' } });
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(hasText(root.root, '2 / 2')).toBe(true);
    expect(hasText(root.root, '$0.20')).toBe(true);
    act(() => root.unmount());
  });

  it('killing AZ-A fails the DB over to the sync standby in AZ-B', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Kill AZ-A').props.onClick();
    });
    expect(hasText(root.root, 'DB failed over')).toBe(true);
    expect(hasText(root.root, 'No data loss')).toBe(true);
    expect(hasText(root.root, 'DB primary · AZ-B')).toBe(true);
    expect(hasText(root.root, '1 / 2')).toBe(true);
    // Restoring the AZ rebuilds the standby and the fleet.
    act(() => {
      buttonWithText(root.root, 'Restore AZ-A').props.onClick();
    });
    expect(hasText(root.root, 'multi-AZ protection restored')).toBe(true);
    expect(hasText(root.root, '2 / 2')).toBe(true);
    act(() => root.unmount());
  });

  it('killing AZ-B loses the read replica — it cannot fail over', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Kill AZ-B').props.onClick();
    });
    expect(hasText(root.root, 'FAILED as designed')).toBe(true);
    expect(hasText(root.root, 'LOST — cannot fail over')).toBe(true);
    expect(hasText(root.root, 'DB primary · AZ-A')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Restore AZ-B').props.onClick();
    });
    expect(hasText(root.root, 'Read replica rebuilt')).toBe(true);
    act(() => root.unmount());
  });

  it('with multi-AZ off, killing AZ-A is a total outage', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Multi-AZ on').props.onClick();
    });
    expect(buttonWithText(root.root, 'Multi-AZ OFF')).toBeDefined();
    act(() => {
      buttonWithText(root.root, 'Kill AZ-A').props.onClick();
    });
    expect(hasText(root.root, '0 / 2')).toBe(true);
    expect(hasText(root.root, 'total outage')).toBe(true);
    act(() => root.unmount());
  });

  it('a burst piles 140 onto the queue and drains at 68/s as serverless invocations', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Burst +140').props.onClick();
    });
    expect(hasText(root.root, 'SQS queue · 140')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(hasText(root.root, 'SQS queue · 72')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(hasText(root.root, 'SQS queue · 0')).toBe(true);
    act(() => root.unmount());
  });

  it('a database probe from the internet is blocked', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Probe DB from the internet').props.onClick();
    });
    expect(hasText(root.root, 'BLOCKED — DB has no public IP')).toBe(true);
    act(() => root.unmount());
  });

  it('reserved pricing costs less per hour than pay-as-you-go at the same fleet size', () => {
    const root = renderSimulator();
    expect(hasText(root.root, '$0.20')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Reserved').props.onClick();
    });
    expect(hasText(root.root, '$0.12')).toBe(true);
    expect(configText(root.root)).toContain('$0.12/hr');
    act(() => root.unmount());
  });

  it('storing a snapshot adds an object to object storage', () => {
    const root = renderSimulator();
    expect(hasText(root.root, '128 objects')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Store snapshot (object)').props.onClick();
    });
    expect(hasText(root.root, '129 objects')).toBe(true);
    act(() => root.unmount());
  });

  it('check-yourself answers reveal on tap', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'those two never move to the provider')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Reveal answer').props.onClick();
    });
    expect(hasText(root.root, 'those two never move to the provider')).toBe(true);
    act(() => root.unmount());
  });

  it('reset clears the queue and the event log', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Burst +140').props.onClick();
    });
    expect(hasText(root.root, 'SQS queue · 140')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Reset').props.onClick();
    });
    expect(hasText(root.root, 'SQS queue · 0')).toBe(true);
    expect(hasText(root.root, 'No events yet')).toBe(true);
    act(() => root.unmount());
  });
});
