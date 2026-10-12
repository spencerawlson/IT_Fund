# Security Concepts: CIA, AAA, Controls and Zero Trust — Avatar Tutor Script

**Lesson ID:** sec-concepts
**Track:** Security+ (SY0-701)
**Estimated runtime:** ~7 minutes (~950 words)

## Spoken script

**[HOOK — 0:00]**
Every security decision you will ever make — buying a firewall, writing a password
policy, responding to a breach at three in the morning — traces back to about six
ideas. Learn them cold, and the rest of Security+ stops being memorisation and
starts being common sense.

**[WHY IT MATTERS — 0:25]**
Here is the thing about this exam: it loves to test whether you can classify
things. Is a security camera preventive or detective? Is a backup a technical
control or an operational one? The scenarios look tricky, but they all collapse
once you know exactly what each category means. So we are going to be precise.

**[SECTION — CIA, non-repudiation and AAA — 0:50]**
Start with the CIA triad: confidentiality, integrity, availability. Think of it
as the three promises security makes. Confidentiality promises that nobody who
shouldn't see your data will see it — and encryption is the main tool that keeps
that promise. Integrity promises the data hasn't been tampered with. And here's
the elegant part: we check integrity with hashing, because even a tiny change to
a file produces a completely different hash. If the hash matches, the file is
untouched. Availability promises the data and systems are there when you need
them — redundancy, backups, resilience. A perfect encryption scheme means nothing
if the server is down.

Now, non-repudiation. Ugly word, simple idea: the sender can't credibly deny
having sent something. How? Digital signatures. Only the holder of the private
key could have produced that signature, so "I never sent that" stops working.
You'll see non-repudiation attached to email, contracts, financial transactions —
anywhere denial would be convenient.

Then AAA — and no, not the roadside people. Authentication: prove who you are.
Authorization: now that we know who you are, here's what you're allowed to do.
Accounting: we wrote down everything you did. That last one is the unsung hero.
Without accounting logs, there is no investigation and no audit. When something
goes wrong, the logs are the crime scene.

**[SECTION — Control categories and types — 2:10]**
Security+ splits controls two different ways, and the exam loves mixing them up,
so keep them on separate shelves in your head. First, categories — that's *how*
a control is implemented. Technical controls are the technology: firewalls,
encryption. Managerial controls are the paperwork with teeth: policies, risk
assessments. Operational controls are carried out by people: guard rotations,
security awareness training. Physical controls are the tangible stuff: locks,
fences, badge readers.

Second, types — that's *what the control does*. Preventive stops the event.
Deterrent discourages it — think of a "beware of dog" sign. Detective identifies
that it happened. Corrective fixes things afterwards. Compensating is the backup
plan: an alternative control for when the primary one isn't feasible. And
directive tells people what to do, like a policy document.

The classic exam trap is the compensating control. Picture a legacy system so old
it can't be patched — the vendor doesn't even exist anymore. You can't apply the
primary control, the patch, so you isolate that system on its own network segment
with tight firewall rules. That isolation is compensating for the missing patch.
When you see "cannot be patched" in a question, your ears should perk up.

**[SECTION — Zero trust — 3:30]**
Zero trust throws away one of the oldest ideas in networking: the trusted
internal network. The old model said, once you're inside the building — on the
corporate LAN — you're trusted. Zero trust says: never trust, always verify.
Every single request is judged on identity, device health, and context, no
matter where it comes from. Being on the LAN grants you nothing by itself.

Under the hood there are three roles. The policy engine decides — that's the
brain. The policy administrator carries out the decision. And the policy
enforcement point is the bouncer at the door, allowing or blocking the actual
connection between the subject and the resource. Engine decides, administrator
relays, enforcement point acts. If a question describes "the component that
grants or denies access," that's the enforcement point.

**[SECTION — Gap analysis, deception and change management — 4:20]**
Three more tools. A gap analysis compares where your security is today against
where it should be — usually against a framework like NIST or ISO 27001 — and
the gaps become your roadmap. Simple, but it shows up on the exam dressed as a
scenario: "the company wants to compare its posture to a standard." That's gap
analysis.

Deception technology is exactly what it sounds like: lie to the attacker. A
honeypot is a decoy system with no legitimate purpose, so anyone touching it is
up to no good. Same idea, different targets: honeynets for networks, honeyfiles
for documents, honeytokens for credentials. The key insight for the exam is that
any interaction with a honeypot is a high-confidence alert, because legitimate
users should never be there.

And change management — which surprises people by being a security control.
Unreviewed changes cause outages and open vulnerabilities; every admin has a
story. A proper change record has approval, an impact analysis, test results,
and a backout plan for when it goes sideways.

**[COMMON MISTAKES — 5:20]**
Three traps to avoid. One: a security camera is primarily *detective*, not
preventive — yes, it deters, but its function is identifying what happened.
Two: don't confuse categories with types. "Technical" describes how it's built;
"preventive" describes what it does. A firewall is both — technical category,
preventive type. Three: accounting in AAA is about *logging activity*, not about
money. The exam counts on that confusion.

**[RECAP — 5:45]**
CIA is the three promises: confidentiality through encryption, integrity through
hashing, availability through redundancy. Non-repudiation means no deniability,
delivered by digital signatures. AAA is prove, permit, record. Controls split by
how they're built — technical, managerial, operational, physical — and by what
they do — preventive, deterrent, detective, corrective, compensating, directive.
Zero trust verifies everything and trusts nothing, not even the LAN. And gap
analysis, honeypots, and change management round out the toolkit. That's the
foundation. Everything from here is application.

## On-screen visuals

- HOOK: the CIA triad as three interlocking rings, labels fading in.
- CIA SECTION: side-by-side — locked file (confidentiality), hash comparison
  showing one changed character flipping the digest (integrity), server cluster
  with one node highlighted as failed-over (availability).
- AAA: three-step flow diagram — badge scan, permission check, log entry.
- Control categories/types: two-column matrix; exam-trap row highlighting the
  unpatchable legacy server isolated on its own segment.
- Zero trust: request path animation — subject to enforcement point, with the
  policy engine and administrator labelled above the decision.
- Gap analysis: current-posture vs target-standard bar comparison.
- RECAP: the cheat-sheet terms as a clean summary card.
