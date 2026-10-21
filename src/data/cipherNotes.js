/**
 * One-line "Cipher points out" notes, shown beside a lesson's cheat sheet.
 * Every note is lifted from that lesson's avatar tutor script (its COMMON
 * MISTAKES section), so the pointer never invents content the lesson doesn't
 * teach. Lessons without an entry get no note — nothing is faked to fill the slot.
 */
const NOTES = {
  'sec-concepts':
    'Exam trap: a security camera is detective, not preventive — it identifies what happened; deterrence is just a side effect.',
  'net-switch-route':
    'Longest prefix match is decided before administrative distance — a /24 beats a /16 even from a more trusted source.',
  'net-osi':
    "Don't call a packet a frame: segments live at Layer 4, packets at Layer 3, frames at Layer 2, bits at Layer 1.",
};

export function getCipherNote(lessonId) {
  return NOTES[lessonId] ?? null;
}
