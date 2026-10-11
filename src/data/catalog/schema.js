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
 * @typedef {object} StackItem  One row of a colour-coded stack (a layer, step, level or function).
 * @property {string} badge       Short label in the coloured badge, e.g. 'L7', '3', 'GV'.
 * @property {string} name
 * @property {string} does        Supports `inline code`.
 * @property {string} [tag]       Pill beside the name, e.g. the PDU or OSI mapping.
 * @property {string} [examples]  Muted trailer after `does`.
 * @property {number} [tone]      1–7 (cool to warm; OSI layer n = tone n). Default: spread warm→cool.
 * @property {string} [word]      Mnemonic word; its first letter is highlighted.
 *
 * @typedef {object} LessonStack  Rendered by components/academy/LayerStack, in reading order.
 * @property {string} [title]
 * @property {StackItem[]} items
 * @property {{ lead: string, fromBottom?: boolean }} [mnemonic]  Needs `word` on every item.
 *
 * @typedef {object} LearnSection
 * @property {string} heading
 * @property {(string | { stack: LessonStack })[]} body  Paragraphs, with stacks placed inline.
 *
 * @typedef {object} LessonContent
 * @property {string[]} [overview]     What it is and why it matters (paragraphs).
 * @property {LearnSection[]} [learn]  Detailed explanation.
 * @property {{ caption: string, diagram: string }} [architecture]  Monospace diagram.
 * @property {LessonExample[]} [examples]
 * @property {[string, string][]} [cheatSheet]  [term, meaning] rows.
 */

export {};
