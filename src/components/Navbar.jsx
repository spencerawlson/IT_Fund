import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FlaskConical, Gamepad2, Search, X } from 'lucide-react';
import Logo from '@/components/Logo';

const LINKS = [
  { to: '/academy', label: 'Academy', icon: Gamepad2, accent: true },
  { to: '/tracks', label: 'Tracks' },
  { to: '/lab', label: 'Visual Lab' },
  { to: '/challenge', label: 'Challenges' },
  { to: '/learning-path', label: 'Learning Path' },
  { to: '/registry', label: 'Config' },
];

const linkClass = (accent) => ({ isActive }) =>
  `inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
    isActive
      ? 'border border-white/25 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
      : accent
        ? 'border border-transparent text-amber-300 hover:bg-white/10 hover:text-amber-200'
        : 'border border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
  }`;

export default function Navbar({ onSearch }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    const value = q.trim();
    setQ('');
    if (onSearch) onSearch(value);
    if (value) navigate('/');
  };

  const links = (
    <>
      {LINKS.map(({ to, label, icon: Icon, accent }) => (
        <NavLink key={to} to={to} className={linkClass(accent)}>
          {Icon && <Icon size={13} />} {label}
        </NavLink>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="glass-strong mx-auto max-w-6xl rounded-3xl px-3 sm:px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/" aria-label="Road to CISSP home" className="shrink-0">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">{links}</nav>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={submit} className="relative hidden sm:block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search concepts..."
                aria-label="Search concepts"
                className="h-9 w-48 rounded-full border border-white/15 bg-white/[0.08] pl-9 pr-8 text-xs text-white placeholder-slate-400 outline-none transition focus:w-64 focus:border-white/40"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </form>
            <Link to="/lab" className="glass-btn inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold" style={{ '--tint': '#0EA5E9' }}>
              <FlaskConical size={14} /> <span className="hidden sm:inline">Open Lab</span>
            </Link>
          </div>
        </div>
        {/* Phones and tablets: swipeable link row. */}
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2.5 [scrollbar-width:none] lg:hidden">{links}</nav>
      </div>
    </header>
  );
}
