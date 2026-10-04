import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { disableServerSync, enableServerSync, flushServerSync } from '@/lib/progress/sync';

// Session-cookie auth (C3). Sign-in is OAuth-only and optional: an anonymous visitor is a normal
// state, never an error, and is never redirected. The server session lives in an HttpOnly cookie,
// so there is no token in JavaScript. When signed in, progress syncs to the server.
const AuthContext = createContext(null);

// Hosted backend target (e.g. https://api.road2cissp.com/api in production).
// Falls back to same-origin /api for local dev (Vite proxy) and the Vercel rewrite.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const syncing = useRef(false);

  const loadUser = async () => {
    try {
      // credentials:include: the session cookie lives on the API origin, which
      // differs from the app origin in production (api.road2cissp.com).
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      setUser(res.ok ? await res.json() : null);
    } catch {
      setUser(null); // network error: treat as anonymous, don't block the app
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const isAuthenticated = !!user;

  // Turn server sync on when signed in, off when signed out.
  useEffect(() => {
    if (!authChecked) return;
    if (isAuthenticated && !syncing.current) {
      syncing.current = true;
      enableServerSync();
    } else if (!isAuthenticated && syncing.current) {
      syncing.current = false;
      disableServerSync();
    }
  }, [isAuthenticated, authChecked]);

  // Flush a pending progress write when the tab is hidden or closing.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushServerSync();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  const signInWith = (provider) => {
    window.location.href = `${API_BASE}/auth/${provider}/login`;
  };

  const signOut = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // ignore; clear locally regardless
    }
    await flushServerSync();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError: null,
        authChecked,
        signInWith,
        loginWithProvider: signInWith, // legacy alias
        signOut,
        logout: signOut, // legacy alias
        navigateToLogin: () => {
          window.location.href = '/signin';
        },
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
