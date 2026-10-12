# Domain 3: Security Architecture and Engineering (13%): Models, Trust and Physical Security — Avatar Tutor Script

**Lesson ID:** cissp-d3
**Track:** CISSP Domains
**Estimated runtime:** ~6 minutes (~783 words)

## Spoken script

**[HOOK — 0:00]**
Bell-LaPadula. Biba. Clark-Wilson. Brewer-Nash. These names sound like
obscure academics, and the exam treats them like celebrities. Domain 3 covers
how secure systems are designed and built — from formal security models to
hardware roots of trust, cryptography choices and the physical protection of
facilities. Let's make the models unforgettable.

**[WHY IT MATTERS — ~0:25]**
Security models are the grammar of system design. They answer a simple
question: who gets to read what, and who gets to write what?
Learn the four models cold and a whole family of exam questions answers
itself.

**[SECTION — Security models — ~0:50]**
Bell-LaPadula enforces confidentiality: no read up, no write down. You can't
read above your clearance, and you can't leak secrets by writing to a lower
level. It models military classification. The classic phrase: read down,
write up — information flows up the clearance ladder, never down.

Biba enforces integrity and is the inverse: no read down, no write up. Don't
trust less reliable data, and don't contaminate more trusted data.

Clark-Wilson also enforces integrity, but through well-formed transactions
and separation of duties. Users reach data only through programs — the access
triple of subject, program and object. It's the banking model: you don't edit
the ledger directly; you run the approved transfer program, which checks the
rules.

Brewer-Nash — the Chinese Wall model — prevents conflicts of interest. Access
changes dynamically based on what you've already accessed: a consultant who
viewed Bank A's data can't then view competitor Bank B's. The wall builds
itself around your history.

**[SECTION — Trusted systems — ~2:35]**
The trusted computing base — the TCB — is all the hardware, firmware and
software that enforces the security policy. Everything security depends on,
in one boundary. The reference monitor is the concept that mediates every
single access, and it must be three things: tamper-proof, always invoked,
and small enough to verify. Think of it as the perfect bouncer: can't be
bribed, checks every person, and works from a rulebook short enough to audit.

A TPM — Trusted Platform Module — provides a hardware root of trust for keys,
measured boot and attestation. BitLocker uses it to seal disk encryption
keys to the machine's measured boot state. Common
Criteria is the international framework for evaluating security products,
with assurance levels EAL1 to EAL7, and protection profiles that define the
requirements.

**[SECTION — Design principles and attacks — ~3:45]**
Secure design principles first. Fail securely: on failure, default to a
secure state — the door locks, it doesn't open. Secure defaults: ship safe
out of the box. Least privilege: nothing gets more access than it needs.
Zero trust: verify everything. Privacy by design: build it in, don't bolt it
on.

Then the attack that ignores the algorithm entirely. A side-channel attack
extracts secrets from timing, power consumption or emissions rather than
breaking the mathematics. Spectre and Meltdown exploited CPU speculative
execution. The analogy: instead of picking the lock, you listen to the
tumblers and work out the combination from the sound.

And one cryptography comparison the exam loves: elliptic curve cryptography
gives equal strength with much shorter keys than RSA. A 256-bit ECC key is
roughly as strong as a 3072-bit RSA key. Same padlock strength, a fraction of
the metal.

**[SECTION — Physical security — ~4:45]**
For data centres, clean-agent fire suppression — such as FM-200 — or
pre-action sprinklers are preferred. A pre-action system fills its pipes only
after detection, reducing accidental water damage. Water and servers are
natural enemies; the whole point is fighting fire without drowning the
hardware.

CPTED — Crime Prevention Through Environmental Design — uses lighting,
sightlines and landscaping to deter crime before any lock or guard is needed.
A well-lit street with clear sightlines needs fewer police. Design the
environment so the crime feels unwinnable, and most attackers choose
somewhere else.

**[COMMON MISTAKES — ~5:00]**
Three traps. One: mixing up the model directions. Bell-LaPadula is
confidentiality — no read up, no write down. Biba is integrity — the mirror
image. Two: confusing Brewer-Nash with Clark-Wilson. Chinese Wall is
conflicts of interest with dynamic access; Clark-Wilson is well-formed
transactions with the access triple. Three: picking water-based suppression
for a data centre. Clean agent or pre-action — the exam punishes sprinklers
that soak the servers.

**[RECAP — ~5:25]**
Bell-LaPadula guards confidentiality: no read up, no write down. Biba guards
integrity: no read down, no write up. Clark-Wilson guards integrity through
well-formed transactions and the subject-program-object triple. Brewer-Nash
builds Chinese Walls against conflicts of interest. The TCB is everything
enforcing policy; the reference monitor mediates every access — tamper-proof,
always invoked, verifiable. TPMs give a hardware root of trust; Common
Criteria rates assurance from EAL1 to EAL7. Fail securely, watch the
side-channels — timing, power, emissions — remember 256-bit ECC equals
3072-bit RSA, suppress data-centre fires with clean agents or pre-action
systems, and design the environment with CPTED.

## On-screen visuals

- HOOK: the four model names as a "hall of fame" wall.
- Security models: four-quadrant card — BLP (no read up / no write down),
  Biba (inverse arrows), Clark-Wilson (subject-program-object triangle),
  Brewer-Nash (dynamic Chinese Wall).
- Trusted systems: TCB boundary diagram with the reference monitor as a
  gatekeeper checking every access; TPM chip with sealed-key visual; Common
  Criteria EAL1–EAL7 scale.
- Design principles and attacks: principle checklist; side-channel
  timing/power/emissions waveforms; ECC-vs-RSA key-length comparison bar.
- Physical security: clean-agent vs pre-action sprinkler diagram; CPTED
  lighting/sightlines illustration.
- RECAP: the cheat-sheet rows as a clean summary card.
