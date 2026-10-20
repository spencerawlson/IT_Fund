# Switching & Routing: VLANs, STP and Path Selection — Avatar Tutor Script

**Lesson ID:** net-switch-route
**Track:** Network+
**Estimated runtime:** ~6 minutes (~839 words)
**Revised 2026-10-20:** merged the v1.0 production doc's equipment + real-lab demo material per the reconciled production plan v2.0.

## Spoken script

**[HOOK — 0:00]**
Switches move frames inside a network; routers move packets between networks.
Almost every connectivity problem you will ever troubleshoot comes down to one
of those two decisions going wrong.

**[WHY IT MATTERS — ~0:15]**
This lesson covers how a switch learns where devices are, how VLANs split one
switch into several isolated networks, how trunks carry those VLANs between
switches, and how routers choose a path. Four ideas that explain most of what a
network does all day — and we will prove the first one live, in a real lab.

**[SECTION — How a switch forwards frames — ~0:40]**
A switch is a diligent student. It reads the source MAC address of every frame
it receives and records which port it arrived on, in its MAC address table —
the CAM table. Over time, it learns where everyone lives.

Forwarding is then a lookup. The switch checks the destination MAC against the
table. Known address: the frame goes out that one port only. Unknown address —
or a broadcast to ff:ff:ff:ff:ff:ff: flood it out every port in the same VLAN,
except the one it came in on. So the first packet to a new destination is
flooded, and the reply comes back switched: the reply taught the switch the
sender's location.

**[DEMO — Prove it in the lab — ~1:30]**
Enough theory — watch it happen. In the lab, two computers share one switch
and one VLAN: Computer A, 192.168.10.10, and Computer B, 192.168.10.20. From
A, we ping B.

*[Real screen recording: PowerShell `ping 192.168.10.20` on Computer A, replies
shown. See On-screen visuals.]*

Replies — connectivity confirmed. The first frames may have been flooded,
before the switch had learned B. The replies taught it both addresses, and
after that the conversation went port to port. Learning, flooding, forwarding
— live.

**[SECTION — VLANs and trunks — ~2:05]**
A VLAN is a separate broadcast domain on shared hardware. Think of it as
drawing invisible walls inside one switch: hosts in VLAN 10 cannot reach hosts
in VLAN 20 without a router or a layer 3 switch. That is what makes VLANs a
segmentation control, not just an organisational trick.

Between switches, VLANs ride trunks. An access port belongs to one VLAN and
carries untagged frames — the port's VLAN is implied. A trunk port carries
many VLANs between switches, adding an 802.1Q tag to each frame so the far
side knows which VLAN it belongs to. Frames on the native VLAN cross the trunk
untagged — which is exactly why the native VLAN needs care, as the security
lesson shows.

And this is not just theory. On a real managed switch, creating a VLAN takes
a few short commands — name the VLAN, assign the port — and the lesson below
shows them exactly. The invisible walls are configuration you will type
yourself.

**[SECTION — Spanning Tree Protocol — ~3:15]**
Redundancy is good — until it loops. Redundant links between switches create
loops, and Ethernet has no TTL to kill a looping frame, so a single broadcast
can multiply forever, in a broadcast storm, until the network melts down.

Spanning Tree Protocol — 802.1D, with RSTP, 802.1w, as the faster modern
version — solves it democratically. The switches elect a root bridge, then
block just enough ports to leave one loop-free path to it. If the active path
fails, the blocked ports unblock automatically. Redundancy without the storm.

**[SECTION — How a router chooses a path — ~3:55]**
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

**[COMMON MISTAKES — ~5:00]**
Three traps. One: longest prefix match beats everything — a /24 wins over a
/16 even if the /16 came from a more trusted source. Specificity is decided
before AD. Two: administrative distance is not the metric. AD picks between
sources; the metric picks between routes from the same source. Three: the
native VLAN crosses trunks untagged — that is precisely what double-tagging
attacks abuse, so it is never "just a default."

**[RECAP — ~5:35]**
Switches learn source MACs into the CAM table and flood only the unknown and
the broadcast — and you watched that happen live in the lab. VLANs are separate
broadcast domains on shared hardware, created with real commands on a real
switch; access ports are untagged, trunks carry 802.1Q tags, and the native
VLAN goes untagged. STP elects a root bridge and blocks redundant links so
broadcasts cannot storm. Routers forward by longest prefix match — most
specific wins — and break ties between sources with administrative distance:
connected 0, static 1, OSPF 110, RIP 120. Frames inside, packets between —
that is the whole job.

## On-screen visuals

- HOOK: a frame moving inside a LAN beside a packet crossing between networks.
- How a switch forwards frames SECTION: the CAM table filling as frames arrive,
  then known-unicast forwarding versus flooding to ff:ff:ff:ff:ff:ff.
- DEMO: a real screen recording, never AI-generated — PowerShell
  `ping 192.168.10.20` run on Computer A (192.168.10.10) in the Proxmox lab,
  replies visible, with the CAM-table graphic from the previous section beside
  it.
- VLANs and trunks SECTION: one switch split into VLAN 10 and VLAN 20, access
  ports untagged, a trunk carrying 802.1Q-tagged frames with the native VLAN
  untagged; as the real-switch moment is spoken, the lesson's own "Create a
  VLAN and an access port" command example on screen.
- Spanning Tree Protocol SECTION: redundant links forming a loop, the broadcast
  storm animation, then the root-bridge election and blocked ports.
- How a router chooses a path SECTION: the routing table with the longest
  prefix match highlighted, the AD trust ranking, and the OSPF/BGP comparison
  row.
- COMMON MISTAKES: longest-prefix-match versus AD ordering, and the native
  VLAN callout.
- RECAP: the cheat-sheet rows as a clean summary card.

---

## Production notes — lesson gaps

Grounded and used (all from this lesson's overview / learn / examples /
cheatSheet, or the academy deck): switch source-MAC learning into the CAM
table; flooding of unknown unicast and broadcast within the same VLAN; VLANs
as separate broadcast domains; access vs trunk ports and 802.1Q tagging;
creating a VLAN and assigning an access port with the lesson's own Cisco IOS
example commands; STP/RSTP root-bridge election and port blocking; longest
prefix match; administrative distance values; OSPF (link-state, Dijkstra,
cost from bandwidth) and BGP (path-vector).

The v1.0 production document contributed two elements this lesson does not
fully support. Per the template's grounding rule, the unsupported facts were
**not** written into the spoken script. They are listed here so Spencer can
decide whether to extend the lesson:

1. **Port mirroring (SPAN).** The concept — a switch copying selected
   traffic to a monitoring port — appears nowhere in the lesson: not in the
   overview, the learn sections, the examples, or the cheat sheet, and not
   in the academy deck's cards. The v1.0 scene built on it could not be
   spoken.
2. **Port mirroring as a cybersecurity technique.** The v1.0 hook — traffic
   copied to a monitoring port for analysis — depends entirely on gap 1, so
   it is also unspoken. If the lesson gains a port-mirroring section, this
   becomes the strongest security beat in the episode.
3. **The TP-Link TL-SG108E itself.** The specific product — an eight-port
   Gigabit Easy Smart Switch — its name, port count, and feature set appear
   nowhere in the lesson. The spoken script therefore says "a real managed
   switch" and leans on the lesson's own configuration example; the named
   product can be spoken (and shown as the hero hardware) only once the
   lesson names it.
4. **Configuration-workflow mismatch (decision, not a missing fact).** The
   lesson's only hands-on VLAN example uses Cisco IOS commands
   (`vlan 10`, `switchport access vlan 10`). If the on-camera hardware is
   the TL-SG108E named in v1.0, its configuration workflow is not the one
   the lesson teaches. Spencer's call: extend the lesson to cover the
   TL-SG108E, or keep the equipment moment generic as scripted.
5. **Demo addressing.** The lab addresses used in the DEMO segment —
   192.168.10.10 pinging 192.168.10.20 on a /24 — come from the v1.0
   document's lab design, not from the lesson. They are production material
   for the recording, flagged here so they are never mistaken for lesson
   content.
