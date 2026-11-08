import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_STORAGE_KEY,
  applyTheme,
  getStoredTheme,
  resolveLiveTheme,
  storeTheme,
  systemPrefersDark,
} from '@/lib/theme';

const ThemeContext = createContext({
  theme: THEME_LIGHT,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Owns the current theme for the whole app. The inline script in index.html
 * already set data-theme on <html> before first paint; the provider reads
 * that attribute on mount so React never flashes the wrong theme, then keeps
 * the attribute, localStorage and the theme-color meta in sync.
 *
 * - Toggling stores the choice (it then always wins over the OS).
 * - With no stored choice, an OS appearance change is followed live.
 * - A choice made in another tab is picked up via the storage event.
 * Safe during SSR: no window/document access during render.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof document === 'undefined') return THEME_LIGHT;
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === THEME_DARK || attr === THEME_LIGHT ? attr : THEME_LIGHT;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onStorage = (e) => {
      if (e.key === THEME_STORAGE_KEY) setThemeState(resolveLiveTheme());
    };
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      if (!getStoredTheme()) setThemeState(systemPrefersDark() ? THEME_DARK : THEME_LIGHT);
    };
    window.addEventListener('storage', onStorage);
    mq.addEventListener('change', onSystem);
    return () => {
      window.removeEventListener('storage', onStorage);
      mq.removeEventListener('change', onSystem);
    };
  }, []);

  const setTheme = useCallback((next) => {
    if (next !== THEME_DARK && next !== THEME_LIGHT) return;
    storeTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
      storeTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
