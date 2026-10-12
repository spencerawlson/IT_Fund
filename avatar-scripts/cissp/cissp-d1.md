# Domain 1: Security and Risk Management (16%): Risk, Continuity, Law and People — Avatar Tutor Script

**Lesson ID:** cissp-d1
**Track:** CISSP Domains
**Estimated runtime:** ~5 minutes (~765 words)

## Spoken script

**[HOOK — 0:00]**
Domain 1 is the biggest single slice of your exam — sixteen percent — and it's
the domain that frames everything else. Risk, continuity, law, people. Get this
domain right and the other seven start making sense, because every technical
decision eventually becomes a risk decision.

**[WHY IT MATTERS — ~0:25]**
Nobody hires a security team to be clever about firewalls. They hire one to
keep the business alive and out of trouble. This domain teaches the governance
machinery — how organisations analyse risk, survive disruption, meet the law
and manage people. It's the vocabulary of the boardroom, and the CISSP expects
you to speak it.

**[SECTION — Risk — ~0:50]**
Risk analysis comes in two flavours. Quantitative analysis uses money: SLE, ARO
and ALE — dollar figures you can put in a budget request. Qualitative analysis
uses ratings like high, medium and low. Most organisations blend both, because
some risks are easy to price and some are not. Here's the mental model:
quantitative is pricing your insurance; qualitative is saying the neighbourhood
feels risky. Both are legitimate; the exam just wants you to know which is
which.

The NIST Risk Management Framework, SP 800-37, runs through seven steps:
Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor. Notice the
sixth step. Authorization is the management decision to accept the residual
risk — the risk remaining after controls are applied. Residual risk never
disappears; someone with the authority must explicitly sign off on what's left.
That's why it's a management decision, not a technical one.

Threat modelling finds design flaws before they're built, and the exam's
favourite method is Microsoft's STRIDE: Spoofing, Tampering, Repudiation,
Information disclosure, Denial of service, Elevation of privilege. Think of it
as burglar-proofing the blueprint before the house is built.

**[SECTION — Continuity — ~2:25]**
A business continuity plan keeps critical business functions running during a
disruption. The disaster recovery plan is the IT-focused subset that restores
systems. The BCP is about the business surviving; the DRP is about the servers
coming back. Maximum tolerable downtime — MTD — is the longest a function can
be down before the damage becomes unacceptable, and the RTO must be less than
or equal to the MTD. Picture it this way: MTD is how long you can hold your
breath; RTO is how fast the rescue has to reach you.

**[SECTION — Law and intellectual property — ~3:10]**
A trade secret is protected by keeping it secret — NDAs, access control,
reasonable measures. There's no registration, and protection lasts exactly as
long as the secret stays secret. A US utility patent generally lasts twenty
years from filing. Copyright lasts the author's life plus seventy years.
Trademarks can be renewed indefinitely while they're in use. Here's the
strategic choice the exam hints at: a patent means publishing your invention in
exchange for twenty years of monopoly; a trade secret means hiding the recipe
forever and praying it never leaks. Coca-Cola chose the second option.

**[SECTION — People, suppliers and standards — ~4:00]**
Separation of duties splits critical tasks so no single person can commit fraud
alone; fraud then requires collusion. Job rotation and mandatory vacations help
detect fraud that's already happening. And when someone leaves, HR and IT act
together — access revoked at or before notification, assets recovered. The
handshake between HR and IT is the control.

Supply chain risk management means assessing and monitoring vendors, including
their suppliers, using SBOMs, contract security requirements and right-to-audit
clauses. Your security is only as strong as your least-scrutinised supplier.
Finally, two standards: ISO/IEC 27001 specifies the requirements for an
information security management system — the ISMS. ISO/IEC 27002 provides the
control guidance. One says what you must have; the other suggests how.

**[COMMON MISTAKES — ~4:55]**
Three traps. One: mixing up the BCP and the DRP. Business functions keep
running — that's the BCP. IT systems get restored — that's the DRP. Two:
residual risk is what's left after controls, and it must be explicitly accepted
by management in the Authorization step — it's not the risk before controls.
Three: ISO 27001 versus 27002. Requirements versus guidance. If a question asks
which one certifies an ISMS, that's 27001.

**[RECAP — ~5:20]**
Quantitative risk speaks money — SLE, ARO, ALE — while qualitative speaks
high, medium, low. The NIST RMF runs Prepare, Categorize, Select, Implement,
Assess, Authorize, Monitor, and Authorization is management accepting residual
risk. STRIDE threat-models designs: spoofing, tampering, repudiation,
information disclosure, denial of service, elevation of privilege. The BCP
keeps the business running, the DRP restores IT, and RTO must sit within the
MTD. Trade secrets last while hidden, patents twenty years, copyright life plus
seventy, trademarks renew forever. Separation of duties forces collusion for
fraud. And ISO 27001 certifies the ISMS while 27002 guides the controls.

## On-screen visuals

- HOOK: Domain 1 weight bar — 16%, largest of the eight — with the four
  pillars: risk, continuity, law, people.
- Risk: quantitative vs qualitative two-column card; the seven NIST RMF steps
  as a vertical timeline with Authorization highlighted; STRIDE as six labelled
  tiles.
- Continuity: BCP vs DRP split diagram — business functions vs IT systems;
  MTD/RTO breath-holding analogy timeline.
- Law and intellectual property: protection-duration comparison table — trade
  secret, patent (20 years), copyright (life + 70), trademark (renewable).
- People, suppliers and standards: separation-of-duties split-task diagram;
  ISO 27001 vs 27002 distinction card.
- RECAP: the cheat-sheet rows as a clean summary card.
