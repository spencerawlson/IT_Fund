# Mobile responsiveness audit — road2cissp.com (2026-11-08)

Audited against remote head `59b8e5a5`. Routes: the `scripts/mobile-check.mjs`
page list (`/`, `/app`, `/academy/courses`, `/academy/lessons/py-basics`,
`/practice`, `/library`, `/academy/roadmap`, `/signin`, `/pricing`) plus
`/labs`, `/lab`, `/tracks`, `/challenge`, `/learning-path`, `/academy/paths`,
`/academy/badges`, `/academy/exam`, `/module/*`, lab pages, exam variants.

Method: static audit only. No real phone-browser verification was possible in
the sandbox: Playwright browsers are not installed and downloads fail through
the proxy, and the `/opt/meta-chromium/chrome` binary refuses to start
("Hatch WebGL domain policy is required for browser startup"). The repo's
`mobile-check.mjs` remains the gate to run where browsers exist, and a phone
check on the live site is the final verification.

## Issues found (fixed in this change)

1. `src/pages/LabWorkspace.jsx:403` — terminal header row `flex items-center
   gap-2` with no wrap: icon + "Terminal"/"Mission Console" heading + long
   caption ("live container — real commands, real output" /
   "simulated — nothing is really executed", untruncated) + "Mission mode"
   button (`ml-auto`). At 360px the row is ~420px wide in a ~328px card —
   the button is pushed out of view. Fix: `flex-wrap`, caption hidden below
   `sm`.
2. `src/components/lab/FlowDiagram.jsx` — node rail: six fixed `h-14 w-14`
   (56px) circles in `flex-1` slots. At 360px each slot is ~49px, so circles
   touch/overlap and the active `scale-110` (62px) overflows its slot;
   11px labels ("Observability", "Load Balancer") wrap to 3 lines in 49px.
   Fix: circles `h-11 w-11 sm:h-14 sm:w-14`, labels `text-[10px] sm:text-xs`,
   rail padding `px-3 sm:px-8`, track line `top-[22px] sm:top-7` (icon
   centre on mobile).
3. `src/pages/Module.jsx:149` — tabs row (`Browse` / `Flashcards` / `Quiz`),
   three `flex-1` buttons at `text-sm`. "Flashcards" + icon is ~100px in a
   ~106px slot at 360px and wraps at 320px. Fix: `text-xs sm:text-sm`,
   `gap-1.5`.
4. `src/pages/LabProgress.jsx:71` — `grid grid-cols-3 gap-3` stat cards:
   ~104px each at 360px, "labs completed" caption wraps to 3 lines. Not
   overflowing, but cramped. Fix: `gap-2 sm:gap-3`.
5. `src/pages/academy/LessonView.jsx:195` — cheat-sheet `<table>` has no
   scroll wrapper; a long term in the `w-2/5` column can force the table
   wider than its Card. Fix: wrap in `<div className="overflow-x-auto">`
   (no visual change on desktop).
6. `src/components/lab/BreakItControls.jsx:38` — scenario buttons
   `min-h-[36px]`: below the 44px tap target. Fix: `min-h-11`.

## Checked and cleared (no fix needed)

- `LandingBackground.jsx` blobs (`h-[34rem] w-[34rem]`, `-right-24` /
  `-left-32`): the Landing root is `overflow-hidden`; used only on `/`.
- Landing header (`Landing.jsx:143`): brand `whitespace-nowrap` + Labs +
  one Sign-in button on phones — fits 360px.
- Landing grids: stats `grid-cols-2`, features/courses `sm:grid-cols-2
  lg:grid-cols-3`, how-it-works `sm:grid-cols-3` (single column on phones).
- Pricing `sm:grid-cols-2`; LabGallery `grid-cols-1 sm:grid-cols-2
  lg:grid-cols-3`; Courses `md:grid-cols-2`,
  `lg:grid-cols-[minmax(0,1fr)_20rem]`; Home/library `sm:grid-cols-2
  lg:grid-cols-3`.
- AppShell: sidebar hidden below `lg`; mobile top bar + bottom tab bar
  (5 tabs, short labels, `min-h-14`, `pb-28` clearance, `pb-safe`).
- Tables: LessonView `<pre>` blocks `overflow-x-auto`; NumberSystemConverter
  table inside `overflow-hidden` with four narrow columns.
- All `src/components/viz/*` animation canvases are `relative
  overflow-hidden` (Udp, SecurityIncident, Tcp, Tls, Dns, Firewall, …).
- LabTerminal: output lines `whitespace-pre-wrap break-words`; input row
  `min-w-0 flex-1`.
- Academy `min-w-[11rem]`: inside a `flex flex-wrap` container.
- PracticeExam / Secplus / Cert exam: sticky chrome bleeds intentionally
  (`-mx-4 px-4`); question jumper `grid-cols-10 sm:grid-cols-20`.
- FlowDiagram focus card `sm:grid-cols-[1fr_auto]`; controls stack on
  phones via `sm:flex-col`.
- `index.html` viewport meta correct; type scale uses `clamp()`; no global
  fixed-width or overflow rules in `index.css`; no `100vw` anywhere.
- StudySheet is a bottom sheet on phones (`items-end`, `max-h-[92dvh]`);
  TutorChat fixed panel `inset-x-3 bottom-3`; toasts `w-full md:max-w-[420px]`.
- Module tabs, QuizRun answers, Challenge rows, SignIn cards, CisspRoadmap
  steps/domains (all `min-w-0` + `shrink-0` where needed).

## Round 2 — tap targets (same session, second pass)

The overflow audit above found the page clean; a second pass over tap
targets found the small-button variant used across the whole site still
below the 44px bar. Fixed in this change:

7. `src/components/ui-glass/Button.jsx:15` — `SIZE.sm` was `min-h-9`
   (36px). 33 usages: landing/pricing headers, lab chrome (Reset, Lesson,
   Exit), LabProgress (Labs, Exit, per-lab Start), "Clear search",
   "Submit exam" in all three exam pages, "Refresh status", "Home".
   Fix: `min-h-9` → `min-h-11`. One line, all 33 fixed; headers grow
   ~8px (their containers are not fixed-height).
8. `src/pages/academy/PracticeExam.jsx:226,235,239`,
   `SecplusPracticeExam.jsx:178,187,191`,
   `CertPracticeExam.jsx:178,187,191` — hand-rolled chrome buttons
   ("Flag for review", "Keep going", "Finish early") were `py-1.5`
   (~32px). Fix: `min-h-11` on all nine. "Submit exam" was already
   covered by fix 7 (Button `size="sm"`).
9. `src/components/StudyMascot.jsx` — "Reveal answer" (`py-1.5`),
   "Another one" and the dismiss X (`py-1`, ~26px). Fix: `min-h-11`
   on all three; the icon-only dismiss also gets `min-w-11 justify-center`.
10. `src/components/FlashcardSession.jsx:174` — "Read" speaker button
    `px-2 py-1` (~26px). Fix: `min-h-11`.
11. `src/components/ui-glass/Tabs.jsx:18` — tab triggers `py-2.5`
    (~40px). Fix: `py-3` (~44px with the text-small line height).
12. `src/components/labs/TopologyBuilder.jsx:87,105,121` — device
    palette chips, 2D/3D toggle and "Clear board" were `py-1` (~28px).
    Fix: `min-h-11` on all three (palette wraps, so taller chips just
    reflow). The link rows at :213 are display-only `<li>`s, not buttons.

13. `src/pages/academy/LessonView.jsx:291` — "Copy code" button in the
    code-block header was `min-h-9` (36px). Fix: `min-h-11`. (Same file
    as fix 5; found by the post-fix re-audit grep.)

## Dashboard card layouts (2026-11-08, phone screenshot of /app)

Spencer's screenshot of the /app dashboard on his phone showed three defects the
static audit above had missed — it was a scrolled viewport, so fixed/sticky
chrome sat on top of card content, which the audit's at-rest reading never saw.

Measured from the screenshot (1206×2622, iPhone 16 Pro, 3x): the sticky header
pill is translucent glass-1 (86% white at top, 68% at bottom), the tab-bar pill
is glass-3, and the page was scrolled ~18px — enough for the stats card's rank
row to slide under the header pill and the UP NEXT title under the tab bar.
The ReviewHero row was measured in code: at 430px the icon (56px) + gaps +
"Start review" button (~185px) leave ~77px for the copy — one word per line.

Fixes in this change:

1. `src/index.css` — new `.nav-solid` (`.glass-1.nav-solid, .glass-3.nav-solid`,
   solid `#ffffff`). Cards keep their frost; only navigation pills use it, so
   scrolling content disappears cleanly behind a pill instead of ghosting
   through and getting sliced mid-line at its edge.
2. `src/components/shell/AppShell.jsx` — mobile header pill and tab-bar pill
   both `nav-solid`; main bottom clearance `pb-28` (112px) → `pb-36` (144px).
   The old clearance left ~8px over the real tab-bar height (~104px: ~70px
   pill + ~34px safe area); 144px leaves ~40px. That is the real cause the
   earlier pass missed: it measured the pill (64px assumed) but not the
   safe-area padding, and it read the page at rest, never scrolled.
3. `src/pages/Academy.jsx` — ReviewHero stacks on phones: icon + copy row at
   full width, then a full-width "Start review" button below. Copy unchanged.
   Desktop row identical.
4. `src/components/Logo.jsx` — the wordmark opts out of the acronym glossary
   (`data-no-glossary`). In the screenshot "CISSP" was invisible — only its
   dotted acronym underline showed. The gradient-clipped text under a Custom
   Highlight range blanks on WebKit; the brand mark is not a glossary term
   anyway. `bg-clip-text` is used nowhere else in the app.
5. Same row pattern, stacked on phones: the practice-exam cards in
   `src/pages/academy/Courses.jsx` and `src/pages/CisspRoadmap.jsx` (text +
   "Start practice exam" button) and the two lab cards in
   `src/pages/academy/LessonView.jsx` (Visual Lab / Launch Lab).
6. Same opaque-pill treatment for the focus-mode sticky headers in
   `src/pages/LabLauncher.jsx`, `src/pages/LabProgress.jsx`,
   `src/pages/LabWorkspace.jsx`, `src/components/academy/lesson/LessonPlayer.jsx`.

Checked and left alone: StreakWidget (wraps; the card itself is fine — the
header was the problem), the `due === 0` review card (text gets ~256px, heading
fits), ContinueLearning's button row (`flex-wrap`, no squeeze), BadgeCard
(icon + text only, no button), UpgradePrompt (centered, buttons wrap),
PracticeExam sticky chrome (already 90% opaque, intentional bleed),
LessonPlayer's fixed ActionBar (main already has `pb-72` clearance).

## Round 2 — checked and cleared (no fix needed)

- `SubnetCalculator.jsx:103-107` — binary-breakdown lines look unbreakable
  at 35 chars, but `toBinary()` joins octets with SPACES, so the lines
  wrap at the spaces; value rows are short mono strings. No overflow.
- PracticeExam sticky chrome, confirming state ("Keep going" + "Submit
  exam" alongside flag + answered count): tight at 360px but the buttons'
  text wraps and min-content fits — no page-level overflow.
- `widgets.jsx` BitsWidget `grid-cols-8`: grid columns shrink to fit;
  Binary readout has `truncate`. CidrWidget 32 flex-1 bars shrink;
  HashWidget hash uses `break-all`.
- `NumberSystemConverter.jsx` bit buttons sit in `flex flex-wrap`;
  Binary/Hex `grid-cols-2` cells fit at 360px.
- `FlashDeck.jsx:114` Again/Got-it buttons: short labels, ~160px each.
- AppShell top bar: Logo (mark + wordmark, ~131px) + three 40px icon
  buttons fits 360px; bottom tab bar 5 short labels, `min-h-14`.
- `AcronymTooltips.jsx:90-92` — tooltip width clamps to `vw - 32` and
  left to `[16, vw - width - 16]`; it cannot run off screen.
- `Lab.jsx` Stage header: icon `shrink-0`, title block `min-w-0 flex-1`,
  pill row `flex-wrap`. LabTerminal output `whitespace-pre-wrap
  break-words`, input `min-w-0 flex-1`.
- `FlowDiagram.jsx:115` Play/Restart row: two `w-full` one-word buttons
  share the row 50/50 on phones.
- Challenge category buttons (single column on phones), status bar,
  badge + timer pills: short labels, fit.
- LearningPath module links, AcademyPlay lab links: text wraps, icons
  `shrink-0` where the row must not squeeze.
- `LessonPlayer.jsx`: top bar (exit + progress + position) fits;
  main has `pb-72` clearance for the fixed action bar.
- `index.html` viewport meta correct; no `100vw`/`w-screen` anywhere;
  no global fixed-width or overflow rules in `index.css`.
