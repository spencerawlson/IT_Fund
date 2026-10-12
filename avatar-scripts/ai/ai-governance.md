# AI Governance & Risk: NIST RMF, the EU AI Act and Shadow AI — Avatar Tutor Script

**Lesson ID:** ai-governance
**Track:** AI Engineering
**Estimated runtime:** ~6 minutes (~790 words)

## Spoken script

**[HOOK — 0:00]**
Here is a question that should make every technology leader slightly nervous:
how many AI systems is your organisation running right now? Most cannot answer
it. Staff paste customer data into public chatbots, teams quietly plug models
into products, and nobody wrote any of it down. AI governance is how an
organisation decides which AI uses are acceptable, proves they are safe and
fair, and meets new regulation. And it is quickly becoming part of security
and risk roles — including, quite possibly, yours.

**[WHY IT MATTERS — ~0:25]**
Regulation is no longer theoretical. The EU AI Act is law, with real tiers and
real obligations. Frameworks like the NIST AI Risk Management Framework give
you a structure that auditors recognise. And the exam angle is real too: risk
tiers, framework functions, and bias concepts are exactly the kind of material
that shows up as scenario questions. This is the lesson that connects the
technical track to the boardroom.

**[SECTION — Frameworks and regulation — ~0:50]**
Three frameworks to know. First, the NIST AI Risk Management Framework, with
four core functions: Govern, Map, Measure, and Manage. Govern cuts across the
other three — it is the culture and accountability layer that makes the rest
real. Map is understanding your context and risks, Measure is analysing and
monitoring them, Manage is responding. There is also a Generative AI Profile,
NIST AI 600-1, that extends the framework specifically to generative models.

Second, the EU AI Act: a risk-based approach with four tiers. Unacceptable risk
means banned practices — out, entirely. High risk carries strict obligations:
risk management, data governance, human oversight, documentation. Limited risk
means transparency duties, like disclosing you are talking to an AI. Minimal
risk means essentially nothing. The exam loves asking which tier a scenario
falls into — learn the ladder.

Third, ISO/IEC 42001, which defines an AI management system — think of it as
the AI counterpart to ISO 27001 for information security. Same idea:
systematic, auditable, continuous.

**[SECTION — Fairness and transparency — ~2:20]**
Now the ethical core. Algorithmic bias is systematically unfair outcomes for
certain groups — a hiring model that downgrades women's CVs, a lending model
that redlines neighbourhoods — and it is often inherited from skewed training
data. The model did not invent the bias; it learned it from history and
automated it at scale. That is why it matters: bias at machine speed.

Explainability is the counterweight: being able to show why a model produced a
particular output. For classic machine learning, SHAP and LIME explain feature
contributions — which inputs pushed the decision and how hard. And
documentation has standard forms: a model card documents a model's intended
use, training data, limitations, and evaluation results, while datasheets do
the same for datasets. If someone asks "what is this model for and where does
it break," the model card should answer.

**[SECTION — Running AI governance — ~3:40]**
Frameworks are theory; this is practice. First, maintain an AI inventory — you
cannot govern AI systems you do not know about, including shadow AI: staff
pasting data into public tools, where confidential data may be retained or used
for training. Do not just ban it; provide approved enterprise tools with clear
data policies. A ban people ignore is worse than a policy people follow.

Second, ownership. AI risk should be owned by business leadership, supported
by a cross-functional governance group: security, legal, privacy, data
science, and business owners at the same table. AI risk is not an IT problem;
it is a business problem with technical symptoms. And third, red team your AI
systems — adversarially probe them for harmful, unsafe, or insecure behaviour
— before launch and after major changes. The same way you pentest an app, you
attack the model.

**[COMMON MISTAKES — ~4:50]**
Three traps. One: thinking governance is paperwork that slows down building.
The frameworks exist because ungoverned AI creates the incidents — the leak,
the biased decision, the regulatory fine. Two: banning public AI tools without
providing an approved alternative. People will use the tools anyway; now they
just hide it, and your shadow AI problem gets worse. Three: assigning AI risk
to IT alone. Without business leadership owning it, governance has no teeth
and the inventory never gets built.

**[RECAP — ~5:20]**
NIST AI RMF: Govern, Map, Measure, Manage — Govern cutting across all of them,
the Generative AI Profile extending it to generative models. The EU AI Act:
unacceptable risk is banned, high risk carries strict obligations, limited risk
means transparency, minimal risk means little. ISO/IEC 42001 is the AI
management system standard. Bias is unfair outcomes inherited from skewed data;
SHAP and LIME explain why; model cards and datasheets document it. Run
governance with a real AI inventory including shadow AI, approved tools instead
of futile bans, business leadership owning the risk, and red teaming before
launch and after changes. That is AI governance — frameworks to daily practice.

## On-screen visuals

- HOOK: organisation diagram with unknown AI uses popping up — shadow AI highlighted.
- WHY IT MATTERS: EU AI Act tiers ladder; NIST AI RMF four-function wheel.
- Frameworks and regulation: RMF functions (Govern across Map, Measure, Manage); EU AI Act four-tier pyramid; ISO/IEC 42001 badge beside ISO 27001.
- Fairness and transparency: bias pipeline — skewed data in, unfair outcomes out; SHAP/LIME feature-contribution bar chart; model card document.
- Running AI governance: AI inventory spreadsheet with shadow AI rows flagged; approved-tools policy vs ban comparison; cross-functional governance group; red-team probe animation.
- RECAP: cheat-sheet terms as a clean summary card.
