// Detailed study notes for module concepts, merged over the short `detail` in modules.js.
// Each file maps concept id -> { body, example, tip }. `body` paragraphs are separated by
// blank lines and may use `backticks` for inline code.
import fundamentals from './fundamentals.js';
import networking from './networking.js';
import systems from './systems.js';
import cloud from './cloud.js';
import security from './security.js';
import platform from './platform.js';

const NOTES = { ...fundamentals, ...networking, ...systems, ...cloud, ...security, ...platform };

/** Raw notes map (concept id or `term:<Term>` -> { body, example?, tip? }). Exported for
 * scripts/export-content.mjs, which ships the notes behind the entitled content API
 * (backend/content.py). The app itself must never import this map directly — it would
 * bundle every premium note for anonymous visitors. Use getNote() (bundled fallback) or
 * the content service (src/lib/content.js) instead. */
export const MODULE_NOTES = NOTES;

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// Notes can also be keyed by term (prefix "term:") so modules sharing a concept reuse one write-up.
const BY_TERM = Object.fromEntries(
  Object.entries(NOTES)
    .filter(([k]) => k.startsWith('term:'))
    .map(([k, v]) => [norm(k.slice(5)), v])
);

/** Full notes for a concept, falling back to its short detail when none are written yet. */
export function getNote(concept) {
  const note = NOTES[concept.id] || BY_TERM[norm(concept.term)];
  return note ? { body: note.body, example: note.example, tip: note.tip } : { body: concept.detail };
}

export const notesCount = Object.keys(NOTES).length;
