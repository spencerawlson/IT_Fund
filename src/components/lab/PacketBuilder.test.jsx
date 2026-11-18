import React from 'react';
import { describe, it, expect } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import PacketBuilder from './PacketBuilder';
import { DNS_QTYPES } from '../../lib/packetBuilder';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('PacketBuilder', () => {
  // Regression: the DNS record-type list is an array of { value, label };
  // reading it as a { code: name } map rendered objects as <option> text
  // and crashed the whole panel (React error #31) on the Visual Lab.
  it('renders the DNS tab with one readable option per record type', () => {
    let r;
    act(() => { r = TestRenderer.create(<PacketBuilder />); });
    const options = r.root.findAllByType('option');
    expect(options).toHaveLength(DNS_QTYPES.length);
    expect(options[0].props.value).toBe(1);
    expect(options[0].children.join('')).toBe('A — IPv4 address (1)');
    for (const o of options) {
      for (const c of o.children) expect(typeof c).not.toBe('object');
    }
  });

  it('renders every tab without crashing', () => {
    let r;
    act(() => { r = TestRenderer.create(<PacketBuilder />); });
    for (const tab of r.root.findAll((n) => n.props?.role === 'tab')) {
      act(() => tab.props.onClick());
      expect(r.root.findAllByType('pre').length).toBe(1);
    }
  });
});
