# LLM Fundamentals: Tokens, Temperature and Hallucinations — Avatar Tutor Script

**Lesson ID:** ai-llm-basics
**Track:** AI Engineering
**Estimated runtime:** ~6 minutes (~782 words)

## Spoken script

**[HOOK — 0:00]**
A large language model does exactly one thing: it predicts text, one token at
a time. That is it. And yet that single mechanism explains almost everything —
why models are brilliant at drafting, why they confidently invent facts, why
temperature changes their personality, and why "I don't know" is so hard for
them to say. Learn the mechanism and the magic disappears. What is left is a
tool you can actually engineer with.

**[WHY IT MATTERS — ~0:25]**
You will call these models from code, design prompts for them, and defend
against their failure modes for the rest of this track. RAG exists because of
the knowledge cutoff. Structured output exists because raw text is hard to
parse. Hallucination countermeasures exist because of what you are about to
learn. This lesson is the physics underneath all of it.

**[SECTION — Tokens, context and training — ~0:50]**
First, the token: a chunk of text, often part of a word — "un," "believ,"
"able." It is the unit the model processes, and everything is counted in
tokens: your bill, your rate limits, your context window. The context window is
the maximum tokens the model can consider at once — and it includes everything:
the system prompt, the conversation, your documents, and the output itself. A
huge window is shared space, not a huge memory for your stuff.

How does a model get built? Pretraining teaches general language by predicting
the next token across huge text corpora — trillions of tokens of the internet,
books, code. Then fine-tuning and RLHF shape it into a helpful assistant. And
the knowledge cutoff: the model knows nothing after the date its training data
ends. For newer facts, you do not ask the model harder — you use search or
retrieval. That is literally what RAG is for.

**[SECTION — Controlling output — ~2:15]**
Now, how do you steer the thing? Temperature controls sampling randomness. Low
temperature means focused, repeatable output — the model keeps picking the most
likely next token. High temperature means more varied, more surprising output,
because the model samples from further down the probability list. For a SOC
classifier, you want low. For brainstorming names, you want high. This is a
dial, not a mood.

Next, the system prompt: it sets the model's role and rules for the whole
conversation, so put persistent guidance there. Few-shot prompting adds examples
of the desired input and output — and it works shockingly well, because the
model imitates patterns. Zero-shot gives none. And when code consumes the
answer, ask for structured JSON; many APIs enforce a schema, so the model
cannot hand you malformed output that breaks your parser at 3am.

**[SECTION — Hallucinations and embeddings — ~3:35]**
The hallucination: confident, fluent, completely fabricated output — a natural
result of generating plausible text, not verified truth. The model is not
lying; lying requires knowing the truth. Reduce it with grounding: RAG, asking
for citations, and verifying claims that matter before they reach a customer.

Now the happier concept: embeddings. An embedding is a vector — a list of
numbers — representing meaning, so texts with similar meaning land close
together in vector space. "Dog" and "puppy" are neighbours; "dog" and "tax law"
are far apart. This is the machinery behind semantic search and behind RAG:
you embed the question, find nearby document chunks, and hand them to the model.

**[SECTION — Choosing a model — ~4:35]**
One decision, one trade-off. Open-weight models can be downloaded and
self-hosted — you control the infrastructure, the data never leaves your
building, and nobody can change the model under you. Closed models are accessed
only through an API: typically more capable, fully managed, but your prompts
travel to someone else's servers. The trade-off is control and privacy against
capability and managed operations. For regulated or sensitive workloads, that
privacy side often wins.

**[COMMON MISTAKES — ~5:05]**
Three traps. One: treating the context window as infinite memory — stuff it
with documents and the model loses the thread of the conversation. Two: blaming
the model for a knowledge cutoff miss; that is a retrieval problem, not a
prompting problem. Three: parsing free text with regex instead of asking for
structured output. You will spend more time fixing the parser than you ever
saved skipping the schema.

**[RECAP — ~5:35]**
An LLM predicts one token at a time; tokens are the unit of pricing, limits,
and the context window — shared space that includes the output. Pretraining
teaches language, fine-tuning and RLHF shape behaviour, and the knowledge
cutoff is why retrieval exists. Temperature is a randomness dial, the system
prompt sets the standing rules, few-shot examples imitate well, and structured
JSON keeps your parser alive. Hallucinations are plausible text without
verification, so ground and verify. Embeddings turn meaning into vectors for
search. And the model choice is control and privacy versus capability and
managed ops. That is the physics; everything else is engineering.

## On-screen visuals

- HOOK: single mechanism "predict the next token" looping; magic fading into a wrench-and-gear icon.
- WHY IT MATTERS: dependency diagram — RAG, structured output, and hallucination countermeasures all pointing back to token/context fundamentals.
- Tokens, context and training: tokenised sentence with chunks highlighted; context-window bar filling with system prompt, conversation, documents, output; timeline showing the knowledge cutoff.
- Controlling output: temperature slider — same prompt producing focused vs varied output; system prompt card; few-shot vs zero-shot comparison; JSON schema badge.
- Hallucinations and embeddings: hallucination flagged in red with a verification checklist; 2D vector-space plot with word neighbours.
- Choosing a model: two-column comparison — self-hosted control vs API capability.
- RECAP: cheat-sheet terms as a clean summary card.
