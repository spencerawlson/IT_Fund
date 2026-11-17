// Educational-quality audit: inventory + STRUCTURAL validation.
//
// Reads the generated full dataset (backend/data/content.json — every track,
// deck, card, lesson and note, premium included) plus the catalog metadata
// (courses, paths, certifications, exam outlines, the source registry).
//
// What this does NOT do: decide whether a statement is technically true.
// Structural checks (missing fields, duplicates, giveaway answers, broken
// references, stale outlines) are automatable. Factual accuracy needs an
// authoritative source or an expert, and is recorded separately in
// docs/audit/issues.json by human/AI review — never inferred here.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const EXAM_KEYS = ['cissp', 'secplus', 'saa', 'cysa', 'awss'];

export function loadContent() {
  return JSON.parse(readFileSync(join(ROOT, 'backend', 'data', 'content.json'), 'utf8'));
}

export async function loadCatalog() {
  const [courses, paths, certs, meta] = await Promise.all([
    import('../../src/data/catalog/courses.js'),
    import('../../src/data/catalog/paths.js'),
    import('../../src/data/catalog/certifications.js'),
    import('../../src/data/academy/meta.js'),
  ]);
  return {
    courses: courses.COURSE_META,
    paths: paths.PATHS,
    certifications: certs.CERTIFICATIONS,
    examOutlines: meta.EXAM_OUTLINES,
    resources: meta.RESOURCES,
    domains: {
      cissp: meta.CISSP_DOMAINS,
      secplus: meta.SECURITY_PLUS_DOMAINS,
      saa: meta.SAA_DOMAINS,
      cysa: meta.CYSA_DOMAINS,
      awss: meta.AWS_SECURITY_DOMAINS,
    },
  };
}

const words = (s) => (String(s || '').match(/[A-Za-z0-9+#./-]+/g) || []).length;
// Loose key for word-overlap similarity (symbols dropped).
export const norm = (s) => String(s || '').toLowerCase().replace(/`/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// Exact key for "is this the same option / question": keeps operators and
// punctuation (`7 // 2` vs `7 % 2`, `ALE = SLE × ARO` vs `+ ARO` differ);
// ignores only case, backticks, spacing and a trailing full stop.
export const exactKey = (s) => String(s || '').toLowerCase().replace(/`/g, '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
// Filler intensifiers used to lengthen wrong options artificially.
const PADDING = /\b(at all|every single|whatsoever|ever again|all day long|day and night|around the clock|no exceptions|nothing else|on its own|once and for all|without fail|all year round|word for word|line by line|one by one|each and every|for good|from start to finish|in one stroke|no matter what)\b/i;
const tokens = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** Every deck as a flat record (track/tier context attached). */
export function decksOf(content) {
  const out = [];
  for (const t of content.tracks) {
    for (const tier of t.tiers) {
      for (const d of tier.decks) out.push({ track: t, tier, deck: d });
    }
  }
  return out;
}

/** Machine-readable inventory of every educational asset in the dataset. */
export function buildInventory(content, catalog, labs = []) {
  const free = new Set(content.freeDecks || []);
  const freeLessons = new Set(content.freeLessons || []);
  const decks = decksOf(content).map(({ track, tier, deck }) => {
    const lesson = content.lessons[deck.id] || null;
    const learn = lesson?.learn || [];
    const lessonWords = lesson
      ? words(lesson.overview) + learn.reduce((n, s) => n + words(s.heading) + (s.body || []).reduce((m, b) => m + (typeof b === 'string' ? words(b) : 0), 0), 0)
      : 0;
    const exams = Object.fromEntries(EXAM_KEYS.filter((k) => deck[k]).map((k) => [k, deck[k]]));
    return {
      id: deck.id,
      track: track.id,
      tier: tier.id,
      title: deck.title,
      free: free.has(deck.id),
      cards: deck.cards.length,
      puzzles: (deck.puzzles || []).length,
      sources: deck.sources || [],
      resources: (deck.resources || []).length,
      exams,
      lesson: lesson
        ? {
            free: freeLessons.has(deck.id),
            hasOverview: Boolean(lesson.overview),
            learnSections: learn.length,
            examples: (lesson.examples || []).length,
            cheatSheet: Array.isArray(lesson.cheatSheet) ? lesson.cheatSheet.length : (lesson.cheatSheet ? 1 : 0),
            furtherReading: (lesson.further_reading || []).length,
            words: lessonWords,
          }
        : null,
    };
  });
  const tracks = content.tracks.map((t) => {
    const ds = decks.filter((d) => d.track === t.id);
    return {
      id: t.id,
      title: t.title,
      tiers: t.tiers.map((x) => x.id),
      decks: ds.length,
      cards: ds.reduce((n, d) => n + d.cards, 0),
      lessonsWithContent: ds.filter((d) => d.lesson).length,
      freeDecks: ds.filter((d) => d.free).length,
    };
  });
  return {
    generatedFrom: 'backend/data/content.json + src/data/catalog + src/data/academy/meta.js + backend/labs',
    contentVersion: content.version,
    totals: {
      tracks: tracks.length,
      decks: decks.length,
      cards: decks.reduce((n, d) => n + d.cards, 0),
      lessons: Object.keys(content.lessons).length,
      lessonsWithContent: decks.filter((d) => d.lesson).length,
      puzzles: decks.reduce((n, d) => n + d.puzzles, 0),
      moduleNotes: Object.keys(content.notes || {}).length,
      courses: catalog.courses.length,
      paths: catalog.paths.length,
      certifications: Object.keys(catalog.certifications).length,
      sourcesRegistered: Object.keys(catalog.resources).length,
      labs: labs.length,
      freeDecks: (content.freeDecks || []).length,
      freeLessons: (content.freeLessons || []).length,
    },
    examOutlines: catalog.examOutlines,
    examDomains: Object.fromEntries(
      EXAM_KEYS.map((k) => [k, (catalog.domains[k] || []).map((d) => ({
        ...d,
        decks: decks.filter((x) => (x.exams[k] || []).includes(d.id)).length,
        cards: decks.filter((x) => (x.exams[k] || []).includes(d.id)).reduce((n, x) => n + x.cards, 0),
      }))]),
    ),
    tracks,
    courses: catalog.courses.map((c) => ({ slug: c.slug, trackId: c.trackId, title: c.title, difficulty: c.difficulty, certifications: c.certifications || [] })),
    paths: catalog.paths.map((p) => ({ slug: p.slug, title: p.title, courses: p.courses })),
    labs,
    decks,
  };
}

/**
 * Structural issues only. Each issue: { id, severity, category, check,
 * file, contentId, detail, original, automated: true }.
 * Severity reflects learner impact if real: an answer that is also a
 * distractor is Critical (two "correct" options), a missing explanation High.
 */
export function structuralIssues(content, catalog) {
  const issues = [];
  const add = (severity, check, contentId, detail, original, file) =>
    issues.push({ id: `S-${String(issues.length + 1).padStart(4, '0')}`, severity, category: 'structural', check, file, contentId, detail, original, automated: true, humanReview: severity === 'Critical' || severity === 'High' });

  const trackFile = (trackId) => `src/data/academy/${trackId}.js`;
  const resourceIds = new Set(Object.keys(catalog.resources));
  const allCards = [];

  for (const { track, deck } of decksOf(content)) {
    const file = trackFile(track.id);
    if (!deck.sources || deck.sources.length === 0) add('Medium', 'deck-no-sources', deck.id, 'Deck cites no sources.', deck.title, file);
    for (const s of deck.sources || []) if (!resourceIds.has(s)) add('Medium', 'deck-unknown-source', deck.id, `Source id "${s}" is not in RESOURCES (meta.js).`, s, file);
    for (const k of EXAM_KEYS) {
      for (const dom of deck[k] || []) {
        if (!(catalog.domains[k] || []).some((x) => x.id === dom)) add('High', 'deck-bad-domain', deck.id, `Mapped to ${k} domain ${dom}, which is not in the outline.`, String(dom), file);
      }
    }
    for (const c of deck.cards) {
      const opts = [c.a, ...(c.wrong || [])];
      allCards.push({ card: c, deck, track, file });
      if (!String(c.q || '').trim()) add('Critical', 'card-no-question', c.id, 'Empty question.', c.q, file);
      if (!String(c.a || '').trim()) add('Critical', 'card-no-answer', c.id, 'Empty answer.', c.a, file);
      if (!String(c.x || '').trim()) add('High', 'card-no-explanation', c.id, 'No explanation.', c.q, file);
      if ((c.wrong || []).length !== 3) add('High', 'card-distractor-count', c.id, `${(c.wrong || []).length} distractors (expected 3).`, c.q, file);
      const seen = new Map();
      for (const o of opts) {
        const n = exactKey(o);
        if (seen.has(n)) {
          add(n === exactKey(c.a) ? 'Critical' : 'High', n === exactKey(c.a) ? 'card-answer-is-distractor' : 'card-duplicate-distractor', c.id,
            n === exactKey(c.a) ? 'A distractor is identical to the correct answer — two correct options.' : 'Two distractors are identical.', o, file);
        }
        seen.set(n, true);
      }
      // Padded distractor: filler intensifiers bolted on to lengthen a wrong
      // option ("…, no exceptions at all", "…, around the clock") read as
      // artificial and mark it as wrong. A distractor that gives a (wrong)
      // reason — "…, because IAM overrides key policies" — is a legitimate
      // misconception and is NOT flagged.
      for (const w of c.wrong || []) {
        if (PADDING.test(w) && !PADDING.test(c.a)) {
          add('Low', 'card-padded-distractor', c.id, 'Distractor is lengthened with filler intensifiers the correct answer lacks.', w, file);
        }
        // "Label: restatement" tails added by the 2026 length rebalance.
        const m = /^([^:]{6,}): ([a-z].*)$/.exec(w);
        if (m && !/: [a-z]/.test(c.a)) {
          const head = tokens(`${m[1]} ${c.q}`);
          const tail = tokens(m[2]);
          let shared = 0;
          for (const x of tail) if (head.has(x)) shared += 1;
          if (tail.size && shared / tail.size >= 0.3) add('Low', 'card-colon-restatement', c.id, 'Distractor carries a colon tail that restates itself — reads as artificially lengthened.', w, file);
        }
      }
      if (/\.\s*$/.test(String(c.a)) && /[\/]|\w+\.\w{2,4}\.$/.test(String(c.a)) && !/\s/.test(String(c.a).trim().replace(/^[^\s]+\s?/, ''))) {
        add('Medium', 'card-answer-trailing-period-literal', c.id, 'Answer is a literal (path/command/file) ending in a full stop that changes its meaning.', c.a, file);
      }
      if (opts.some((o) => /\b(all|none) of the above\b/i.test(o))) add('Medium', 'card-all-none-of-above', c.id, '"All/None of the above" breaks when options are shuffled.', c.q, file);
      const lens = opts.map((o) => String(o).length);
      const longest = Math.max(...lens.slice(1));
      if (lens[0] > 2 * longest && lens[0] - longest > 25) add('Low', 'card-answer-length-giveaway', c.id, `Answer is ${lens[0]} chars vs longest distractor ${longest} — length gives it away.`, c.a, file);
      if (norm(c.x) && norm(c.x) === norm(c.a)) add('Medium', 'card-explanation-restates-answer', c.id, 'Explanation only repeats the answer.', c.x, file);
    }
  }

  // Exact duplicates (same normalised question) — across the whole bank.
  const byQ = new Map();
  for (const r of allCards) {
    const k = exactKey(r.card.q);
    if (!byQ.has(k)) byQ.set(k, []);
    byQ.get(k).push(r);
  }
  for (const [, group] of byQ) {
    if (group.length < 2) continue;
    const answers = new Set(group.map((g) => exactKey(g.card.a)));
    const sameDeck = new Set(group.map((g) => g.deck.id)).size === 1;
    // Same question asked in two tracks with differently-worded answers is
    // usually fine (the same term taught twice) — but the two answers must
    // agree, so it is flagged for a consistency read. Same deck = real dup.
    const sev = sameDeck ? 'High' : answers.size > 1 ? 'Low' : 'Low';
    add(sev, sameDeck ? 'duplicate-question-same-deck' : answers.size > 1 ? 'cross-track-duplicate-reworded' : 'duplicate-question',
      group.map((g) => g.card.id).join(', '),
      answers.size > 1 ? `Same question in ${group.length} places with differently worded answers — check they agree.` : `Same question in ${group.length} places (same answer).`,
      group[0].card.q, [...new Set(group.map((g) => g.file))].join(', '));
  }

  // Near-duplicates within a track (token Jaccard >= 0.85, not exact).
  const byTrack = new Map();
  for (const r of allCards) {
    if (!byTrack.has(r.track.id)) byTrack.set(r.track.id, []);
    byTrack.get(r.track.id).push({ ...r, tok: tokens(r.card.q) });
  }
  for (const [, rows] of byTrack) {
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        if (exactKey(rows[i].card.q) === exactKey(rows[j].card.q)) continue;
        if (rows[i].tok.size < 4) continue;
        const s = jaccard(rows[i].tok, rows[j].tok);
        if (s >= 0.85) add('Low', 'near-duplicate-question', `${rows[i].card.id}, ${rows[j].card.id}`, `Questions ${Math.round(s * 100)}% similar by wording.`, `${rows[i].card.q} || ${rows[j].card.q}`, rows[i].file);
      }
    }
  }

  // Lessons.
  for (const { track, deck } of decksOf(content)) {
    const l = content.lessons[deck.id];
    const file = `src/data/catalog/lessons/${track.id}.js`;
    if (!l) { add('Medium', 'lesson-missing', deck.id, 'Deck has no lesson body.', deck.title, file); continue; }
    if (!l.overview) add('Medium', 'lesson-no-overview', deck.id, 'Lesson has no overview/objectives paragraph.', deck.title, file);
    if (!(l.learn || []).length) add('High', 'lesson-no-learn', deck.id, 'Lesson has no Learn sections.', deck.title, file);
    if (!(l.examples || []).length) add('Low', 'lesson-no-examples', deck.id, 'Lesson has no worked examples.', deck.title, file);
    for (const fr of l.further_reading || []) {
      if (!/^https:\/\//.test(fr.url || '')) add('Medium', 'lesson-bad-link', deck.id, 'Further-reading link is not https.', fr.url, file);
    }
  }

  // Exam outlines past their validity.
  const today = new Date().toISOString().slice(0, 10);
  for (const [k, o] of Object.entries(catalog.examOutlines || {})) {
    if (o.validUntil && o.validUntil < today) add('Critical', 'exam-outline-expired', k, `${o.exam} outline expired ${o.validUntil}.`, o.outline, 'src/data/academy/meta.js');
  }
  return issues;
}

export function summarise(issues) {
  const by = (key) => issues.reduce((m, i) => ((m[i[key]] = (m[i[key]] || 0) + 1), m), {});
  return { total: issues.length, bySeverity: by('severity'), byCheck: by('check') };
}
