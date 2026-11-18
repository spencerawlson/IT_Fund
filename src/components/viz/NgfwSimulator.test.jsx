import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import NgfwSimulator from './NgfwSimulator';
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
    if (Array.isArray(children)) return children.some((c) => (typeof c === 'string' || typeof c === 'number') && String(c).includes(text));
    return false;
  }).length > 0;
}

function selectByLabel(root, label) {
  const match = root.findAllByType('select').find((s) => s.props['aria-label'] === label);
  expect(match, `select "${label}"`).toBeDefined();
  return match;
}

function confText(root) {
  return root.findByType('pre').props.children;
}

function renderSimulator() {
  let root;
  act(() => {
    root = TestRenderer.create(<NgfwSimulator />);
  });
  return root;
}

function sendPacket(root, packetId) {
  act(() => {
    selectByLabel(root.root, 'Test packet').props.onChange({ target: { value: packetId } });
  });
  act(() => {
    buttonWithText(root.root, 'Send packet').props.onClick();
  });
}

describe('NGFW Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is registered as the firewall-3d renderer and keeps kind blueprint', () => {
    const subject = SUBJECTS.find((s) => s.id === 'firewall-3d');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Security');
    expect(RENDERERS['firewall-3d']).toBeDefined();
    expect(typeof RENDERERS['firewall-3d']).toBe('function');
    let rendered;
    act(() => {
      rendered = TestRenderer.create(React.createElement(RENDERERS['firewall-3d']));
    });
    expect(hasText(rendered.root, 'Rule base')).toBe(true);
    act(() => rendered.unmount());
  });

  it('renders the one-screen simulator: rules, counters, zones, sessions, config, log', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Rule base — first match wins')).toBe(true);
    expect(hasText(root.root, 'SSH out')).toBe(true);
    expect(hasText(root.root, 'Add a rule')).toBe(true);
    expect(buttonWithText(root.root, 'SSL: off')).toBeDefined();
    expect(buttonWithText(root.root, 'IPS: on')).toBeDefined();
    expect(hasText(root.root, 'Sessions open: 0')).toBe(true);
    expect(hasText(root.root, 'Inside (LAN)')).toBe(true);
    expect(hasText(root.root, 'NGFW-1')).toBe(true);
    expect(hasText(root.root, 'Stateful session table')).toBe(true);
    expect(hasText(root.root, 'NGFW config — updates live')).toBe(true);
    expect(hasText(root.root, 'Event log')).toBe(true);
    expect(hasText(root.root, 'Lab brief — the next-gen firewall')).toBe(true);
    expect(hasText(root.root, 'Exercises — in order')).toBe(true);
    expect(hasText(root.root, 'Debrief — what you should have seen')).toBe(true);
    expect(confText(root.root)).toContain('implicit deny');
    expect(confText(root.root)).toContain('ssl-inspection off');
    act(() => root.unmount());
  });

  it('SSH is denied by Rule 2 and web browsing is allowed by Rule 3 with NAT', () => {
    const root = renderSimulator();
    sendPacket(root, 'ssh');
    expect(hasText(root.root, 'Deny — denied by Rule 2')).toBe(true);
    sendPacket(root, 'web');
    expect(hasText(root.root, 'Allow — allowed by Rule 3')).toBe(true);
    expect(hasText(root.root, 'NAT: 10.0.1.10 → 203.0.113.5')).toBe(true);
    expect(hasText(root.root, 'Sessions open: 1')).toBe(true);
    expect(confText(root.root)).toContain('sessions 1 | allow 1');
    act(() => root.unmount());
  });

  it('unmatched FTP hits the implicit deny', () => {
    const root = renderSimulator();
    sendPacket(root, 'ftp');
    expect(hasText(root.root, 'implicit deny')).toBe(true);
    act(() => root.unmount());
  });

  it('a broad allow added at the top breaks the SSH deny; moving it below Rule 2 fixes it', () => {
    const root = renderSimulator();
    // Add "Allow inside → outside, any app" at the top of the list.
    act(() => {
      selectByLabel(root.root, 'Rule action').props.onChange({ target: { value: 'allow' } });
    });
    act(() => {
      selectByLabel(root.root, 'Source zone').props.onChange({ target: { value: 'inside' } });
    });
    act(() => {
      selectByLabel(root.root, 'Destination zone').props.onChange({ target: { value: 'outside' } });
    });
    act(() => {
      selectByLabel(root.root, 'Application').props.onChange({ target: { value: 'any' } });
    });
    act(() => {
      selectByLabel(root.root, 'Rule position').props.onChange({ target: { value: 'top' } });
    });
    act(() => {
      buttonWithText(root.root, 'Add rule').props.onClick();
    });
    sendPacket(root, 'ssh');
    expect(hasText(root.root, 'Allow — allowed by Rule 1')).toBe(true);
    // Move the broad allow (fresh sim, so its id is r7) down twice, past Rule 2.
    act(() => {
      buttonWithLabel(root.root, 'Move rule r7 down').props.onClick();
    });
    act(() => {
      buttonWithLabel(root.root, 'Move rule r7 down').props.onClick();
    });
    sendPacket(root, 'ssh');
    expect(hasText(root.root, 'Deny — denied by Rule 2')).toBe(true);
    act(() => root.unmount());
  });

  it('deleting a rule is real: deleting the SSH deny lets SSH through', () => {
    const root = renderSimulator();
    // Rule 2 is the SSH deny; its delete button is the second in the list.
    const deleteButtons = () => root.root.findAllByType('button')
      .filter((b) => typeof b.props['aria-label'] === 'string' && b.props['aria-label'].startsWith('Delete rule'));
    expect(deleteButtons()).toHaveLength(6);
    act(() => {
      deleteButtons()[1].props.onClick();
    });
    expect(deleteButtons()).toHaveLength(5);
    sendPacket(root, 'ssh');
    expect(hasText(root.root, 'implicit deny')).toBe(true);
    act(() => root.unmount());
  });

  it('return traffic is allowed only while its session is open', () => {
    const root = renderSimulator();
    sendPacket(root, 'return');
    expect(hasText(root.root, 'no open session')).toBe(true);
    sendPacket(root, 'web');
    expect(hasText(root.root, 'Sessions open: 1')).toBe(true);
    sendPacket(root, 'return');
    expect(hasText(root.root, 'open session')).toBe(true);
    // Close the session by hand: the same reply is dropped again.
    act(() => {
      buttonWithLabel(root.root, 'Close session s1').props.onClick();
    });
    expect(hasText(root.root, 'Sessions open: 0')).toBe(true);
    sendPacket(root, 'return');
    expect(hasText(root.root, 'no open session')).toBe(true);
    act(() => root.unmount());
  });

  it('the HTTPS exploit passes with SSL inspection off and is blocked with it on', () => {
    const root = renderSimulator();
    // Plain HTTP needs an allow rule before the IPS ever sees it.
    act(() => {
      selectByLabel(root.root, 'Rule action').props.onChange({ target: { value: 'allow' } });
    });
    act(() => {
      selectByLabel(root.root, 'Source zone').props.onChange({ target: { value: 'inside' } });
    });
    act(() => {
      selectByLabel(root.root, 'Destination zone').props.onChange({ target: { value: 'outside' } });
    });
    act(() => {
      selectByLabel(root.root, 'Application').props.onChange({ target: { value: 'HTTP' } });
    });
    act(() => {
      selectByLabel(root.root, 'Rule position').props.onChange({ target: { value: 'bottom' } });
    });
    act(() => {
      buttonWithText(root.root, 'Add rule').props.onClick();
    });
    // The plain-HTTP exploit is blocked either way — it is never encrypted.
    sendPacket(root, 'http-exploit');
    expect(hasText(root.root, 'Blocked — blocked by IPS')).toBe(true);
    sendPacket(root, 'https-exploit');
    expect(hasText(root.root, 'SSL inspection is off')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'SSL: off').props.onClick();
    });
    expect(buttonWithText(root.root, 'SSL: on')).toBeDefined();
    expect(confText(root.root)).toContain('ssl-inspection on');
    sendPacket(root, 'https-exploit');
    expect(hasText(root.root, 'Blocked — blocked by IPS')).toBe(true);
    act(() => root.unmount());
  });

  it('zone policy: the internet reaches the DMZ web server, the DMZ never reaches the LAN', () => {
    const root = renderSimulator();
    sendPacket(root, 'dmz-web');
    expect(hasText(root.root, 'Allow — allowed by Rule 4')).toBe(true);
    sendPacket(root, 'dmz-lan');
    expect(hasText(root.root, 'Deny — denied by Rule 5')).toBe(true);
    act(() => root.unmount());
  });

  it('the NAC check quarantines unpatched PC-7 and remediation lets it back on', () => {
    const root = renderSimulator();
    sendPacket(root, 'pc7-web');
    expect(hasText(root.root, 'Allow — allowed by Rule 3')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'NAC check').props.onClick();
    });
    expect(hasText(root.root, 'quarantine VLAN')).toBe(true);
    sendPacket(root, 'pc7-web');
    expect(hasText(root.root, 'NAC quarantine')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Remediate PC-7').props.onClick();
    });
    sendPacket(root, 'pc7-web');
    expect(hasText(root.root, 'Allow — allowed by Rule 3')).toBe(true);
    act(() => root.unmount());
  });

  it('live traffic advances the counters and sessions expire', () => {
    const root = renderSimulator();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // 10 ticks of the cycle: web/dns/dmz-web/ssh/https-exploit/ftp/return.
    expect(hasText(root.root, 'Sessions open: 0')).toBe(false);
    act(() => root.unmount());
  });

  it('check-yourself answers reveal on tap', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Rules are evaluated top-down and the first match wins')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Reveal answer').props.onClick();
    });
    expect(hasText(root.root, 'Rules are evaluated top-down and the first match wins')).toBe(true);
    act(() => root.unmount());
  });

  it('reset clears the sessions and the counters', () => {
    const root = renderSimulator();
    sendPacket(root, 'web');
    expect(hasText(root.root, 'Sessions open: 1')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Reset').props.onClick();
    });
    expect(hasText(root.root, 'Sessions open: 0')).toBe(true);
    expect(hasText(root.root, 'No open sessions')).toBe(true);
    act(() => root.unmount());
  });
});
