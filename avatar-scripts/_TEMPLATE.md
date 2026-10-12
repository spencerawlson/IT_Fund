# Avatar Tutor Script — TEMPLATE

Every lesson script follows this format. Copy it exactly.

---

# {Human-readable lesson title} — Avatar Tutor Script

**Lesson ID:** {lesson-id}
**Track:** {track name}
**Estimated runtime:** ~{N} minutes (~{word count} words)

## Spoken script

**[HOOK — 0:00]**
One or two sentences that make the learner care. A stakes-raising question, a
real-world breach, or a promise: "learn this and X becomes easy." Never start
with "In this lesson we will..."

**[WHY IT MATTERS — ~0:25]**
Why this lesson earns its place: exam weight, real-job relevance, or how it
unlocks later lessons. One short paragraph.

**[SECTION — {exact learn heading from the lesson} — ~0:50]**
Teach the section like a human instructor:
- Explain the *idea* first, then the terminology — never the reverse.
- One concrete analogy or real-world example per key concept.
- Say *why* things are the way they are, not just what they are.
- Call out the exact distinction the exam loves to test.

Repeat one SECTION block per `learn` heading in the lesson, in order.

**[COMMON MISTAKES — near the end]**
Two or three traps: the wrong answer people pick on the exam, the misconception
practitioners carry, the subtle distinction (e.g. detective vs deterrent).

**[RECAP — end]**
Three to five sentences. The learner should be able to close their eyes and
replay the lesson's skeleton from this alone.

## On-screen visuals

For each SECTION, one line describing what appears beside/behind the avatar
(diagram, highlighted term, short code sample, comparison table). Keep it to
things the existing lesson page already shows or that Three.js can render —
no invented media.

---

## Rules

1. **Explain, never read.** If a sentence could be produced by reading the lesson
   text aloud, rewrite it. Analogies, stories, and "here's why" are mandatory.
2. **Grounded.** Every fact in the script must come from the lesson's `overview`,
   `learn`, or `cheatSheet`. No new facts, no invented statistics.
3. **Spoken language.** Contractions, short sentences, rhetorical questions. It
   will be read aloud — no bullet lists, no "as shown in Figure 3," no markdown
   in the spoken parts.
4. **Length.** 600–800 words of spoken script (~4–6 minutes at 140 wpm).
5. **Spelling.** Match the lesson content (Canadian/British: -ise, -our).
6. **Chapter sync.** SECTION headings must match the lesson's `learn` headings
   word for word, so video chapters align with the page.
