# IS-IS: Levels, LSPs and the Provider Backbone — Avatar Tutor Script

**Lesson ID:** rt-isis
**Track:** Routing Protocols
**Estimated runtime:** ~4 minutes (~622 words)

## Spoken script

**[HOOK — 0:00]**
IS-IS is a link-state protocol like OSPF — but it runs directly over Layer 2
instead of over IP. That one design choice, plus its extensibility, made it the
favourite of large service-provider backbones.

**[WHY IT MATTERS — ~0:15]**
If you ever work in a service provider, you will meet IS-IS. This lesson covers
the Level 1 and Level 2 hierarchy, NET addressing, LSPs and the link-state
database, the DIS on LAN segments, and why IS-IS added IPv6 so painlessly.

**[SECTION — Levels and the backbone — ~0:45]**
IS-IS routers come in three flavours. Level 1 routers route inside an area.
Level 2 routers form the inter-area backbone. L1/L2 routers speak both — the
equivalent of an OSPF area border router.

Here is the elegant difference from OSPF: the backbone is simply the contiguous
chain of Level 2 routers. There is no magic area number, no Area 0 to touch.
The L2 set just has to stay connected. Fewer rules, same hierarchy.

And the router's identity is not an IP address at all. A router identifies
itself with a NET — a Network Entity Title — an NSAP address encoding the area
ID and a system ID. Because the control plane does not use IP addresses, it
stays off the IP data plane — which, as we will see, is a security feature in
disguise.

**[SECTION — LSPs, SPF and the DIS — ~2:10]**
The machinery will feel familiar. Each router originates Link-State PDUs —
LSPs — describing its links. These flood until every router holds an identical
database, and each router runs SPF for shortest paths. Same link-state idea as
OSPF: flood, synchronise, compute.

On a LAN, IS-IS elects a DIS — the Designated Intermediate System — to reduce
flooding, analogous to OSPF's DR. Two differences the exam may probe: there is
no backup DIS, and preemption is simpler. One designated router, no understudy,
less ceremony.

**[SECTION — Why providers like it — ~3:20]**
So why do providers choose it? First, it scales cleanly, with none of OSPF's
area-number ceremony. Second, extensibility: routes and address families are
carried in TLVs — type-length-value fields — so adding IPv6 was just new TLVs.
No new protocol version, unlike the OSPFv2 to OSPFv3 jump. The protocol did not
change; the payloads just grew new types. That same TLV trick is why IS-IS
absorbs new features without version churn.

Wide metrics removed the original small per-link metric ceiling, so large
bandwidths are expressible. And running on CLNS — directly over Layer 2 —
means the routing control plane is harder to reach and attack from the IP data
plane. An attacker on the IP network cannot easily even address the protocol
that routes it.

**[COMMON MISTAKES — ~4:25]**
Three traps. One: IS-IS levels are not OSPF areas. L1 is intra-area, L2 is the
backbone, and the backbone is defined by connectivity, not by a number. Two:
the DIS has no backup — do not invent a BDIS. Three: the NET is an NSAP
address, not an IP address. If a question asks for the router's IP-based
identity, that is OSPF's router ID, not IS-IS.

**[RECAP — ~4:50]**
IS-IS is link-state over Layer 2, not IP. L1 routes inside an area, L2 forms
the backbone, L1/L2 does both — and the backbone is the contiguous L2 chain,
no Area 0 required. Routers identify with NETs, NSAP addresses encoding area
and system ID. LSPs flood, the database synchronises, SPF computes. The DIS
tames LAN flooding with no backup and simpler preemption. Compare that with OSPF, which needed an entirely new protocol version —
OSPFv3 — to speak IPv6. IS-IS just defined new TLVs and carried on. Wide
metrics lifted the ceiling, and the CLNS control plane hides from
IP attackers. The provider's quiet workhorse — less famous than OSPF, chosen
where scale demands it.

## On-screen visuals

- HOOK: a provider backbone with IS-IS running beneath the IP layer.
- Levels and the backbone SECTION: the L1/L2/L1-L2 hierarchy diagram with the
  contiguous Level 2 backbone chain, and a NET address broken into area ID and
  system ID.
- LSPs, SPF and the DIS SECTION: LSP flooding to a synchronised database, SPF
  computing, and the DIS election with the no-backup callout.
- Why providers like it SECTION: TLV fields extending to carry IPv6, and the
  CLNS control plane sitting below the IP data plane's reach.
- COMMON MISTAKES: levels-versus-areas and the no-BDIS callouts.
- RECAP: the cheat-sheet rows as a clean summary card.
