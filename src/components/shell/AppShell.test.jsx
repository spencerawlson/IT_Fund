import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TutorProvider } from '@/components/shell/TutorContext';
import AppShell from './AppShell';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };
const SIGNED_IN_AUTH = {
  user: { display_name: 'Test User', avatar_url: null, providers: ['google'] },
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
