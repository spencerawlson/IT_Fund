import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';

// The account page's subscription card for a signed-in free user: the
// subscribe action is a Stripe checkout started from this page, not a link
// to /pricing. The real hook fetches /api/billing/status in an effect (never
// runs under SSR), so it is mocked to the resolved free state.
vi.mock('@/lib/subscription', () => ({
  useSubscription: () => ({
    subscribed: false,
    status: 'none',
    currentPeriodEnd: null,
    loading: false,
    refresh: () => {},
  }),
}));

import SignIn from './SignIn';

const SIGNED_IN_AUTH = {
  user: { display_name: 'Test User', avatar_url: null, providers: ['google'] },
  isLoadingAuth: false,
  authChecked: true,
};

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderAccount() {
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={SIGNED_IN_AUTH}>
        <StaticRouter location="/signin">
          <SignIn />
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

function renderSignIn(location = '/signin') {
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={ANON_AUTH}>
        <StaticRouter location={location}>
          <SignIn />
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('SignIn account page subscription card (2026-11-13)', () => {
  it('gives a signed-in free user a Subscribe action, never a pricing link', () => {
    const html = renderAccount();
    expect(html).toContain('Your account');
    expect(html).toContain('free tier');
    expect(html).toContain('Subscribe');
    expect(html).not.toContain('href="/pricing"');
    expect(html).not.toContain('See plans');
    expect(html).not.toContain('Pricing');
  });
});

describe('SignIn seats-full refusal (seat cap)', () => {
  it('surfaces the seats-full refusal plainly when the callback sends ?error=seats_full', () => {
    const html = renderSignIn('/signin?error=seats_full');
    expect(html).toContain('All seats are taken');
    expect(html).toContain('sign-ups are closed');
    expect(html).not.toContain('waitlist');
  });

  it('shows no seats-full alert on a plain sign-in', () => {
    const html = renderSignIn();
    expect(html).not.toContain('All seats are taken');
    expect(html).not.toContain('sign-ups are closed');
  });
});
