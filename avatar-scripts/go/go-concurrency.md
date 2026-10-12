# Go Goroutines & Channels: Share Memory by Communicating — Avatar Tutor Script

**Lesson ID:** go-concurrency
**Track:** Go Programming
**Estimated runtime:** ~5 minutes (~667 words)

## Spoken script

**[HOOK — 0:00]**
Thousands of concurrent tasks. One keyword to start them. And a motto that
flips everything you thought you knew about shared data: don't communicate
by sharing memory — share memory by communicating. This is Go's superpower,
and its calling card.

**[WHY IT MATTERS — ~0:25]**
Concurrency is usually expensive and dangerous: threads are heavy, locks are
subtle, races are silent. Go made spawning concurrent work cheap and gave
those tasks a disciplined way to talk. If you write backend services,
tooling, or anything cloud-native, this lesson is the reason you're
learning Go.

**[SECTION — Goroutines: threads, minus the weight — ~0:50]**
A goroutine starts with a single keyword — go someFunction() — and costs
roughly a few kilobytes of stack, multiplexed by the runtime scheduler onto
a small pool of OS threads. Thousands can run concurrently without the
overhead that makes OS threads precious. Picture a restaurant where a
handful of waiters serve hundreds of tables: the scheduler assigns attention
where it is needed, and nobody waits on a dedicated servant.

One caveat for newcomers: main does not wait. Launch a goroutine and return
from main, and the program exits with it — the lights go out when the
manager leaves, staff or no staff. Coordination, covered below, is how you
keep that from happening.

**[SECTION — Share memory by communicating — ~2:30]**
A channel is a typed conduit between goroutines: ch <- v sends, v := <-ch
receives. An unbuffered channel — make(chan int) — blocks until sender and
receiver meet: a rendezvous that synchronises as well as transfers, like a
handshake that cannot happen unless both parties show up. A buffered channel
— make(chan int, 10) — holds up to ten values, letting the sender proceed
until the buffer fills: a mailbox, not a meeting.

The motto is a design principle, not a slogan: prefer passing values through
channels over guarding shared variables with locks, and whole categories of
reasoning about interleavings simply vanish. The data travels to the code
instead of the code fighting over the data. It is a genuine inversion of
instinct: hand the data itself from goroutine to goroutine, and ownership is
never in doubt.

select is the other half of the model: it waits on multiple channel
operations and proceeds with whichever is ready first, with an optional
default case making it non-blocking. Timeouts, cancellation, fan-in from
several producers — select is the construct behind all of them.

**[SECTION — Coordination primitives — ~4:05]**
Some problems still want the classic tools, and the sync package provides
them. sync.WaitGroup counts goroutines down to zero — Add, Done, Wait — the
standard way to make main wait for its workers. Think roll call before the
bus leaves: nobody departs until every name is checked off.

sync.Mutex guards a critical section with Lock and Unlock — and defer the
unlock, because forgetting is the classic bug. Get the coordination wrong
and you meet the deadlock detector: if every goroutine is blocked with
nobody left to unblock them, the runtime halts the program with "all
goroutines are asleep." Everyone waiting for someone else to go first at a
four-way stop — the runtime calls it.

And for the subtler bugs, the race detector — go test -race — instruments
your program to flag unsynchronised concurrent access to shared memory. Run
it in CI and thank yourself later.

**[COMMON MISTAKES — ~5:00]**
Three traps. One: letting main return while goroutines are still working —
the program exits with main, so coordinate with a WaitGroup. Two: forgetting
to Unlock a mutex — defer mu.Unlock() at the moment you lock. Three:
treating goroutines like OS threads — they are cheap and numerous by
design; spawning thousands is normal, not reckless.

**[RECAP — ~5:20]**
go f() starts a goroutine: kilobytes of stack, scheduled by the runtime,
thousands at a time — but main doesn't wait. Channels move values between
goroutines: unbuffered is a rendezvous, buffered holds N. Share memory by
communicating, not the reverse; select waits on whichever channel is ready
first. sync.WaitGroup waits for workers, sync.Mutex guards critical
sections — defer the unlock. Deadlock everything and the runtime tells you;
race subtly and go test -race catches you. That is Go concurrency.

## On-screen visuals

- HOOK: thousands of lightweight goroutines fanning out from one keyword;
  the motto as a banner.
- WHY IT MATTERS: heavy OS threads beside cheap goroutines — the cost
  comparison.
- SECTION — Goroutines: threads, minus the weight: go someFunction()
  spawning; the scheduler multiplexing goroutines onto OS threads; main
  exiting early while a goroutine is still running.
- SECTION — Share memory by communicating: an unbuffered channel as a
  handshake rendezvous; a buffered channel as a mailbox; values flowing
  through channels instead of locked shared state; select choosing the
  ready channel.
- SECTION — Coordination primitives: WaitGroup as a roll call — Add, Done,
  Wait; a mutex with a deferred unlock; the "all goroutines are asleep"
  deadlock message; the race detector flagging shared access.
- COMMON MISTAKES: three trap cards — main exiting early, a forgotten
  unlock, goroutines mistaken for heavy threads.
- RECAP: the cheat-sheet terms rendered as a clean summary card.
