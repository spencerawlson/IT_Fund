// Consolidated FAQs — the single source of truth for the /faq page.
//
// Every question and answer below is copied verbatim from the page it used
// to live on (see the per-group source comments); nothing here is invented.
// The per-page FAQ sections were removed 2026-11-13 on Spencer's call, in
// favour of this one page: the Nov 8 GEO-100 per-page FAQ sections are gone
// with them, and the FAQPage JSON-LD now lives only on /faq.
//
// Deduplication: identical question+answer pairs that appeared on several
// pages are one entry here. The two answers shared by every practice exam
// ("Can I pause the exam?" and "What happens after I finish?") appear once,
// under "All practice exams". Same-question-different-answer pairs are kept
// as separate entries (e.g. "Do I need to install anything?" — one answer
// for the Visual Lab, one for the Interactive Labs).
import {
  CERT_EXAMS,
  EXAM_QUESTION_COUNT,
  EXAM_DURATION_MIN,
  EXAM_PASS_PCT,
  SECPLUS_EXAM_QUESTION_COUNT,
  SECPLUS_EXAM_DURATION_MIN,
  SECPLUS_EXAM_PASS_PCT,
} from '@/lib/academy';

// CISSP practice exam FAQs — verbatim from PracticeExam.jsx EXAM_FAQS.
// The first answer is templated from the exam constants, as it was there.
export const CISSP_EXAM_FAQS = [
  {
    q: 'How does the practice exam work?',
    a: `${EXAM_QUESTION_COUNT} questions sampled from every track, weighted by the official CISSP domain weights. You get ${EXAM_DURATION_MIN / 60} hours on the clock, and ${EXAM_PASS_PCT}% proficiency passes this simulator.`,
    sources: [
      { label: 'ISC2 CISSP', href: 'https://www.isc2.org/certifications/cissp' },
    ],
  },
  {
    q: 'Can I pause the exam?',
    a: 'No — the timer survives a refresh, and closing the tab does not buy you time. One sitting, start to finish.',
  },
  {
    q: 'Is the real CISSP like this?',
    a: 'Not exactly. The real CISSP is computer-adaptive — it adjusts difficulty as you answer. This is fixed-length practice: a knowledge check with a per-domain breakdown, not a test-day prediction.',
    sources: [
      { label: 'ISC2 CISSP exam outline', href: 'https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline' },
    ],
  },
  {
    q: 'What happens after I finish?',
    a: 'You get a per-domain breakdown showing exactly what to study next, and you can review every missed question with the correct answer. Retake it as often as you like.',
  },
];

// Security+ practice exam FAQs — verbatim from SecplusPracticeExam.jsx.
export const SECPLUS_EXAM_FAQS = [
  {
    q: 'How does the practice exam work?',
    a: `${SECPLUS_EXAM_QUESTION_COUNT} questions sampled from every track, weighted by the official SY0-701 domain weights. You get ${SECPLUS_EXAM_DURATION_MIN} minutes on the clock, and ${SECPLUS_EXAM_PASS_PCT}% proficiency passes this simulator.`,
    sources: [
      { label: 'CompTIA Security+', href: 'https://www.comptia.org/certifications/security' },
    ],
  },
  {
    q: 'Can I pause the exam?',
    a: 'No — the timer survives a refresh, and closing the tab does not buy you time. One sitting, start to finish.',
  },
  {
    q: 'Is the real Security+ like this?',
    a: 'Not exactly. The real SY0-701 is 90 questions in 90 minutes and includes performance-based questions — drag-and-drop, simulations, and other hands-on tasks — which this simulator does not include. This is fixed-length practice: a knowledge check with a per-domain breakdown, not a test-day prediction.',
    sources: [
      { label: 'CompTIA SY0-701 exam objectives', href: 'https://www.comptia.org/certifications/security' },
    ],
  },
  {
    q: 'What happens after I finish?',
    a: 'You get a per-domain breakdown showing exactly what to study next, and you can review every missed question with the correct answer. Retake it as often as you like.',
  },
];

// Per-certification practice exam FAQs — verbatim from CertPracticeExam.jsx.
// Two answers vary by cert (exam length/format); the other two are shared
// with the CISSP/Security+ exams and live once under "All practice exams".
function certFaqs(cfg) {
  const realExam = {
    'aws-saa': 'The real SAA-C03 is 65 scenario-based questions in 130 minutes — multiple-choice and multiple-response. This simulator samples the same domains and weights, but it is a knowledge check with a per-domain breakdown, not a test-day prediction.',
    cysa: 'The real CS0-003 is 85 questions in 165 minutes and includes performance-based questions — hands-on tasks in a simulated environment — which this simulator does not include. This is fixed-length practice: a knowledge check with a per-domain breakdown, not a test-day prediction.',
    'aws-security': 'The real SCS-C02 is 65 scenario-based questions in 170 minutes — multiple-choice and multiple-response. This simulator samples the same domains and weights, but it is a knowledge check with a per-domain breakdown, not a test-day prediction.',
  }[cfg.certId] || 'This simulator samples the same domains and weights as the real exam, but it is a knowledge check with a per-domain breakdown, not a test-day prediction.';
  return [
    {
      q: 'How does the practice exam work?',
      a: `${cfg.questionCount} questions. ${cfg.blurb} You get ${cfg.durationMin} minutes on the clock, and ${cfg.passPct}% proficiency passes this simulator.`,
    },
    {
      q: 'Can I pause the exam?',
      a: 'No — the timer survives a refresh, and closing the tab does not buy you time. One sitting, start to finish.',
    },
    {
      q: `Is the real ${cfg.code} like this?`,
      a: realExam,
    },
    {
      q: 'What happens after I finish?',
      a: 'You get a per-domain breakdown showing exactly what to study next, and you can review every missed question with the correct answer. Retake it as often as you like.',
    },
  ];
}

const pick = (faqs, questions) => faqs.filter((f) => questions.includes(f.q));

// The two answers every practice exam shares, kept once.
const SHARED_EXAM_FAQS = pick(CISSP_EXAM_FAQS, [
  'Can I pause the exam?',
  'What happens after I finish?',
]);

// The two answers that vary per exam, for one exam.
const examSpecificFaqs = (faqs, realExamQuestion) => pick(faqs, [
  'How does the practice exam work?',
  realExamQuestion,
]);

export const FAQ_GROUPS = [
  // Getting started — sources: Landing.jsx (4) + Home.jsx (1)
  {
    id: 'getting-started',
    title: 'Getting started',
    faqs: [
      {
        q: 'Is Road to CISSP really free to start?',
        a: 'Yes. Start free with no credit card — sign up with Google or GitHub, no password needed. Everything works without an account too, with your progress kept in this browser.',
      },
      {
        q: 'What should I learn first?',
        a: 'Start with the roadmap — a guided route through every layer of the IT, networking, cloud, and security curriculum, from first principles to exam day.',
      },
      {
        q: 'How do the labs work?',
        a: 'Hands-on labs run in real terminals. Type labs to browse the tracks and lab start <#> to begin — this is how real lab environments work.',
      },
      {
        q: 'Which certifications does it cover?',
        a: 'Security+ (SY0-701), Network+ (N10-009), Linux+ and CySA+ (CS0-003) — all the way to the CISSP.',
      },
      {
        q: 'Do I need an account to use the library?',
        a: 'No. Everything works without an account, with your progress kept in this browser. Sign in only if you want it synced across devices.',
      },
    ],
    note: {
      text: 'Exam details come straight from the vendors:',
      links: [{ label: 'CISSP — ISC2', href: 'https://www.isc2.org/certifications/cissp' }, { label: 'Security+ — CompTIA', href: 'https://www.comptia.org/certifications/security' }, { label: 'Network+ — CompTIA', href: 'https://www.comptia.org/certifications/network' }],
    },
  },
  // Pricing & billing — sources: Pricing.jsx (6) + Landing.jsx (1)
  {
    id: 'pricing-billing',
    title: 'Pricing & billing',
    faqs: [
      {
        q: 'What does Pro unlock?',
        a: 'One subscription unlocks every track, 23+ hands-on labs, and Security+ & CISSP exam simulators — $19/month, cancel anytime. Your progress syncs across devices.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel in one click from your account page — no emails, no phone calls, no retention gauntlet. You keep full access until the end of your billing period.',
      },
      {
        q: 'What happens to my progress if I cancel?',
        a: 'Nothing is deleted. Your streaks, XP, badges, and history stay on your account. You drop back to the free tier until you resubscribe.',
      },
      {
        q: 'What if I want a refund?',
        a: 'If this is your first subscription and you ask within 14 days of subscribing, you get your money back — email support@road2cissp.com with the date you subscribed. After that, refunds are decided case by case. A subscription refunded in full loses access and is cancelled, so you are not charged again.',
      },
      {
        q: 'What happens if my payment fails?',
        a: 'Your subscription goes past due and you keep full access for 7 days while you fix the payment — update your card in the Stripe Customer Portal, reached from your account page. After 7 days without a successful payment, access is revoked until you resubscribe.',
      },
      {
        q: 'What exactly is free?',
        a: 'Five sample lessons, 57 flashcards, two hands-on labs, and all marketing pages — no account or payment needed. Everything beyond that needs the subscription.',
      },
      {
        q: 'Is this enough to pass Security+ or CISSP?',
        a: 'That is the goal we build toward: flashcards mapped to official objectives, scenario-based practice, hands-on labs, and timed exam sims. We recommend pairing it with the official exam objectives checklist as you study.',
      },
    ],
    note: {
      text: 'Before you book the exam, check the official objectives:',
      links: [{ label: 'CISSP exam outline — ISC2', href: 'https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline' }, { label: 'Security+ exam objectives — CompTIA', href: 'https://www.comptia.org/certifications/security' }],
    },
  },
  // Library — sources: Home.jsx (3)
  {
    id: 'library',
    title: 'Library',
    faqs: [
      {
        q: 'How do I find a concept?',
        a: 'Use the search box — it searches every concept’s name, summary, and notes — or filter by level to browse one slice of the library at a time.',
      },
      {
        q: 'What is a module?',
        a: 'A module is a bundle of related concepts — for example, a networking module covers addressing, routing, and DNS. Each concept has a short summary and detailed study notes with examples.',
        sources: [{ label: 'NIST CSRC Glossary', href: 'https://csrc.nist.gov/glossary' }],
      },
      {
        q: 'Is the library the same as the courses?',
        a: 'It is the same material, organized differently. Courses order the modules into a guided sequence; the library keeps every module available for reference and search.',
      },
    ],
  },
  // Visual Lab — sources: Lab.jsx (4)
  {
    id: 'visual-lab',
    title: 'Visual Lab',
    faqs: [
      {
        q: 'Do I need to install anything?',
        a: 'No. Everything runs in the browser — 3D models, animations, and tools like the subnet calculator. Nothing to download, nothing to configure.',
      },
      {
        q: 'What can I explore here?',
        a: 'Seven areas: hardware, networking, routing, cloud and scale, security, data and systems, and DevOps. Pick a subject — the OSI model, the TCP handshake, DNS resolution, BGP path selection, the TLS handshake — and step through how it works.',
        sources: [{ label: 'RFC 793: TCP', href: 'https://www.rfc-editor.org/rfc/rfc793' }, { label: 'RFC 1035: DNS', href: 'https://www.rfc-editor.org/rfc/rfc1035' }, { label: 'RFC 8446: TLS 1.3', href: 'https://www.rfc-editor.org/rfc/rfc8446' }],
      },
      {
        q: 'How is the Visual Lab different from the Interactive Labs?',
        a: 'Here you watch and explore: animations and 3D models that show how things work. In the Interactive Labs you do it yourself in a real terminal — several subjects link straight through with “Build this in the Interactive Lab”.',
      },
      {
        q: 'Can I share a subject with someone?',
        a: 'Yes. Opening a subject updates the page address, so you can copy the link and send it — it opens on the same subject.',
      },
    ],
  },
  // Interactive labs — sources: LabLauncher.jsx (4)
  {
    id: 'interactive-labs',
    title: 'Interactive labs',
    faqs: [
      {
        q: 'How do I start a lab?',
        a: 'Type labs to see the tracks, then lab start followed by the lab’s number — for example lab start 1. Type lab info and the number first if you want the details before you begin.',
      },
      {
        q: 'Do I need to install anything?',
        a: 'No. The labs run in real terminals in your browser — networking, Linux, Python, and cloud. Nothing to download or configure. The Python labs follow the official Python Tutorial, and the networking labs use the same tools the Wireshark guide documents.',
        sources: [{ label: 'The Python Tutorial', href: 'https://docs.python.org/3/tutorial/' }, { label: 'Wireshark User’s Guide', href: 'https://www.wireshark.org/docs/wsug_html_chunked/' }],
      },
      {
        q: 'What if I get stuck?',
        a: 'Type help to see every command, lab info and the lab’s number for its instructions, or go back to the track list with back. Your progress is saved — see it on the My progress page.',
      },
      {
        q: 'How are these labs different from the Visual Lab?',
        a: 'The Visual Lab shows you how things work with animations and 3D models. Here you type the commands yourself — it is the same material, hands-on.',
      },
    ],
  },
  // Courses — sources: Courses.jsx (4)
  {
    id: 'courses',
    title: 'Courses',
    faqs: [
      {
        q: 'Do I have to take courses in order?',
        a: 'No. Every course is open at every level — follow the recommended order, or start where you need to. Modules inside a course work the same way.',
      },
      {
        q: 'What is inside a course?',
        a: 'A sequence of modules, and each module a sequence of lessons — plus cheat sheets and hands-on labs. Every course also lists the skills it teaches and the certifications it prepares you for.',
      },
      {
        q: 'Which course should I take first?',
        a: 'Start with the roadmap: it orders the courses into seven steps, from IT foundations through Network+ and Security+ to the CISSP. Security+ is the flagship course if you want one place to begin.',
      },
      {
        q: 'Are the courses tied to real certifications?',
        a: 'Yes. Courses prepare you for CompTIA Network+, Security+, Linux+ and CySA+, Cisco CCNA, and the ISC2 CISSP, among others — each course page lists the certifications it prepares you for.',
        sources: [{ label: 'CompTIA Security+', href: 'https://www.comptia.org/certifications/security' }, { label: 'ISC2 CISSP', href: 'https://www.isc2.org/certifications/cissp' }],
      },
    ],
  },
  // Career paths — sources: Paths.jsx (4)
  {
    id: 'career-paths',
    title: 'Career paths',
    faqs: [
      {
        q: 'What is a career path?',
        a: 'A path is a set of courses aimed at one role — for example Networking, Cybersecurity, or Cloud Security. Each path lists its courses in order, with the time it takes and the background that makes it easier.',
      },
      {
        q: 'Do I have to finish one path before starting another?',
        a: 'No. Every path is open from the start — nothing is locked. The prerequisites are advice, not gates: they tell you which background makes a path easier, not whether you may start it.',
      },
      {
        q: 'Which path should I start with?',
        a: 'If you are new to IT, start with IT Foundations, then follow the roadmap — it lays out the seven steps from foundations to the CISSP in the order most successful candidates take them.',
      },
      {
        q: 'What certification does a path prepare me for?',
        a: 'It depends on the path. Networking leads toward CompTIA Network+, Cybersecurity toward Security+ and CySA+, and every path builds toward the CISSP capstone. Each course page lists the certifications it prepares you for.',
        sources: [{ label: 'CompTIA Network+', href: 'https://www.comptia.org/certifications/network' }, { label: 'ISC2 CISSP', href: 'https://www.isc2.org/certifications/cissp' }],
      },
    ],
  },
  // CISSP roadmap — sources: CisspRoadmap.jsx (4)
  {
    id: 'cissp-roadmap',
    title: 'CISSP roadmap',
    faqs: [
      {
        q: 'How long does the roadmap take?',
        a: 'The seven steps run about 1–2, 2–3, 2–3, 3–4, 3–4, 2–3, and 3–6 months — roughly a year and a half to two years at the suggested pace. Your pace is your own: a step counts as done at 80% mastery, whenever you get there.',
      },
      {
        q: 'What does “ready” mean?',
        a: '80% mastery in all eight CISSP domains. Each domain’s readiness is half its capstone lesson and half every earlier lesson tagged with it — so early study counts toward the exam.',
      },
      {
        q: 'Do I have to follow the steps in order?',
        a: 'No. Nothing is locked — every lesson can be opened at any time. The steps are the order most successful candidates take, and prerequisites are recommendations, not gates.',
      },
      {
        q: 'What do I need to sit the CISSP itself?',
        a: 'The CISSP needs five years of paid experience across two or more of its eight domains — or you can become an Associate of ISC2, with six years to earn the experience. The exam itself is the final step of this roadmap.',
        sources: [{ label: 'ISC2 CISSP', href: 'https://www.isc2.org/certifications/cissp' }],
      },
    ],
  },
  // Badges & streaks — sources: Badges.jsx (5)
  {
    id: 'badges',
    title: 'Badges & streaks',
    faqs: [
      {
        q: 'How do I earn a badge?',
        a: 'Badges are awarded automatically as you study. Review your first card for First Steps, keep a daily streak for On a Roll, Week Warrior and Unbreakable, master a deck for Deck Master, and beat a tier boss for Boss Slayer.',
      },
      {
        q: 'What is a streak?',
        a: 'Studying on consecutive days. Three days in a row earns On a Roll, seven earns Week Warrior, and thirty earns Unbreakable.',
      },
      {
        q: 'What does the CISSP-Ready badge mean?',
        a: 'You reached 80% readiness in all eight CISSP domains — the same bar the roadmap uses for exam-ready. It is a readiness marker, not a certification.',
      },
      {
        q: 'What is the mastered box?',
        a: 'Cards move through review boxes as you answer them correctly — the Leitner system: get a card right and it waits longer before coming back; get it wrong and it returns sooner. One hundred cards in the mastered box earns Century.',
        sources: [{ label: 'Leitner system', href: 'https://en.wikipedia.org/wiki/Leitner_system' }],
      },
      {
        q: 'Do badges count toward a certification?',
        a: 'No. Badges are motivation inside Road to CISSP — they unlock nothing and never expire; they just mark progress. Certifications themselves are issued by the vendors: the CISSP by ISC2, Security+ by CompTIA.',
        sources: [{ label: 'ISC2 CISSP', href: 'https://www.isc2.org/certifications/cissp' }, { label: 'CompTIA Security+', href: 'https://www.comptia.org/certifications/security' }],
      },
    ],
  },
  // Practice exams — sources: PracticeExam.jsx, SecplusPracticeExam.jsx,
  // CertPracticeExam.jsx (one subgroup per certification). The shared
  // answers live once; each subgroup holds only what varies for that exam.
  {
    id: 'practice-exams',
    title: 'Practice exams',
    sections: [
      {
        id: 'practice-exams',
        title: 'All practice exams',
        faqs: SHARED_EXAM_FAQS,
      },
      {
        title: 'CISSP practice exam',
        faqs: examSpecificFaqs(CISSP_EXAM_FAQS, 'Is the real CISSP like this?'),
      },
      {
        title: 'Security+ practice exam',
        faqs: examSpecificFaqs(SECPLUS_EXAM_FAQS, 'Is the real Security+ like this?'),
      },
      ...Object.values(CERT_EXAMS).map((cfg) => ({
        title: `${cfg.title} (${cfg.code}) practice exam`,
        faqs: examSpecificFaqs(certFaqs(cfg), `Is the real ${cfg.code} like this?`),
      })),
    ],
  },
];

// Flat list of every consolidated entry (52), for the FAQPage JSON-LD.
export const ALL_FAQS = FAQ_GROUPS.flatMap((g) =>
  g.sections ? g.sections.flatMap((s) => s.faqs) : g.faqs,
);
