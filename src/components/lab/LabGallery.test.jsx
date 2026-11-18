import React from 'react';
import { describe, it, expect } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import LabGallery from './LabGallery';
import { SIMULATOR_IDS, displayLabel } from '../../pages/Lab';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const CATEGORIES = ['Hardware', 'Networking', 'Data & Systems'];

// Small fixture: three merged simulators, one plain blueprint, one
// animation, one tool.
const SUBJECTS = [
  { id: 'switch', category: 'Hardware', kind: 'blueprint', label: 'Network Switch Blueprint', blurb: 'Switch.' },
  { id: 'rack-server', category: 'Hardware', kind: 'blueprint', label: 'Rack Server Blueprint', blurb: 'Rack server.' },
  { id: 'osi', category: 'Networking', kind: 'blueprint', label: 'OSI Model Blueprint', blurb: 'OSI.' },
  { id: 'tcp', category: 'Networking', kind: 'anim', label: 'TCP Handshake', blurb: 'TCP.' },
  { id: 'nas', category: 'Data & Systems', kind: 'blueprint', label: 'NAS Storage Blueprint', blurb: 'NAS.' },
  { id: 'subnet', category: 'Networking', kind: 'tool', label: 'Subnet Calculator', blurb: 'Subnet.' },
];

const isSimulator = (id) => ['switch', 'rack-server', 'nas'].includes(id);

function textOf(node) {
  const children = node.props?.children;
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.filter((c) => typeof c === 'string' || typeof c === 'number').join('');
  return '';
}

function cardLabels(renderer) {
  return renderer.root.findAllByType('h3').map((h) => textOf(h).trim());
}

function clickFilter(renderer, label) {
  const match = renderer.root.findAllByType('button').find((b) => textOf(b).trim() === label);
  expect(match, `filter button "${label}"`).toBeDefined();
  act(() => {
    match.props.onClick();
  });
}

// Pills render as a span whose text child is the label.
function tagCount(renderer, tag) {
  return renderer.root.findAll((node) => node.type === 'span' && textOf(node).trim() === tag).length;
}

function renderGallery(props = {}) {
  let root;
  act(() => {
    root = TestRenderer.create(
      <LabGallery subjects={SUBJECTS} categories={CATEGORIES} onSelect={() => {}} isSimulator={isSimulator} displayLabel={displayLabel} {...props} />,
    );
  });
  return root;
}

describe('LabGallery simulator tags + Interactive filter', () => {
  it('tags simulator cards Simulator and leaves the other kinds alone', () => {
    const root = renderGallery();
    expect(cardLabels(root)).toEqual([
      'Network Switch Simulator', 'Rack Server Simulator',
      'OSI Model Blueprint', 'TCP Handshake', 'Subnet Calculator',
      'NAS Storage Simulator',
    ]);
    expect(tagCount(root, 'Simulator')).toBe(3);
    expect(tagCount(root, 'Blueprint')).toBe(1);
    expect(tagCount(root, 'Animated')).toBe(1);
    expect(tagCount(root, 'Interactive')).toBe(1);
    act(() => root.unmount());
  });

  it('the Interactive filter shows simulators and tools, and hides the rest', () => {
    const root = renderGallery();
    clickFilter(root, 'Interactive');
    expect(cardLabels(root)).toEqual([
      'Network Switch Simulator', 'Rack Server Simulator',
      'Subnet Calculator', 'NAS Storage Simulator',
    ]);
    act(() => root.unmount());
  });

  it('the Blueprints filter still shows simulators (their kind stays blueprint)', () => {
    const root = renderGallery();
    clickFilter(root, 'Blueprints');
    expect(cardLabels(root)).toEqual([
      'Network Switch Simulator', 'Rack Server Simulator',
      'OSI Model Blueprint', 'NAS Storage Simulator',
    ]);
    act(() => root.unmount());
  });

  it('without an isSimulator prop, cards fall back to their kind tag', () => {
    let root;
    act(() => {
      root = TestRenderer.create(
        <LabGallery subjects={SUBJECTS} categories={CATEGORIES} onSelect={() => {}} isSimulator={undefined} displayLabel={undefined} />,
      );
    });
    expect(tagCount(root, 'Simulator')).toBe(0);
    expect(tagCount(root, 'Blueprint')).toBe(4);
    // The display-label default is the stored label, so titles stay put too.
    expect(cardLabels(root)).toEqual([
      'Network Switch Blueprint', 'Rack Server Blueprint',
      'OSI Model Blueprint', 'TCP Handshake', 'Subnet Calculator',
      'NAS Storage Blueprint',
    ]);
    act(() => root.unmount());
  });
});

describe('displayLabel (src/pages/Lab.jsx)', () => {
  it('rewrites a simulator title from Blueprint to Simulator', () => {
    expect(displayLabel({ id: 'switch', label: 'Network Switch Blueprint' })).toBe('Network Switch Simulator');
    expect(displayLabel({ id: 'nas', label: 'NAS Storage Blueprint' })).toBe('NAS Storage Simulator');
    expect(displayLabel({ id: 'rack-server', label: 'Rack Server Blueprint' })).toBe('Rack Server Simulator');
    // A pending simulator flips the same way: it already carries the
    // Simulator tag, and its simulator arrives with its PR.
    expect(displayLabel({ id: 'server-rack', label: 'Server Rack Blueprint' })).toBe('Server Rack Simulator');
    expect(displayLabel({ id: 'ups', label: 'UPS Blueprint' })).toBe('UPS Simulator');
  });

  it('leaves non-simulators and titles without a Blueprint suffix alone', () => {
    expect(displayLabel({ id: 'osi', label: 'OSI Model Blueprint' })).toBe('OSI Model Blueprint');
    expect(displayLabel({ id: 'load-balancer', label: 'Load Balancer' })).toBe('Load Balancer');
    expect(displayLabel({ id: 'tcp', label: 'TCP Handshake' })).toBe('TCP Handshake');
  });
});

describe('SIMULATOR_IDS (src/pages/Lab.jsx)', () => {
  it('covers the load balancer and all ten equipment subjects', () => {
    const expected = [
      'load-balancer', 'switch', 'nas', 'rack-server', 'server-rack', 'ups',
      'patch-panel', 'router', 'access-point', 'cloud', 'firewall-3d',
    ];
    for (const id of expected) expect(SIMULATOR_IDS.has(id), `SIMULATOR_IDS has ${id}`).toBe(true);
    expect(SIMULATOR_IDS.size).toBe(expected.length);
  });
});
