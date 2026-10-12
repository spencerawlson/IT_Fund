# Agents & Orchestration: Loops, Guardrails and the Lethal Trifecta — Avatar Tutor Script

**Lesson ID:** ai-agents
**Track:** AI Engineering
**Estimated runtime:** ~6 minutes (~787 words)

## Spoken script

**[HOOK — 0:00]**
An agent is a model in a loop: observe, think, act, repeat until the goal is
met. It can book the flight, file the ticket, query the database — genuinely
useful, genuinely autonomous. And here is the catch that makes this lesson
matter: an agent that can act can be tricked into acting. A malicious web page
can talk your helpful agent into leaking your data. Autonomy is power, and
power needs guardrails.

**[WHY IT MATTERS — ~0:25]**
Agents are where AI engineering meets real risk. The patterns in this lesson —
least privilege, sandboxing, human-in-the-loop, the lethal trifecta — are the
difference between a demo that impresses and a product that survives contact
with attackers. Interviewers ask about these. Auditors will ask about these.
And if you ever ship an agent, your future self will thank you for learning
them now.

**[SECTION — Agents and workflows — ~0:50]**
An agent is an LLM in a loop: observe the situation, think about what to do,
act by calling a tool, then repeat until done. A workflow is different — it
follows predefined code paths with model calls at fixed steps, like an assembly
line that happens to use AI at two stations. The agent decides its own steps;
the workflow's steps are decided by you.

The lesson's bias: prefer the simplest workflow that works, and add autonomy
only when the task truly needs it. Every loop iteration costs tokens and
latency, and gives the model another chance to wander. One pattern worth knowing
is orchestrator-worker: a lead model splits a task and delegates subtasks to
workers — great for broad research, at the cost of more tokens. Simple first,
fancy when earned.

**[SECTION — Memory and context — ~2:00]**
An agent needs memory, and it comes in two flavours. Short-term memory is the
context window — what the agent is holding in mind right now. Long-term memory
is an external store or files, where useful information persists across steps
or sessions. A support agent might keep your account details in long-term
memory and the current conversation in short-term.

But memory is not free, because of context engineering: curating exactly what
goes into the context at each step. Too much noise degrades reasoning — stuff
the context with irrelevant history and judgement gets worse, not better. So
summarise and prune. The skill is not remembering everything; it is remembering
the right things.

**[SECTION — Limiting the blast radius — ~2:55]**
Now the security core: assume the agent will be manipulated, and design so a
manipulated agent can do little damage. Least privilege — credentials scoped
per tool, so the calendar tool gets calendar access and nothing else. Sandbox
code execution in isolated containers with no secrets and controlled egress,
because generated code may be buggy or malicious. And require human-in-the-loop
approval for high-impact actions: sending money, deleting data, emailing
customers. The agent proposes; a human disposes.

Guardrails are the checks that block or correct unsafe behaviour: input
filters, output validators, tool allow-lists, and rate limits. And then there
is the concept with the dramatic name: the lethal trifecta. For data
exfiltration you need three things together — private data access, plus
exposure to untrusted content, plus a way to send data out. An agent with all
three can be instructed by a malicious web page to leak your data. Remove at
least one leg and the attack collapses. When you design an agent, count the
legs.

**[SECTION — Evaluating agents — ~4:25]**
Measure task success rate on realistic scenarios, plus cost, number of steps,
and safety. But read the transcripts, not just the final answers — an agent can
reach the right answer by an unsafe route. The booking got made, but it also
emailed your inbox to a stranger. The transcript is the flight recorder. Success
without safety is failure wearing a costume.

**[COMMON MISTAKES — ~5:00]**
Three traps. One: making everything an agent — most tasks are workflows in an
agent costume, and fixed steps would be cheaper, faster, safer. Two: one fat
credential instead of scoped per-tool access. Convenience now, incident later.
Three: evaluating only the final answer. An agent that exfiltrated data
mid-task is not a success, and the transcript is where you would have caught
it.

**[RECAP — ~5:30]**
An agent is an LLM in a loop — observe, think, act — while a workflow follows
fixed paths; prefer the simple workflow until autonomy is earned, and use
orchestrator-worker for broad research. Memory is short-term context plus
long-term external store, and context engineering means curating, summarising,
and pruning so noise does not degrade reasoning. Limit the blast radius with
least-privilege credentials, sandboxed execution, human approval for
high-impact actions, and guardrails. Count the legs of the lethal trifecta —
private data, untrusted content, an exfil path — and remove at least one.
Evaluate success, cost, steps, and safety, and always read the transcripts.
Autonomy is power. Guardrails are what make it safe to use.

## On-screen visuals

- HOOK: agent loop animation — observe, think, act — completing a booking; then a malicious page redirecting the loop.
- WHY IT MATTERS: guardrail checklist with auditor and interviewer icons.
- Agents and workflows: loop diagram vs fixed-path workflow diagram; orchestrator-worker fan-out.
- Memory and context: two-tier memory — context window vs external store; context pruning animation.
- Limiting the blast radius: per-tool scoped credentials; sandbox container diagram; human-approval checkpoint; the lethal trifecta as a three-legged stool with one leg removed.
- Evaluating agents: metrics dashboard — success, cost, steps, safety; transcript excerpt with a hidden unsafe action highlighted.
- RECAP: cheat-sheet terms as a clean summary card.
