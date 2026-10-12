# RIP: Distance-Vector Routing by Rumour — Avatar Tutor Script

**Lesson ID:** rt-rip
**Track:** Routing Protocols
**Estimated runtime:** ~4 minutes (~615 words)

## Spoken script

**[HOOK — 0:00]**
RIP is the classic distance-vector protocol: routers advertise their whole
table to their neighbours and choose paths by hop count. It is simple, easy to
configure — and the perfect teacher of how dynamic routing, and routing loops,
actually behave.

**[WHY IT MATTERS — ~0:15]**
You will rarely deploy RIP in production, but every loop-prevention idea in
routing was invented to fix distance-vector's mistakes. This lesson covers the
hop-count metric and the 15-hop limit, RIP versions — v1, v2 and RIPng — the
timers, and the loop-prevention mechanisms: split horizon, route poisoning,
poison reverse and triggered updates.

**[SECTION — Distance-vector by rumour — ~0:50]**
A distance-vector router does not build a map of the network. It simply
believes what its neighbours tell it — routing by rumour — and adds its own
distance on top. "My neighbour says the destination is two hops away, and the
neighbour is one hop from me, so it must be three." Nobody checks.

RIP's distance is hop count, so it ignores bandwidth entirely. Here is the
consequence the exam loves: a three-hop path over gigabit links loses to a
two-hop path over a slow serial link. RIP cannot see speed, only steps. And the
metric maxes out at 15 — 16 means unreachable. That low ceiling caps RIP at
small networks, but it also bounds how far a loop can count before dying — a
crude built-in circuit breaker, and a deliberate trade-off.

**[SECTION — Stopping loops — ~2:15]**
Rumour-based routing has a famous disease: the count-to-infinity problem, where
two routers bounce a dead route back and forth, each incrementing the hop
count, until it finally hits 16. Four mechanisms tame it.

Split horizon forbids advertising a route back out the interface it was learned
on — killing the simplest two-router loop at birth. Route poisoning advertises
a dead route with metric 16, so neighbours drop it immediately instead of
ageing it out. Poison reverse sends that poisoned route back toward the source
as an explicit "not through me." And triggered updates send changes at once
rather than waiting for the periodic timer, so bad news travels fast. Together,
they keep naive distance-vector designs from counting to infinity.

**[SECTION — Versions and hardening — ~3:30]**
Three versions, each less naive than the last. RIPv1 is classful and broadcasts
its updates to everyone. RIPv2 is classless — it supports VLSM and CIDR —
multicasts to 224.0.0.9, and supports authentication. RIPng carries IPv6 over
UDP 521.

And two hardening habits that apply on any version. Mark host-facing interfaces
passive: the router advertises their subnets without sending or accepting
updates there — no peering with whatever plugs into a wall jack. And enable
RIPv2 authentication, so a rogue device cannot inject routes into your table.
An unauthenticated routing protocol believes anyone who speaks to it; do not
give it that chance.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: assuming RIP considers bandwidth — it does not. Hop count
only, and the gigabit-versus-serial question is the exam's favourite proof.
Two: confusing the loop defences. Split horizon stops the advertisement going
back; route poisoning advertises the dead route as 16; poison reverse sends the
poison back toward the source. Three: 15 is the maximum usable hop count; 16
is not a hop — it is "unreachable."

**[RECAP — ~4:55]**
RIP routes by rumour: neighbours advertise their whole table, and the fewest
hops win. Hop count ignores bandwidth, 15 hops is the max, and 16 means
unreachable. Loops are tamed by split horizon, route poisoning, poison reverse
and triggered updates. RIPv1 is classful and broadcasts; RIPv2 is classless,
multicasts to 224.0.0.9 and authenticates; RIPng carries IPv6 on UDP 521.
Passive interfaces face the hosts; authentication faces the rogues. Simple
protocol, timeless lessons.

## On-screen visuals

- HOOK: two routers exchanging full tables, with hop counts incrementing.
- Distance-vector by rumour SECTION: the rumour chain animation — "my neighbour
  says two hops, plus one is three" — and the 3-hop gigabit versus 2-hop serial
  comparison, with the 15/16 ceiling.
- Stopping loops SECTION: the count-to-infinity bounce, then each defence —
  split horizon, poisoning at 16, poison reverse, triggered updates — applied
  in turn.
- Versions and hardening SECTION: the v1/v2/RIPng comparison — classful versus
  classless, broadcast versus 224.0.0.9 multicast, UDP 521 — with passive
  interface and authentication callouts.
- COMMON MISTAKES: the three loop defences side by side and the 15/16
  distinction.
- RECAP: the cheat-sheet rows as a clean summary card.
