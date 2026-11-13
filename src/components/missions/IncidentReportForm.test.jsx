import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import IncidentReportForm, { reportIsComplete } from './IncidentReportForm';

describe('reportIsComplete', () => {
  it('requires all three fields', () => {
    expect(reportIsComplete({})).toBe(false);
    expect(reportIsComplete({ summary: 's', root_cause: 'c', fix: '' })).toBe(false);
    expect(reportIsComplete({ summary: 's', root_cause: 'c', fix: 'f' })).toBe(true);
    expect(reportIsComplete({ summary: '  ', root_cause: 'c', fix: 'f' })).toBe(false);
  });
});

describe('IncidentReportForm', () => {
  it('renders the three fields and the submit button (SSR smoke)', () => {
    const html = renderToString(
      <IncidentReportForm initial={{}} onSubmit={async () => {}} canSubmit />,
    );
    expect(html).toContain('What happened?');
    expect(html).toContain('Root cause');
    expect(html).toContain('The fix');
    expect(html).toContain('File incident report');
  });

  it('hints that other objectives come first when the gate is closed', () => {
    const html = renderToString(
      <IncidentReportForm initial={{}} onSubmit={async () => {}} canSubmit={false} />,
    );
    expect(html).toContain('Finish the other objectives first');
  });

  it('pre-fills saved report fields', () => {
    const html = renderToString(
      <IncidentReportForm
        initial={{ summary: 'Guest reached SRV', root_cause: 'No ACL', fix: 'ACL 10' }}
        onSubmit={async () => {}}
        canSubmit
      />,
    );
    expect(html).toContain('Guest reached SRV');
    expect(html).toContain('No ACL');
    expect(html).toContain('ACL 10');
  });
});
