# Governance, Risk & Compliance: The Business of Security — Avatar Tutor Script

**Lesson ID:** sec-governance
**Track:** Security+ (SY0-701)
**Estimated runtime:** ~6 minutes (~800 words)

## Spoken script

**[HOOK — 0:00]**
Security is not a technical hobby — it is a business function. Someone has to decide which risks matter, write down the rules, meet legal obligations, and prove it all to auditors. That is governance, risk, and compliance: the part of security that speaks the language of money and law.

**[WHY IT MATTERS — ~0:25]**
This lesson is the exam's numbers-and-documents corner: quantitative risk with actual formulas, the policy hierarchy, contracts, regulations with real fines, and audit reports. The questions are generous — know the formulas and the definitions, and the points are nearly free. In a real job, this is how you justify every security budget you will ever ask for.

**[SECTION — Quantitative risk — ~0:50]**
Two formulas, and they build on each other. Single Loss Expectancy — SLE — is the cost of one occurrence: Asset Value times Exposure Factor, the fraction of the asset lost. An asset worth $100,000 with a 25% exposure factor has an SLE of $25,000.

Annualized Loss Expectancy — ALE — is the expected yearly cost: SLE times ARO, the annualised rate of occurrence. If that event happens once every two years — an ARO of 0.5 — the ALE is $12,500 per year. A control costing more than $12,500 per year is not worth it for this risk alone: the ALE caps the sensible price of the fix.

**[SECTION — Managing risk — ~1:55]**
There are four responses to risk, and the exam will dress them as scenarios. Accept: live with it. Avoid: stop the risky activity entirely. Transfer: shift the financial impact — cyber insurance is the classic example. Mitigate: reduce the likelihood or impact with controls. Bought insurance? That is transfer. Shut down the service? That is avoid.

Risk appetite is the amount of risk an organisation is willing to accept in pursuit of its goals; risk tolerance is the acceptable variation around it. And the risk register records identified risks with owners, ratings, and chosen responses, reviewed regularly.

**[SECTION — Policies and third parties — ~2:50]**
The policy hierarchy is a ladder of specificity. A policy states what and why at a high level. A standard sets mandatory specifics — AES-256 for data at rest, for example. A procedure is the step-by-step how. Guidelines are recommendations, not mandatory. Policy says encrypt; standard says AES-256; procedure says how; guidelines suggest.

Third-party contracts each have a job. An MSA — master services agreement — sets the master terms of a relationship. An SOW — statement of work — defines the specific work under it. An SLA sets service levels: uptime, response times. An NDA protects confidentiality. An MOU is a less formal statement of intent — a handshake with letterhead.

**[SECTION — Regulations, roles and assurance — ~3:50]**
GDPR regulates the personal data of people in the EU: breaches must be reported to the regulator within 72 hours, and fines reach up to 4% of global annual turnover. PCI DSS protects payment card data — but it is an industry standard enforced by contracts with the card brands, not a law. GDPR is law; PCI DSS is contract.

Data roles split accountability from implementation. The data owner is accountable for the data and classifies it; the data custodian implements the protections. Under privacy law, the controller decides why and how personal data is processed, and the processor handles it on the controller's behalf.

Assurance comes from audits. A SOC 2 Type I report checks that controls are designed properly at a single point in time; Type II shows they operated effectively over a period, usually 6 to 12 months. And a business impact analysis — a BIA — identifies critical functions and the impact of losing them, setting RTO and RPO: the foundation of business continuity planning.

**[COMMON MISTAKES — ~5:00]**
Three traps. One: the formulas. SLE is Asset Value times Exposure Factor; ALE is SLE times ARO. Do not multiply all three at once. Two: calling PCI DSS a law. It is an industry standard enforced by contract — GDPR is the law with the 4% fines. Three: SOC 2 Type I versus Type II. Type I is design at a point in time; Type II is operation over time.

**[RECAP — ~5:25]**
SLE equals AV times EF; ALE equals SLE times ARO — and the ALE caps what a control may cost. Risk responses are accept, avoid, transfer, mitigate; appetite is the stance, tolerance the wiggle room. Policies state what and why, standards mandate specifics, procedures give steps, guidelines suggest. MSAs set terms, SOWs define work, SLAs set service levels. GDPR: 72-hour breach notice, fines up to 4% of turnover; PCI DSS is contractual, not law. Owners are accountable, custodians implement; Type I checks design, Type II checks operation; the BIA sets RTO and RPO.

## On-screen visuals

- HOOK: a boardroom table with risk, rules, and regulations as three pillars.
- Quantitative risk: the worked example — $100,000 asset, 25% exposure, $25,000 SLE, ARO 0.5, $12,500 ALE — with the control-cost decision line.
- Managing risk: four response cards — accept, avoid, transfer, mitigate — with the insurance and shutdown scenarios.
- Policy hierarchy: the ladder — policy, standard, procedure, guideline — from what-and-why down to step-by-step; contract cards for MSA, SOW, SLA, NDA, MOU.
- Regulations: GDPR's 72 hours and 4% beside PCI DSS labelled contractual; owner/custodian and controller/processor as paired roles; SOC 2 Type I versus Type II timeline; BIA feeding RTO and RPO.
- RECAP: the cheat-sheet rows as a clean summary card.
