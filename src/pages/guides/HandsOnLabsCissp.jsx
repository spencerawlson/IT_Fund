import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button, Card } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';
import FaqSection, { faqJsonLd } from '@/components/FaqSection';
import { COUNTS } from '@/data/counts';

const PAGE_TITLE = 'Do hands-on labs help with CISSP preparation? · Road to CISSP';
const PAGE_DESCRIPTION =
  'Yes — for most candidates. Why doing beats watching for a thinking exam, what Road to CISSP labs actually are, and where their limits lie.';

const FAQS = [
  {
    q: 'Do I need to install anything to use the labs?',
    a: 'No. The labs run in your browser in real terminals — nothing to install, no virtual machine to set up, and nothing to break on your own computer.',
  },
  {
    q: 'How many labs are free?',
    a: 'Two labs are free with no plan and no account needed, so you can try the format before paying. The rest of the labs need a Pro subscription.',
  },
  {
    q: 'Can labs alone get me through the CISSP?',
    a: 'No. Labs cement the domains, they do not replace reading them. The exam also tests governance, risk, law, and management — subjects no terminal teaches. Pair labs with the lessons, flashcards, and timed exam simulators.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Do hands-on labs help with CISSP preparation?',
      description: PAGE_DESCRIPTION,
      author: { '@type': 'Organization', name: 'Road to CISSP', url: 'https://www.road2cissp.com' },
    },
    faqJsonLd(FAQS),
  ],
};

export default function HandsOnLabsCissp() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        path="/guides/hands-on-labs-cissp"
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
          Do hands-on labs help with CISSP preparation?
        </h1>
        <p className="mt-4 text-body text-ink-2">
          Yes, for most candidates. The CISSP is a thinking exam: it tests judgment across eight domains, not recall of facts. Labs build that judgment — you make a call, see the consequence, and remember it. Videos teach the concept; labs teach the decision.
        </p>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">What labs add that video alone cannot</h2>
          <p className="mt-2 text-body text-ink-2">
            Watching someone configure a firewall is not the same as configuring one yourself. The CISSP rarely asks what a control is — it asks which control fits a scenario, what to do first, or which answer is most appropriate. Those are judgment calls, and judgment comes from making calls and living with the result. In a lab, a wrong choice breaks something visible: the hosts cannot talk, the log shows the intrusion you missed, the policy you wrote is wider than you thought. That mistake costs nothing and teaches more than a chapter of reading, because you felt the consequence instead of memorising it.
          </p>
          <p className="mt-2 text-body text-ink-2">
            Labs also close the gap between recognising an answer and producing one. A multiple-choice question lets you recognise the right option among four; a terminal gives you a blank prompt. If you can build the thing from nothing, the exam question about it feels easy. And there is a quieter benefit: confidence. Candidates who have actually done the work walk into the exam knowing what a VLAN, an IAM policy, or a packet capture looks like in practice, not just in a diagram.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">What Road to CISSP labs actually are</h2>
          <p className="mt-2 text-body text-ink-2">
            Road to CISSP has {COUNTS.labs} hands-on labs: 31 simulated labs that walk you through a scenario step by step, and 30 labs that run in real Docker containers — one hardened container per session, with a real terminal to work in. The terminals are the point: Cisco IOS, Linux triage, Python automation, and cloud sandboxes, not screenshots of terminals. Two labs are free with no plan and no account needed; the rest need a Pro subscription ($29/month or $250/year). You can browse them all from the{' '}
            <Link to="/labs" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">labs page</Link>
            {' '}and see the full price on the{' '}
            <Link to="/pricing" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">pricing page</Link>.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">What you actually do in a lab</h2>
          <p className="mt-2 text-body text-ink-2">
            A lab is a task with a terminal, not a video with a quiz at the end. Concrete examples:
          </p>
          <ul className="mt-2 max-w-reading list-disc space-y-2 pl-5 text-body text-ink-1 marker:text-ink-3">
            <li>Configure a VLAN on a Cisco switch, then test which hosts can actually reach each other — and fix it when they cannot.</li>
            <li>Triage a Linux log after a simulated intrusion, and work out how the attacker got in from the evidence in front of you.</li>
            <li>Write a Python script that automates a repetitive security check instead of doing it by hand for the tenth time.</li>
            <li>Audit an AWS IAM policy, find the over-broad permission, and tighten it without breaking the application that depends on it.</li>
          </ul>
          <p className="mt-2 text-body text-ink-2">
            Each lab maps to the CISSP domain it exercises, so the doing stays connected to the exam. The three missions — Glasshouse, Broken Shield, and Packet Flood — take the same idea further: multi-step incidents where you investigate, contain, and report, the way the job actually works.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Who labs help most — and who can skip them</h2>
          <p className="mt-2 text-body text-ink-2">
            Labs help most the people who learn by doing, career-changers with little hands-on background, and anyone whose weakest domains are the technical ones — security architecture, network security, and security operations. If reading alone leaves you nodding along without retaining anything, labs are the fix: they force you to produce, not just consume.
          </p>
          <p className="mt-2 text-body text-ink-2">
            Engineers who already live in terminals every day can move faster through the labs — the commands are familiar — but the exam-style scenarios are still worth doing, because the CISSP asks what you would do, not what you can type. The people who get the least from labs are those aiming mainly at the management domains, where reading, flashcards, and timed simulators carry more weight. Nobody should skip labs entirely, but the balance shifts with your background.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">The honest limit</h2>
          <p className="mt-2 text-body text-ink-2">
            Labs cement the domains; they do not replace reading them. Half the CISSP is governance, risk management, law, and organisational behaviour — subjects no terminal teaches. A candidate who only does labs will know how a firewall works and still miss the question about which framework the board should adopt. The combination that works is the one the{' '}
            <Link to="/academy/roadmap" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">roadmap</Link>
            {' '}is built around: lessons for the concepts, {COUNTS.totalCardsPlus} flashcards for retention, labs for judgment, and the timed{' '}
            <Link to="/academy/exam" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">practice exams</Link>
            {' '}to prove — under pressure — that the knowledge holds together. If you have more questions, the{' '}
            <Link to="/faq" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">FAQ</Link>
            {' '}covers pricing, the free tier, and how the labs and exams work.
          </p>
        </section>

        <Card level={2} padding="md" className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Try one before you decide</h2>
          <p className="mt-2 text-body text-ink-2">
            Two labs are free with no account and no payment — run one and see whether the format works for you. If doing beats watching for the way you learn, the other {COUNTS.labs - 2} labs are part of Pro.
          </p>
          <p className="mt-4">
            <Button to="/labs">Browse the labs</Button>
          </p>
        </Card>

        <FaqSection faqs={FAQS} id="labs-faq" />
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
