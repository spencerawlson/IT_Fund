// Reading content for the Routing Protocols course, keyed by lesson (deck) id.
// Strings support `inline code` only. Aligned with src/data/academy/routing.js. Config examples are
// Cisco IOS-style, matching the Interactive Lab's simulated IOS shell.

const code = (...lines) => lines.join('\n');

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'rt-fundamentals': {
    overview: [
      'Routing is how a router decides where to send a packet it did not originate. It compares the packet\'s destination IP against its routing table and forwards out the best matching path — hop by hop, each router making its own independent decision.',
      'This lesson covers the building blocks every protocol shares: the routing table, how routes are sourced (connected, static, dynamic), longest-prefix matching, administrative distance, metrics, convergence, and the split between the control plane and the data plane.',
    ],
    learn: [
      {
        heading: 'The forwarding decision',
        body: [
          'When a packet arrives, the router looks up the destination address and picks the route with the longest prefix match — the most specific entry (largest mask). A /32 host route beats a /24, which beats a /0 default, no matter what protocol or metric produced them. Specificity is decided before anything else.',
          'The chosen route gives a next-hop IP and/or an exit interface. A next-hop-only (recursive) route forces a second lookup to find how to reach that next hop; a route with an exit interface can forward directly.',
        ],
      },
      {
        heading: 'Where routes come from, and who to trust',
        body: [
          'Routes are connected (a subnet on an up interface), static (configured by hand), or dynamic (learned from a protocol). When the same prefix is learned from more than one source, administrative distance (AD) breaks the tie: lower is more trusted. Connected is 0, static 1, eBGP 20, EIGRP 90, OSPF 110, RIP 120.',
          'A metric only compares routes from the same protocol — OSPF cost against OSPF cost, hop count against hop count. AD decides between protocols; the metric decides within one.',
        ],
      },
      {
        heading: 'Control plane vs data plane, and convergence',
        body: [
          'The control plane runs the routing protocols and builds the routing table (the RIB); the data plane forwards packets using the derived forwarding table (the FIB). Separating them lets forwarding stay fast while protocols think.',
          'After any topology change, the network is converging until every router again has an up-to-date, loop-free view. Fast convergence and good summarization (advertising many prefixes as one) are what keep large networks stable.',
        ],
      },
    ],
    cheatSheet: [
      ['Longest-prefix match', 'Most specific route (largest mask) wins first'],
      ['Administrative distance', 'Trust ranking between sources; lower wins (Conn 0, Static 1, EIGRP 90, OSPF 110, RIP 120)'],
      ['Metric', 'Tiebreaker within one protocol only'],
      ['Next hop', 'IP of the next router; may need a recursive lookup to an exit interface'],
      ['Convergence', 'All routers agree on current, loop-free paths'],
      ['Control vs data plane', 'Protocols build the table (RIB); the FIB forwards packets'],
      ['Summarization', 'Advertise many prefixes as one to shrink tables and contain instability'],
    ],
  },

  'rt-static': {
    overview: [
      'Static routes are paths you configure by hand. They add no protocol overhead, are completely predictable, and cannot be manipulated by a neighbour — but they do not adapt when the topology changes, so they do not scale.',
      'This lesson covers static and default routes, recursive vs directly-attached statics, floating statics for backup, and the security implications of getting a default route wrong.',
    ],
    learn: [
      {
        heading: 'Static and default routes',
        body: [
          'A static route pins a destination to a next hop or exit interface. A default route, `0.0.0.0/0` (or `::/0` for IPv6), is the gateway of last resort: it matches anything no more-specific route covers, which is how stub sites reach the internet.',
          'A recursive static names only a next-hop IP, so the router must resolve that IP to an interface; a directly-attached static names the exit interface and avoids the second lookup.',
        ],
      },
      {
        heading: 'Floating static routes',
        body: [
          'A floating static is a backup with a deliberately higher administrative distance than the preferred route. While the primary (lower-AD) path is up, the floating route stays out of the table; when the primary disappears, the backup installs automatically. For example, a static with AD 5 sits behind OSPF (AD 110)? No — you raise it ABOVE the dynamic protocol so it only wins when the dynamic route is gone.',
        ],
      },
      {
        heading: 'Security implications',
        body: [
          'A single wrong default route can blackhole or misdirect every unmatched packet in the network, so verify `show ip route` after any change. Statics cannot be spoofed by a rogue neighbour, which makes them attractive on small, trusted, single-path links — but on anything larger, their lack of self-healing is a liability.',
        ],
      },
    ],
    examples: [
      {
        title: 'Static, default and floating-static (Cisco IOS)',
        code: code(
          '! Directly-attached static to a LAN',
          'ip route 192.168.20.0 255.255.255.0 GigabitEthernet0/1',
          '',
          '! Recursive static via a next hop',
          'ip route 10.2.0.0 255.255.0.0 10.0.0.2',
          '',
          '! Default route (gateway of last resort)',
          'ip route 0.0.0.0 0.0.0.0 203.0.113.1',
          '',
          '! Floating static backup (AD 200) over a secondary link',
          'ip route 0.0.0.0 0.0.0.0 198.51.100.1 200',
        ),
      },
    ],
    cheatSheet: [
      ['Static route', 'Manually configured; predictable, no overhead, no self-healing'],
      ['Default route', '0.0.0.0/0 — matches anything not more specifically routed'],
      ['Recursive static', 'Next-hop IP only; needs a second lookup'],
      ['Directly-attached static', 'Names the exit interface; no recursion'],
      ['Floating static', 'Backup with higher AD; installs only when the primary fails'],
      ['Verify', 'show ip route / show ipv6 route; watch for S*'],
    ],
  },

  'rt-rip': {
    overview: [
      'RIP is the classic distance-vector protocol: routers advertise their whole table to directly-connected neighbours and choose paths by hop count. It is simple and easy to configure, which is exactly why it is useful for learning how dynamic routing — and routing loops — actually behave.',
      'This lesson covers the hop-count metric and 15-hop limit, RIP versions (v1, v2, RIPng), the timers, and the loop-prevention mechanisms: split horizon, route poisoning, poison reverse and triggered updates.',
    ],
    learn: [
      {
        heading: 'Distance-vector by rumour',
        body: [
          'A distance-vector router does not build a map of the network. It simply believes what its neighbours tell it ("routing by rumour") and adds its own distance. RIP\'s distance is hop count, so it ignores bandwidth entirely — a 3-hop path over gigabit links loses to a 2-hop path over a slow serial link.',
          'The metric maxes out at 15; 16 means unreachable. That low ceiling caps network size but also bounds how far a loop can count.',
        ],
      },
      {
        heading: 'Stopping loops',
        body: [
          'Split horizon forbids advertising a route back out the interface it was learned on, killing the simplest two-router loop. Route poisoning advertises a dead route with metric 16 so neighbours drop it immediately instead of ageing it out. Poison reverse sends that poisoned route back toward the source as an explicit "not through me".',
          'Together with triggered updates (sending changes at once rather than waiting for the periodic timer) these mechanisms tame the count-to-infinity problem that plagues naive distance-vector designs.',
        ],
      },
      {
        heading: 'Versions and hardening',
        body: [
          'RIPv1 is classful and broadcasts updates. RIPv2 is classless (supports VLSM/CIDR), multicasts to 224.0.0.9, and supports authentication. RIPng carries IPv6 over UDP 521. On any version, mark host-facing interfaces passive so you advertise their subnets without sending or accepting updates there, and enable RIPv2 authentication so a rogue device cannot inject routes.',
        ],
      },
    ],
    examples: [
      {
        title: 'RIPv2 with a passive interface (Cisco IOS)',
        code: code(
          'router rip',
          ' version 2',
          ' no auto-summary',
          ' network 192.168.1.0',
          ' network 10.0.0.0',
          ' passive-interface GigabitEthernet0/0   ! host-facing: advertise, do not peer',
        ),
      },
    ],
    cheatSheet: [
      ['Metric', 'Hop count (ignores bandwidth)'],
      ['Max hops', '15 usable; 16 = unreachable'],
      ['Split horizon', 'Do not advertise a route back out its source interface'],
      ['Route poisoning', 'Advertise a dead route as metric 16'],
      ['Poison reverse', 'Send the poisoned route back toward the source'],
      ['RIPv2 vs v1', 'Classless, multicast 224.0.0.9, authentication'],
      ['RIPng', 'RIP for IPv6 (UDP 521)'],
    ],
  },

  'rt-ospf': {
    overview: [
      'OSPF is the most common interior gateway protocol in enterprises. It is link-state: every router floods a description of its own links, so all routers in an area build an identical database and independently compute shortest paths with Dijkstra\'s algorithm. The result converges fast and avoids the loops that haunt distance-vector protocols.',
      'This lesson covers router IDs, Hello-based neighbour discovery and adjacency states, LSAs and the LSDB, SPF and cost, the area hierarchy with the Area 0 backbone, ABRs/ASBRs, and the DR/BDR election on multi-access links.',
    ],
    learn: [
      {
        heading: 'Neighbours, adjacencies and the database',
        body: [
          'Routers find each other with Hello packets, which must agree on area, subnet/mask, timers, and authentication before an adjacency can form. The adjacency walks through states — Down, Init, 2-Way, ExStart, Exchange, Loading, Full — and only at Full have the two routers synchronised their link-state databases.',
          'Each router originates LSAs (link-state advertisements) describing its links; these flood through the area until every router holds the same LSDB. A stuck ExStart/Exchange almost always means an MTU mismatch.',
        ],
      },
      {
        heading: 'SPF, cost and areas',
        body: [
          'Against the completed LSDB, each router runs SPF (Dijkstra) to build its own shortest-path tree, using cost as the metric. Cost is derived from interface bandwidth (reference bandwidth ÷ bandwidth), so you should set a consistent reference bandwidth network-wide once links exceed 100 Mbps.',
          'OSPF scales through areas. Every non-backbone area must touch Area 0 (the backbone); an Area Border Router (ABR) joins an area to the backbone and summarises between them, while an ASBR injects external routes (from another protocol) into OSPF.',
        ],
      },
      {
        heading: 'DR/BDR and hardening',
        body: [
          'On a broadcast multi-access segment, having every router fully adjacent with every other would flood duplicate LSAs. OSPF elects a Designated Router (and Backup) so everyone forms a full adjacency only with the DR/BDR, drastically cutting flooding. Point-to-point links need no DR.',
          'Secure OSPF with cryptographic authentication on adjacencies and `passive-interface` on host-facing ports, so a rogue device cannot peer and inject false LSAs. OSPFv3 carries IPv6 (and, via address families, IPv4 too).',
        ],
      },
    ],
    examples: [
      {
        title: 'OSPF in Area 0 with a passive interface (Cisco IOS)',
        code: code(
          'router ospf 1',
          ' router-id 1.1.1.1',
          ' auto-cost reference-bandwidth 10000   ! 10 Gbps reference',
          ' network 10.0.12.0 0.0.0.3 area 0',
          ' network 192.168.1.0 0.0.0.255 area 0',
          ' passive-interface GigabitEthernet0/0  ! LAN: advertise, do not peer',
        ),
      },
    ],
    cheatSheet: [
      ['Type', 'Link-state; floods LSAs, runs SPF (Dijkstra)'],
      ['Router ID', 'Highest loopback IP, else highest active IP, else set manually'],
      ['Metric', 'Cost = reference-bandwidth ÷ interface bandwidth'],
      ['Full state', 'Adjacency complete and LSDBs synchronised'],
      ['Area 0', 'The backbone; every area must connect to it'],
      ['ABR / ASBR', 'Area↔backbone border / external-route injector'],
      ['DR/BDR', 'Cuts flooding on broadcast multi-access segments'],
      ['IPv6', 'OSPFv3'],
    ],
  },

  'rt-eigrp': {
    overview: [
      'EIGRP is Cisco\'s advanced distance-vector protocol. It keeps the simplicity of distance-vector but adds DUAL, which precomputes loop-free backup paths so failover can be almost instantaneous — often faster than OSPF reconvergence.',
      'This lesson covers neighbours and the composite metric, the DUAL concepts (feasible distance, reported distance, successor, feasible successor), the feasibility condition that guarantees loop-freedom, and stub routing.',
    ],
    learn: [
      {
        heading: 'The composite metric and neighbours',
        body: [
          'EIGRP routers discover neighbours with Hellos (multicast 224.0.0.10) and must match the AS number and K-values to peer. Its metric is composite — by default bandwidth and delay (load, reliability and MTU are available but off, to keep the metric stable). Internal EIGRP routes have AD 90; external (redistributed) routes 170.',
        ],
      },
      {
        heading: 'DUAL: successors and feasible successors',
        body: [
          'For each destination EIGRP tracks a feasible distance (its own best metric) and each neighbour\'s reported distance (that neighbour\'s metric to the prefix). The successor is the best next hop and goes in the routing table. A feasible successor is a pre-qualified backup.',
          'A backup qualifies only if it satisfies the feasibility condition: the neighbour\'s reported distance is less than your current feasible distance. That proves the neighbour is genuinely closer to the destination, so using it cannot create a loop. If the successor fails and a feasible successor exists, DUAL swaps instantly without recomputation.',
        ],
      },
      {
        heading: 'Scaling with stubs',
        body: [
          'In hub-and-spoke designs, a spoke configured as an EIGRP stub advertises only its connected/summary routes and tells the hub not to send it queries. This shrinks the query domain, which is the main thing that slows EIGRP convergence at scale. EIGRP also supports IPv4 and IPv6 and, although historically Cisco-proprietary, is now published as informational RFC 7868.',
        ],
      },
    ],
    examples: [
      {
        title: 'EIGRP with named mode and a stub spoke (Cisco IOS)',
        code: code(
          'router eigrp 100',
          ' network 10.0.0.0 0.0.0.255',
          ' network 192.168.10.0 0.0.0.255',
          ' passive-interface GigabitEthernet0/0',
          ' eigrp stub connected summary        ! on a spoke router',
        ),
      },
    ],
    cheatSheet: [
      ['Algorithm', 'DUAL — precomputed, loop-free backups'],
      ['Metric', 'Composite: bandwidth + delay by default'],
      ['Successor', 'Best route, installed in the table'],
      ['Feasible successor', 'Pre-qualified loop-free backup'],
      ['Feasibility condition', 'Neighbour RD < current FD'],
      ['AD', '90 internal, 170 external'],
      ['Stub', 'Limits advertised routes and query scope'],
    ],
  },

  'rt-isis': {
    overview: [
      'IS-IS is a link-state protocol, like OSPF, but it runs directly over Layer 2 (CLNS) rather than over IP. That design, plus its extensibility through TLVs, makes it a favourite in large service-provider backbones.',
      'This lesson covers the Level 1 / Level 2 hierarchy, NET (NSAP) addressing, LSPs and the link-state database, the DIS on LAN segments, and why IS-IS added IPv6 so painlessly.',
    ],
    learn: [
      {
        heading: 'Levels and the backbone',
        body: [
          'IS-IS routers are Level 1 (intra-area), Level 2 (inter-area backbone), or L1/L2 (both — the equivalent of an OSPF ABR). The backbone is simply the contiguous chain of Level 2 routers; unlike OSPF\'s fixed Area 0, there is no magic area number, the L2 set just has to stay connected.',
          'A router identifies itself with a NET (Network Entity Title), an NSAP address that encodes the area ID and a system ID — notably not an IP address, which keeps the control plane off the IP data plane.',
        ],
      },
      {
        heading: 'LSPs, SPF and the DIS',
        body: [
          'Each router originates Link-State PDUs (LSPs) describing its links; these flood so every router holds an identical database and runs SPF for shortest paths — the same link-state idea as OSPF. On a LAN, IS-IS elects a DIS (Designated Intermediate System) to reduce flooding, analogous to OSPF\'s DR but with no backup DIS and simpler preemption.',
        ],
      },
      {
        heading: 'Why providers like it',
        body: [
          'IS-IS scales cleanly, and because routes and address families are carried in TLVs, adding IPv6 was just new TLVs — no new protocol version, unlike OSPFv2 → OSPFv3. Wide metrics removed the original small per-link metric ceiling. Running on CLNS also means the routing control plane is harder to reach and attack from the IP data plane.',
        ],
      },
    ],
    cheatSheet: [
      ['Type', 'Link-state over Layer 2 (CLNS), not IP'],
      ['Levels', 'L1 intra-area, L2 backbone, L1/L2 both'],
      ['Backbone', 'Contiguous set of Level 2 routers'],
      ['NET/NSAP', 'Router identity encoding area + system ID'],
      ['LSP', 'Link-State PDU flooded to build the LSDB'],
      ['DIS', 'Designated router on a LAN (no backup)'],
      ['IPv6', 'Added via TLVs — no new protocol version'],
    ],
  },

  'rt-bgp': {
    overview: [
      'BGP is the routing protocol of the internet. It is a path-vector protocol that exchanges reachability between autonomous systems and chooses paths by policy and attributes, not by interior cost. If an organisation multihomes to several providers, BGP is how it does it.',
      'This lesson covers autonomous systems and ASNs, eBGP vs iBGP, the BGP message types, the key path attributes, the best-path selection order, and scaling/safety tools like route reflectors and prefix filtering.',
    ],
    learn: [
      {
        heading: 'Autonomous systems and sessions',
        body: [
          'An autonomous system is a network under one routing policy, identified by an ASN. BGP peers are configured explicitly and talk over TCP 179 — reliable transport means BGP does not flood like IGPs. eBGP runs between different ASes (AD 20); iBGP runs within one AS (AD 200) and, because iBGP does not re-advertise routes learned from one iBGP peer to another, needs a full mesh or route reflectors.',
          'Peers exchange OPEN (set up), UPDATE (advertise/withdraw NLRI with attributes), KEEPALIVE (stay up), and NOTIFICATION (error/teardown) messages.',
        ],
      },
      {
        heading: 'Attributes and best-path selection',
        body: [
          'BGP does not use a single metric; it walks an ordered list of attributes. On Cisco the order starts: highest Weight (local to the router), then highest Local Preference (AS-wide outbound policy), locally-originated routes, shortest AS_PATH, lowest Origin, lowest MED, eBGP over iBGP, and so on.',
          'AS_PATH lists the ASes a route crossed — used both for loop prevention (reject routes containing your own ASN) and shortest-path preference. LOCAL_PREF steers traffic leaving your AS; MED hints to a neighbour which entry point into your AS to prefer; communities tag routes so peers apply agreed policy.',
        ],
      },
      {
        heading: 'Scaling and safety',
        body: [
          'Route reflectors remove the iBGP full-mesh requirement by re-advertising iBGP routes, so you avoid n(n-1)/2 sessions. Because BGP will believe what a peer announces, filtering is essential: prefix lists, AS_PATH filters, max-prefix limits and RPKI origin validation protect you — and the wider internet — from leaks and hijacks.',
        ],
      },
    ],
    examples: [
      {
        title: 'eBGP peering with a prefix-list filter (Cisco IOS)',
        code: code(
          'router bgp 65001',
          ' neighbor 203.0.113.1 remote-as 65002',
          ' network 198.51.100.0 mask 255.255.255.0',
          ' neighbor 203.0.113.1 prefix-list OUT out',
          ' neighbor 203.0.113.1 maximum-prefix 1000',
          '!',
          'ip prefix-list OUT permit 198.51.100.0/24   ! advertise only what we own',
        ),
      },
    ],
    cheatSheet: [
      ['Role', 'Inter-AS (internet) path-vector routing'],
      ['Transport', 'TCP 179; peers configured explicitly'],
      ['eBGP vs iBGP', 'Between ASes (AD 20) vs within an AS (AD 200)'],
      ['AS_PATH', 'ASes traversed; loop prevention + shortest-path'],
      ['LOCAL_PREF', 'Outbound policy within the AS (higher wins)'],
      ['MED', 'Hints a neighbour\'s inbound entry point (lower wins)'],
      ['Route reflector', 'Removes the iBGP full-mesh need'],
      ['Filtering', 'Prefix-lists, AS_PATH filters, max-prefix, RPKI'],
    ],
  },

  'rt-redistribution': {
    overview: [
      'Redistribution injects routes learned by one routing protocol into another — for example, advertising OSPF routes into EIGRP so two domains can reach each other. It is powerful and often necessary during migrations or at the edge of different administrative domains, but it is also one of the easiest ways to create routing loops.',
      'This lesson covers seed metrics, route tagging and filtering, administrative-distance tuning, OSPF external route types, and the discipline that keeps mutual redistribution safe.',
    ],
    learn: [
      {
        heading: 'Why metrics do not translate',
        body: [
          'Each protocol measures paths differently — OSPF cost means nothing to EIGRP, whose composite metric means nothing to RIP. So when you redistribute, you must supply a seed (default) metric for the injected routes, giving them a sensible starting value in the receiving protocol. When redistributing into OSPF, externals are External Type 2 (E2) by default, carrying only the seed cost; E1 adds internal cost along the way.',
        ],
      },
      {
        heading: 'The loop problem and how to break it',
        body: [
          'With two-way redistribution between two protocols, a route can leave domain A, enter domain B, and be redistributed straight back into A — now looking like an external route — causing loops and suboptimal paths. The fixes are tags and filters: tag routes as they leave a domain and deny tagged routes from re-entering it, and raise the administrative distance of redistributed routes so native routes stay preferred.',
          'Prefer a single, well-controlled redistribution point where possible; every extra boundary multiplies the risk.',
        ],
      },
      {
        heading: 'Verify, always',
        body: [
          'After configuring redistribution, read `show ip route` on both domains and run `traceroute` to confirm paths are correct and loop-free. Be careful with `redistribute connected` — without a route-map it can leak management or transit subnets you never meant to advertise.',
        ],
      },
    ],
    examples: [
      {
        title: 'Redistribute OSPF into EIGRP with a tag filter (Cisco IOS)',
        code: code(
          'router eigrp 100',
          ' redistribute ospf 1 metric 1000000 100 255 1 1500 route-map FROM-OSPF',
          '!',
          'route-map FROM-OSPF deny 10',
          ' match tag 110            ! block routes we tagged on the way out',
          'route-map FROM-OSPF permit 20',
          ' set tag 100',
        ),
      },
    ],
    cheatSheet: [
      ['Redistribution', 'Inject routes from one protocol into another'],
      ['Seed metric', 'Required starting metric (metrics do not cross protocols)'],
      ['OSPF E2 vs E1', 'E2 = seed cost only; E1 adds internal cost'],
      ['Route tag', 'Mark routes to filter them on the way back'],
      ['AD tuning', 'Keep native routes preferred over redistributed copies'],
      ['Single point', 'Fewer boundaries = fewer loops'],
      ['Verify', 'show ip route + traceroute on both domains'],
    ],
  },

  'rt-routing-security': {
    overview: [
      'Routing protocols were designed for trusted environments, so their default posture is dangerously open. An attacker who can peer, inject or impersonate can blackhole, reroute or intercept traffic across a whole network — and the internet has seen this repeatedly in BGP hijacks and leaks.',
      'This lesson connects routing to the Road to CISSP security curriculum: the threats (rogue routers, route injection, prefix hijacking, route leaks) and the defences (authentication, passive interfaces, prefix filtering, RPKI, control-plane protection, and monitoring).',
    ],
    learn: [
      {
        heading: 'The threats',
        body: [
          'A rogue router that forms an adjacency can inject false routes to blackhole or capture traffic. In BGP, prefix hijacking is announcing address space you do not own (the 2008 YouTube/Pakistan incident is the classic case), and a route leak is advertising routes against policy, pulling transit through a network that should not carry it. OSPF and RIP can be attacked by injecting crafted LSAs/updates when adjacencies are unauthenticated.',
        ],
      },
      {
        heading: 'The defences',
        body: [
          'Authenticate every adjacency cryptographically (HMAC-SHA keychains for OSPF/EIGRP/IS-IS, TCP-AO or MD5 for BGP) so unauthorised or spoofed peers cannot join. Make host-facing interfaces passive so a device on an access port can never peer. On BGP edges, filter prefixes in and out (prefix-lists, AS_PATH filters, max-prefix limits) and validate origins with RPKI ROAs so invalid announcements are dropped.',
          'Protect the router itself with control-plane policing (CoPP) to rate-limit traffic hitting the routing process, blunting control-plane DoS.',
        ],
      },
      {
        heading: 'Detection and the SIEM',
        body: [
          'Prevention is never perfect, so monitor. Log routing changes and feed them to a SIEM: alert on unexpected neighbours, prefix origin changes, sudden table churn, and authentication failures. BGP monitoring services and route-origin feeds catch hijacks that your own routers cannot see. This is the same detect-and-investigate discipline as the platform\'s log-triage and SIEM labs, applied to the control plane.',
        ],
      },
    ],
    cheatSheet: [
      ['Rogue router', 'Unauthorised peer injecting routes — authenticate + passive interfaces'],
      ['Prefix hijack', 'Announcing address space you do not own'],
      ['Route leak', 'Advertising routes against policy'],
      ['Authentication', 'HMAC-SHA keychains (IGP), TCP-AO/MD5 (BGP)'],
      ['Prefix filtering', 'prefix-lists, AS_PATH filters, max-prefix'],
      ['RPKI', 'Validates an AS is authorised to originate a prefix'],
      ['CoPP', 'Rate-limits traffic to the control plane'],
      ['Monitoring', 'Log routing changes to a SIEM; alert on anomalies'],
    ],
  },

  'rt-routing-troubleshooting': {
    overview: [
      'Routing problems are usually one of a few things: no matching route, the wrong best path, or an adjacency that never formed. A methodical approach — check the table, check the protocol, check the neighbour, test the path — finds the fault far faster than guessing.',
      'This lesson covers that methodology and the `show`, `ping` and `traceroute` commands that back each step, with the output patterns that point straight at the cause.',
    ],
    learn: [
      {
        heading: 'Start with the table',
        body: [
          'When a destination is unreachable, the first question is always: is there a matching route? `show ip route <dest>` (or `show ipv6 route`) tells you whether the router would forward the packet at all, and the route code (C, S, O, D, B) shows how it was learned. No route means the prefix is not advertised or is filtered; a surprising route means a metric, AD or redistribution issue.',
          '`show ip protocols` then summarises which protocols run, what networks they advertise, their neighbours and their administrative distances — often the fastest way to spot a missing `network` statement.',
        ],
      },
      {
        heading: 'Check the adjacency',
        body: [
          'If a protocol is up but routes are missing, verify the neighbour: `show ip ospf neighbor`, `show ip eigrp neighbors`, or `show ip bgp summary`. A stuck state is diagnostic — OSPF stuck in EXSTART is almost always an MTU mismatch; a BGP peer in Idle/Active means the TCP session, ASN or authentication is wrong; no OSPF neighbour at all usually means mismatched area, subnet/mask, timers, authentication or network type.',
        ],
      },
      {
        heading: 'Test the path',
        body: [
          'Finally, prove the data path. `ping` tests reachability; `traceroute` exposes the per-hop path and shows exactly where it breaks — revealing routing loops, black holes and asymmetric routing that a ping alone hides. Work the layers top to bottom and change one variable at a time.',
        ],
      },
    ],
    examples: [
      {
        title: 'A routing triage sequence (Cisco IOS)',
        code: code(
          'show ip route 10.2.2.0          ! is there a matching route, and how was it learned?',
          'show ip protocols               ! which protocols, which networks advertised?',
          'show ip ospf neighbor           ! did the adjacency reach FULL?',
          'show ip bgp summary             ! is the BGP session Established?',
          'traceroute 10.2.2.2             ! where does the path actually break?',
        ),
      },
    ],
    cheatSheet: [
      ['show ip route', 'Is there a matching route, and how was it learned?'],
      ['show ip protocols', 'Protocols, advertised networks, neighbours, AD'],
      ['show ip ospf neighbor', 'Adjacency state (EXSTART = MTU mismatch)'],
      ['show ip eigrp topology', 'Successors and feasible successors'],
      ['show ip bgp summary', 'Peer state (Idle/Active = session problem)'],
      ['ping', 'Reachability test'],
      ['traceroute', 'Per-hop path; finds loops and black holes'],
    ],
  },
};
