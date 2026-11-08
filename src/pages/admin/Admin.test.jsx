import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  AdminLoginForm,
  AccountsTable,
  OverviewView,
  SubscriptionsView,
  AiCallsView,
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
