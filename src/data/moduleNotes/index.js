// Detailed study notes for module concepts, merged over the short `detail` in modules.js.
// Each file maps concept id -> { body, example, tip }. `body` paragraphs are separated by
// blank lines and may use `backticks` for inline code.
import fundamentals from './fundamentals';
import networking from './networking';
import systems from './systems';
import cloud from './cloud';
import security from './security';
import platform from './platform';

const NOTES = { ...fundamentals, ...networking, ...systems, ...cloud, ...security, ...platform };

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
