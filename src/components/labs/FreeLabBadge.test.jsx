import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FreeLabBadge } from './FreeLabBadge';

describe('FreeLabBadge', () => {
  it('says Free and No plan needed, in Spencer\u2019s words', () => {
    const html = renderToString(<FreeLabBadge />);
    expect(html).toContain('Free');
    expect(html).toContain('No plan needed');
  });
});
