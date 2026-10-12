# Decoupling with Queues and Events — SQS, SNS, EventBridge and Step Functions — Avatar Tutor Script

**Lesson ID:** saa-decoupling
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~793 words)

## Spoken script

**[HOOK — 0:00]**
Tightly coupled architectures fail together: one slow component backs up into
the next until the whole system stalls. Decoupled architectures fail separately
— a queue absorbs the surge, a failed message is isolated and retried, and each
tier scales on its own schedule.

**[WHY IT MATTERS — ~0:25]**
The skill being tested is selection — knowing which service fits which shape of
problem — and the failure modes each one exists to contain. The payoff is
immediate: the web tier can spike at noon, the workers can scale at night, and
nobody pages anybody. Queues are the shock absorbers of good architecture.

**[SECTION — Queues absorb, topics broadcast — ~0:50]**
SQS is a pull-based buffer between producers and consumers. When a web tier
spikes and the backend cannot keep up, messages wait in the queue instead of
overwhelming workers; when a downstream API rate-limits you, the queue meters
the work to a pace it can accept. Consumers poll, process, and delete — and if
processing fails, the message simply becomes visible again for another attempt.

Two queue types serve two contracts. Standard queues offer at-least-once
delivery, best-effort ordering, and near-unlimited throughput — the default for
decoupled work. FIFO queues offer exactly-once processing and strict ordering
within a message group, at lower throughput: the choice when messages must be
processed in exact order per customer. Retention stretches to 14 days, and long
polling — waiting for messages rather than returning empty — cuts both cost
and latency.
SNS is the complementary shape: push-based publish/subscribe. One message
published to a topic fans out to every subscriber simultaneously. The canonical
fan-out pattern is an SNS topic feeding one SQS queue per consumer, so
inventory, billing, and shipping each process the same order event at their own
pace, in their own queue, with their own retries.

**[SECTION — Poison pills and idempotency — ~2:05]**
Every queue eventually receives a message no consumer can process — a poison
pill that crashes each worker that touches it. Without protection, that
message cycles forever, consuming capacity. The dead-letter queue is the
isolation ward: after a configured number of failed receives, the message is
moved aside for inspection, and once the bug is fixed it can be redriven into
the main queue.

Because standard queues deliver at-least-once, duplicates are a fact of life:
a consumer can crash after processing but before deleting, and the message
returns. Consumers must therefore be idempotent — processing the same message
twice produces the same result as once; retries are safe only when repetition
is harmless. The visibility timeout makes this work: a received message becomes
invisible to other consumers for the timeout period — long enough to finish
processing. Set it too short and a slow consumer's message reappears
mid-processing, creating duplicates.

**[SECTION — Orchestration and events — ~3:15]**
Some workflows are not a queue but a sequence: step one, then step two, with
retries, branching, and occasionally a human approval. Step Functions
orchestrates these — state machines that coordinate Lambda functions and
services, retry failed steps with backoff, and pause for human input via
callbacks. A saga across microservices, where each step needs a compensating
action on failure, is the textbook case.

EventBridge is the event bus for loosely coupled systems: producers emit
events, rules route them to targets based on content, and a schema registry
keeps everyone honest about the shape. Choose it over SNS when routing logic
matters — events filtered by type, transformed en route, or sourced from SaaS
applications — and keep SNS for simple fan-out. EventBridge Scheduler fires
one-time or recurring schedules without running any infrastructure. Two
integration patterns tie the toolkit together: when Lambda throttles on a burst
of S3 uploads, an SQS queue between the S3 notification and the function
absorbs the spike; and when the workload is a true stream — ordered,
replayable, many consumers — Kinesis Data Streams replaces the queue with a
sharded, replayable log.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: at-least-once means duplicates will happen — a consumer that
is not idempotent corrupts data on retry. Two: the visibility timeout must
exceed processing time, or slow consumers manufacture their own duplicates.
Three: SNS is push and SQS is pull — workers polling for work is SQS, one
event reaching many subscribers instantly is SNS.

**[RECAP — ~5:00]**
Decouple so components fail separately. SQS buffers with pull-based workers —
standard for throughput, FIFO for ordered exactly-once per message group — with
dead-letter queues isolating poison pills, idempotent consumers surviving
duplicates, and visibility timeouts tuned to processing time. SNS broadcasts to
many subscribers; the fan-out pattern feeds one queue per consumer. EventBridge
routes events by content, Step Functions orchestrates sequences with retries
and human approvals, and Kinesis carries ordered replayable streams.

## On-screen visuals

- HOOK: a coupled chain of components stalling together beside a decoupled
  chain with a queue absorbing the surge — "fail separately, not together".
- QUEUES SECTION: SQS as a buffer between a spiking web tier and workers; the
  SNS fan-out pattern — one topic feeding inventory, billing, and shipping
  queues; standard versus FIFO comparison.
- POISON PILL SECTION: a poison message cycling between workers, then being
  moved to a dead-letter queue; a duplicate delivery being safely absorbed by
  an idempotent consumer; the visibility timeout as a countdown.
- ORCHESTRATION SECTION: a Step Functions state machine with a retry loop and
  a human-approval pause; EventBridge rules routing events by content; SQS
  absorbing an S3-to-Lambda burst.
- COMMON MISTAKES: three trap cards — "duplicates require idempotency",
  "timeout must exceed processing time", "push is SNS, pull is SQS".
- RECAP: the cheat-sheet terms as a clean summary card.
