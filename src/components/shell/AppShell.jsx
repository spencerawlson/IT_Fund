import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Repeat, FlaskConical, Crown, Search, Sparkles, X, LogIn, User } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/AuthContext';
import { useTutorEnabled } from '@/components/academy/tutor/TutorAssist';
import { getCourse, courseHref } from '@/data/catalog';
import { useAcademy } from '@/lib/academy';
import { continueLearning } from '@/lib/progress/engine';
import { cn } from '@/lib/utils';
import { useTutorPanel } from './TutorContext';

// Which URLs light up each item. Lessons, courses and paths all count as "Learn".
const LEARN = /^\/academy\/(courses|lessons|paths)(\/|$)|^\/academy\/(?!roadmap|review)[^/]+$/;
const PRACTICE = /^\/(practice|lab|challenge|library|tracks|learning-path|roadmap|module)(\/|$)/;

function useNavItems() {
  const state = useAcademy();
  const next = continueLearning(state);
  const learnTo = next ? courseHref(getCourse(next.lesson.courseSlug)) : '/academy/courses';
  return [
    { to: '/', label: 'Home', icon: Home, match: (p) => p === '/' || p === '/academy' },
    { to: learnTo, label: 'Learn', icon: BookOpen, match: (p) => LEARN.test(p) },
    { to: '/academy/review', label: 'Review', icon: Repeat, match: (p) => p === '/academy/review' },
    { to: '/practice', label: 'Practice', icon: FlaskConical, match: (p) => PRACTICE.test(p) },
    { to: '/academy/roadmap', label: 'Road to CISSP', short: 'CISSP', icon: Crown, match: (p) => p === '/academy/roadmap' },
  ];
}

function SearchForm({ onDone, autoFocus = false, className }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    navigate(`/library?q=${encodeURIComponent(value)}`);
    setQ('');
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden="true" />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search concepts"
        aria-label="Search concepts"
        className="h-10 w-full rounded-control border border-white/10 bg-white/[0.05] pl-9 pr-3 text-small text-ink-1 outline-none placeholder:text-ink-2 focus:border-white/25"
      />
    </form>
  );
}

function TutorButton({ compact = false }) {
  const enabled = useTutorEnabled();
  const { open, setOpen } = useTutorPanel();
  if (!enabled) return null;
  if (compact) {
    return (
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Ask the tutor" className="flex h-10 w-10 items-center justify-center rounded-control text-ink-1 hover:bg-white/[0.06]">
        <Sparkles size={20} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-small font-semibold text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink-1"
    >
      <Sparkles size={18} aria-hidden="true" /> Ask the tutor
    </button>
  );
}

/** Account entry: avatar + name when signed in, "Sign in to sync" otherwise. Links to /signin. */
function AccountMenu({ compact = false }) {
  const { isAuthenticated, user } = useAuth();
  const avatar = isAuthenticated && user?.avatar_url;
  if (compact) {
    return (
      <Link to="/signin" aria-label={isAuthenticated ? 'Your account' : 'Sign in'} className="flex h-10 w-10 items-center justify-center rounded-control text-ink-1 hover:bg-white/[0.06]">
        {avatar ? <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full border border-white/10" /> : <LogIn size={20} aria-hidden="true" />}
      </Link>
    );
  }
  return (
    <Link to="/signin" className="flex items-center gap-3 rounded-control px-3 py-2.5 text-small font-semibold text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink-1">
      {avatar ? <img src={user.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full border border-white/10" /> : <User size={18} aria-hidden="true" />}
      <span className="min-w-0 truncate">{isAuthenticated ? user.display_name || 'Your account' : 'Sign in to sync'}</span>
    </Link>
  );
}

/**
 * The one navigation for the app: a sidebar from lg up, a top bar plus bottom tab bar below.
 * Lessons, quizzes and sign-in pages render outside it (full-screen focus mode).
 */
export default function AppShell() {
  const items = useNavItems();
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen text-ink-1">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-control focus:bg-action focus:px-4 focus:py-2 focus:text-action-ink">
        Skip to content
      </a>

      {/* Desktop sidebar: the site header (logo, search, navigation). Hidden below lg, where the top bar takes over. */}
      <header className="fixed inset-y-3 left-3 z-40 hidden w-60 lg:block">
        <div className="glass-1 flex h-full flex-col rounded-card p-3">
          <Link to="/" aria-label="Road to CISSP home" className="mb-5 mt-1 px-2">
            <Logo size={30} />
          </Link>
          <SearchForm className="mb-4" />
          <nav aria-label="Main" className="space-y-1">
            {items.map(({ to, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={label}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-control px-3 py-2.5 text-small font-semibold transition-colors',
                    active ? 'bg-white/10 text-ink-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'text-ink-2 hover:bg-white/[0.06] hover:text-ink-1',
                  )}
                >
                  <Icon size={18} className={active ? 'text-action' : undefined} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-1 border-t border-white/[0.08] pt-3">
            <TutorButton />
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 px-3 pt-3 lg:hidden">
        <div className="glass-1 flex h-14 items-center justify-between gap-2 rounded-card pl-3 pr-1.5">
          {searchOpen ? (
            <>
              <SearchForm autoFocus onDone={() => setSearchOpen(false)} className="flex-1" />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="flex h-10 w-10 items-center justify-center rounded-control text-ink-1 hover:bg-white/[0.06]">
                <X size={20} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <Link to="/" aria-label="Road to CISSP home">
                <Logo size={28} />
              </Link>
              <div className="flex items-center">
                <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search concepts" className="flex h-10 w-10 items-center justify-center rounded-control text-ink-1 hover:bg-white/[0.06]">
                  <Search size={20} aria-hidden="true" />
                </button>
                <TutorButton compact />
                <AccountMenu compact />
              </div>
            </>
          )}
        </div>
      </header>

      <main id="main" className="pb-28 lg:pb-12 lg:pl-[16.5rem]">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe lg:hidden">
        <div className="glass-3 grid grid-cols-5 rounded-card p-1">
          {items.map(({ to, label, short, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={label}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-control text-caption font-semibold transition-colors',
                  active ? 'bg-white/10 text-ink-1' : 'text-ink-2 hover:text-ink-1',
                )}
              >
                <Icon size={20} className={active ? 'text-action' : undefined} aria-hidden="true" />
                {short || label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

