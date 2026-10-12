# LLM APIs, Tools & Structured Output: Function Calling, Cost and Reliability — Avatar Tutor Script

**Lesson ID:** ai-apis-tools
**Track:** AI Engineering
**Estimated runtime:** ~5 minutes (~765 words)

## Spoken script

**[HOOK — 0:00]**
Here is a secret about AI features: the model API call is the easy part. Ten
lines of code and you have a chatbot. The interesting part — the part that
separates a demo from a product — is everything around the call. Letting the
model use tools safely, streaming answers so users do not stare at a spinner,
controlling cost when success means millions of tokens, and surviving rate
limits. That is this lesson.

**[WHY IT MATTERS — ~0:25]**
Most AI engineering jobs are really API engineering jobs. You will define tool
schemas, set output caps, implement retry logic, and hide keys from the
browser. These are also the details that fail in production at the worst
moments: a leaked API key, a runaway response that costs real money, a 429
storm because nobody implemented backoff. Learn the patterns once and every
integration gets easier.

**[SECTION — Tool use — ~0:50]**
Tool use, also called function calling, is how a model does things instead of
just saying things. But here is the crucial detail: the model does not run
anything itself. It returns a request to call a named function with arguments.
Your code validates those arguments, runs the function, and sends the result
back for the model to continue. The model is the brain deciding what to call;
your code is the hands doing the work. Never confuse the two.

You define each tool with a JSON Schema, so the model produces valid, typed
arguments — and you still validate server-side, because the model can be wrong
or manipulated. Grounding ties answers to supplied sources or tool results,
which reduces hallucination and makes citations possible. And MCP, the Model
Context Protocol, is an open, standard way to expose tools and data to AI
applications. One warning from the lesson: treat third-party MCP servers as
untrusted code, because that is what they are.

**[SECTION — Latency and cost — ~2:05]**
Two things users feel: speed and your bill. Streaming delivers tokens as they
are generated, typically over Server-Sent Events — the answer appears to type
itself out, which massively improves perceived latency even though the total
time is the same. Prompt caching reuses an already processed prompt prefix
across calls to cut cost and latency, so put stable content — the system
prompt, the reference documents — first, and variable content last. Order
matters because only the shared prefix gets cached.

Now the money. APIs usually charge per input and output token, with output
tokens typically priced higher — generation is the expensive direction. Set a
maximum output length to cap cost and latency and prevent runaway responses.
But check the stop reason: set the limit too low and answers get silently
truncated, and you will debug "dumb model" complaints that are really your own
cap. And model routing: send easy tasks to small, cheap models and reserve the
large ones for hard tasks. Not every question needs the flagship.

**[SECTION — Reliability and safety — ~3:25]**
Production means failure, so plan for it. HTTP 429 means you are rate limited.
Retry with exponential backoff and jitter — each wait gets longer, and the
jitter randomises it so every client does not retry at the same instant and
trigger the limit again. And respect any retry-after header; the server is
telling you exactly how long to wait.

Then the safety rule that is somehow still violated weekly: API keys live on
the server, never in browser code. Anything shipped to the browser is public —
anyone can open dev tools and read it. Your front end calls your back end, and
your back end calls the model. There is no shortcut here, only breaches.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: letting the model call tools without validating arguments
server-side. The schema guides the model, but a manipulated model can still
hand you garbage — or a weapon. Two: retrying 429s without jitter, so all your
clients stampede back at once and the limit never clears. Three: putting the
API key in front-end code because it was faster. It is always faster, right up
until someone scrapes your key and runs up your bill.

**[RECAP — ~5:00]**
Tool use means the model requests and your code runs — define tools with JSON
Schema, validate server-side, and treat third-party MCP servers as untrusted.
Ground answers in sources to cut hallucination. Stream over Server-Sent Events
for perceived speed, cache the stable prompt prefix first, and remember output
tokens cost more than input tokens — cap output length but check the stop
reason. Route easy tasks to small models. Retry 429s with backoff, jitter, and
the retry-after header. And keep API keys on the server, because the browser is
public. That is the whole API discipline in one pass.

## On-screen visuals

- HOOK: simple 10-line API call vs the full production stack around it (tools, streaming, retries, cost caps).
- WHY IT MATTERS: production failure montage — leaked key, runaway bill, 429 storm.
- Tool use: flow diagram — model returns function request, your code validates, runs, returns result; JSON Schema tool definition sample.
- Latency and cost: streaming tokens typing out over SSE; prompt-caching prefix diagram; per-token pricing table (output dearer); model routing diagram.
- Reliability and safety: 429 retry timeline with backoff and jitter; key-on-server vs key-in-browser contrast.
- RECAP: cheat-sheet terms as a clean summary card.
