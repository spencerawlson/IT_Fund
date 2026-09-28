import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Route as RouteIcon, BookOpen, Repeat, Crown, Menu, X } from 'lucide-react';
import Navbar from '@/components/Navbar';

// Only pages that exist are listed; later phases add Labs, Projects, Certifications, etc.
const NAV = [
  { to: '/academy', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/academy/paths', label: 'Career paths', icon: RouteIcon },
  { to: '/academy/courses', label: 'Courses', icon: BookOpen },
  { to: '/academy/review', label: 'Review', icon: Repeat },
  { to: '/academy/roadmap', label: 'Road to CISSP', icon: Crown },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
    isActive ? 'border border-white/20 bg-white/15 text-white' : 'border border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
  }`;

/** Page frame for the Academy: site navbar, a sticky section sidebar on desktop, a toggle menu on mobile. */
export default function AcademyShell({ children }) {
  const [open, setOpen] = useState(false);
  const links = NAV.map(({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
      <Icon size={17} aria-hidden="true" /> {label}
    </NavLink>
  ));

  return (
    <div className="relative isolate min-h-screen text-white">
      <Navbar />
      <div className="mx-auto flex max-w-6xl gap-10 px-4 pb-24 pt-6 sm:px-8 lg:pt-10">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav aria-label="Academy" className="glass sticky top-24 space-y-1 rounded-3xl p-3">
            {links}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="academy-mobile-nav"
              className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
            >
              {open ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />} Academy menu
            </button>
            {open && (
              <nav id="academy-mobile-nav" aria-label="Academy" className="glass mt-2 space-y-1 rounded-3xl p-3">
                {links}
              </nav>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
