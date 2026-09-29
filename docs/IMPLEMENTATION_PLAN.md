# Road to CISSP — Visual Overhaul Plan

Status: **draft for review** (2026-09-28, revised). Nothing below is built yet.

**Goal:** make the app look and behave like a professional learning platform: calm, consistent,
focused on the lesson. Keep the liquid-glassmorphism identity.

**Out of scope for now:** subscription/Stripe, accounts and server-side progress, mobile store
apps. Filling lesson content is deferred too (Part C), except where empty content breaks a layout.

---

## Part A — What makes it feel "all over the place"

Found by screenshotting every main page at 1440px and 390px, then counting styles in the code.

### A1. The background competes with the content
- Three saturated colour blobs (amber, fuchsia, cyan) at 55% opacity sit behind everything.
  The glass panels are translucent, so **each card picks up a different colour** depending on
  where it sits. On the home page the grid runs blue → teal → purple → grey for identical cards.
- The tint **changes per page**: amber on the dashboard, blue on the Network course, amber again
  inside the Python lesson. Moving between pages feels like switching apps.
- Body text often sits directly on bright colour, which hurts readability.

### A2. Too many colours, none of them meaning anything
- Primary buttons come in three colours: amber ("Continue learning", "Start lesson"), blue
  ("Start: Lesson 1.1"), cyan ("Open Lab").
- The brand wordmark is cyan, the section labels are amber, and each course and CISSP domain has
  its own colour. Difficulty badges use green, blue, amber and red.
- There are **36 distinct hex colours** in components and data.

### A3. Two navigation systems at once
- The global top bar (Academy, Tracks, Visual Lab, Challenges, Learning Path, **Config**, search,
  Open Lab) sits above a second Academy sidebar (Dashboard, Career paths, Courses, Review, Road to
  CISSP). Phones get a third control, the "Academy menu" button.
- `/` (the first page a visitor sees) is the **legacy 38-module grid**, not the Academy.
- "Config" is a developer page, but it sits in the main navigation.
- The orange **"Ask the tutor"** button floats over content on every page. It covers cards on
  desktop and the "Continue learning" panel on mobile.

### A4. No consistent visual system
- **Corner radii:** 10 different values are in use, from `rounded-sm` to `rounded-[2rem]`.
- **Text sizes:** 207 uses of 9, 10 and 11px text. Grey helper text on dark glass (for example
  "Courses for this path are in development") is about **3.4:1 contrast**, below the WCAG AA
  minimum of 4.5:1.
- **Glass:** 38 files use the shared `.glass` class, but 55 files hand-roll their own
  translucent panels with `bg-white/[0.0x] border-white/10`.
- **Pills:** status, metadata, tabs, skills, certifications, resources and chips all use the same
  rounded pill, so nothing stands out. The roadmap page has walls of 20+ chips per CISSP domain.
- **Page headings:** the dashboard says "Start here." at 48px, while other pages use 24–32px
  titles with an amber or grey eyebrow label above.

### A5. Too much on screen at once
- The dashboard shows all 11 career paths, 4 of them "Coming soon". Phones scroll through
  ~4,800px of cards before reaching progress.
- New learners see "0 days" streak, "0 / 100 XP", "Level 1 Recruit" and "0%" repeated on every
  card. Gamification at zero reads as noise, not motivation.
- The lesson reading page renders a single sentence plus a "Quiz & practice" box for 63 of 64
  lessons. It looks unfinished.

### What already works (keep it)
- The lesson player's focus mode: no site navigation, one progress bar, one clear action.
- The course syllabus: numbered lessons, ✓ / ○ / 🔒 states, time estimates.
- Breadcrumbs, the dark base, the CPU-chip logo, and the glass edge highlight.

---

## Part B — The plan

Principles: **one accent colour, one navigation, one set of components, one reading surface.**
The glass stays, but the background becomes quieter and text always sits on a surface opaque
enough to read.

Every phase ends with:
- tests: `node ./node_modules/vitest/vitest.mjs run`
- lint: `node ./node_modules/eslint/bin/eslint.js . --quiet`
- build: `node ./node_modules/vite/bin/vite.js build`
- before/after screenshots at **360, 390, 768 and 1440px** of every page touched, for your review

### Phase 1 — Design foundations (tokens + a preview page)
Defined once in `src/index.css` and `tailwind.config.js`:
- **Colour.** One neutral scale, **one accent** for actions and focus (see Q1), and four semantic
  colours: success, warning, danger, info. Course colours shrink to a small icon tile only; they
  never tint panels, buttons or the page.
- **Background.** A single fixed tint for the whole app. Blob opacity drops from 0.55 to about
  0.25, the blobs move more slowly, and a darker scrim sits behind the content column. The
  `useBgTint` per-page switching is removed.
- **Glass levels.**
  - `glass-1`: navigation and cards
  - `glass-2`: reading surfaces, with a more opaque fill so text is always on a dark,
    even background
  - `glass-3`: menus, dialogs and the tutor panel

  The per-card radial highlight becomes one subtle top edge.
- **Type scale.** Page title 32/40px, section 20px, body 16px (17px in lessons),
  small 14px, caption 12px minimum. Nothing below 12px. Reading width capped at about
  70 characters per line.
- **Spacing and radius.** An 8px spacing grid and three radii: controls 12px, cards 20px,
  pills fully round (for badges only).
- **Contrast.** All text meets WCAG AA (4.5:1) on its glass level.
- **Review step.** A dev-only `/design` route shows every token and component on the real
  background, so you can approve the look before any page changes.
- **Exit:** you approve `/design`.

### Phase 2 — Component kit
Build the pieces once in `src/components/ui-glass/` (or extend `src/components/academy/ui/`):
- `Button`: primary, secondary and ghost variants, plus a loading state
- `Card`: header and footer slots, hover only when clickable
- `Badge`: status and neutral only, with fixed meanings
- `ProgressBar` and `ProgressRing`
- `Tabs`, `PageHeader` (title, description, actions), `SectionHeader`, `EmptyState`, `Stat`
- `LessonRow`

Existing shared components (`bits.jsx`, `cards.jsx`) are rebuilt on these. A lint check or test
flags new hand-rolled `bg-white/[0.0x]` panels.

**Exit:** the `/design` page shows every component in all its states. No page changes yet.

### Phase 3 — One app shell and navigation
- **Desktop.** One left sidebar with five items:
  - Home (dashboard)
  - Learn (current course)
  - Review
  - Practice (Visual Lab and Challenges)
  - Road to CISSP

  A slim top bar holds search and your progress. The duplicate top navbar goes away.
- **Mobile.** A bottom tab bar with the same five items (thumb-reachable, standard for
  learning apps). The "Academy menu" toggle goes away.
- **Home.** `/` shows the Academy dashboard. The legacy module grid moves under Practice or is
  retired (see Q2).
- **Config.** Removed from the navigation (still reachable by URL).
- **Tutor.** It becomes a sidebar or tab item that opens a panel. Inside a lesson, it is a
  button in the lesson toolbar. It no longer floats over content.
- **Lesson player.** Keeps its focus mode, restyled with the new tokens.
- **Exit:** no page has two navigation bars, and nothing overlaps content at 360px.

### Phase 4 — Page-by-page restyle
Order by traffic:
1. **Dashboard.** Shows Continue Learning (the hero), Review due, and your current path's
   progress, in that order. Other paths collapse into one "Explore paths" link. Streak and XP
   are removed from the dashboard (see Decisions).
2. **Lesson page.** Reading and practice become one page on a `glass-2` surface:
   - header: course › module › lesson, time, status
   - body text at 17px and 70 characters wide
   - "Start practice" as the single primary action
   - previous and next lessons at the bottom

   Empty sections are not shown. Lessons without notes get a proper summary block drawn from
   `moduleNotes`, instead of one lone sentence.
3. **Lesson player.** Tokens, type and button colour made consistent; the layout already works.
4. **Course page.** Two columns on desktop: the syllabus on the left, and a sticky card on the
   right (progress, "Continue", what you'll learn). On mobile they stack. Skills and
   certifications become plain text lists, not pill walls.
5. **Road to CISSP.** The seven steps become a vertical stepper with one progress bar each.
   Domain readiness becomes eight rows (domain name, weight, progress bar); the chip walls move
   into an expandable "What counts toward this" section.
6. **Paths and Courses indexes.** Your current path and course first. "Coming soon" items are
   hidden. Locked items get one consistent locked style.
7. **Visual Lab, Challenges and legacy pages.** Tokens and shell only, no layout changes.
   Scope depends on Q2.

Each page is its own commit with before/after screenshots.

**Exit:** a walkthrough of Home → course → lesson → practice → result → next lesson looks like
one product at 390px and at 1440px.

### Phase 5 — Polish and accessibility check
- Visible keyboard focus everywhere.
- Motion respects `prefers-reduced-motion`, including the background.
- Screen-reader labels on icon-only buttons.
- Automated contrast check on the main pages. Plain text is typed with one font (`Inter`
  or the system font, see Q3).
- A performance check: backdrop blur is expensive on low-end phones. Fall back to a
  solid surface on devices without `backdrop-filter` support.
- **Exit:** the accessibility audit passes. Lighthouse accessibility scores 95 or higher on
  Home, Course and Lesson.

---

## Part C — Deferred (after the overhaul)
- Fill every lesson with real reading content, reusing `moduleNotes` first, with a coverage test.
- Stronger cross-module review.
- Accounts (Google/GitHub OAuth), a database, server-side progress. Then subscription.
  Then self-hosting and mobile apps.

---

## Decisions (2026-09-28)

- **Accent:** amber, the current "Continue learning" colour. Primary buttons use dark text on amber
  (8.6:1); white on amber is about 2.1:1 and fails WCAG AA.
- **Legacy pages:** kept for now, restyled with the shell and tokens only.
- **Font:** Inter, self-hosted via `@fontsource-variable/inter` (no Google Fonts request).
- **Gamification:** XP, levels and streaks are **removed from the main pages** (dashboard, course,
  lesson). They may live on a separate progress page later.

## Status

- **Phase 1: built, awaiting your approval.** Run the dev server and open `/design`
  (dev only; left out of production builds).
  - **Tokens:** CSS variables in `src/index.css`, Tailwind keys `ink-*`, `action`, the status
    colours, `text-title/heading/lesson/body/small/caption`, `rounded-control/card` and
    `max-w-reading`. The source values are in `src/lib/design/tokens.js`.
  - **Glass levels:** `.glass-1/2/3`, with a solid fallback where blur isn't supported.
  - **Background:** one fixed palette with blobs at about 0.3 opacity, moving more slowly.
    `useBgTint` is now a no-op; its calls are removed in Phase 4.
  - **Focus ring:** amber on keyboard focus.
  - **Tests:** `src/lib/design/tokens.test.js` checks that CSS matches the tokens and checks
    contrast. Rule: dim text (`ink-3`) only on glass-2 and glass-3, not on glass-1 (3.5:1 there).
  - **Already visible app-wide:** the calmer background, Inter, and amber for shadcn `primary`
    and focus.
