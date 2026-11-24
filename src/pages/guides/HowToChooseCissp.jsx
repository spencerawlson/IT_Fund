import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button, Card } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';
import FaqSection, { faqJsonLd } from '@/components/FaqSection';
import { COUNTS } from '@/data/counts';

const PAGE_TITLE = 'How to choose a CISSP online course · Road to CISSP';
const PAGE_DESCRIPTION =
  'Self-paced or bootcamp, video-only or hands-on, what the price buys — a decision guide for choosing a CISSP course, with a checklist that works for any provider.';

const FAQS = [
  {
    q: 'Should I pay for a bootcamp or self-study?',
    a: 'It depends on how you learn and what your schedule allows. A bootcamp buys structure, a fixed schedule, and a live instructor to ask — at a higher price and with fixed hours. Self-paced study costs less and fits around full-time work, but needs self-discipline. Most candidates who work full time do better self-paced, with a timed simulator to keep them honest.',
  },
  {
    q: 'Is a free CISSP course enough to pass?',
    a: 'Free material can cover the concepts, but the exam tests judgment under time pressure, and that takes practice: timed simulators, domain-weighted scoring, and hands-on labs. Use a free tier to judge whether a course fits how you learn, then pay for the practice layer, not for more videos.',
  },
  {
    q: 'How do I know a course covers all eight CISSP domains?',
    a: 'Check that its syllabus maps lessons to the eight domains of the ISC2 exam outline, and that its practice exams report scores per domain. If a provider cannot show you a domain-by-domain breakdown of your weak spots, it cannot tell you when you are ready.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'How to choose a CISSP online course',
      description: PAGE_DESCRIPTION,
      author: { '@type': 'Organization', name: 'Road to CISSP', url: 'https://www.road2cissp.com' },
    },
    faqJsonLd(FAQS),
  ],
};

const CHECKLIST = [
  'Self-paced or live — does the format fit your work hours and your self-discipline?',
  'Hands-on labs in real terminals, or video only?',
  'Timed exam simulators with per-domain scoring — not just a question bank?',
  'A free tier you can try before paying — lessons, labs, and the simulator format?',
  'Lessons mapped to all eight CISSP domains, against the current ISC2 outline?',
  'Explanations for why the wrong answers are wrong, not just the right letter?',
  'Someone to ask when you are stuck — and how fast do they answer?',
  'Total cost including renewal — and is the ISC2 exam fee separate? (It always is.)',
];

export default function HowToChooseCissp() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        path="/guides/how-to-choose-cissp-course"
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
        <h1 className="text-[clamp(2rem,1.75rem+2vw,3rem)] font-bold leading-[1.1] tracking-tight text-ink-1">
          How to choose a CISSP online course
        </h1>
        <p className="mt-4 text-body text-ink-2">
          Start with how you actually learn, then check three things before you pay: hands-on practice, a timed exam simulator, and a free tier you can try first. The right course fits your schedule and your budget — not someone else’s.
        </p>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Self-paced or a live bootcamp?</h2>
          <p className="mt-2 text-body text-ink-2">
            This is the first fork in the road, and it matters more than the brand name. A live bootcamp gives you structure: fixed class hours, an instructor to question, and classmates keeping pace with you. That accountability is real, and for some learners it is the difference between finishing and drifting. The cost is money and rigidity — bootcamps are the most expensive option, and their hours are fixed whether or not they suit your job.
          </p>
          <p className="mt-2 text-body text-ink-2">
            Self-paced study is the opposite trade: far cheaper, and it fits around full-time work, night shifts, and family. The risk is entirely yours — nobody notices when you skip a week. If you choose self-paced, buy yourself the structure a bootcamp would have provided: a written plan, a weekly rhythm, and a simulator that tells you the truth about your weak domains. Most candidates working full time do better self-paced, provided the course gives them something to measure progress with.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Video-only or hands-on?</h2>
          <p className="mt-2 text-body text-ink-2">
            The CISSP is a judgment exam. Its questions describe a situation and ask for the best course of action, the first step, or the most appropriate control — and the wrong answers are usually plausible. Watching someone else make those calls does not build the judgment; making them yourself does. A course that is only videos leaves the most important skill unpractised.
          </p>
          <p className="mt-2 text-body text-ink-2">
            Look for labs in real terminals — configuring, triaging, scripting — and for practice questions that explain why each wrong answer is wrong, not just which letter is right. Road to CISSP has {COUNTS.labs} hands-on labs and {COUNTS.totalCardsPlus} flashcards built around that idea; the{' '}
            <Link to="/guides/hands-on-labs-cissp" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">labs guide</Link>
            {' '}explains what the labs add and where their limits are. Whatever provider you choose, ask the same question: where do I get to do the work, not just watch it?
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Price — and what the price buys</h2>
          <p className="mt-2 text-body text-ink-2">
            Compare what is actually included, not just the headline number: how many lessons, whether labs and simulators are included or sold separately, whether the content is updated when the ISC2 outline changes, and how long your access lasts. A cheap course that sells the simulator separately is not cheap.
          </p>
          <p className="mt-2 text-body text-ink-2">
            Road to CISSP Pro is $29/month or $250/year — the annual plan saves $98 against twelve monthly payments, about $20.83 a month — and one subscription unlocks every track, all {COUNTS.labs} labs, and the Security+ and CISSP exam simulators. The free tier needs no account: 5 lessons and 5 decks free, plus two hands-on labs, so you can judge the format before paying anything. See the{' '}
            <Link to="/pricing" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">pricing page</Link>
            {' '}for the current terms. One cost no course includes: the ISC2 exam fee itself, which ISC2 charges separately — the{' '}
            <Link to="/guides/how-long-does-cissp-take" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">how-long guide</Link>
            {' '}has the current figure and where to check it.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Exam simulators vs plain videos</h2>
          <p className="mt-2 text-body text-ink-2">
            A question bank is not a simulator. A real simulator is timed, domain-weighted like the exam, and reports your score per domain — because knowing you scored 62% overall tells you nothing, while knowing Domain 3 is at 45% tells you exactly what to study next. It should also show you the reasoning behind every answer, so a lucky guess does not masquerade as knowledge.
          </p>
          <p className="mt-2 text-body text-ink-2">
            This is also how you know when you are ready. If a course has no timed, domain-scored practice exam, you will be guessing at your readiness right up to exam day. Road to CISSP pairs its simulators with the{' '}
            <Link to="/academy/roadmap" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">roadmap</Link>
            {', '}which tracks mastery per domain, and the{' '}
            <Link to="/academy/exam" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">practice exam</Link>
            {' '}itself. Ask any provider the same question: how will I know I am ready, in numbers, per domain?
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Community and support</h2>
          <p className="mt-2 text-body text-ink-2">
            You will get stuck — on a concept, a lab, or a question whose answer makes no sense. What matters is whether anyone answers, and how fast. Before paying, check whether the provider has a place to ask questions, who answers them (an instructor, a community, or nobody), and whether the material is visibly maintained: a course whose newest content predates the current exam outline is a course that stopped caring. The{' '}
            <Link to="/faq" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">FAQ</Link>
            {' '}answers the common questions about Road to CISSP directly, and support is one email away from the contact page.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">The other names you will see</h2>
          <p className="mt-2 text-body text-ink-2">
            The CISSP market is crowded, and several providers are honest options with different strengths. Udemy is a large marketplace: quality varies by instructor, so check recency and reviews for the specific course, not the platform. Cybrary offers a broad subscription library across many certifications, which suits learners who want more than one exam. Infosec Institute is known for live, instructor-led bootcamps. Destination Certification is CISSP-focused and structured around the exam domains. InfosecTrain runs live online classes with an instructor. Any of these can work for the right learner — the checklist below is how to judge them all, including Road to CISSP, by the same standard.
          </p>
        </section>

        <Card level={2} padding="md" className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Buyer’s checklist — use it for any provider</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-ink-1 marker:text-ink-3">
            {CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-body text-ink-2">
            A provider that answers all eight clearly is a provider that has thought about how people actually pass. Start with the free tier — 5 lessons, 5 decks, and two labs, no account needed — and run the checklist against what you find.
          </p>
          <p className="mt-4">
            <Button to="/labs">Try the free labs</Button>
          </p>
        </Card>

        <FaqSection faqs={FAQS} id="choose-faq" />
      </main>

      <footer className="border-t border-black/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span className="text-caption text-ink-3">Road to CISSP — learn IT by doing it.</span>
          <div className="flex gap-4 text-caption text-ink-3">
            <Link to="/faq" className="hover:text-ink-1">FAQ</Link>
            {isAuthenticated ? (
              <Link to="/signin" className="hover:text-ink-1">Account</Link>
            ) : (
              <Link to="/pricing" className="hover:text-ink-1">Pricing</Link>
            )}
            <Link to="/privacy" className="hover:text-ink-1">Privacy</Link>
            <Link to="/terms" className="hover:text-ink-1">Terms</Link>
            <Link to="/contact" className="hover:text-ink-1">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
