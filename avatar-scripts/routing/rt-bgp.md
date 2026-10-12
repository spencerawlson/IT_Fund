# BGP: Path-Vector Routing and the Internet — Avatar Tutor Script

**Lesson ID:** rt-bgp
**Track:** Routing Protocols
**Estimated runtime:** ~5 minutes (~738 words)

## Spoken script

**[HOOK — 0:00]**
BGP is the routing protocol of the internet. It does not measure links, it does
not count hops — it exchanges paths between autonomous systems and chooses by
policy. If an organisation multihomes to several providers, BGP is how it does
it.

**[WHY IT MATTERS — ~0:15]**
This lesson covers autonomous systems and ASNs, eBGP versus iBGP, the BGP
message types, the key path attributes, the best-path selection order, and the
scaling and safety tools — route reflectors and prefix filtering.

**[SECTION — Autonomous systems and sessions — ~0:50]**
An autonomous system is a network under one routing policy, identified by an
ASN. BGP peers — neighbours — are configured explicitly; there is no
auto-discovery here. And they talk over TCP 179. Reliable transport is the
point: BGP does not flood like an IGP, it maintains sessions and exchanges
updates over a protocol that retransmits.

Two flavours. eBGP runs between different autonomous systems, with AD 20.
iBGP runs within one AS, with AD 200. And iBGP has a famous rule: it does not
re-advertise routes learned from one iBGP peer to another iBGP peer. Why?
Loop prevention inside the AS. The cost is the full mesh — or route
reflectors, which we will reach shortly.

Peers speak four message types. OPEN sets up the session. UPDATE advertises or
withdraws NLRI — the reachable prefixes — with their attributes. KEEPALIVE
keeps the session up. NOTIFICATION reports an error and tears the session down.
Four messages, and one of them is mostly "I am still here."

**[SECTION — Attributes and best-path selection — ~2:20]**
BGP does not use a single metric. It walks an ordered list of attributes, and
on Cisco the order starts like this: highest Weight first — local to the
router, never advertised. Then highest Local Preference — AS-wide outbound
policy. Then locally-originated routes. Then shortest AS_PATH. Then lowest
Origin. Then lowest MED. Then eBGP over iBGP. And so on down the list. The exam
tests the order, so walk it until it is automatic.

Three attributes deserve their own intuition. AS_PATH lists the autonomous
systems a route crossed. It does two jobs: loop prevention — reject any route
containing your own ASN — and shortest-path preference. LOCAL_PREF steers
traffic leaving your AS: set it high on the exit you prefer, and the whole AS
follows. MED does the reverse: it hints to a neighbour which entry point into
your AS to prefer — and lower wins. Think of LOCAL_PREF as your outbound
steering wheel and MED as a suggestion you hand to your neighbour. Communities
tag routes so peers apply agreed policy — labels that trigger pre-arranged
behaviour.

**[SECTION — Scaling and safety — ~3:50]**
The iBGP full-mesh rule would demand n times n minus one over two sessions —
unworkable at scale. Route reflectors remove the requirement by re-advertising
iBGP routes to clients: the reflector becomes the hub, and the mesh collapses
into spokes.

And safety, because BGP will believe what a peer announces. Filtering is
essential: prefix lists that permit only expected prefixes, AS_PATH filters,
max-prefix limits that tear down a session spewing too many routes, and RPKI
origin validation — cryptographic proof that an AS is authorised to originate
a prefix — so invalid announcements are dropped. These protect you, and the
wider internet, from leaks and hijacks. The routing security lesson takes the
attack side further.

**[COMMON MISTAKES — ~4:55]**
Three traps. One: Weight is highest-wins and local-only; Local Preference is
highest-wins and AS-wide. Do not swap their scope. Two: MED is lowest-wins —
it is the odd one out among "highest wins" attributes. Three: eBGP is AD 20,
iBGP is AD 200. The internal one is less trusted — because iBGP routes have
travelled further from their origin.

**[RECAP — ~5:20]**
An AS is one routing policy under one ASN; peers are explicit over TCP 179.
eBGP runs between ASes at AD 20; iBGP runs inside at AD 200 and needs a full
mesh or route reflectors. Messages: OPEN, UPDATE, KEEPALIVE, NOTIFICATION.
Best path walks the attributes: Weight, Local Preference, locally originated,
shortest AS_PATH, lowest Origin, lowest MED, eBGP over iBGP. AS_PATH prevents
loops and prefers short paths; LOCAL_PREF steers your outbound traffic; MED —
lower wins — hints your neighbour's inbound choice; communities tag policy.
Scale with route reflectors; stay safe with prefix lists, AS_PATH filters,
max-prefix limits and RPKI. Policy, not cost — that is BGP.

## On-screen visuals

- HOOK: autonomous systems exchanging AS paths across the internet.
- Autonomous systems and sessions SECTION: the eBGP/iBGP boundary diagram with
  AD 20/200, the TCP 179 session, and the four message types.
- Attributes and best-path selection SECTION: the ordered best-path ladder —
  Weight down through eBGP-over-iBGP — with the AS_PATH, LOCAL_PREF and MED
  callouts.
- Scaling and safety SECTION: the full-mesh n(n-1)/2 collapsing into route-
  reflector spokes, and the filtering stack — prefix lists, AS_PATH filters,
  max-prefix, RPKI.
- COMMON MISTAKES: the Weight/LOCAL_PREF scope split and the MED lowest-wins
  callout.
- RECAP: the cheat-sheet rows as a clean summary card.
