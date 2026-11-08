import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import FaqSection, { faqJsonLd } from './FaqSection';

const FAQS = [
  {
    q: 'How does the practice exam work?',
    a: '100 questions sampled from every track, weighted by the official CISSP domain weights.',
    sources: [{ label: 'ISC2 CISSP', href: 'https://www.isc2.org/certifications/cissp' }],
  },
  { q: 'Can I pause the exam?', a: 'No — the timer survives a refresh.' },
];

describe('faqJsonLd', () => {
  it('builds a FAQPage whose questions match the rendered FAQs', () => {
    const ld = faqJsonLd(FAQS);
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(2);
    expect(ld.mainEntity[0].name).toBe('How does the practice exam work?');
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe(
      '100 questions sampled from every track, weighted by the official CISSP domain weights.',
    );
    expect(ld.mainEntity[1].acceptedAnswer.text).toBe('No — the timer survives a refresh.');
  });
});

describe('FaqSection', () => {
  it('renders the questions, answers, and source links', () => {
    const html = renderToString(<FaqSection faqs={FAQS} />);
    expect(html).toContain('Frequently asked questions');
    expect(html).toContain('How does the practice exam work?');
    expect(html).toContain('100 questions sampled from every track');
    expect(html).toContain('Can I pause the exam?');
    expect(html).toContain('https://www.isc2.org/certifications/cissp');
    expect(html).toContain('ISC2 CISSP');
  });

  it('renders nothing for an empty list', () => {
    expect(renderToString(<FaqSection faqs={[]} />)).toBe('');
  });
});
