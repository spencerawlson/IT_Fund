import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_DARK } from '@/lib/theme';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

/**
 * The theme switch. One button, icon-only (Sun in dark, Moon in light),
 * 44px tap target, keyboard-focusable with a visible focus ring from the
 * global :focus-visible rule. Used in the app shell (sidebar + mobile top
 * bar) and the public headers (landing, pricing) so the switch is reachable
 * from every screen.
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === THEME_DARK;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className={cn('flex h-11 w-11 items-center justify-center rounded-control text-ink-1 transition-colors hover:bg-black/5', className)}
    >
      {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
