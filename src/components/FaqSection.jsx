import React from 'react';

// One FAQ section for the prerendered pages: a visible "Frequently asked
// questions" block (the h2 is what the GEO audit looks for) plus the
// FAQPage JSON-LD builder, fed from the same FAQS array — single source of
// truth, so the visible answers and the structured data can never drift.
//
// FAQ item: { q, a, sources?: [{ label, href }] } — `a` is plain text
// (it goes verbatim into acceptedAnswer.text); `sources` render as small
// outbound links under the answer, for the claims that need a citation.
// External links open in a new tab, like ListLink.
export function faqJsonLd(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export default function FaqSection({ faqs, title = 'Frequently asked questions', id }) {
  if (!faqs || faqs.length === 0) return null;
  return (
    <section className="pb-16 sm:pb-20" aria-label={title} id={id}>
      <h2 className="text-center text-title font-bold text-ink-1">{title}</h2>
      <div className="mx-auto mt-8 grid max-w-3xl gap-4">
        {faqs.map((f) => (
          <div key={f.q} className="glass-2 rounded-card p-5">
            <h3 className="text-body font-semibold text-ink-1">{f.q}</h3>
            <p className="mt-1.5 text-small text-ink-2">{f.a}</p>
            {f.sources?.length > 0 && (
              <p className="mt-2 text-caption text-ink-2">
                Sources:{' '}
                {f.sources.map((s, i) => (
                  <React.Fragment key={s.href}>
                    {i > 0 && ', '}
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-black/30 underline-offset-4 hover:text-ink-1"
                    >
                      {s.label}
                    </a>
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
