# Domain 2: Asset Security (10%): Classification, Ownership and Sanitisation — Avatar Tutor Script

**Lesson ID:** cissp-d2
**Track:** CISSP Domains
**Estimated runtime:** ~6 minutes (~779 words)

## Spoken script

**[HOOK — 0:00]**
Some of the worst breaches in history weren't caused by brilliant hackers.
They were caused by data nobody had inventoried, classified, or destroyed.
Domain 2 is about knowing what information you hold, who is responsible for
it, and how it dies. It sounds administrative. It is also where sloppy
organisations bleed.

**[WHY IT MATTERS — ~0:25]**
You cannot protect what you don't know you have. Asset security is the
foundation every other domain stands on: classification decides how data gets
handled, ownership decides who decides, and sanitisation decides whether
deleted data is really gone. The exam tests all three relentlessly.

**[SECTION — Know it, own it, classify it — ~0:50]**
The first step in asset security is to identify and inventory your assets.
That sounds obvious, which is exactly why organisations skip it — and why the
exam makes it the first step. Everything else follows from the inventory.

The data owner classifies the data and is accountable for it. Custodians
implement the protections the owner specifies. The owner is the landlord who
sets the house rules; the custodian is the property manager who enforces
them. Never confuse the two on the exam: the owner decides, the custodian
operates.

Classification levels come in two dialects. US government, from highest:
Top Secret, Secret, Confidential, plus Unclassified. Commercial schemes use
levels like confidential or proprietary, private, sensitive and public.
Different labels, same idea: the classification tells everyone how carefully
to handle the data.

Then there's retention. A data retention policy keeps data only as long as
it's legally and operationally needed. Over-retention increases the impact of
a breach and the cost of e-discovery — every extra record you keep is a
record you have to defend in court and in an incident. Keeping everything
forever feels safe; it's actually the opposite.

**[SECTION — Sanitisation — ~2:30]**
Deleting a file doesn't delete the data. Data remanence is the residual data
left on media after deletion — and it's why sanitisation matters. Tearing the
table of contents out of a book doesn't remove the chapters.

NIST SP 800-88 defines three levels. Clear: overwriting, suitable for reuse
inside the organisation. Purge: stronger techniques that defeat laboratory
recovery, suitable for reuse outside the organisation. Destroy: physical
destruction. The level follows the destination: the further the media
travels, the stronger the sanitisation.

One exam favourite: degaussing does not work on SSDs, because SSDs aren't
magnetic. A degaussed SSD still holds your data. For solid-state media, use
cryptographic erase, the vendor's secure erase command, or physical
destruction. When you see "degauss" and "SSD" in the same question, that's
the wrong answer.

**[SECTION — Privacy roles and techniques — ~3:40]**
Under GDPR, the controller decides the purpose and means of processing
personal data; the processor acts on the controller's behalf. A cloud
provider is typically a processor. The controller is the chef who decides
what's on the menu; the processor is the kitchen that cooks it. If a question
asks who's accountable for how personal data gets used, that's the
controller.

Pseudonymisation replaces identifiers so data can't be linked to a person
without additional information held separately. Here's the trap the exam
sets: pseudonymised data is still personal data under GDPR. The codebook
still exists somewhere, so re-identification is possible. Only truly
anonymised data falls outside GDPR. Masked name, real risk — don't confuse
the two.

**[SECTION — Baselines and DRM — ~4:30]**
Scoping selects the controls from a standard baseline — such as NIST SP
800-53 — that are relevant to a system. Tailoring then adjusts them to the
environment. You don't apply every control in the catalogue; you scope down
to what fits, then tailor what remains. It's the difference between buying
the whole toolbox and sharpening the tools you'll actually use.

Digital rights management — DRM — protects how content is used after
distribution, controlling copying, printing and forwarding. Think of it as
the librarian who follows the book home to make sure you don't photocopy it.

**[COMMON MISTAKES — ~5:05]**
Three traps. One: mixing up Clear, Purge and Destroy. Clear is overwrite for
internal reuse; Purge defeats lab recovery for external reuse; Destroy is
physical. Two: degaussing an SSD. It's the classic "sounds right, is wrong"
answer — SSDs aren't magnetic. Three: calling pseudonymised data anonymous.
Under GDPR, pseudonymised is still personal data; only truly anonymised data
isn't.

**[RECAP — ~5:30]**
Identify and inventory first — you can't protect what you don't know. The
owner classifies and is accountable; the custodian implements. Government
classification runs Top Secret down to Unclassified; commercial runs
confidential to public. Keep data only as long as needed — over-retention
feeds breaches and e-discovery bills. Sanitisation has three levels: Clear,
Purge, Destroy — and never degauss an SSD. The GDPR controller decides
purpose; the processor acts. Pseudonymised data is still personal data.
Scoping selects controls, tailoring adjusts them, and DRM guards content
after distribution.

## On-screen visuals

- HOOK: a server graveyard — old drives and tapes — with a "forgotten data"
  highlight.
- Know it, own it, classify it: inventory-to-classification flow; owner vs
  custodian two-role card; US government and commercial classification ladders
  side by side.
- Sanitisation: book-with-torn-contents analogy visual; Clear/Purge/Destroy
  three-step escalator; SSD with a "no degaussing" warning badge.
- Privacy roles and techniques: controller-decides/processor-acts flow
  diagram; pseudonymisation masking visual with the separate codebook.
- Baselines and DRM: baseline-to-scoped-to-tailored funnel; DRM shield over a
  document with copy/print/forward blocked.
- RECAP: the cheat-sheet rows as a clean summary card.
