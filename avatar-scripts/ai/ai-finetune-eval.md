# Fine-tuning & Evaluation: LoRA, Golden Datasets and LLM Judges — Avatar Tutor Script

**Lesson ID:** ai-finetune-eval
**Track:** AI Engineering
**Estimated runtime:** ~5 minutes (~740 words)

## Spoken script

**[HOOK — 0:00]**
Changing a model's behaviour is expensive and easy to get wrong. But here is
the harder problem: knowing whether the change helped. You tweaked the prompt,
regenerated the answers, and they feel better. Do they? Feelings are not
measurements. Evals are to AI engineering what unit tests are to software —
without them, every prompt tweak is a guess. And fine-tuning without evals is
just expensive guessing.

**[WHY IT MATTERS — ~0:25]**
Fine-tuning is the most over-requested and under-understood technique in AI
engineering. Teams reach for it when prompting would have worked, then cannot
tell whether it helped. This lesson teaches restraint: when fine-tuning is
actually the right tool, how LoRA makes it affordable, and how to build the
evals that tell you the truth about every change you ship.

**[SECTION — When and how to fine-tune — ~0:50]**
Fine-tuning is the right tool for consistent style or format, or a narrow task
that prompting cannot achieve — your support team's voice, your incident
report structure. But the lesson's first rule is restraint: try prompting and
RAG first. They are cheaper, faster to iterate on, and reversible in seconds.
Fine-tuning is a commitment; prompting is an experiment.

When you do fine-tune, LoRA makes it affordable. Instead of training all the
weights, LoRA trains small low-rank adapter matrices — a tiny add-on that
steers the big model, cheap enough for a single GPU. QLoRA adds 4-bit
quantisation on top. Quantisation generally means storing weights in lower
precision — 8-bit, 4-bit — to save memory, at some cost in quality. Think of it
as a compressed photo: much smaller file, slightly softer image.

Two more terms. Catastrophic forgetting is fine-tuning eroding general
abilities the model had before — your support-tuned model suddenly cannot do
basic maths. Mitigate it with adapters, by mixing in general data, and with low
learning rates. And distillation trains a small model to imitate a larger one,
giving cheaper inference at some quality cost: the student learns from the
teacher, then works the shift alone.

**[SECTION — Evals — ~2:20]**
An eval is a repeatable test set that measures model or application quality —
and the discipline is to run it on every prompt or model change, like a unit
test suite. No passing eval, no ship. A golden dataset is a curated set of
inputs with expected outputs used for regression testing, and the best way to
grow one is from real failures seen in production. Every time the model
embarrasses you in production, that case goes into the golden set so it can
never embarrass you the same way twice.

For scale, there is LLM-as-a-judge: use a model to grade outputs against a
rubric, which scales to thousands of cases no human team could review. But
calibrate it against human grades, and watch for bias — judges favour longer
answers, for example, even when longer is worse. And a warning about public
benchmarks: scores can be inflated by contamination, when test data leaked into
training. The model is not smart; it has seen the exam. Build private evals
from your own use cases.

**[SECTION — Production logging — ~3:45]**
You cannot evaluate what you cannot see. Log prompts and outputs in production
for debugging, for growing your evals, for abuse detection, and for audits.
But these logs are sensitive — they can be as sensitive as the data the
application handles. So redact personal data and control access to the logs.
The golden rule: the logs deserve the same protection as the database they
came from.

**[COMMON MISTAKES — ~4:25]**
Three traps. One: fine-tuning before trying prompting and RAG. It is the
expensive answer to a cheap problem, and it locks you into retraining every
time the facts change. Two: trusting public benchmark scores without asking
about contamination — a leaked test set makes any model look brilliant. Three:
using an LLM judge without calibrating against humans. An uncalibrated judge
with a length bias will happily certify that every answer should have been
longer.

**[RECAP — ~4:55]**
Fine-tune for style, format, or narrow tasks — and only after prompting and
RAG have failed. LoRA trains small adapters instead of all the weights, QLoRA
adds 4-bit quantisation, and quantisation trades a little quality for a lot of
memory. Watch for catastrophic forgetting and consider distillation for cheaper
inference. Build evals like unit tests, grow a golden dataset from production
failures, calibrate any LLM judge against humans, and distrust public
benchmarks that might be contaminated. Log everything in production, redact
the personal data, and guard the logs like the database. Measure first, tune
second — that is the whole discipline.

## On-screen visuals

- HOOK: prompt tweak with "feels better?" vs an eval scoreboard giving a hard number.
- WHY IT MATTERS: decision ladder — prompting, RAG, fine-tuning — with cost and reversibility annotated.
- When and how to fine-tune: LoRA adapter diagram (small matrices steering a frozen model); quantisation as a compressed photo; catastrophic forgetting curve.
- Evals: eval harness running like a unit test suite; golden dataset growing from production failures; LLM judge with a human-calibration check; contamination warning on a benchmark leaderboard.
- Production logging: log pipeline with PII redaction and access controls.
- RECAP: cheat-sheet terms as a clean summary card.
