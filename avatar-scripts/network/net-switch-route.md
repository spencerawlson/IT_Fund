# Switching & Routing: VLANs, STP and Path Selection — Avatar Tutor Script

**Lesson ID:** net-switch-route
**Track:** Network+
**Estimated runtime:** ~6 minutes (~787 words)

## Spoken script

**[HOOK — 0:00]**
Switches move frames inside a network; routers move packets between networks.
Almost every connectivity problem you will ever troubleshoot comes down to one
of those two decisions going wrong.

**[WHY IT MATTERS — ~0:15]**
This lesson covers how a switch learns where devices are, how VLANs split one
switch into several isolated networks, how trunks carry those VLANs between
switches, and how routers choose a path using their routing table. Four ideas —
and together they explain most of what a network does all day.

**[SECTION — How a switch forwards frames — ~0:45]**
A switch is a diligent student. It reads the source MAC address of every frame
it receives and records which port it arrived on, in its MAC address table —
the CAM table. Over time, it learns where everyone lives.

Forwarding is then a lookup. The switch checks the destination MAC against the
table. Known address: send the frame out that one port only. Unknown address —
or a broadcast to ff:ff:ff:ff:ff:ff: flood it out every port in the same VLAN,
except the one it came in on. That is why the first packet to an unknown
destination is flooded, and the reply comes back switched: the reply taught the
switch the sender's location.

**[SECTION — VLANs and trunks — ~1:55]**
A VLAN is a separate broadcast domain on shared hardware. Think of it as
drawing invisible walls inside one switch: hosts in VLAN 10 cannot reach hosts
in VLAN 20 without a router or a layer 3 switch. That is what makes VLANs a
segmentation control, not just an organisational trick.

Between switches, VLANs ride trunks. An access port belongs to one VLAN and
carries untagged frames — the port's VLAN is implied. A trunk port carries many
VLANs between switches, adding an 802.1Q tag to each frame so the far side
knows which VLAN it belongs to. Frames on the native VLAN cross the trunk
untagged — which is exactly why the native VLAN needs care, as the security
lesson shows.

**[SECTION — Spanning Tree Protocol — ~3:00]**
Redundancy is good — until it loops. Redundant links between switches create
loops, and Ethernet has no TTL to kill a looping frame. So a single broadcast
can multiply forever, in a broadcast storm, until the network melts down.

Spanning Tree Protocol — 802.1D, with RSTP, 802.1w, as the faster modern
version — solves it democratically. The switches elect a root bridge, then
block just enough ports to leave one loop-free path to it. If the active path
fails, the blocked ports unblock automatically. Redundancy without the storm.

**[SECTION — How a router chooses a path — ~3:50]**
The router's job is the opposite of the switch's: it moves packets between
networks. For each packet it matches the destination against its routing table
and uses the longest prefix match — the most specific entry wins. A /24 route
beats a /16, which beats the default route 0.0.0.0/0. Specificity first,
always.

Where do the routes come from? Directly connected networks, static routes you
configure, or dynamic routing protocols. When several sources offer the same
prefix, the lowest administrative distance wins: connected is 0, static is 1,
OSPF is 110, RIP is 120. Think of AD as the router's trust ranking.

Two protocols to know by sight. OSPF is a link-state protocol: each router
floods its links, builds a full map of the area, and runs Dijkstra's
shortest-path algorithm — using cost, based on bandwidth, as the metric. BGP
is the path-vector protocol that routes between organisations on the internet.
The routing track takes both much further; here, recognise the names.

**[COMMON MISTAKES — ~4:55]**
Three traps. One: longest prefix match beats everything — a /24 wins over a
/16 even if the /16 came from a more trusted source. Specificity is decided
before AD. Two: administrative distance is not the metric. AD picks between
sources; the metric picks between routes from the same source. Three: the
native VLAN crosses trunks untagged — that is precisely what double-tagging
attacks abuse, so it is never "just a default."

**[RECAP — ~5:20]**
Switches learn source MACs into the CAM table and flood only the unknown and
the broadcast. VLANs are separate broadcast domains on shared hardware; access
ports are untagged, trunks carry 802.1Q tags, and the native VLAN goes
untagged. STP elects a root bridge and blocks redundant links so broadcasts
cannot storm. Routers forward by longest prefix match — most specific wins —
and break ties between sources with administrative distance: connected 0,
static 1, OSPF 110, RIP 120. OSPF is link-state with Dijkstra and cost; BGP is
the path-vector protocol between organisations. Frames inside, packets between
— that is the whole job.

## On-screen visuals

- HOOK: a frame moving inside a LAN beside a packet crossing between networks.
- How a switch forwards frames SECTION: the CAM table filling as frames arrive,
  then known-unicast forwarding versus flooding to ff:ff:ff:ff:ff:ff.
- VLANs and trunks SECTION: one switch split into VLAN 10 and VLAN 20, access
  ports untagged, a trunk carrying 802.1Q-tagged frames with the native VLAN
  untagged.
- Spanning Tree Protocol SECTION: redundant links forming a loop, the broadcast
  storm animation, then the root-bridge election and blocked ports.
- How a router chooses a path SECTION: the routing table with the longest
  prefix match highlighted, the AD trust ranking, and the OSPF/BGP comparison
  row.
- COMMON MISTAKES: longest-prefix-match versus AD ordering, and the native
  VLAN callout.
- RECAP: the cheat-sheet rows as a clean summary card.
