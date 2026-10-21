import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import CipherNote from './CipherNote';

describe('CipherNote', () => {
  it('renders the pointing Cipher and the note', () => {
    const html = renderToString(<CipherNote text="A camera is detective, not preventive." />);
    expect(html).toContain('aria-label="Cipher the study mascot"');
    expect(html).toContain('mascot-point');
    expect(html).toContain('cipher-mascot-presenting.jpg');
    expect(html).toContain('Cipher points out');
    expect(html).toContain('A camera is detective, not preventive.');
  });

  it('renders nothing without a note', () => {
    expect(renderToString(<CipherNote text={null} />)).toBe('');
    expect(renderToString(<CipherNote text="" />)).toBe('');
  });
});
