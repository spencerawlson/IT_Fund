import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import LessonBlueprint from './LessonBlueprint';

describe('LessonBlueprint', () => {
  it('renders the sheet lazily, full width, with its caption', () => {
    const html = renderToString(
      <LessonBlueprint
        src="/blueprint-network-switch-48-port.jpg"
        alt="Managed 48-port switch blueprint"
        caption="Managed Network Switch (48-Port) — full technical blueprint."
      />,
    );
    expect(html).toContain('src="/blueprint-network-switch-48-port.jpg"');
    expect(html).toContain('alt="Managed 48-port switch blueprint"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('Managed Network Switch (48-Port)');
    expect(html).toContain('<figure');
    expect(html).toContain('<figcaption');
  });

  it('renders no caption element without a caption', () => {
    const html = renderToString(
      <LessonBlueprint src="/blueprint-network-switch-48-port.jpg" alt="Switch blueprint" />,
    );
    expect(html).toContain('<figure');
    expect(html).not.toContain('<figcaption');
  });
});
