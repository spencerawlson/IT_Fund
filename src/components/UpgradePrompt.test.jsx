import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import UpgradePrompt from './UpgradePrompt';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };
const SIGNED_IN_AUTH = {
  user: { display_name: 'Test User', avatar_url: null, providers: ['google'] },
  isLoadingAuth: false,
  authChecked: true,
};

function renderPrompt(auth) {
  return renderToString(
    <AuthProvider initialAuth={auth}>
      <StaticRouter location="/academy/lessons/net-security">
        <UpgradePrompt what="The test lesson" />
      </StaticRouter>
    </AuthProvider>,
  );
}

describe('UpgradePrompt (2026-11-13)', () => {
  it('points signed-out visitors at the pricing page (and offers sign-in)', () => {
    const html = renderPrompt(ANON_AUTH);
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('See plans');
    expect(html).toContain('href="/signin"');
    expect(html).toContain('Sign in');
  });

  it('points signed-in users at their account page, never at pricing', () => {
    const html = renderPrompt(SIGNED_IN_AUTH);
    expect(html).toContain('href="/signin"');
    expect(html).toContain('Subscribe');
    expect(html).not.toContain('href="/pricing"');
    expect(html).not.toContain('See plans');
    expect(html).not.toContain('Pricing');
    expect(html).not.toContain('Sign in');
  });
});
