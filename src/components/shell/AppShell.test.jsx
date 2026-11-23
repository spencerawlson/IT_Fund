import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TutorProvider } from '@/components/shell/TutorContext';
import AppShell, { shouldHideTabBar } from './AppShell';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };
const SIGNED_IN_AUTH = {
  user: { display_name: 'Test User', avatar_url: null, providers: ['google'] },
  isLoadingAuth: false,
  authChecked: true,
};
const SIGNED_IN_AVATAR_AUTH = {
  user: { display_name: 'Test User', avatar_url: 'https://example.com/avatar.png', providers: ['google'] },
  isLoadingAuth: false,
  authChecked: true,
};

function renderShell(auth) {
  const queryClient = new QueryClient();
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={auth}>
        <QueryClientProvider client={queryClient}>
          <TutorProvider>
            <StaticRouter location="/app">
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/app" element={<div>Home</div>} />
                </Route>
              </Routes>
            </StaticRouter>
          </TutorProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('AppShell sidebar pricing (2026-11-13)', () => {
  it('shows Pricing in the sidebar for signed-out visitors', () => {
    const html = renderShell(ANON_AUTH);
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('Pricing');
  });

  it('hides Pricing from the sidebar for signed-in users', () => {
    const html = renderShell(SIGNED_IN_AUTH);
    expect(html).not.toContain('href="/pricing"');
    expect(html).not.toContain('Pricing');
    // The rest of the nav is untouched.
    expect(html).toContain('Home');
    expect(html).toContain('Learn');
    expect(html).toContain('Road to CISSP');
  });
});

describe('AppShell Learn nav (navigation fix, 2026-11-18)', () => {
  it('Learn opens the courses index, not the last-opened course', () => {
    const html = renderShell(SIGNED_IN_AUTH);
    expect(html).toContain('href="/academy/courses"');
    expect(html).not.toContain('href="/academy/courses/network-engineering"');
  });
});

describe('AppShell bottom tab bar auto-hide (floating-nav overlap, 2026-11-19)', () => {
  const base = { scrollY: 500, lastScrollY: 300, viewportHeight: 900, scrollHeight: 5000 };

  it('hides while scrolling down past the top of the page', () => {
    expect(shouldHideTabBar(base)).toBe(true);
  });

  it('shows while scrolling up', () => {
    expect(shouldHideTabBar({ ...base, lastScrollY: 700 })).toBe(false);
  });

  it('shows near the top of the page', () => {
    expect(shouldHideTabBar({ ...base, scrollY: 100, lastScrollY: 0 })).toBe(false);
  });

  it('shows at the page bottom even when scrolling down', () => {
    expect(shouldHideTabBar({ ...base, scrollY: 4100, lastScrollY: 4000 })).toBe(false);
  });

  it('shows when the scroll position does not change', () => {
    expect(shouldHideTabBar({ ...base, lastScrollY: 500 })).toBe(false);
  });

  it('renders the tab bar visible by default (no hide transform in SSR)', () => {
    const html = renderShell(SIGNED_IN_AUTH);
    expect(html).toContain('transition-transform');
    // The hide class is translate-y-[calc(100%+1rem)]; other translate-y
    // utilities (e.g. the search icon's -translate-y-1/2) are unrelated.
    expect(html).not.toContain('translate-y-[calc(100%+1rem)]');
  });
});

describe('AppShell mobile top bar sign-in (2026-11-23)', () => {
  // The compact AccountMenu was icon-only when signed out (a LogIn icon with
  // an aria-label and no visible text), so phones showed no "Sign in" in the
  // app header at all.
  it('shows a visible "Sign in" label in the mobile top bar for signed-out visitors', () => {
    const html = renderShell(ANON_AUTH);
    expect(html).toContain('>Sign in<');
  });

  it('keeps the signed-in avatar icon-only in the mobile top bar', () => {
    const html = renderShell(SIGNED_IN_AVATAR_AUTH);
    expect(html).toContain('avatar.png');
    expect(html).not.toContain('>Sign in<');
  });
});
