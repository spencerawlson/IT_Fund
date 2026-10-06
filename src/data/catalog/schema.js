// Content model for the Academy (JSDoc only; no runtime code). See docs/ACADEMY.md.
//
//   Career path ──► Course ──► Module ──► Lesson ──► (Lab · Assessment · Project, later phases)
//
// Everything references other content by id/slug, so one lesson can serve several paths,
// courses and certification tracks without being copied.

/**
 * @typedef {'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'} Difficulty
 *
 * @typedef {object} Prerequisites
 * Nothing here locks anything: all three kinds are shown as recommendations.
 * @property {string[]} [required]     The background the item assumes; shown as "recommended first".
 * @property {string[]} [recommended]  Strongly advised, but not needed to start.
 * @property {string[]} [optional]     Nice to have; shown as a hint.
 *
 * @typedef {object} LearningPath
 * @property {string} slug
 * @property {string} title
 * @property {string} icon            lucide-react icon name (see components/academy/icons.js)
 * @property {string} color
 * @property {Difficulty} difficulty
 * @property {string} summary
 * @property {string[]} courses       Course slugs, in the order to take them.
 * @property {Prerequisites} prerequisites  Path slugs.
 *
 * @typedef {object} ModuleMeta
 * @property {string} title
 * @property {string} summary
 *
 * @typedef {object} CourseMeta
 * @property {string} slug
 * @property {string} trackId         The src/data/academy track that supplies modules and lessons.
 * @property {string} title
 * @property {Difficulty} difficulty
 * @property {string} description
 * @property {string[]} objectives
 * @property {string[]} skills        Keys of SKILLS.
 * @property {string[]} certifications Keys of CERTIFICATIONS.
 * @property {Record<string, ModuleMeta>} modules  Keyed by tier id (beginner/intermediate/advanced).
 *
 * @typedef {object} Certification
 * @property {string} id
 * @property {string} name
 * @property {string} vendor
 *
 * Rich lesson sections (all optional; plain strings may use `backticks` for inline code).
 * Rendered as React text nodes — never as raw HTML — so content can't inject markup.
 *
 * @typedef {object} LessonExample
 * @property {string} title
 * @property {string} code
 * @property {string} [explanation]
 *
 * @typedef {object} LessonPart  One learn section, rendered in this order:
 * @property {string} heading
 * @property {string[]} body          Lead paragraphs (at least one).
 * @property {string} [visual]        Inline diagram id (components/academy/lesson/visuals.jsx).
 * @property {{ columns: string[], rows: string[][], caption?: string }} [table]  Aligned table;
 *                                    the first cell of each row is its label.
 * @property {string[]} [points]      Key points. "Lead: text" sets the lead in bold.
 * @property {{ label: string, text: string }} [note]  Callout: exam tip, memory aid, pitfall.
 *
 * @typedef {object} LessonContent
 * @property {string[]} [overview]     What it is and why it matters (paragraphs).
 * @property {LessonPart[]} [learn]    Detailed explanation.
 * @property {{ caption: string, diagram?: string, visual?: string }} [architecture]  A visual id,
 *                                    or a monospace diagram.
 * @property {LessonExample[]} [examples]
 * @property {[string, string][]} [cheatSheet]  [term, meaning] rows.
 */

export {};
