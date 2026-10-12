# Routing Troubleshooting: Table, Neighbour, Path — Avatar Tutor Script

**Lesson ID:** rt-routing-troubleshooting
**Track:** Routing Protocols
**Estimated runtime:** ~4 minutes (~625 words)

## Spoken script

**[HOOK — 0:00]**
Routing problems are usually one of a few things: no matching route, the wrong
best path, or an adjacency that never formed. A methodical approach — check the
table, check the protocol, check the neighbour, test the path — finds the fault
far faster than guessing.

**[WHY IT MATTERS — ~0:15]**
This lesson covers that methodology and the show, ping and traceroute commands
that back each step, with the output patterns that point straight at the cause.
When the network is down, this is the sequence your hands should know.

**[SECTION — Start with the table — ~0:50]**
When a destination is unreachable, the first question is always: is there a
matching route? show ip route — followed by the destination, or show ipv6 route
for IPv6 — tells you whether the router would forward the packet at all. And
the route code tells you how it was learned: C for connected, S for static, O
for OSPF, D for EIGRP, B for BGP.

No route means the prefix is not advertised or is filtered somewhere. A
surprising route — the wrong next hop, the wrong source — means a metric, AD
or redistribution issue. The table does not lie; read it before touching
anything.

Then widen the lens: show ip protocols summarises which protocols are running,
what networks they advertise, their neighbours and their administrative
distances. It is often the fastest way to spot a missing network statement —
the protocol is up, but nobody told it which interfaces to speak on.

**[SECTION — Check the adjacency — ~2:15]**
If the protocol is up but routes are missing, verify the neighbour. show ip
ospf neighbor, show ip eigrp neighbors, or show ip bgp summary — each shows
whether the relationship actually formed.

A stuck state is diagnostic — it is the protocol telling you exactly what is
wrong. OSPF stuck in EXSTART is almost always an MTU mismatch. A BGP peer in
Idle or Active means the TCP session, the ASN or the authentication is wrong.
And no OSPF neighbour at all usually means mismatched area, subnet and mask,
timers, authentication, or network type. Work the checklist; the mismatch is
usually the most boring item on it.

**[SECTION — Test the path — ~3:30]**
Finally, prove the data path. ping tests reachability — the blunt instrument.
traceroute exposes the per-hop path and shows exactly where it breaks. A ping
says "it is broken"; a traceroute says "here, at this hop." It reveals routing
loops, black holes and asymmetric routing that a ping alone hides.

Work the layers top to bottom and change one variable at a time. The
methodology is the message: table, then protocol, then neighbour, then path.
Each step narrows the search, and each step's output tells you which step
comes next.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: skipping the table and going straight to the neighbour —
if there is no route, the adjacency state is trivia. Two: changing two things
between tests, so you never learn which change mattered. Three: trusting ping
alone. Reachability without the path hides loops and asymmetry; traceroute is
not optional.

**[RECAP — ~4:55]**
Start with the table: show ip route with the destination — C, S, O, D, B tell
you the source; no route means not advertised or filtered. Widen with show ip
protocols — the missing network statement lives here. Check the adjacency:
show ip ospf neighbor, show ip eigrp neighbors, show ip bgp summary — EXSTART
means MTU, Idle or Active means the BGP session is wrong, no neighbour means a
Hello mismatch. Test the path: ping for reachability, traceroute for the
per-hop truth — loops, black holes, asymmetry. Table, protocol, neighbour,
path. One variable at a time.

## On-screen visuals

- HOOK: the four-step triage flow — table, protocol, neighbour, path — as a
  decision diagram.
- Start with the table SECTION: show ip route output with the route codes C, S,
  O, D, B highlighted, and the show ip protocols summary with a missing network
  statement flagged.
- Check the adjacency SECTION: the neighbour-state diagnostics — OSPF EXSTART
  with the MTU callout, BGP Idle/Active with the session checklist, and the
  Hello-mismatch list.
- Test the path SECTION: ping versus traceroute — the per-hop path exposing a
  loop and a black hole.
- COMMON MISTAKES: the skipped-table and two-changes warnings.
- RECAP: the cheat-sheet rows as a clean summary card.
