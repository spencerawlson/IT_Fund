import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import LabUsageMeter, { formatHours } from './LabUsageMeter';

const metered = (overrides = {}) => ({
  metered: true,
  usedSeconds: 26400, // 7h 20m
  allowanceSeconds: 72000, // 20h
  overageSeconds: 0,
  liveSeconds: 0,
  resetsAt: '2026-04-17T12:00:00', // local-noon: always Apr 17 in any TZ
  ...overrides,
});

const html = (usage, props = {}) => renderToString(<LabUsageMeter usage={usage} {...props} />);
// SSR escapes apostrophes (You're -> You&#x27;re); normalize so the
// assertions read the copy as a learner sees it.
const clean = (s) => s.replace(/&#x27;/g, "'").replace(/<!-- -->/g, '');

describe('formatHours', () => {
  it('formats seconds as "Xh YYm", flooring minutes', () => {
    expect(formatHours(0)).toBe('0h 00m');
    expect(formatHours(3600)).toBe('1h 00m');
    expect(formatHours(26400)).toBe('7h 20m');
    expect(formatHours(54000)).toBe('15h 00m');
    expect(formatHours(72600)).toBe('20h 10m');
    expect(formatHours(89)).toBe('0h 01m');
  });
});

describe('LabUsageMeter (Phase 0)', () => {
  it('renders used / allowance / reset date with a progress bar', () => {
    const out = html(metered());
    expect(out).toContain('7h 20m');
    expect(out).toContain('of 20h included');
    expect(out).toContain('resets Apr 17');
    // 26400 / 72000 = 36.67% -> 37
    expect(out).toContain('aria-valuenow="37"');
    expect(out).not.toContain("You're at");
  });

  it('warns at 15h ("You\'re at Xh of your 20 included Docker lab-hours")', () => {
    const out = clean(html(metered({ usedSeconds: 54000 })));
    expect(out).toContain("You're at 15h 00m of your 20 included Docker lab-hours.");
    expect(out).not.toContain('left this period');
    expect(out).not.toContain('over your included 20h');
  });

  it('warns more strongly at 18h, with the time left', () => {
    const out = clean(html(metered({ usedSeconds: 64800 })));
    expect(out).toContain("You're at 18h 00m of your 20 included Docker lab-hours");
    expect(out).toContain('only 2h 00m left this period');
    expect(out).not.toContain('over your included 20h');
  });

  it('at exactly 20h shows the over-age line with 0h over', () => {
    const out = clean(html(metered({ usedSeconds: 72000 })));
    expect(out).toContain('0h 00m over your included 20h');
    expect(out).toContain("overage billing isn't live yet; this is a preview of your usage.");
  });

  it('past 20h shows the over-age line and caps the bar at 100%', () => {
    const out = clean(html(metered({ usedSeconds: 75600, overageSeconds: 3600 })));
    expect(out).toContain('1h 00m over your included 20h');
    expect(out).toContain("overage billing isn't live yet; this is a preview of your usage.");
    expect(out).toContain('aria-valuenow="100"');
  });

  it('never renders money, "billed", or invoice language — even over the allowance', () => {
    const out = clean(html(metered({ usedSeconds: 90000, overageSeconds: 18000 })));
    expect(out).not.toContain('$');
    expect(out).not.toContain('billed');
    expect(out).not.toContain('invoice');
    expect(out).not.toContain('charged');
    expect(out).not.toContain('/hr');
  });

  it('omits the reset date when resets_at is null', () => {
    const out = html(metered({ resetsAt: null }));
    expect(out).toContain('7h 20m');
    expect(out).not.toContain('resets');
  });

  it('null usage renders a muted "Lab usage unavailable" line, never a crash', () => {
    const out = html(null);
    expect(out).toContain('Lab usage unavailable');
    expect(out).not.toContain('of 20h included');
  });

  it('still-loading usage (undefined) renders nothing', () => {
    expect(html(undefined)).toBe('');
  });

  it('unmetered usage (free tier / guest) renders nothing', () => {
    expect(html({ ...metered(), metered: false })).toBe('');
  });

  it('compact renders the same meter line', () => {
    const out = html(metered(), { compact: true });
    expect(out).toContain('7h 20m');
    expect(out).toContain('of 20h included');
    expect(out).toContain('resets Apr 17');
  });
});
