# Python for Security & Data: Sockets, Secrets, and Authorisation First — Avatar Tutor Script

**Lesson ID:** py-security-tools
**Track:** Python & Automation
**Estimated runtime:** ~5 minutes (~747 words)

## Spoken script

**[HOOK — 0:00]**
Security teams build small tools constantly: a port checker, a hash verifier,
a log summariser. Python's standard library covers most of it — but the
security-sensitive parts have sharp edges. Use them wrong and your tool
becomes the vulnerability. This lesson is about using them right.

**[WHY IT MATTERS — 0:25]**
You'll write these tools yourself: checking which ports are open, verifying a
download hasn't been tampered with, storing credentials, querying a database
of users. Each one has a correct, safe pattern — and a tempting, dangerous
one that looks almost identical. Knowing which is which is the entire lesson.

**[SECTION — Networking and integrity — 0:50]**
The socket module opens raw TCP and UDP connections. Socket dot
create-connection with a host, port, and timeout is the whole basis of a port
check: if the connection succeeds, the port is open. Wrap it in a with block
so each connection closes immediately, and always set a timeout so a filtered
port doesn't stall your scan. That polite little function — connect, timeout,
close — is a port scanner in miniature.

Hashlib computes digests: sha256 of data, hexdigest, and you have a
fingerprint. Compare it against the vendor's published hash to verify a
download, or hash evidence to preserve its integrity for later. A hash is how
you answer "is this exactly what it claims to be?" — one changed byte, and
the digest won't match.

And when you need deeper protocol work — crafting and sniffing arbitrary
packets — Scapy is the tool. Just remember it belongs on authorised networks
only, which we'll come back to.

**[SECTION — Passwords, tokens and encryption — 1:55]**
Never store passwords with a fast hash like plain SHA-256. Why? Because
attackers can try billions of guesses per second against a fast hash. Use a
slow, salted algorithm designed for passwords: bcrypt, scrypt, or Argon2.
Slow is the feature — it makes each guess expensive, which is exactly what
you want when the guesses are hostile.

Generate tokens, API keys, and passwords with the secrets module. The random
module is predictable — fine for games, fatal for security — and must never be
used for security values. Secrets dot token urlsafe gives you a proper random
token in one call.

For encryption, use the cryptography library — specifically its Fernet
recipe, which gives authenticated symmetric encryption with sensible
defaults. The lesson's advice is blunt for a reason: do not assemble
cryptographic primitives yourself. Fernet means you don't have to choose
modes, padding, or authentication — it's already done right.

And when comparing secrets like tokens or HMACs, use hmac dot compare digest.
A normal double-equals stops at the first differing character — and that
timing difference can leak the secret byte by byte to a patient attacker.
Compare digest takes the same time regardless, closing the leak.

**[SECTION — Data and databases — 3:15]**
Pandas is the standard library for tabular analysis: read a CSV, then groupby
and value counts summarise thousands of log rows in a line or two. When the
question is "what's in this data," pandas usually answers it faster than
anything else.

Then the critical database rule: prevent SQL injection with parameterised
queries. Cursor dot execute with the SQL and a separate tuple of values — the
driver sends the value separately from the SQL, so input can never change the
query. Never build SQL with f-strings or concatenation. Why is this
non-negotiable? Because one quote character in user input can rewrite your
query — and parameterised queries make that structurally impossible, not just
unlikely.

**[SECTION — Authorisation first — 4:10]**
The ethics section, and it's short because it's absolute: scanning or probing
systems you don't own — or don't have written permission to test — can be
illegal, and it violates professional codes of ethics such as ISC2's. Every
technique in this lesson is dual-use. The difference between a security
professional and an attacker isn't the tool — it's the written scope. Get it
before you run anything against anything but your own lab.

**[COMMON MISTAKES — 4:45]**
Three traps. One: the random module for tokens or passwords — predictable;
use secrets. Two: comparing secrets with double-equals — the timing leak;
use hmac dot compare digest. Three: building SQL with f-strings — injection;
use parameterised queries. And the meta-trap: running these tools without
written authorisation.

**[RECAP — 5:10]**
Sockets check ports — connect with a timeout, close promptly; hashlib
fingerprints files for integrity; Scapy crafts packets on authorised networks
only. Passwords get slow salted hashes — bcrypt, scrypt, Argon2 — never fast
ones; secrets makes tokens, never random; Fernet handles encryption; compare
digest compares secrets in constant time. Pandas summarises tabular data;
parameterised queries keep SQL injection structurally impossible. And above it
all: written authorisation first, always. Sharp tools, used right.

## On-screen visuals

- HOOK: a small toolkit assembling — port checker, hash verifier, log
  summariser — with warning icons on the sharp edges.
- Networking SECTION: a TCP connection succeeding on an open port and timing
  out on a filtered one; a file's hash compared against a vendor's published
  digest, matching.
- Passwords SECTION: a fast hash being brute-forced at billions of guesses
  per second versus a slow salted hash resisting; secrets versus random
  labelled safe/unsafe; two string comparisons — one short-circuiting, one
  constant-time.
- Data SECTION: pandas collapsing thousands of CSV rows into a summary; a
  malicious quote character neutralised by a parameterised query.
- Authorisation SECTION: a written scope document as the gate before any
  scan runs.
- RECAP: the cheat-sheet terms as a clean summary card.
