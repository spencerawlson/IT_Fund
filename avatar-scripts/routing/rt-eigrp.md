# EIGRP & DUAL: Successors and Feasible Successors — Avatar Tutor Script

**Lesson ID:** rt-eigrp
**Track:** Routing Protocols
**Estimated runtime:** ~5 minutes (~634 words)

## Spoken script

**[HOOK — 0:00]**
EIGRP is Cisco's advanced distance-vector protocol. It keeps distance-vector's
simplicity but adds DUAL — which pre-computes loop-free backup paths, so
failover can be almost instantaneous. Often faster than OSPF reconvergence.

**[WHY IT MATTERS — ~0:15]**
Speed of failover is the whole story here. This lesson covers neighbours and
the composite metric, the DUAL concepts — feasible distance, reported distance,
successor, feasible successor — the feasibility condition that guarantees
loop-freedom, and stub routing.

**[SECTION — The composite metric and neighbours — ~0:50]**
EIGRP routers discover neighbours with Hellos on multicast 224.0.0.10 — and
like OSPF's Hellos, these are picky: both sides must match the AS number and
the K-values to peer. Same AS, same K-values, or no adjacency.

The metric is composite. By default it weighs bandwidth and delay. Load,
reliability and MTU are available too, but left off — because a metric that
jitters with every traffic burst would flap routes constantly. Stability is a
feature: the metric must describe the path, not the moment.

One number to memorise: internal EIGRP routes have AD 90, external
redistributed routes have AD 170. At AD 90, EIGRP is the most trusted dynamic
IGP — more trusted than OSPF at 110.

**[SECTION — DUAL: successors and feasible successors — ~2:10]**
DUAL is the clever part. For each destination, EIGRP tracks two numbers. The
feasible distance is your own best metric to the prefix. The reported distance
is each neighbour's metric to the prefix — what the neighbour claims it costs
them. The successor is the best next hop, and it goes in the routing table.

Now the backup. A feasible successor is a pre-qualified backup path — but it
only qualifies if it satisfies the feasibility condition: the neighbour's
reported distance must be less than your current feasible distance. Why does
that guarantee loop-freedom? Because it proves the neighbour is genuinely
closer to the destination than you are — so sending traffic to them cannot
circle back through you. If the successor fails and a feasible successor
exists, DUAL swaps instantly, with no recomputation. The backup was vetted
before the failure, not during it.

**[SECTION — Scaling with stubs — ~3:40]**
DUAL's weakness is queries: when no feasible successor exists, the router
queries neighbours, which query theirs, and convergence slows as the query
domain grows. The fix in hub-and-spoke designs is stub routing.

A spoke configured as an EIGRP stub advertises only its connected and summary
routes — and tells the hub not to send it queries. The spoke is saying "I am a
dead end; do not ask me for alternate paths." This shrinks the query domain,
which is the main thing that slows EIGRP convergence at scale.

Two closing facts. EIGRP supports IPv4 and IPv6. And although it was
historically Cisco-proprietary, it is now published as informational RFC 7868.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: the feasibility condition compares the neighbour's reported
distance against your feasible distance — RD less than FD. Reverse it and you
have described a loop, not a backup. Two: the successor is the route in the
table; the feasible successor is the backup waiting. Do not swap the roles.
Three: a stub limits both what the spoke advertises and the queries it
receives. It is a two-way quieting, not just route filtering.

**[RECAP — ~5:00]**
Hellos on 224.0.0.10, matching AS number and K-values. Composite metric:
bandwidth and delay by default; AD 90 internal, 170 external. DUAL tracks your
feasible distance and each neighbour's reported distance; the best next hop is
the successor, and a neighbour becomes a feasible successor only when its
reported distance is less than your feasible distance — loop-freedom by
arithmetic. Failover is instant when a feasible successor waits. Stubs shrink
the query domain on spokes. EIGRP: distance-vector simplicity, link-state
speed of recovery.

## On-screen visuals

- HOOK: a link failing and traffic swapping to a pre-computed backup instantly.
- The composite metric and neighbours SECTION: the Hello match checklist — AS
  number, K-values, 224.0.0.10 — and the composite metric dial with bandwidth
  and delay active, plus the AD 90/170 callout.
- DUAL: successors and feasible successors SECTION: the FD/RD number line, the
  feasibility condition RD < FD highlighted, and the instant successor-to-
  feasible-successor swap.
- Scaling with stubs SECTION: the hub-and-spoke query domain shrinking when
  the spoke goes stub.
- COMMON MISTAKES: the RD-versus-FD comparison and successor-role callouts.
- RECAP: the cheat-sheet rows as a clean summary card.
