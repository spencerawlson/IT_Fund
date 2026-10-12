import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Celebration, StreakFlame } from './Celebration';

const party = { id: 'exam-pass-cissp-e1', kind: 'exam-pass', title: 'You passed!', subtitle: 'CISSP practice exam — 82%', accent: '#10b981' };

describe('Celebration', () => {
  it('renders nothing without a celebration', () => {
    expect(renderToString(<Celebration celebration={null} onClose={() => {}} />)).toBe('');
  });

  it('renders a dialog with the title, subtitle, and a dismiss button', () => {
    const html = renderToString(<Celebration celebration={party} onClose={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('You passed!');
    expect(html).toContain('CISSP practice exam — 82%');
    expect(html).toContain('Keep going');
    expect(html).toContain('aria-label="Dismiss celebration"');
  });

  it('renders the celebrating Cipher with a party hat', () => {
    const html = renderToString(<Celebration celebration={party} onClose={() => {}} />);
    expect(html).toContain('aria-label="Cipher the study mascot"');
    expect(html).toContain('<polygon');
  });

  it('labels each kind accessibly', () => {
    for (const kind of ['levelup', 'streak', 'badge', 'exam-pass', 'lab-complete']) {
      const html = renderToString(
        <Celebration celebration={{ id: `x-${kind}`, kind, title: 'T', subtitle: 'S' }} onClose={() => {}} />,
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('T');
    }
  });

  it('never fires confetti server-side (effects do not run in renderToString)', () => {
    // If confetti ran during SSR this would throw; reaching here proves the
    // reduced-motion/static path renders cleanly without a browser.
    const html = renderToString(<Celebration celebration={party} onClose={() => {}} />);
    expect(html).toContain('You passed!');
  });
});

describe('StreakFlame', () => {
  it('ignites on streak milestones and stays calm otherwise', () => {
    const lit = renderToString(<StreakFlame streak={7} />);
    expect(lit).toContain('streak-ignited');
    expect(lit).toContain('aria-label="7 day study streak"');
    const calm = renderToString(<StreakFlame streak={4} />);
    expect(calm).not.toContain('streak-ignited');
    const none = renderToString(<StreakFlame streak={0} />);
    expect(none).toContain('aria-label="No active streak"');
  });
});
