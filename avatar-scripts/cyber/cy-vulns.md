# Vulnerability Types & Mitigations: Zero-Days, Injection and Defences That Work — Avatar Tutor Script

**Lesson ID:** cy-vulns
**Track:** Cybersecurity Operations
**Estimated runtime:** ~5 minutes (~673 words)

## Spoken script

**[HOOK — 0:00]**
Vulnerabilities are the raw material of every attack. And here is the exam
secret: memorising individual CVEs is pointless. The skill is recognising
the flaw class — seeing unsanitised input plus string-built SQL and thinking
"injection" before you even know the CVE number. Classes, not cases.

**[WHY IT MATTERS — 0:25]**
Security+ tests whether you can name the flaw class, explain how it is
exploited, and state the fix. This lesson covers the major classes —
zero-days, buffer overflows, race conditions, injection flaws, cryptographic
weaknesses — and the mitigations that actually work. Pattern recognition is
the whole game.

**[SECTION — Flaw classes to recognize — 0:50]**
A zero-day is exploited before the vendor knows or patches it. So what do
you do when there is no patch? Isolation and monitoring — you cannot fix the
flaw, so you shrink its reach and watch it closely.

Buffer overflows write past a buffer's bounds to hijack execution. The
mitigations stack: safe languages that bound-check for you, ASLR which
randomises memory layout so exploits cannot find their targets, and DEP/NX
which marks memory non-executable. Three layers, because one is never
enough.

Race conditions — time-of-check to time-of-use — exploit the gap between a
security check and the action it approved. The check passed; then the file
was swapped. The vulnerability lives in the gap.

Injection flaws share one root cause: untrusted input treated as code. SQL
injection manipulates databases — the fix is parameterised queries. Cross-
site scripting injects scripts into victims' browsers — the fix is output
encoding plus Content Security Policy. The family extends: LDAP injection,
template injection, and XXE, where XML parsers resolve external entities to
read files. Cross-site request forgery tricks a logged-in browser into
unwanted actions — countered by anti-CSRF tokens.

Three more to file away. Replay attacks re-send captured valid data —
defeated by nonces and timestamps, so the capture cannot be reused. Downgrade
attacks force weaker crypto — countered by HSTS and version enforcement.
Side-channel attacks extract secrets from timing or cache behaviour, the
Spectre class — mitigated with constant-time code.

**[SECTION — Mitigations that work — 2:45]**
Now the fixes — and notice the tone: these are not suggestions. Validate
input against an allow-list of known-good values, because deny-lists always
miss the next bypass. Encode output for its context, so data can never
execute. Separate code from data with parameterised queries. None of these
is optional — they are the actual fixes.

Least privilege grants only the access a task needs, limiting any
compromise's blast radius. Defence in depth layers controls so no single
failure is fatal. Attack surface reduction removes what attackers could
target in the first place — you cannot exploit what is not there.

And "security through obscurity" — hiding how things work — fails the moment
it is discovered. Use it only as one layer among many, per Kerckhoffs's
principle: the system must be secure even when the attacker knows exactly
how it works. Obscurity is seasoning, never the meal.

**[COMMON MISTAKES — 4:00]**
Three traps. One: answering a zero-day question with "patch it." There is no
patch yet — isolate and monitor. Two: picking deny-lists over allow-lists.
Deny-lists chase known-bad and always miss the next bypass; allow-lists
permit only known-good. Three: treating obscurity as a real control. Once
discovered it evaporates — Kerckhoffs's principle demands the system be
secure even when fully known.

**[RECAP — 4:25]**
Zero-days are exploited before patches exist — isolate and monitor. Buffer
overflows are countered by safe languages, ASLR, and DEP. Race conditions
live in the gap between check and use. Injection means untrusted input
treated as code: parameterised queries for SQLi, output encoding plus CSP
for XSS, anti-CSRF tokens for forged requests, nonces and timestamps against
replays, HSTS against downgrades, constant-time code against side channels.
Mitigate with allow-lists, context-aware encoding, and code-data separation —
none optional. Layer with least privilege, defence in depth, and attack
surface reduction. And obscurity is a layer, never a strategy.

## On-screen visuals

- HOOK: a CVE list dissolving into flaw-class categories — injection, memory,
  crypto — the patterns glowing.
- Flaw classes: zero-day timeline — exploit before patch; buffer overflow
  memory diagram with ASLR randomisation and DEP zones; TOCTOU gap animation;
  injection family tree sharing the "input treated as code" root; replay,
  downgrade, and side-channel mini-diagrams.
- Mitigations: allow-list vs deny-list gate comparison; parameterised query
  separating code from data; layered defence-in-depth stack; Kerckhoffs's
  principle call-out — "secure even when fully known."
- RECAP: the cheat-sheet table as a summary card.
