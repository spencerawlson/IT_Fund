# Devices, Media & Topologies: Hubs, Switches, Cables and Fibre — Avatar Tutor Script

**Lesson ID:** net-devices-media
**Track:** Network+
**Estimated runtime:** ~5 minutes (~739 words)

## Spoken script

**[HOOK — 0:00]**
Before any protocol matters, traffic needs something to travel over and devices
to move it. Pick the wrong cable, and your 10-gigabit plan quietly dies at
55 metres. Choose well, and the network just works.

**[WHY IT MATTERS — ~0:15]**
Choosing the right cable, knowing its limits, and understanding what each device
does with traffic are the foundations of every network design — and of many
troubleshooting calls. This lesson covers hubs, switches, routers and load
balancers, collision and broadcast domains, copper and fibre media, connectors,
Power over Ethernet and the common topologies.

**[SECTION — Devices and domains — ~0:45]**
Start with what each box does to traffic. A hub is a Layer 1 device that
repeats every signal out every port — so all attached devices share one
collision domain. It is like shouting in a small room: everyone hears
everything, and two people talking at once means a collision. Hubs are obsolete.

A switch is a Layer 2 device that learns which MAC address lives on which port,
and forwards each frame only where it needs to go. So every switch port is its
own collision domain. But — and the exam loves this — a switch still floods
broadcasts to every port in the same VLAN. The whole switch, per VLAN, is one
broadcast domain.

A router is a Layer 3 device. It forwards packets between networks by IP
address, and it does not forward broadcasts. So each router interface separates
broadcast domains. And a load balancer distributes incoming traffic across
several servers — improving availability and scale — and often terminates TLS.

**[SECTION — Copper and fibre — ~2:20]**
Now the stuff the traffic travels on. Twisted-pair Ethernet — Cat 5e, Cat 6,
Cat 6a — terminates in RJ45 connectors. RJ11 is the smaller telephone connector;
do not confuse the two. Here is the limit that matters: copper Ethernet runs
are capped at 100 metres. And watch the speed caveat — Cat 6 carries 10 Gbps
only to about 55 metres, while Cat 6a carries 10 Gbps the full 100. Run 60
metres of Cat 6 expecting 10 gig, and physics will embarrass you.

Fibre fixes both problems. It is immune to electrical interference, and it goes
much farther. Two kinds. Single-mode fibre uses a laser and a narrow core to
reach kilometres. Multimode fibre uses a wider core for shorter runs inside
buildings and data centres. Common fibre connectors include LC and SC.

One more idea on copper: Power over Ethernet. PoE delivers power over the data
cable to phones, wireless access points and cameras — no separate power brick.
The standards step up in power: 802.3af is PoE, 802.3at is PoE+, and 802.3bt is
PoE++, each supplying more than the last.

**[SECTION — Topologies — ~3:50]**
Topologies describe how nodes connect. In a star, every node connects to a
central device. Most Ethernet LANs are a star — or a hierarchy of stars — around
switches. It is simple, but the centre is a single point of failure.

A full mesh connects every node to every other node. That gives the most
redundancy: any link can die and traffic just reroutes. The price? You need
n times n minus one over two links — six nodes means fifteen links. That is why
full meshes are usually reserved for the network core or the WAN, where
redundancy is worth the cost.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: a switch port is its own collision domain, but not its own
broadcast domain — the broadcast domain is the whole VLAN. Two: the 100-metre
copper limit is for the full run, and the 10-gigabit Cat 6 limit is 55 metres,
not 100. Three: full mesh link count — n times n minus one over two. Six nodes,
fifteen links. Write the formula down before the exam.

**[RECAP — ~5:05]**
Hubs repeat everything at Layer 1 — obsolete. Switches forward by MAC at Layer
2; each port is a collision domain, the VLAN is the broadcast domain. Routers
forward by IP at Layer 3 and separate broadcast domains. Load balancers spread
traffic across servers. Copper tops out at 100 metres, and 10 Gbps needs Cat 6a
for the full run; RJ45 is Ethernet, RJ11 is telephone. Single-mode fibre goes
kilometres, multimode serves the building. PoE powers phones and access points
over the data cable. Star for the LAN, full mesh for the core.

## On-screen visuals

- HOOK: a 60-metre Cat 6 cable run flagged at the 55-metre mark with a 10-Gbps
  warning.
- Devices and domains SECTION: hub-versus-switch traffic animation — hub
  repeating out every port, switch forwarding to one port — then the broadcast
  domain spanning the VLAN and stopping at the router.
- Copper and fibre SECTION: the cable card — RJ45 versus RJ11, the 100-metre
  limit bar with the 55-metre Cat 6 callout, single-mode laser versus multimode
  wide core, LC/SC connectors, and the PoE standards ladder af, at, bt.
- Topologies SECTION: star diagram around a central switch, then the full-mesh
  formula n(n-1)/2 worked for six nodes.
- COMMON MISTAKES: collision-versus-broadcast domain comparison and the mesh
  formula.
- RECAP: the cheat-sheet rows as a clean summary card.
