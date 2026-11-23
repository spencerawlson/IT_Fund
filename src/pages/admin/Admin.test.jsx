import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  AdminLoginForm,
  AccountsTable,
  AddCustomerForm,
  DeleteAccountConfirm,
  EditAccountForm,
  OverviewView,
  ReportView,
  SubscriptionsView,
  AiCallsView,
  isReservedSeat,
} from './Admin';

describe('Admin login form', () => {
  it('renders a password field and a sign-in button', () => {
    const html = renderToString(<AdminLoginForm onSubmit={() => {}} error="" loading={false} />);
    expect(html).toContain('Admin password');
    expect(html).toContain('type="password"');
    expect(html).toContain('Sign in');
  });

  it('shows a generic error without hinting at the cause', () => {
    const html = renderToString(<AdminLoginForm onSubmit={() => {}} error="Invalid password." loading={false} />);
    expect(html).toContain('Invalid password.');
    expect(html).not.toContain('not set');
  });
});

describe('AccountsTable', () => {
  const items = [
    {
      id: 'u1', display_name: 'Alice', email: 'a@example.com',
      created_at: '2026-11-01T10:00:00+00:00', last_active: '2026-11-07T10:00:00+00:00',
      lessons_passed: 3, labs_completed: 1, subscription_status: 'active',
    },
    {
      id: 'u2', display_name: '', email: 'b@example.com',
      created_at: null, last_active: null,
      lessons_passed: 0, labs_completed: 0, subscription_status: 'none',
    },
  ];

  it('renders rows and unknown dates as "unknown"', () => {
    const html = renderToString(
      <AccountsTable items={items} total={2} page={1} pageSize={25} onPage={() => {}} />,
    );
    expect(html).toContain('Alice');
    expect(html).toContain('a@example.com');
    expect(html).toContain('active');
    expect(html).toContain('unknown');
    // renderToString inserts <!-- --> between the interpolated parts.
    expect(html.replace(/<!-- -->/g, '')).toContain('Page 1 of 1');
  });

  it('renders an empty state', () => {
    const html = renderToString(
      <AccountsTable items={[]} total={0} page={1} pageSize={25} onPage={() => {}} />,
    );
    expect(html).toContain('No accounts match.');
  });
});

describe('OverviewView', () => {
  it('shows unknown MRR when Stripe is not configured', () => {
    const html = renderToString(
      <OverviewView data={{ total_users: 4, paying_subscribers: 1, subscriptions_by_status: { active: 1 }, mrr: null, ai_calls_30d: 2, ai_cost_30d_usd: 0.0001 }} />,
    );
    expect(html).toContain('Monthly recurring revenue');
    expect(html).toContain('unknown');
    expect(html).toContain('Stripe is not configured');
  });

  it('shows MRR from the live Stripe price when configured', () => {
    const html = renderToString(
      <OverviewView data={{ total_users: 4, paying_subscribers: 1, subscriptions_by_status: { active: 1 }, mrr: { amount: 19, currency: 'usd', paying_count: 1, price_display: '$19', source: 'Stripe live price' }, ai_calls_30d: 0, ai_cost_30d_usd: 0 }} />,
    );
    expect(html).toContain('$19.00');
    expect(html).toContain('Stripe live price');
  });
});

describe('SubscriptionsView', () => {
  it('renders stored subscription rows', () => {
    const html = renderToString(
      <SubscriptionsView data={{ totals_by_status: { active: 1 }, mrr: null, items: [{ user_id: 'u1', display_name: 'Alice', email: 'a@example.com', status: 'active', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', current_period_end: '2026-12-01T00:00:00+00:00', updated_at: '2026-11-01T00:00:00+00:00' }] }} />,
    );
    expect(html).toContain('Alice');
    expect(html).toContain('active');
    expect(html).toContain('cus_1');
  });
});

describe('AiCallsView', () => {
  const data = {
    days: 30,
    totals: { calls: 1, prompt_tokens: 120, completion_tokens: 8, cost_usd: 0.000023 },
    per_day: [{ day: '2026-11-08', calls: 1, cost_usd: 0.000023 }],
    per_user: [{ user_id: 'u1', display_name: 'Alice', email: 'a@example.com', calls: 1, cost_usd: 0.000023 }],
    total: 1, page: 1, page_size: 25,
    recent: [{ id: 'c1', user_id: 'u1', display_name: 'Alice', email: 'a@example.com', mode: 'explain', model: 'gpt-4o-mini', prompt_tokens: 120, completion_tokens: 8, cost_usd: 0.000023, cached: false, error: false, created_at: '2026-11-08T10:00:00+00:00' }],
  };

  it('states that cost history starts when logging ships', () => {
    const html = renderToString(<AiCallsView data={data} />);
    expect(html).toContain('Cost history starts when call logging ships');
    expect(html).toContain('explain');
    expect(html).toContain('gpt-4o-mini');
  });

  it('shows unknown cost for unlisted models', () => {
    const unknown = { ...data, recent: [{ ...data.recent[0], cost_usd: null, prompt_tokens: null, completion_tokens: null }] };
    const html = renderToString(<AiCallsView data={unknown} />);
    expect(html).toContain('unknown');
  });
});

describe('AccountsTable manual access', () => {
  const items = [
    {
      id: 'u1', display_name: 'Alice', email: 'a@example.com',
      created_at: '2026-11-01T10:00:00+00:00', last_active: null,
      lessons_passed: 0, labs_completed: 0, subscription_status: 'none',
      manual_grant: { active: true, granted_at: '2026-11-16T10:00:00+00:00', note: 'Met at the meetup', revoked_at: null, revoked_note: '' },
    },
    {
      id: 'u2', display_name: 'Bob', email: 'b@example.com',
      created_at: null, last_active: null,
      lessons_passed: 0, labs_completed: 0, subscription_status: 'none',
      manual_grant: null,
    },
  ];

  it('shows grant state and Grant/Revoke actions when handlers are given', () => {
    const html = renderToString(
      <AccountsTable items={items} total={2} page={1} pageSize={25} onPage={() => {}} onGrant={() => {}} onRevoke={() => {}} />,
    );
    expect(html).toContain('Granted');
    expect(html).toContain('Met at the meetup');
    expect(html).toContain('Revoke');
    expect(html).toContain('Grant access');
  });

  it('hides the actions column without handlers (report mode)', () => {
    const html = renderToString(
      <AccountsTable items={items} total={2} page={1} pageSize={25} onPage={() => {}} />,
    );
    expect(html).not.toContain('Grant access');
    expect(html).not.toContain('Revoke');
  });
});

describe('AccountsTable edit and delete', () => {
  const items = [
    {
      id: 'u1', display_name: 'Dummy 1', email: '1@road2cissp.local',
      created_at: '2026-11-16T10:00:00+00:00', last_active: null,
      lessons_passed: 0, labs_completed: 0, subscription_status: 'none',
      manual_grant: { active: true, granted_at: '2026-11-16T10:00:00+00:00', note: 'Reserved seat', revoked_at: null, revoked_note: '' },
    },
    {
      id: 'u2', display_name: 'Alice', email: 'a@example.com',
      created_at: null, last_active: null,
      lessons_passed: 0, labs_completed: 0, subscription_status: 'none',
      manual_grant: null,
    },
  ];

  it('shows Edit and Delete buttons when handlers are given', () => {
    const html = renderToString(
      <AccountsTable items={items} total={2} page={1} pageSize={25} onPage={() => {}} onGrant={() => {}} onRevoke={() => {}} onEdit={() => {}} onDelete={() => {}} />,
    );
    expect(html).toContain('Edit');
    expect(html).toContain('Delete');
    expect(html).toContain('Manage');
  });

  it('hides the Manage column without handlers (report mode)', () => {
    const html = renderToString(
      <AccountsTable items={items} total={2} page={1} pageSize={25} onPage={() => {}} />,
    );
    expect(html).not.toContain('Manage');
    expect(html).not.toContain('>Edit<');
    expect(html).not.toContain('>Delete<');
  });

  it('marks reserved seats and does not ask for confirmation up front', () => {
    const html = renderToString(
      <AccountsTable items={items} total={2} page={1} pageSize={25} onPage={() => {}} onGrant={() => {}} onRevoke={() => {}} onEdit={() => {}} onDelete={() => {}} />,
    );
    expect(html).toContain('Reserved');
    // The delete confirmation ("Delete account") only appears after the
    // row's Delete button is clicked — it must not render, and no API call
    // can happen, before that click.
    expect(html).not.toContain('Delete account');
    expect(html).not.toContain('This cannot be undone');
  });
});

describe('EditAccountForm', () => {
  it('renders prefilled with the account name and email', () => {
    const html = renderToString(
      <EditAccountForm account={{ id: 'u1', display_name: 'Dummy 1', email: '1@road2cissp.local' }} onSubmit={() => {}} onCancel={() => {}} busy={false} error="" />,
    );
    expect(html).toContain('value="Dummy 1"');
    expect(html).toContain('value="1@road2cissp.local"');
    expect(html).toContain('Save changes');
    expect(html).toContain('Cancel');
  });

  it('shows a server error without closing', () => {
    const html = renderToString(
      <EditAccountForm account={{ id: 'u1', display_name: 'Dummy 1', email: '1@road2cissp.local' }} onSubmit={() => {}} onCancel={() => {}} busy={false} error="An account with this email already exists." />,
    );
    expect(html).toContain('An account with this email already exists.');
  });
});

describe('DeleteAccountConfirm', () => {
  it('shows the account name and email and warns before any API call', () => {
    const html = renderToString(
      <DeleteAccountConfirm account={{ id: 'u1', display_name: 'Dummy 1', email: '1@road2cissp.local' }} onConfirm={() => {}} onCancel={() => {}} busy={false} error="" />,
    );
    expect(html).toContain('Dummy 1');
    expect(html).toContain('1@road2cissp.local');
    expect(html).toContain('This removes the account from the board and revokes its manual grant. This cannot be undone.');
    expect(html).toContain('Delete account');
    expect(html).toContain('Cancel');
  });

  it('shows a server error (e.g. live Stripe subscription) and stays open', () => {
    const html = renderToString(
      <DeleteAccountConfirm account={{ id: 'u1', display_name: 'Alice', email: 'a@example.com' }} onConfirm={() => {}} onCancel={() => {}} busy={false} error="This account has an active Stripe subscription. Cancel it in Stripe first, then delete the account." />,
    );
    expect(html).toContain('Cancel it in Stripe first');
  });
});

describe('isReservedSeat', () => {
  it('matches @road2cissp.local case-insensitively and nothing else', () => {
    expect(isReservedSeat('1@road2cissp.local')).toBe(true);
    expect(isReservedSeat('42@ROAD2CISSP.LOCAL')).toBe(true);
    expect(isReservedSeat('a@example.com')).toBe(false);
    expect(isReservedSeat('x@road2cissp.local.evil.com')).toBe(false);
    expect(isReservedSeat(null)).toBe(false);
    expect(isReservedSeat(undefined)).toBe(false);
  });
});

describe('AddCustomerForm', () => {
  it('renders name, email and note fields', () => {
    const html = renderToString(<AddCustomerForm onSubmit={() => {}} busy={false} error="" success="" />);
    expect(html).toContain('Add a customer');
    expect(html).toContain('Name');
    expect(html).toContain('Email');
    expect(html).toContain('Note (optional)');
    expect(html).toContain('Add customer + grant access');
  });
});

describe('OverviewView manual enrollments', () => {
  it('shows the manual enrollment count', () => {
    const html = renderToString(
      <OverviewView data={{ total_users: 4, paying_subscribers: 1, subscriptions_by_status: { active: 1 }, mrr: null, ai_calls_30d: 2, ai_cost_30d_usd: 0.0001, manual_grants_active: 3 }} />,
    );
    expect(html).toContain('Manual enrollments');
    expect(html).toContain('3');
  });

  it('shows real in-person members and the reserved placeholder seats separately', () => {
    // Spencer's @road2cissp.local placeholders hold places but are not
    // members: their own card, never counted as manual enrollments.
    const html = renderToString(
      <OverviewView data={{ total_users: 5003, paying_subscribers: 2, subscriptions_by_status: { active: 2 }, mrr: null, ai_calls_30d: 0, ai_cost_30d_usd: 0, manual_grants_active: 5001, manual_members: 1, reserved_seats: 5000 }} />,
    );
    expect(html).toContain('Manual enrollments');
    expect(html).toContain('Reserved seats');
    expect(html).toContain('5000');
    expect(html).not.toContain('5001');
    expect(html).toContain('not members, never revenue');
  });

  it('shows no reserved-seats card when there are none', () => {
    const html = renderToString(
      <OverviewView data={{ total_users: 4, paying_subscribers: 1, subscriptions_by_status: { active: 1 }, mrr: null, ai_calls_30d: 0, ai_cost_30d_usd: 0, manual_grants_active: 1, manual_members: 1, reserved_seats: 0 }} />,
    );
    expect(html).not.toContain('Reserved seats');
  });
});

describe('ReportView', () => {
  const data = {
    generated_at: '2026-11-16T10:00:00+00:00',
    days: 30,
    overview: { total_users: 1, paying_subscribers: 0, subscriptions_by_status: {}, manual_grants_active: 1, mrr: null, ai_calls_30d: 0, ai_cost_30d_usd: 0 },
    accounts: {
      total: 1,
      items: [{
        id: 'u1', display_name: 'Alice', email: 'a@example.com',
        created_at: '2026-11-01T10:00:00+00:00', last_active: null,
        lessons_passed: 0, labs_completed: 0, subscription_status: 'none',
        manual_grant: { active: true, granted_at: '2026-11-16T10:00:00+00:00', note: '', revoked_at: null, revoked_note: '' },
      }],
      truncated: false,
    },
    subscriptions: { totals_by_status: {}, mrr: null, items: [] },
    ai_costs: { days: 30, totals: { calls: 0, prompt_tokens: 0, completion_tokens: 0, cost_usd: 0 }, per_day: [], per_user: [], total: 0, page: 1, page_size: 100, recent: [] },
  };

  it('renders the report with print and CSV actions', () => {
    const html = renderToString(<ReportView data={data} onDownloadCsv={() => {}} />);
    expect(html).toContain('Report generated');
    expect(html).toContain('Print');
    expect(html).toContain('Download CSV');
    expect(html).toContain('Alice');
    expect(html).toContain('Manual enrollments');
  });
});
