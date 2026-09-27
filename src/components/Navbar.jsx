import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlaskConical, Gamepad2, Search, X } from 'lucide-react';

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

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0D1117]/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 text-xs text-white shadow-sm">
                N
              </span>
              <span className="hidden sm:inline">NetOS Study Hub</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <Link to="/academy" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-white/[0.04] hover:text-amber-200">
                <Gamepad2 size={13} /> Academy
              </Link>
              <Link to="/tracks" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:text-white hover:bg-white/[0.04]">
                Tracks
              </Link>
              <Link to="/lab" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:text-white hover:bg-white/[0.04]">
                Visual Lab
              </Link>
              <Link to="/challenge" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:text-white hover:bg-white/[0.04]">
                Challenges
              </Link>
              <Link to="/learning-path" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:text-white hover:bg-white/[0.04]">
                Learning Path
              </Link>
              <Link to="/registry" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:text-white hover:bg-white/[0.04]">
                Config
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={submit} className="relative hidden sm:block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search concepts..."
                className="h-9 w-56 rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-8 text-xs text-white placeholder-slate-500 outline-none backdrop-blur-sm transition focus:border-blue-500/50 focus:w-72"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </form>
            <Link
              to="/lab"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:opacity-90"
            >
              <FlaskConical size={14} /> Open Lab
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
