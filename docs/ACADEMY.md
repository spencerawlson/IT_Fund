# Academy architecture

The Academy is a data-driven learning platform inside the Road to CISSP app (Vite + React Router,
static content in JS modules, learner progress behind a storage adapter).

```
Career path ──► Course ──► Module ──► Lesson ──► (Lab · Assessment · Project: later phases)
```

Content is referenced by id/slug, never copied: one course can belong to several paths, and (from
Phase 3) certification tracks will reference existing modules and lessons.

## Where things live

| Concern | File |
|---|---|
| Lesson questions, puzzles, resources (the original "tracks") | `src/data/academy/<track>.js`, `interactive.js`, `meta.js` |
| Course metadata (wraps one track each) | `src/data/catalog/courses.js` |
| Career paths + prerequisites | `src/data/catalog/paths.js` |
| Certifications, skills | `src/data/catalog/certifications.js` |
| Rich lesson reading content | `src/data/catalog/lessonContent.js` |
| Content typedefs | `src/data/catalog/schema.js` |
| Catalogue builder + lookups + URLs | `src/data/catalog/index.js` |
| Progress rules (pure functions) | `src/lib/progress/engine.js` |
| Persistence adapter | `src/lib/progress/storage.js` |
| Learner state store (XP, cards, lessons, resume) | `src/lib/academy.js` |
| Shared UI (shell, cards, progress bar, badges) | `src/components/academy/ui/` |
| Pages | `src/pages/Academy.jsx`, `src/pages/academy/*.jsx` |

## Routes

| Route | Page |
|---|---|
| `/academy` | Dashboard: Continue Learning, review, career paths |
| `/academy/paths`, `/academy/paths/:slug` | Career paths |
| `/academy/courses`, `/academy/courses/:courseSlug` | Courses |
| `/academy/courses/:courseSlug/:moduleSlug` | Module (lessons + knowledge assessment) |
| `/academy/lessons/:lessonId` | Lesson reading view (Overview, Learn, Architecture, Examples, Quiz, Cheat sheet, Resources) |
| `/academy/:trackId/lesson/:deckId` | Interactive lesson player (unchanged URL) |
| `/academy/:trackId/boss/:tierId` | Module knowledge assessment (the tier "boss") |
| `/academy/review`, `/academy/roadmap`, `/academy/:trackId` | Existing pages, still supported |

## Content model

- **Track** (`src/data/academy/<track>.js`): tiers `beginner/intermediate/advanced`, each a list of
  decks. A deck is `{ id, title, summary, cissp, sources, cards: [[q, a, explanation?, wrong?]] }`.
- **Course** (`COURSE_META`): `{ slug, trackId, title, difficulty, description, objectives, skills,
  certifications, modules: { <tierId>: { title, summary } } }`. The builder turns the track's tiers
  into **modules** (`key = "<trackId>:<tierId>"`, `slug = tierId`) and its decks into **lessons**
  (`id = deck id`, numbered `module.lesson`, e.g. `2.3`).
- **Path** (`PATHS`): `{ slug, title, icon, color, difficulty, summary, courses: [courseSlug],
  prerequisites: { required, recommended, optional } }` (path slugs).
- **Lesson content** (`LESSON_CONTENT[lessonId]`): optional `overview`, `learn`, `architecture`,
  `examples`, `cheatSheet`. Strings support `` `inline code` `` only; everything renders as React
  text, never raw HTML, so content cannot inject markup.

> **Card ids are positional** (`<deckId>-<index>`). Append new cards; never reorder or delete, or
> learners lose progress on them. The same applies to deck ids.

## Progress and locking

State (in `src/lib/academy.js`): `lessons[lessonId] = { best, at }`, `cards[cardId] = { box, due }`
(Leitner spaced repetition), `bosses`, `xp`, `streak`, `badges`, and `resume` (mid-lesson position).

Rules (`src/lib/progress/engine.js`), all hard locks being **required** prerequisites:

1. A lesson is **passed** at `PASS_PCT` (70%) first-try accuracy.
2. Lessons in a module open strictly in order.
3. Modules in a course open strictly in order.
4. A module also requires every module in the previous Road to CISSP roadmap step (`ROADMAP` in
   `meta.js`). Once any lesson in a module is passed, the module stays open.
5. A path is **Locked** until its `required` paths are complete. `recommended`/`optional` only
   show labelled guidance. A path with no courses is **Coming soon** and never blocks others.

Progress percentages are passed lessons ÷ total lessons (module, course, path, overall). Time left
sums `lessonMinutes` (≈45 s per question + 2 min per puzzle) of unpassed lessons.

**Continue Learning** picks: a half-finished lesson → the next lesson in the most recently studied
course → the first open lesson in roadmap order.

**Review**: every lesson opens with up to 4 questions from earlier lessons (overdue first, then the
weakest). `/academy/review` serves due cards, or the weakest past cards when nothing is due.

## Persistence

`src/lib/academy.js` reads and writes through a `ProgressAdapter` (`load`, `save`,
`onExternalChange`). Today that is `localStorageAdapter('itfund-academy-v1')`, so progress is per
browser. `setProgressAdapter()` swaps it (tests use `memoryAdapter`).

**Not built yet — server-side progress.** The backend has no database and its auth is an in-memory
demo (users vanish on every cold start). Per-user progress needs, in order:

1. Real authentication (planned: Google/GitHub OAuth) with server-verified sessions.
2. A database (e.g. Postgres) with tables such as `user_progress(user_id, lesson_id, best, at)`,
   `user_cards(user_id, card_id, box, due)`, `user_resume`, later `bookmarks`, `notes`, `attempts`.
3. FastAPI endpoints (`GET/PUT /api/academy/progress`) that take the user from the session, never
   from the request body, validate input, and rate-limit writes. Scores should eventually be
   computed server-side from submitted answers rather than trusted from the client.
4. A `serverAdapter` that hydrates from the API and writes through, keeping localStorage as an
   offline cache, plus a one-time import of existing local progress.

## How to…

**Add a lesson** — append a deck to the right tier in `src/data/academy/<track>.js`. It appears in
its module automatically. Optional: puzzles in `interactive.js[deckId]`, reading content in
`lessonContent.js[deckId]`, sources as keys of `RESOURCES` in `meta.js` (real URLs only).

**Add a module** — modules are a track's tiers. Add decks to a tier and name the module in the
course's `modules` map.

**Add a course** — create `src/data/academy/<track>.js` (same shape as the others), register it in
`src/data/academy/index.js` (`tracks`), add its tiers to a `ROADMAP` step in `meta.js`, then add a
`COURSE_META` entry. The catalogue test fails if the roadmap misses a lesson.

**Add a career path** — add an entry to `PATHS` with course slugs and prerequisite path slugs.
Add its icon to `src/components/academy/icons.js` if new.

**Add a certification** — add it to `CERTIFICATIONS` and list its id in the relevant courses'
`certifications`. (Certification tracks and domain progress arrive in Phase 3.)

**Map skills** — add the key to `SKILLS` and list it in the course's `skills`. (The skill scoring
model arrives in Phase 3.)

**Assessments** — each module's knowledge assessment is its tier boss: 15 questions drawn from the
module, 3 lives, 80% to pass (`AcademyPlay` with `kind="boss"`).

## Tests

`npm test` (or `node node_modules/vitest/vitest.mjs run` when npm's shim fails on this path) runs
`src/**/*.test.js`: catalogue integrity, locking and prerequisites, progress maths, continue-learning
selection, review picking, and the store/adapter.

## Roadmap of remaining phases

- **Phase 2** — Lab Center (`/academy/labs`, task checklists, collapsed hints, explicit "Reveal
  solution"), troubleshooting challenges, richer question types, command reference component,
  cheat sheets as a first-class type.
- **Phase 3** — Skill matrix with a modular scoring model, certification center and tracks that
  reference lessons, Road to CISSP as a certification track with per-domain progress.
- **Phase 4** — Project center and the enterprise capstone.
- **Phase 5** — Practice exams, achievements, bookmarks, notes, search, analytics. Bookmarks, notes
  and exam history need the server-side persistence above.
