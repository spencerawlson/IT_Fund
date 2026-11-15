import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import CypherNote from './CypherNote';

describe('CypherNote', () => {
  it('renders the pointing Cypher and the note', () => {
    const html = renderToString(<CypherNote text="A camera is detective, not preventive." />);
    expect(html).toContain('aria-label="Cypher the study mascot"');
    expect(html).toContain('mascot-point');
    expect(html).toContain('cypher-mascot-point-right.jpg');
    expect(html).toContain('Cypher points out');
    expect(html).toContain('A camera is detective, not preventive.');
  });

  it('renders nothing without a note', () => {
    expect(renderToString(<CypherNote text={null} />)).toBe('');
    expect(renderToString(<CypherNote text="" />)).toBe('');
  });
});
