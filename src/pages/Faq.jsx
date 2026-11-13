import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';
import FaqSection, { faqJsonLd } from '@/components/FaqSection';
import { FAQ_GROUPS, ALL_FAQS } from '@/data/faqs';

// The one FAQ page: every question the site used to scatter across its
// pages, grouped by topic, with a search box. The per-page FAQ sections
// were removed 2026-11-13 on Spencer's call — this page is where they live
// now, and the FAQPage JSON-LD lives only here.
function matches(faq, query) {
  return `${faq.q} ${faq.a}`.toLowerCase().includes(query);
}

function GroupNote({ note }) {
  if (!note) return null;
  return (
    <p className="mx-auto -mt-8 mb-16 max-w-3xl text-center text-small text-ink-2">
      {note.text}{' '}
      {note.links.map((l, i) => (
        <React.Fragment key={l.href}>
          {i > 0 && ', '}
          <a
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-black/30 underline-offset-4 hover:text-ink-1"
          >
            {l.label}
          </a>
        </React.Fragment>
      ))}
      .
    </p>
  );
}

export default function Faq() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!q) return FAQ_GROUPS;
    const keep = (faqs) => faqs.filter((f) => matches(f, q));
    return FAQ_GROUPS.map((g) => {
      if (g.sections) {
        const sections = g.sections
          .map((s) => ({ ...s, faqs: keep(s.faqs) }))
          .filter((s) => s.faqs.length > 0);
        return { ...g, sections };
      }
      return { ...g, faqs: keep(g.faqs) };
    }).filter((g) => (g.sections ? g.sections.length > 0 : g.faqs.length > 0));
  }, [q]);

  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title="Frequently asked questions · Road to CISSP"
        description="Every question about Road to CISSP in one place — getting started, pricing, courses, labs, and practice exams."
        path="/faq"
        jsonLd={faqJsonLd(ALL_FAQS)}
      />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="text-body font-bold tracking-tight">Road to CISSP</Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" to="/labs">Labs</Button>
          <Button variant="secondary" size="sm" to="/signin">Sign in</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h1 className="text-[clamp(2rem,1.75rem+2vw,3rem)] font-bold leading-[1.1] tracking-tight text-ink-1">
          Frequently asked questions
        </h1>
        <p className="mt-4 text-body text-ink-2">
          Every question about Road to CISSP in one place — getting started, pricing, courses, labs, and practice exams.
        </p>

        <div className="mt-6">
          <label htmlFor="faq-search" className="sr-only">Search questions</label>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-body text-ink-1 placeholder:text-ink-3 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <nav aria-label="FAQ topics" className="mt-6 flex flex-wrap gap-2">
          {FAQ_GROUPS.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="rounded-full border border-black/10 px-3 py-1.5 text-small font-semibold text-ink-2 hover:text-ink-1"
            >
              {g.title}
            </a>
          ))}
        </nav>

        {groups.length === 0 ? (
          <p className="mt-10 text-body text-ink-2">
            No questions match &ldquo;{query.trim()}&rdquo;. Try a different word, or{' '}
            <Link to="/contact" className="underline decoration-black/30 underline-offset-4 hover:text-ink-1">ask us</Link>.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="mt-10">
              {g.sections ? (
                g.sections.map((s) => (
                  <FaqSection key={s.title} faqs={s.faqs} title={s.title} id={s.id} />
                ))
              ) : (
                <FaqSection faqs={g.faqs} title={g.title} id={g.id} />
              )}
              {!q && <GroupNote note={g.note} />}
            </div>
          ))
        )}
      </main>

      <footer className="border-t border-black/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span className="text-caption text-ink-3">Road to CISSP — learn IT by doing it.</span>
          <div className="flex gap-4 text-caption text-ink-3">
            <Link to="/faq" className="hover:text-ink-1">FAQ</Link>
            <Link to="/pricing" className="hover:text-ink-1">Pricing</Link>
            <Link to="/privacy" className="hover:text-ink-1">Privacy</Link>
            <Link to="/terms" className="hover:text-ink-1">Terms</Link>
            <Link to="/contact" className="hover:text-ink-1">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
