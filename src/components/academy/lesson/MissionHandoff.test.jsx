import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import MissionHandoff, { missionCtaLabel, handoffInviteLine } from './MissionHandoff';

// SSR: effects (attempt history, analytics) do not run, so the handoff
// renders its first paint — Cypher's lines, the Listen control, and the
// one mission button — without any network.
function renderHandoff(props) {
  return renderToString(
    <StaticRouter location="/academy/network/lesson/net-security">
      <MissionHandoff missionId="op-broken-shield" lessonId="net-security" {...props} />
    </StaticRouter>,
  );
}

describe('MissionHandoff', () => {
  it('speaks the congratulations + invite sequence with one Start Mission button', () => {
    const html = renderHandoff();
    expect(html).toContain('Congratulations, you finished — you know the drill.');
    expect(html).toContain('Now that you know about this lesson, we have a mission for you.');
    expect(html).toContain('You can click on the Start Mission button to start the mission and put what you learned in practice.');
    expect(html).toContain('Start Mission');
    expect(html).toContain('/missions/op-broken-shield');
    expect(html).toContain('Hear Cipher say it');
  });

  it('is a spoken handoff, not a written briefing block — no Sentinel, no briefing copy', () => {
    const html = renderHandoff();
    expect(html).not.toContain('Sentinel');
    expect(html).not.toContain('Mission briefing');
    expect(html).not.toContain('Mission Briefing');
    expect(html).not.toContain('Excellent work, Agent');
  });

  it('shows no manipulation hint on the Cypher viewer', () => {
    const html = renderHandoff();
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });
});

describe('missionCtaLabel', () => {
  it('is one CTA per state, never two at once', () => {
    expect(missionCtaLabel({ completed: false, hasAttempt: false })).toBe('Start Mission');
    expect(missionCtaLabel({ completed: false, hasAttempt: true })).toBe('Continue Mission');
    expect(missionCtaLabel({ completed: true, hasAttempt: true })).toBe('Replay the mission');
  });
});

describe('handoffInviteLine', () => {
  it('names the button the student actually sees', () => {
    expect(handoffInviteLine('Start Mission')).toContain('Start Mission button to start the mission');
    expect(handoffInviteLine('Continue Mission')).toContain('Continue Mission button to pick up the mission');
    expect(handoffInviteLine('Replay the mission')).toContain('Replay the mission button to run the mission again');
  });
});
