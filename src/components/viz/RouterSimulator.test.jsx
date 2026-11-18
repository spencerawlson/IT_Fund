import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import RouterSimulator from './RouterSimulator';
import { SUBJECTS, RENDERERS } from '@/pages/Lab';

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

function inputWithLabel(root, label) {
  const inputs = root.findAllByType('input');
  const match = inputs.find((i) => i.props['aria-label'] === label);
  expect(match, `input "${label}"`).toBeDefined();
  return match;
}

function collectText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join('');
  if (node && node.props) return collectText(node.props.children);
  return '';
}

function hasText(root, text) {
  return root.findAll((node) => collectText(node).includes(text)).length > 0;
}

function create() {
  let root;
  act(() => {
    root = TestRenderer.create(<RouterSimulator />);
  });
  return root;
}

describe('Router Visual Lab simulator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the controls, counters, routing table and config', () => {
    const root = create();
    expect(hasText(root.root, 'Send a packet')).toBe(true);
    expect(hasText(root.root, 'Routing table — live')).toBe(true);
    expect(hasText(root.root, 'running-config — updates live')).toBe(true);
    expect(hasText(root.root, 'NAT translations (PAT overload)')).toBe(true);
    expect(hasText(root.root, 'Routes in RIB:')).toBe(true);
    expect(hasText(root.root, '10.0.0.0/24')).toBe(true);
    expect(hasText(root.root, '0.0.0.0/0')).toBe(true);
    const conf = root.root.findByType('pre');
    expect(conf.props.children).toContain('ip route 0.0.0.0 0.0.0.0 203.0.113.1');
    act(() => root.unmount());
  });

  it('sending a packet forwards it via the default route and creates a NAT translation', () => {
    const root = create();
    act(() => {
      buttonWithText(root.root, 'Send packet').props.onClick();
    });
    expect(hasText(root.root, 'Forwarded via 203.0.113.1')).toBe(true);
    expect(hasText(root.root, '203.0.113.2:1024')).toBe(true);
    expect(hasText(root.root, 'NAT translations: 1')).toBe(true);
    act(() => root.unmount());
  });

  it('adding a static route changes the routing table and the lookup', () => {
    const root = create();
    act(() => {
      inputWithLabel(root.root, 'Static route destination').props.onChange({ target: { value: '192.0.2.0/24' } });
    });
    act(() => {
      inputWithLabel(root.root, 'Static route next hop').props.onChange({ target: { value: '203.0.113.1' } });
    });
    act(() => {
      buttonWithText(root.root, 'Add static route').props.onClick();
    });
    expect(hasText(root.root, '192.0.2.0/24')).toBe(true);
    expect(hasText(root.root, 'Static route added: 192.0.2.0/24')).toBe(true);
    // The new route now wins the lookup for its network.
    act(() => {
      inputWithLabel(root.root, 'Destination IP').props.onChange({ target: { value: '192.0.2.7' } });
    });
    act(() => {
      buttonWithText(root.root, 'Send packet').props.onClick();
    });
    expect(hasText(root.root, '192.0.2.0/24')).toBe(true);
    act(() => root.unmount());
  });

  it('rejects a static route with a bad destination instead of adding it', () => {
    const root = create();
    act(() => {
      inputWithLabel(root.root, 'Static route destination').props.onChange({ target: { value: 'not-a-network' } });
    });
    act(() => {
      inputWithLabel(root.root, 'Static route next hop').props.onChange({ target: { value: '203.0.113.1' } });
    });
    act(() => {
      buttonWithText(root.root, 'Add static route').props.onClick();
    });
    expect(hasText(root.root, 'must be a network in CIDR form')).toBe(true);
    expect(hasText(root.root, 'not-a-network')).toBe(false);
    act(() => root.unmount());
  });

  it('killing the primary WAN fails over to the AD-200 floating static', () => {
    const root = create();
    expect(hasText(root.root, 'via 203.0.113.1 (AD 1)')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Kill primary WAN (Gi0/1)').props.onClick();
    });
    expect(hasText(root.root, 'via 198.51.100.1 (AD 200)')).toBe(true);
    expect(hasText(root.root, 'Floating static (AD 200)')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Send packet').props.onClick();
    });
    expect(hasText(root.root, 'Forwarded via 198.51.100.1')).toBe(true);
    act(() => root.unmount());
  });

  it('killing the R1–R2 link reconverges OSPF via R3', () => {
    const root = create();
    act(() => {
      buttonWithText(root.root, 'Kill OSPF link R1–R2').props.onClick();
    });
    expect(hasText(root.root, 'OSPF reconverged')).toBe(true);
    expect(hasText(root.root, '10.0.10.3')).toBe(true);
    act(() => root.unmount());
  });

  it('the ACL denies Telnet from the guest VLAN and permits the web', () => {
    const root = create();
    // Switch the source to the guest host and send a Telnet packet.
    act(() => {
      buttonWithText(root.root, '10.0.1.5').props.onClick();
    });
    act(() => {
      inputWithLabel(root.root, 'Destination port').props.onChange({ target: { value: 23 } });
    });
    act(() => {
      buttonWithText(root.root, 'Send packet').props.onClick();
    });
    expect(hasText(root.root, 'Denied by ACL rule 1')).toBe(true);
    // Port 80 from the same guest host is permitted.
    act(() => {
      inputWithLabel(root.root, 'Destination port').props.onChange({ target: { value: 80 } });
    });
    act(() => {
      buttonWithText(root.root, 'Send packet').props.onClick();
    });
    expect(hasText(root.root, 'Forwarded via')).toBe(true);
    act(() => root.unmount());
  });

  it('shows the lab brief, exercises, debrief and check-yourself questions', () => {
    const root = create();
    expect(hasText(root.root, 'Lab brief — the router')).toBe(true);
    expect(hasText(root.root, 'Exercises — in order')).toBe(true);
    expect(hasText(root.root, 'Debrief — what you should have seen')).toBe(true);
    expect(hasText(root.root, 'Check yourself')).toBe(true);
    expect(hasText(root.root, 'floating static')).toBe(true);
    act(() => root.unmount());
  });
});

describe('Router registry', () => {
  it('keeps the router subject as kind blueprint with a simulator renderer', () => {
    const subject = SUBJECTS.find((s) => s.id === 'router');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Networking');
    expect(RENDERERS['router']).toBeDefined();
  });
});
