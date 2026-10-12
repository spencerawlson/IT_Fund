# Routing Fundamentals: Tables, AD and Metrics — Avatar Tutor Script

**Lesson ID:** rt-fundamentals
**Track:** Routing Protocols
**Estimated runtime:** ~6 minutes (~798 words)

## Spoken script

**[HOOK — 0:00]**
Routing is how a router decides where to send a packet it did not originate.
Get this lesson right and every protocol that follows — RIP, OSPF, EIGRP,
BGP — becomes a variation on one theme.

**[WHY IT MATTERS — ~0:15]**
This lesson covers the building blocks every protocol shares: the routing
table, how routes are sourced — connected, static, dynamic — longest-prefix
matching, administrative distance, metrics, convergence, and the split between
the control plane and the data plane. Learn the shared machinery once, and each
protocol lesson is just "how does this one fill the table."

**[SECTION — The forwarding decision — ~0:45]**
When a packet arrives, the router looks up the destination address and picks
the route with the longest prefix match — the most specific entry, the largest
mask. A /32 host route beats a /24, which beats a /0 default. No matter what
protocol or metric produced them. Specificity is decided before anything else,
and this ordering is the single most tested fact in routing.

The chosen route gives a next-hop IP, an exit interface, or both. A next-hop
only route — a recursive route — forces a second lookup to find how to reach
that next hop. A route with an exit interface can forward directly. Same
destination, fewer lookups.

**[SECTION — Where routes come from, and who to trust — ~1:55]**
Routes are connected — a subnet on an up interface — static, configured by
hand, or dynamic, learned from a protocol. When the same prefix arrives from
more than one source, administrative distance breaks the tie, and lower is more
trusted. Connected is 0, static is 1, eBGP is 20, EIGRP is 90, OSPF is 110,
RIP is 120.

And here is the distinction the exam lives for: a metric only compares routes
from the same protocol. OSPF cost against OSPF cost, hop count against hop
count. AD decides between protocols; the metric decides within one. Comparing
an OSPF cost to a RIP hop count is meaningless — they are different currencies,
and AD is the exchange rate.

**[SECTION — Control plane vs data plane, and convergence — ~3:05]**
A router has two brains. The control plane runs the routing protocols and
builds the routing table — the RIB. The data plane forwards packets using the
derived forwarding table — the FIB. Separating them lets forwarding stay fast
while the protocols think. Forwarding never waits for a protocol to finish its
maths.

After any topology change, the network is converging until every router again
has an up-to-date, loop-free view of the world. Fast convergence and good
summarisation — advertising many prefixes as one — are what keep large networks
stable. Summarisation shrinks tables and contains instability: fewer moving
parts, fewer surprises.

**[SECTION — The routing protocols at a glance — ~4:00]**
Every dynamic protocol answers the same question — how do routers agree on
paths without a human drawing the map — but the answers differ in algorithm,
metric and scale. IGPs run inside one organisation; BGP, the lone EGP, stitches
organisations together.

RIP is the classic distance-vector IGP: neighbours advertise their whole table,
and the best path is the fewest hops — 15 maximum, 16 unreachable. OSPF is the
open-standard link-state IGP: every router learns the full topology and runs
Dijkstra's shortest-path-first algorithm, with cost from bandwidth as the
metric; large networks split into areas. EIGRP is Cisco's advanced
distance-vector IGP: a composite metric of bandwidth and delay, DUAL
pre-computing backups, and AD 90 — the most trusted dynamic IGP. IS-IS is the
other link-state IGP, born in the OSI world and favoured by large service
providers, using levels instead of areas. And BGP is the path-vector EGP that
runs the internet: it exchanges paths as sequences of autonomous system numbers
and applies policy, riding TCP 179.

**[COMMON MISTAKES — ~5:15]**
Three traps. One: longest prefix match is decided before AD and before the
metric. A /24 from RIP beats a /16 from OSPF — specificity first. Two: the
metric never compares across protocols. Three: the RIB is the control plane's
table; the FIB is the data plane's forwarding table. Know which brain you are
talking about.

**[RECAP — ~5:35]**
The router forwards by longest prefix match, using the next hop or the exit
interface. Routes are connected, static or dynamic; AD ranks trust between
sources — 0, 1, 20, 90, 110, 120 — while the metric only compares within one
protocol. The control plane builds the RIB; the data plane forwards from the
FIB. Convergence is every router agreeing on loop-free paths again, and
summarisation keeps the agreement small. RIP counts hops, OSPF runs Dijkstra
on cost, EIGRP pre-computes backups with DUAL, IS-IS uses levels, and BGP
exchanges AS paths by policy. One theme, five variations.

## On-screen visuals

- HOOK: a packet arriving at a router with three candidate routes, the most
  specific highlighted.
- The forwarding decision SECTION: the longest-prefix-match ladder — /32 over
  /24 over /0 — and the recursive next-hop second lookup.
- Where routes come from, and who to trust SECTION: the AD trust ranking bar —
  0, 1, 20, 90, 110, 120 — beside the "AD between, metric within" split.
- Control plane vs data plane, and convergence SECTION: the RIB-to-FIB flow
  diagram and a summarisation collapsing many prefixes into one.
- The routing protocols at a glance SECTION: the colour-grouped protocol
  comparison stack — RIP, OSPF, EIGRP, IS-IS, BGP — with algorithm and metric.
- COMMON MISTAKES: the specificity-before-AD ordering and RIB/FIB callouts.
- RECAP: the cheat-sheet rows as a clean summary card.
