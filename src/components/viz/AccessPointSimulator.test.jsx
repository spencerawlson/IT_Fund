import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import AccessPointSimulator from './AccessPointSimulator';
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
    root = TestRenderer.create(<AccessPointSimulator />);
  });
  return root;
}

describe('Access Point Visual Lab subject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is registered as the access-point renderer and keeps kind blueprint', () => {
    const subject = SUBJECTS.find((s) => s.id === 'access-point');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('Networking');
    expect(RENDERERS['access-point']).toBeDefined();
    expect(typeof RENDERERS['access-point']).toBe('function');
    let rendered;
    act(() => {
      rendered = TestRenderer.create(React.createElement(RENDERERS['access-point']));
    });
    expect(hasText(rendered.root, 'Band & standard')).toBe(true);
    act(() => rendered.unmount());
  });

  it('renders the one-screen simulator: controls, counters, floor plan, clients, AP visual, config', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Band & standard')).toBe(true);
    expect(hasText(root.root, 'Channel plan — 3 floor APs')).toBe(true);
    expect(hasText(root.root, 'Security')).toBe(true);
    expect(hasText(root.root, 'PoE power')).toBe(true);
    expect(hasText(root.root, 'Run evil-twin attack')).toBe(true);
    expect(hasText(root.root, 'Floor plan')).toBe(true);
    expect(hasText(root.root, 'Clients — position along the corridor')).toBe(true);
    expect(hasText(root.root, 'Ceiling AP — 4x4 MIMO')).toBe(true);
    expect(hasText(root.root, 'Site survey — neighbours')).toBe(true);
    expect(hasText(root.root, 'AP config — updates live')).toBe(true);
    expect(hasText(root.root, 'Event log')).toBe(true);
    expect(hasText(root.root, 'Lab brief — the wireless access point')).toBe(true);
    expect(hasText(root.root, 'Exercises — in order')).toBe(true);
    expect(hasText(root.root, 'Debrief — what you should have seen')).toBe(true);
    expect(configText(root.root)).toContain('ssid=R2C-WiFi');
    expect(configText(root.root)).toContain('channel=1');
    act(() => root.unmount());
  });

  it('starts on the clean 1-6-11 plan: 0% plan interference, 54 Mbps on 802.11g', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Plan 1 · 6 · 11 — 0% interference · 54 Mbps')).toBe(true);
    expect(hasText(root.root, '5 / 5')).toBe(true);
    act(() => root.unmount());
  });

  it('moving AP-1 onto channel 3 raises the interference reading', () => {
    const root = renderSimulator();
    expect(hasText(root.root, '66%')).toBe(true);
    act(() => {
      selectByLabel(root.root, 'AP-1 channel').props.onChange({ target: { value: '3' } });
    });
    // AP-1 now sits on the café's channel: worst interference climbs to 99%
    // (75% neighbour + 24% plan overlap).
    expect(hasText(root.root, '99%')).toBe(true);
    // The plan is no longer clean either: 3 overlaps 6.
    expect(hasText(root.root, 'Plan 3 · 6 · 11 — 24% interference · 42 Mbps')).toBe(true);
    expect(configText(root.root)).toContain('channel=3');
    act(() => root.unmount());
  });

  it('putting all three APs on channel 6 collapses the plan to 100% / 5 Mbps', () => {
    const root = renderSimulator();
    act(() => {
      selectByLabel(root.root, 'AP-1 channel').props.onChange({ target: { value: '6' } });
    });
    act(() => {
      selectByLabel(root.root, 'AP-3 channel').props.onChange({ target: { value: '6' } });
    });
    expect(hasText(root.root, 'Plan 6 · 6 · 6 — 100% interference · 5 Mbps')).toBe(true);
    act(() => root.unmount());
  });

  it('switching to 5 GHz channel 40 clears the interference', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, '5 GHz').props.onClick();
    });
    act(() => {
      selectByLabel(root.root, 'AP-1 channel').props.onChange({ target: { value: '40' } });
    });
    expect(hasText(root.root, 'Plan 40 · 44 · 149 — 0% interference')).toBe(true);
    expect(configText(root.root)).toContain('channel=40');
    act(() => root.unmount());
  });

  it('dragging Phone-B toward AP-2 makes it roam, and the log records the move', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Phone-B roamed')).toBe(false);
    act(() => {
      inputByLabel(root.root, 'Phone-B position').props.onChange({ target: { value: '24' } });
    });
    expect(hasText(root.root, 'Phone-B roamed AP-1 → AP-2')).toBe(true);
    expect(hasText(root.root, 'the client decided')).toBe(true);
    act(() => root.unmount());
  });

  it('the evil twin is blocked on WPA3-Personal and steals 3 clients on WEP', () => {
    const root = renderSimulator();
    act(() => {
      buttonWithText(root.root, 'Run evil-twin attack').props.onClick();
    });
    expect(hasText(root.root, 'Evil twin blocked')).toBe(true);
    expect(hasText(root.root, '5 / 5')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'End evil-twin attack').props.onClick();
      selectByLabel(root.root, 'Security mode').props.onChange({ target: { value: 'wep' } });
    });
    act(() => {
      buttonWithText(root.root, 'Run evil-twin attack').props.onClick();
    });
    expect(hasText(root.root, 'Evil twin active')).toBe(true);
    expect(hasText(root.root, 'stole 3 clients')).toBe(true);
    expect(hasText(root.root, '2 / 5')).toBe(true);
    expect(hasText(root.root, 'Stolen by twin')).toBe(true);
    act(() => root.unmount());
  });

  it('a legacy 802.11b client caps the plan at 11 Mbps', () => {
    const root = renderSimulator();
    expect(hasText(root.root, '0% interference · 54 Mbps')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Legacy 802.11b off').props.onClick();
    });
    expect(hasText(root.root, '0% interference · 11 Mbps')).toBe(true);
    expect(hasText(root.root, 'drags the whole cell to 11 Mbps')).toBe(true);
    act(() => root.unmount());
  });

  it('802.3af cannot feed the 25 W AP — throughput halves until PoE+ is restored', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Under-powered AP')).toBe(false);
    act(() => {
      selectByLabel(root.root, 'PoE power').props.onChange({ target: { value: 'af' } });
    });
    expect(hasText(root.root, 'Under-powered AP')).toBe(true);
    expect(hasText(root.root, 'cannot feed a')).toBe(true);
    expect(hasText(root.root, '0% interference · 27 Mbps')).toBe(true);
    expect(configText(root.root)).toContain('UNDER-POWERED');
    act(() => {
      selectByLabel(root.root, 'PoE power').props.onChange({ target: { value: 'at' } });
    });
    expect(hasText(root.root, 'Under-powered AP')).toBe(false);
    expect(hasText(root.root, '0% interference · 54 Mbps')).toBe(true);
    act(() => root.unmount());
  });

  it('hiding the SSID says plainly that it is not security', () => {
    const root = renderSimulator();
    expect(configText(root.root)).toContain('ignore_broadcast_ssid=0');
    expect(configText(root.root)).not.toContain('NOT security');
    act(() => {
      buttonWithText(root.root, 'SSID broadcast on').props.onClick();
    });
    expect(hasText(root.root, 'Hidden SSID is NOT security')).toBe(true);
    expect(configText(root.root)).toContain('ignore_broadcast_ssid=1');
    act(() => root.unmount());
  });

  it('802.1X authenticates on WPA3-Enterprise and the config shows it', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Authenticate client')).toBe(false);
    act(() => {
      selectByLabel(root.root, 'Security mode').props.onChange({ target: { value: 'wpa3-enterprise' } });
    });
    expect(hasText(root.root, 'Authenticate client')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Authenticate client').props.onClick();
    });
    expect(hasText(root.root, 'Access-Accept')).toBe(true);
    expect(configText(root.root)).toContain('ieee8021x=1');
    expect(configText(root.root)).toContain('wpa_key_mgmt=WPA-EAP');
    act(() => root.unmount());
  });

  it('check-yourself answers reveal on tap', () => {
    const root = renderSimulator();
    expect(hasText(root.root, '22 MHz wide')).toBe(false);
    act(() => {
      buttonWithText(root.root, 'Reveal answer').props.onClick();
    });
    expect(hasText(root.root, '22 MHz wide')).toBe(true);
    act(() => root.unmount());
  });

  it('reset restores the clean plan, the clients and the counters', () => {
    const root = renderSimulator();
    act(() => {
      selectByLabel(root.root, 'Security mode').props.onChange({ target: { value: 'wep' } });
    });
    act(() => {
      buttonWithText(root.root, 'Run evil-twin attack').props.onClick();
    });
    expect(hasText(root.root, '2 / 5')).toBe(true);
    act(() => {
      buttonWithText(root.root, 'Reset').props.onClick();
    });
    expect(hasText(root.root, 'Evil twin active')).toBe(false);
    expect(hasText(root.root, '5 / 5')).toBe(true);
    expect(hasText(root.root, 'Plan 1 · 6 · 11 — 0% interference · 54 Mbps')).toBe(true);
    act(() => root.unmount());
  });
});
