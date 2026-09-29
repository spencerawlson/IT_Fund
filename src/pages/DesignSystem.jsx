import React from 'react';
import { ArrowRight, Check, AlertTriangle, XCircle, Info, Play, RotateCcw, BookOpen, Clock, Layers, SearchX, ExternalLink } from 'lucide-react';
import {
  Badge, Button, Card, CardFooter, CardHeader, EmptyState, LessonRow, PageHeader,
  ProgressBar, ProgressRing, SectionHeader, Stat, StatusBadge, Tabs,
} from '@/components/ui-glass';
import { ACTION, INK, SEMANTIC, contrast, hexToRgb, worstContrast } from '@/lib/design/tokens';

// Dev-only preview of the design system (route /design, not in production builds).
// Phases 1-2 of docs/IMPLEMENTATION_PLAN.md: approve tokens and components here before pages change.

const LEVELS = [
  { cls: 'glass-1', name: 'Glass 1', use: 'Cards and navigation. Light frost; the background stays visible.' },
  { cls: 'glass-2', name: 'Glass 2', use: 'Reading surfaces: lessons, course syllabus. Text never depends on the background.' },
  { cls: 'glass-3', name: 'Glass 3', use: 'Menus, dialogs and the tutor panel. Sits above everything else.' },
];

const TYPE = [
  { cls: 'text-title', label: 'Title', size: '28–32px', sample: 'Lesson 2.2: Switching & Routing' },
  { cls: 'text-heading', label: 'Heading', size: '20px', sample: 'How a router chooses a path' },
  { cls: 'text-lesson', label: 'Lesson body', size: '17px', sample: 'A router matches each packet’s destination against its routing table and uses the longest prefix match.' },
  { cls: 'text-body', label: 'Body', size: '16px', sample: 'Lessons open in order, so each one builds on the last.' },
  { cls: 'text-small', label: 'Small', size: '14px', sample: '3 lessons · 39 min' },
  { cls: 'text-caption', label: 'Caption', size: '12px (minimum)', sample: 'Module 2 · Intermediate' },
];

const STATUS = [
  { key: 'success', label: 'Passed', icon: Check, cls: 'text-success' },
  { key: 'warning', label: 'Needs review', icon: AlertTriangle, cls: 'text-warning' },
  { key: 'danger', label: 'Incorrect', icon: XCircle, cls: 'text-danger' },
  { key: 'info', label: 'Note', icon: Info, cls: 'text-info' },
];

const ratio = (n) => `${n.toFixed(1)}:1`;

function Section({ title, description, children }) {
  return (
    <section className="mt-14">
      <h2 className="text-heading text-ink-1">{title}</h2>
      {description && <p className="mt-1 max-w-reading text-small text-ink-2">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function DesignSystem() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-8">
      <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Phases 1–2 preview · dev only</p>
      <h1 className="mt-2 text-title text-ink-1">Design system</h1>
      <p className="mt-3 max-w-reading text-body text-ink-2">
        One accent, three glass levels, one type scale. Every page will be rebuilt from these pieces.
        Contrast figures are the worst case across the whole background.
      </p>

      <Section title="Glass levels" description="Each level has one job. The more a surface is read, the more opaque it is.">
        <div className="grid gap-4 md:grid-cols-3">
          {LEVELS.map(({ cls, name, use }) => (
            <div key={cls} className={`${cls} rounded-card p-6`}>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">{cls}</p>
              <p className="mt-2 text-heading text-ink-1">{name}</p>
              <p className="mt-2 text-small text-ink-2">{use}</p>
              <dl className="mt-5 space-y-1 text-caption text-ink-2">
                {Object.entries(INK).map(([key, hex]) => {
                  const r = worstContrast(hex, cls);
                  return (
                    <div key={key} className="flex justify-between">
                      <dt>{key} text</dt>
                      <dd className="tabular-nums">{r >= 4.5 ? ratio(r) : 'not allowed here'}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="glass rounded-[2rem] p-6">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Before · legacy .glass</p>
            <p className="mt-2 text-small text-ink-2">Heavier highlight and tint. Being replaced page by page.</p>
          </div>
          <div className="glass-1 rounded-card p-6">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">After · glass-1</p>
            <p className="mt-2 text-small text-ink-2">Same identity, less noise.</p>
          </div>
        </div>
      </Section>

      <Section title="Accent" description="Amber is the only colour for primary actions and focus. Nothing decorative uses it.">
        <div className="glass-2 flex flex-wrap items-center gap-4 rounded-card p-6">
          <Button iconAfter={ArrowRight}>Continue learning</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <span className="text-small text-ink-3">
            Button text {ratio(contrast(hexToRgb(ACTION.actionInk), hexToRgb(ACTION.action)))} · press Tab to see the focus ring
          </span>
        </div>
      </Section>

      <Section title="Status colours" description="Used only to carry meaning, always with an icon or word, never alone.">
        <div className="glass-2 grid gap-4 rounded-card p-6 sm:grid-cols-4">
          {STATUS.map(({ key, label, icon: Icon, cls }) => (
            <p key={key} className={`flex items-center gap-2 text-body font-semibold ${cls}`}>
              <Icon size={18} aria-hidden="true" /> {label}
              <span className="ml-auto text-caption font-normal tabular-nums text-ink-3">{ratio(worstContrast(SEMANTIC[key], 'glass-2'))}</span>
            </p>
          ))}
        </div>
      </Section>

      <Section title="Type scale" description="Inter. Body text is 16px, lesson text 17px at no more than 70 characters per line.">
        <div className="glass-2 divide-y divide-white/5 rounded-card px-6">
          {TYPE.map(({ cls, label, size, sample }) => (
            <div key={cls} className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:items-baseline">
              <p className="text-caption text-ink-3">{label} · {size}</p>
              <p className={`${cls} max-w-reading text-ink-1`}>{sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shape and spacing" description="Three radii and an 8px grid.">
        <div className="glass-2 flex flex-wrap items-end gap-6 rounded-card p-6">
          <div className="text-center">
            <div className="h-12 w-28 rounded-control border border-white/15 bg-white/5" />
            <p className="mt-2 text-caption text-ink-3">Control · 12px</p>
          </div>
          <div className="text-center">
            <div className="h-20 w-32 rounded-card border border-white/15 bg-white/5" />
            <p className="mt-2 text-caption text-ink-3">Card · 20px</p>
          </div>
          <div className="text-center">
            <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-caption text-ink-2">Badge</span>
            <p className="mt-2 text-caption text-ink-3">Pill · badges only</p>
          </div>
          <div className="flex items-end gap-2">
            {[1, 2, 3, 4, 6, 8].map((n) => (
              <div key={n} className="text-center">
                <div className="w-3 rounded-sm bg-ink-3/40" style={{ height: n * 8 }} />
                <p className="mt-2 text-caption tabular-nums text-ink-3">{n * 8}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <h2 className="mt-24 border-t border-white/10 pt-10 text-title text-ink-1">Components</h2>
      <p className="mt-2 max-w-reading text-body text-ink-2">
        Import from <code className="rounded bg-white/10 px-1.5 py-0.5 text-small">@/components/ui-glass</code>. Pages are rebuilt from these in Phase 4.
      </p>

      <Section title="Button" description="Primary is amber and appears once per view. Secondary for alternatives, ghost for low-emphasis actions.">
        <Card level={2} padding="lg" className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={Play}>Start lesson</Button>
            <Button variant="secondary" icon={BookOpen}>Read the lesson</Button>
            <Button variant="ghost" icon={RotateCcw}>Review</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">Large</Button>
            <Button>Medium</Button>
            <Button size="sm">Small</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" href="https://www.isc2.org/certifications/cissp" iconAfter={ExternalLink}>External link</Button>
          </div>
        </Card>
      </Section>

      <Section title="Badge" description="Neutral for facts. Status badges pair an icon with a word, so meaning never relies on colour.">
        <Card level={2} padding="lg" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Beginner</Badge>
            <Badge>3 modules</Badge>
            <Badge icon={Clock}>1 h 50 min</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {['completed', 'in-progress', 'not-started', 'available', 'locked', 'coming-soon'].map((s) => <StatusBadge key={s} status={s} />)}
          </div>
        </Card>
      </Section>

      <Section title="Progress" description="Amber while in progress, green when complete. Always labelled for screen readers.">
        <Card level={2} padding="lg" className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-4">
            <ProgressBar value={0} label="Not started" />
            <ProgressBar value={45} label="In progress" />
            <ProgressBar value={100} label="Complete" />
            <ProgressBar value={60} label="Compact" size="sm" showValue={false} />
          </div>
          <div className="flex gap-4">
            <ProgressRing value={0} label="Not started" />
            <ProgressRing value={45} label="In progress" />
            <ProgressRing value={100} label="Complete" size={56} />
          </div>
        </Card>
      </Section>

      <Section title="Card" description="Level 1 for tiles on the background, level 2 for reading. Only linked cards react to hover.">
        <div className="grid gap-4 md:grid-cols-2">
          <Card to="/design">
            <CardHeader eyebrow="Course" title="Network Engineering" description="How packets actually move, aligned to Network+." trailing={<StatusBadge status="in-progress" />} />
            <ProgressBar value={33} label="Course progress" className="mt-5" />
            <CardFooter>
              <span className="text-small text-ink-2">3 modules · 9 lessons</span>
              <span className="inline-flex items-center gap-1 text-small font-semibold text-ink-1">Open <ArrowRight size={16} aria-hidden="true" /></span>
            </CardFooter>
          </Card>
          <Card level={2}>
            <CardHeader title="What you’ll learn" />
            <ul className="mt-4 space-y-2 text-body text-ink-2">
              {['Explain traffic with the OSI and TCP/IP models', 'Subnet IPv4 and read IPv6 addresses', 'Troubleshoot methodically'].map((t) => (
                <li key={t} className="flex gap-3"><Check size={18} className="mt-1 shrink-0 text-success" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Lesson row" description="The syllabus unit. The learner’s next lesson is highlighted; locked lessons are not links.">
        <Card level={2} padding="sm" className="space-y-1">
          <LessonRow number="1.1" title="OSI & TCP/IP Models" status="completed" minutes={13} to="/design" />
          <LessonRow number="1.2" title="Ports & Protocols" status="in-progress" minutes={15} to="/design" current />
          <LessonRow number="1.3" title="Devices, Media & Topologies" status="available" minutes={11} to="/design" />
          <LessonRow number="2.1" title="IPv4, IPv6 & Subnetting" status="locked" minutes={14} />
        </Card>
      </Section>

      <Section title="Tabs" description="Underline tabs; arrow keys move between them.">
        <Card level={2} padding="lg">
          <Tabs
            label="Lesson sections"
            items={[
              { value: 'learn', label: 'Learn', content: <p className="max-w-reading text-lesson text-ink-1">Switches move frames inside a network; routers move packets between networks.</p> },
              { value: 'examples', label: 'Examples', content: <p className="text-body text-ink-2">Worked examples appear here.</p> },
              { value: 'cheat', label: 'Cheat sheet', content: <p className="text-body text-ink-2">Key facts at a glance.</p> },
            ]}
          />
        </Card>
      </Section>

      <Section title="Page header, section header, stats" description="Every page opens the same way: breadcrumbs, one title, a short description, at most one primary action.">
        <Card level={2} padding="lg">
          <PageHeader
            breadcrumbs={[{ label: 'Home', to: '/design' }, { label: 'Network Engineering', to: '/design' }, { label: 'Module 1' }]}
            eyebrow="Module 1 · Beginner"
            title="Networking Fundamentals"
            description="Models, ports, protocols, devices and media."
            actions={<><Button icon={Play}>Continue: Lesson 1.2</Button><Button variant="secondary">View syllabus</Button></>}
          />
          <SectionHeader title="In this module" description="3 lessons" action={<Button variant="ghost" size="sm">Expand all</Button>} />
          <div className="flex flex-wrap gap-8">
            <Stat icon={Layers} label="Lessons" value="9" />
            <Stat icon={Clock} label="Time left" value="1 h 50 min" />
          </div>
        </Card>
      </Section>

      <Section title="Empty state" description="What happened, and one way forward.">
        <EmptyState icon={SearchX} title="Lesson not found" text="It may have moved. Your progress is safe." action="Back to your course" to="/design" />
      </Section>
    </main>
  );
}
