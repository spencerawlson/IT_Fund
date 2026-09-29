import React from 'react';
import { ArrowRight, Check, AlertTriangle, XCircle, Info } from 'lucide-react';
import { ACTION, INK, SEMANTIC, contrast, hexToRgb, worstContrast } from '@/lib/design/tokens';

// Dev-only preview of the design system (route /design, not in production builds).
// Phase 1 of docs/IMPLEMENTATION_PLAN.md: approve the look here before pages change.

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
      {description && <p className="mt-1 max-w-reading text-small text-ink-3">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function DesignSystem() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-8">
      <p className="text-caption font-semibold uppercase tracking-wider text-ink-3">Phase 1 preview · dev only</p>
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
          <button type="button" className="inline-flex items-center gap-2 rounded-control bg-action px-5 py-3 text-body font-semibold text-action-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:bg-action-hover">
            Continue learning <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="rounded-control border border-white/15 bg-white/5 px-5 py-3 text-body font-semibold text-ink-1 transition hover:bg-white/10">
            Secondary
          </button>
          <button type="button" className="rounded-control px-4 py-3 text-body font-semibold text-ink-2 transition hover:bg-white/5 hover:text-ink-1">
            Ghost
          </button>
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
    </main>
  );
}
