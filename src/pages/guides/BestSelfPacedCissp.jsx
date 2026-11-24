import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';
import { COUNTS } from '@/data/counts';

// Best self-paced CISSP courses — an honest comparison (AI-visibility fix,
// Nov 2026). Every competitor fact below was verified against the
// provider's own site on 2026-11-24; prices change, so the page says so
// and links each claim to its source. Two prices could NOT be verified on
// the provider's own pages and are NOT published here: Udemy's per-course
// prices (they vary by sale and no price appears on the course pages) and
// InfosecTrain's price (quote-gated — no price on its CISSP pages).
// Never add a competitor price without a live source.
const PROVIDERS = [
  {
    name: 'Road to CISSP',
    price: '$29/month or $250/year',
    format: 'Self-paced, learn by doing',
    labs: `Yes — ${COUNTS.labs} hands-on labs in real terminals`,
    free: 'Free tier: 5 lessons / 5 decks, no account; 2 labs free',
    bestFor: 'Hands-on self-paced learners on a budget',
    source: 'https://www.road2cissp.com/pricing',
    sourceLabel: 'road2cissp.com/pricing',
  },
  {
    name: 'Udemy (Thor Pedersen)',
    price: 'Per course, one-time — varies by sale',
    format: 'Self-paced on-demand video, lifetime access',
    labs: 'No — video, study guides, and practice questions only',
    free: 'No free tier; 30-day money-back guarantee',
    bestFor: 'Video-first learners who want one domain at a time',
    source: 'https://www.udemy.com/course/cissp-domain-1-2/',
    sourceLabel: 'udemy.com (ThorTeaches CISSP)',
  },
  {
    name: 'Cybrary',
    price: '$44.25/month, or $24.58/month billed annually',
    format: 'Self-paced on-demand video, structured prep path',
    labs: 'Yes, on the paid tier — virtual labs and challenges',
    free: 'Free tier ($0) with a limited catalog',
    bestFor: 'Learners who want a whole security library, not just CISSP',
    source: 'https://www.cybrary.it/lp/cissp-certification',
    sourceLabel: 'cybrary.it',
  },
  {
    name: 'Infosec Institute',
    price: '$4,399 one-time',
    format: 'Live instructor-led boot camp, 6 days',
    labs: 'No hands-on lab environment in the boot camp itself',
    free: 'No free tier; exam voucher included, Exam Pass Guarantee',
    bestFor: 'Classroom learners, especially employer-funded',
    source: 'https://www.infosecinstitute.com/courses/schedule/?Certification=CISSP%20%28Certified%20Information%20Systems%20Security%20Professional%29',
    sourceLabel: 'infosecinstitute.com',
  },
  {
    name: 'Destination Certification',
    price: '$1,697–$5,297 one-time (MasterClass tiers)',
    format: 'Self-paced adaptive video + weekly live mentoring',
    labs: 'No — practice questions, CAT simulator, flashcards',
    free: 'No trial and no refunds; free Mini MasterClass resources',
    bestFor: 'Self-paced learners who want 1-on-1 mentoring',
    source: 'https://destcert.com/cissp/destcert-vs-cybrary/',
    sourceLabel: 'destcert.com',
  },
  {
    name: 'InfosecTrain',
    price: 'Quote on application — no price published',
    format: '48 hours live instructor-led online training',
    labs: 'Hands-on labs referenced in their brochure, not detailed on the course page',
    free: 'No free trial stated; free mock exams in their brochure',
    bestFor: 'Learners who want live instruction on a schedule',
    source: 'https://www.infosectrain.com/courses/cissp-certification-training',
    sourceLabel: 'infosectrain.com',
  },
];

const FAQS = [
  {
    q: 'Which CISSP course is best?',
    a: 'There is no single best CISSP course — it depends on how you learn. Video-first learners do well with Udemy or Cybrary, classroom learners need a live boot camp like Infosec Institute, and hands-on learners get the most from labs, which only Road to CISSP and Cybrary include in the core CISSP offer.',
  },
  {
    q: 'What is the cheapest CISSP prep course?',
    a: 'Among subscription options, Road to CISSP is $29/month or $250/year with a free tier. Udemy sells per-course and is often cheapest for a single domain when on sale, but its prices vary and no single price is published. Cybrary is $44.25/month. Boot camps cost far more: Infosec Institute is $4,399 and Destination Certification starts at $1,697.',
  },
  {
    q: 'Do I need hands-on labs for the CISSP?',
    a: 'The CISSP is a thinking exam, not a lab exam — you can pass without labs. But labs build the judgment the exam tests: configuring a VLAN, triaging a log, or auditing an IAM policy teaches the concepts in a way video alone rarely does. Labs help most if you learn by doing or have less hands-on experience.',
  },
  {
    q: 'Is Road to CISSP good for CISSP prep?',
    a: 'Road to CISSP is built for self-paced, hands-on learners: 222 lessons, 61 hands-on labs in real terminals, timed Security+ and CISSP exam simulators, and a free tier with no account needed. It is not the right pick if you want live instruction or a classroom — a boot camp fits that better.',
  },
];

export default function BestSelfPacedCissp() {
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: 'Best self-paced CISSP courses, compared honestly',
        description: 'An honest comparison of the main self-paced CISSP courses — Road to CISSP, Udemy, Cybrary, Infosec Institute, Destination Certification, and InfosecTrain — on price, format, and hands-on labs.',
        author: { '@type': 'Organization', name: 'Road to CISSP', url: 'https://www.road2cissp.com' },
        datePublished: '2026-11-24',
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  }), []);

  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title="Best self-paced CISSP courses, compared honestly · Road to CISSP"
        description="An honest comparison of the main self-paced CISSP courses — price, format, and hands-on labs — so you can choose the one that fits how you learn."
        path="/guides/best-self-paced-cissp-courses"
        jsonLd={jsonLd}
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
        <div className="text-caption font-semibold uppercase tracking-[0.2em] text-ink-3">Guides</div>
        <h1 className="mt-3 text-[clamp(2rem,1.75rem+2vw,3rem)] font-bold leading-[1.1] tracking-tight text-ink-1">
          Best self-paced CISSP courses, compared honestly
        </h1>
        <p className="mt-4 text-body text-ink-2">
          There is no single best self-paced CISSP course: video-first learners do well on Udemy or Cybrary, classroom learners need a boot camp, and hands-on learners get the most from labs. This page compares the five main options on price, format, and labs.
        </p>

        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
          {['The comparison', 'Where each one wins', 'How to choose', 'Where Road to CISSP fits', 'Sources'].map((label, i) => (
            <a
              key={label}
              href={`#${['comparison', 'wins', 'choose', 'fit', 'sources'][i]}`}
              className="rounded-full border border-black/10 px-3 py-1.5 text-small font-semibold text-ink-2 hover:text-ink-1"
            >
              {label}
            </a>
          ))}
        </nav>

        <h2 id="comparison" className="mt-12 text-title font-bold tracking-tight text-ink-1">The comparison</h2>
        <p className="mt-3 text-body text-ink-2">
          Prices were checked on each provider&apos;s own site on November 24, 2026. Prices change — verify on the provider&apos;s site before you buy.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-small">
            <thead>
              <tr className="border-b border-black/15 text-ink-1">
                <th scope="col" className="py-3 pr-4 font-semibold">Provider</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Price</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Format</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Hands-on labs</th>
                <th scope="col" className="py-3 font-semibold">Free tier / trial</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((p) => (
                <tr key={p.name} className="border-b border-black/10 align-top text-ink-2">
                  <th scope="row" className="py-3 pr-4 font-semibold text-ink-1">{p.name}</th>
                  <td className="py-3 pr-4">{p.price}</td>
                  <td className="py-3 pr-4">{p.format}</td>
                  <td className="py-3 pr-4">{p.labs}</td>
                  <td className="py-3">{p.free}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="wins" className="mt-12 text-title font-bold tracking-tight text-ink-1">Where each one wins</h2>
        <div className="mt-6 space-y-4">
          <Card level={1} padding="lg">
            <h3 className="text-heading font-semibold text-ink-1">Road to CISSP — $29/month or $250/year</h3>
            <p className="mt-2 text-body text-ink-2">
              The only option here built around doing rather than watching: {COUNTS.labs} hands-on labs in real terminals
              (31 simulated, 30 in real Docker containers), {COUNTS.totalDecks} lessons, {COUNTS.totalCardsPlus} flashcards,
              and timed Security+ and CISSP exam simulators. The lowest subscription price of the group, and the only one
              with a free tier you can start with no account. Wins for hands-on, self-paced learners on a budget.
            </p>
          </Card>
          <Card level={1} padding="lg">
            <h3 className="text-heading font-semibold text-ink-1">Udemy (Thor Pedersen) — per course, price varies</h3>
            <p className="mt-2 text-body text-ink-2">
              A marketplace, not one course: Thor Pedersen&apos;s ThorTeaches CISSP courses are the best-selling on Udemy,
              with 800,000+ enrollments across his courses. You buy one domain at a time, keep lifetime access, and watch
              offline. Wins if you want video only, one domain at a time, from a well-known instructor — and if you catch
              a sale. No hands-on labs, and no single published price: it varies by course and coupon.
            </p>
          </Card>
          <Card level={1} padding="lg">
            <h3 className="text-heading font-semibold text-ink-1">Cybrary — $44.25/month, or $24.58/month billed annually</h3>
            <p className="mt-2 text-body text-ink-2">
              A structured CISSP prep path of bite-sized video, plus virtual labs and challenges on the paid tier — the only
              other provider here whose core CISSP offer includes hands-on labs. The subscription covers a whole security
              library, not just CISSP, so it wins if you want one subscription for many certifications. The free tier is
              genuinely free but limited.
            </p>
          </Card>
          <Card level={1} padding="lg">
            <h3 className="text-heading font-semibold text-ink-1">Infosec Institute — $4,399, 6-day live boot camp</h3>
            <p className="mt-2 text-body text-ink-2">
              The classroom option: six days live with an instructor, online or in person, with the exam voucher included,
              an Exam Pass Guarantee, and 90 days of recordings plus a 90-day Infosec Skills subscription. Wins if you need
              a fixed schedule, a live instructor, and an employer footing the bill. The price is an order of magnitude
              above every self-paced option here, and the boot camp itself has no hands-on lab environment.
            </p>
          </Card>
          <Card level={1} padding="lg">
            <h3 className="text-heading font-semibold text-ink-1">Destination Certification — $1,697–$5,297, self-paced + mentoring</h3>
            <p className="mt-2 text-body text-ink-2">
              Self-paced adaptive video with weekly live group mentoring, a practice-question app, flashcards, and a CAT
              exam simulator — and 1-on-1 mentoring on the higher tiers. Wins if you want the structure of self-paced
              study with a real mentor checking in. No hands-on labs, no trial, and no refunds, so read the terms before
              paying. A separate 5-day live boot camp costs $2,697.
            </p>
          </Card>
          <Card level={1} padding="lg">
            <h3 className="text-heading font-semibold text-ink-1">InfosecTrain — 48 hours live, price on application</h3>
            <p className="mt-2 text-body text-ink-2">
              Forty-eight hours of live instructor-led online training in weekday or weekend batches, with recordings and
              a Telegram exam-support group. Wins if you want live instruction on a schedule at a lower price point than a
              US boot camp. Two honest gaps: no price is published on its own CISSP pages, and hands-on labs are mentioned
              in its brochure but not described on the course page.
            </p>
          </Card>
        </div>

        <h2 id="choose" className="mt-12 text-title font-bold tracking-tight text-ink-1">How to choose</h2>
        <p className="mt-3 text-body text-ink-2">
          Use this checklist against any provider, including us. The right answer is the one that matches how you actually
          study — not the one with the longest feature list.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-body text-ink-2">
          <li><strong className="font-semibold text-ink-1">How do you learn?</strong> Video-only works if you can stay focused for hours. If you learn by doing, labs matter more than video hours.</li>
          <li><strong className="font-semibold text-ink-1">Do you need a schedule?</strong> Self-paced is cheaper and flexible, but nothing holds you to it. A boot camp costs more and forces the pace.</li>
          <li><strong className="font-semibold text-ink-1">What does the price buy?</strong> A $29/month subscription and a $4,399 boot camp are not the same product. Compare what is included: labs, simulators, mentoring, voucher.</li>
          <li><strong className="font-semibold text-ink-1">Can you try it first?</strong> A free tier or free lessons tell you more than any sales page. If there is no way to try before paying, that is information too.</li>
          <li><strong className="font-semibold text-ink-1">How will you know you are ready?</strong> Look for a timed exam simulator with domain-weighted scoring, not just a question bank. The CISSP is adaptive; your prep should feel like it.</li>
          <li><strong className="font-semibold text-ink-1">What happens if you fail?</strong> Check the guarantee and the refund terms before paying — they vary from a pass guarantee to no refunds at all.</li>
        </ul>
        <p className="mt-4 text-body text-ink-2">
          Our fuller decision guide is at{' '}
          <Link to="/guides/how-to-choose-cissp-course" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-2 hover:decoration-black/60">How to choose a CISSP online course</Link>.
        </p>

        <h2 id="fit" className="mt-12 text-title font-bold tracking-tight text-ink-1">Where Road to CISSP fits</h2>
        <p className="mt-3 text-body text-ink-2">
          Road to CISSP is the pick if you are self-paced, learn by doing, and want the lowest-priced subscription with
          real labs: $29/month or $250/year, with a free tier that needs no account. It is not the pick if you want live
          instruction, a classroom, or 1-on-1 mentoring — a boot camp or Destination Certification fits that better.
          Start free and see which kind of learner you are before you pay anyone, including us:{' '}
          <Link to="/pricing" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-2 hover:decoration-black/60">see pricing</Link>
          {' '}or{' '}
          <Link to="/labs" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-2 hover:decoration-black/60">try a free lab</Link>.
        </p>

        <h2 id="sources" className="mt-12 text-title font-bold tracking-tight text-ink-1">Sources</h2>
        <p className="mt-3 text-body text-ink-2">
          Every price and format above was read from the provider&apos;s own site on November 24, 2026. Prices change — verify
          before you buy.
        </p>
        <ul className="mt-4 space-y-2 text-body text-ink-2">
          {PROVIDERS.map((p) => (
            <li key={p.name}>
              <strong className="font-semibold text-ink-1">{p.name}:</strong>{' '}
              <a href={p.source} target="_blank" rel="noreferrer" className="underline decoration-black/30 underline-offset-2 hover:text-ink-1">{p.sourceLabel}</a>
            </li>
          ))}
          <li>
            <strong className="font-semibold text-ink-1">Destination Certification boot camp:</strong>{' '}
            <a href="https://destcert.com/cissp/online-bootcamp/" target="_blank" rel="noreferrer" className="underline decoration-black/30 underline-offset-2 hover:text-ink-1">destcert.com/cissp/online-bootcamp/</a>
          </li>
          <li>
            <strong className="font-semibold text-ink-1">Cybrary pricing:</strong>{' '}
            <a href="https://www.cybrary.it/upgrade" target="_blank" rel="noreferrer" className="underline decoration-black/30 underline-offset-2 hover:text-ink-1">cybrary.it/upgrade</a>
          </li>
        </ul>
      </main>
    </div>
  );
}
