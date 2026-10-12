# OSPF: Link-State Routing with Areas — Avatar Tutor Script

**Lesson ID:** rt-ospf
**Track:** Routing Protocols
**Estimated runtime:** ~5 minutes (~688 words)

## Spoken script

**[HOOK — 0:00]**
OSPF is the most common interior gateway protocol in enterprises. It is
link-state: every router floods a description of its own links, so all routers
in an area build an identical database and compute shortest paths themselves.
The result converges fast — and avoids the loops that haunt distance-vector
protocols.

**[WHY IT MATTERS — ~0:15]**
If you work in enterprise networking, you will meet OSPF. This lesson covers
router IDs, Hello-based neighbour discovery and adjacency states, LSAs and the
link-state database, SPF and cost, the area hierarchy with the Area 0
backbone, ABRs and ASBRs, and the DR/BDR election on multi-access links.

**[SECTION — Neighbours, adjacencies and the database — ~0:50]**
OSPF routers find each other with Hello packets — but Hellos are picky. Both
sides must agree on the area, the subnet and mask, the timers, and
authentication before an adjacency can form. Mismatch any one of them and the
routers stay strangers, which is why "no OSPF neighbour" is usually a
configuration mismatch, not a broken link.

The adjacency then walks through states — Down, Init, 2-Way, ExStart, Exchange,
Loading, Full. Only at Full have the two routers synchronised their link-state
databases. Each router originates LSAs — link-state advertisements — describing
its links, and these flood through the area until every router holds the same
LSDB. Same database everywhere: that is what makes the maths trustworthy.

One diagnostic to memorise: a neighbour stuck in ExStart or Exchange almost
always means an MTU mismatch. The routers cannot agree on packet sizes, so the
database exchange stalls forever.

**[SECTION — SPF, cost and areas — ~2:20]**
Against the completed LSDB, each router runs SPF — Dijkstra's shortest-path
algorithm — to build its own shortest-path tree. The metric is cost, derived
from interface bandwidth: reference bandwidth divided by bandwidth. Lowest
cost wins. And here is the operational catch: once your links exceed 100 Mbps,
set a consistent reference bandwidth network-wide, or fast links all look
equally cheap and the algorithm cannot tell them apart.

OSPF scales through areas. Every non-backbone area must touch Area 0, the
backbone. An Area Border Router — an ABR — joins an area to the backbone and
summarises between them, keeping each area's flooding contained. An ASBR
injects external routes, from another protocol, into OSPF. Areas are OSPF's
answer to "what happens when the network gets big": divide, summarise,
contain.

**[SECTION — DR/BDR and hardening — ~3:40]**
On a broadcast multi-access segment — think a LAN with many routers — having
every router fully adjacent with every other would flood duplicate LSAs
everywhere. So OSPF elects a Designated Router, and a Backup, and everyone
forms a full adjacency only with the DR and BDR. Flooding drops dramatically.
Point-to-point links need no DR — with only two routers, there is nobody to
elect among.

Two hardening habits. Secure OSPF with cryptographic authentication on
adjacencies, so a rogue device cannot peer and inject false LSAs. And set
passive-interface on host-facing ports — advertise the subnet, never form an
adjacency there. One more version note: OSPFv3 carries IPv6 — and via address
families, IPv4 too.

**[COMMON MISTAKES — ~4:45]**
Three traps. One: the adjacency states are a sequence — a router stuck in
ExStart is not "almost done," it is broken, usually by MTU. Two: cost is
reference bandwidth divided by interface bandwidth — bigger bandwidth means
smaller cost, and the reference must be consistent network-wide. Three: every
area must touch Area 0. An area dangling off another non-backbone area is a
design the protocol will not bless.

**[RECAP — ~5:10]**
Hellos must agree on area, subnet, timers and authentication; the adjacency
climbs from Down to Full, and ExStart stalls mean MTU mismatch. LSAs flood
until every router holds the same LSDB. Each router runs Dijkstra against it,
using cost — reference bandwidth over interface bandwidth — as the metric.
Areas scale OSPF: every area touches the Area 0 backbone, ABRs join areas to
it, ASBRs inject external routes. The DR and BDR cut flooding on broadcast
segments. Authenticate adjacencies, passivate host ports, and remember OSPFv3
for IPv6. Same database, same maths, loop-free paths.

## On-screen visuals

- HOOK: routers flooding link descriptions until every database matches.
- Neighbours, adjacencies and the database SECTION: the Hello agreement
  checklist — area, subnet, timers, authentication — the adjacency state
  ladder to Full, and the ExStart/MTU stall callout.
- SPF, cost and areas SECTION: Dijkstra's tree growing from the LSDB, the
  cost formula, and the area hierarchy with Area 0 at the centre, ABR and
  ASBR marked.
- DR/BDR and hardening SECTION: the full-mesh flooding problem collapsing into
  DR/BDR adjacencies, with authentication and passive-interface callouts.
- COMMON MISTAKES: the ExStart diagnostic and the area-to-backbone rule.
- RECAP: the cheat-sheet rows as a clean summary card.
