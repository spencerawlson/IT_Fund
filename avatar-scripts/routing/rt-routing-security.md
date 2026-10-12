# Routing Security: Hijacks, Leaks and Defences — Avatar Tutor Script

**Lesson ID:** rt-routing-security
**Track:** Routing Protocols
**Estimated runtime:** ~5 minutes (~631 words)

## Spoken script

**[HOOK — 0:00]**
Routing protocols were designed for trusted environments, so their default
posture is dangerously open. An attacker who can peer, inject or impersonate
can blackhole, reroute or intercept traffic across a whole network — and the
internet has seen this repeatedly.

**[WHY IT MATTERS — ~0:15]**
This lesson connects routing to the Road to CISSP security curriculum: the
threats — rogue routers, route injection, prefix hijacking, route leaks — and
the defences — authentication, passive interfaces, prefix filtering, RPKI,
control-plane protection and monitoring.

**[SECTION — The threats — ~0:50]**
Four threats, escalating in blast radius. A rogue router that forms an
adjacency can inject false routes — blackholing traffic into nothing, or
capturing it for inspection. Your routers believed a stranger.

In BGP, prefix hijacking is announcing address space you do not own. The
classic case is the 2008 YouTube incident, when Pakistan's attempt to block
YouTube domestically leaked a hijacked prefix globally and took the site down
worldwide. One bad announcement, global consequences — because BGP believes
what peers announce.

A route leak is subtler: advertising routes against policy, pulling transit
traffic through a network that should not carry it. Not theft, exactly —
misdirection at scale. And closer to home, OSPF and RIP can be attacked by
injecting crafted LSAs and updates when adjacencies are unauthenticated. No
authentication, no questions asked.

**[SECTION — The defences — ~2:20]**
Defence starts with identity. Authenticate every adjacency cryptographically:
HMAC-SHA keychains for OSPF, EIGRP and IS-IS; TCP-AO or MD5 for BGP. An
unauthorised or spoofed peer simply cannot join the conversation.

Then shrink the attack surface. Make host-facing interfaces passive, so a
device on an access port can never peer — no adjacency, no injection. On BGP
edges, filter prefixes in and out: prefix-lists that permit only what you
expect, AS_PATH filters, max-prefix limits. And validate origins with RPKI:
Route Origin Authorisation lets routers check cryptographically that an AS is
authorised to originate a prefix, so invalid announcements are dropped before
they spread.

Finally, protect the router itself. Control-plane policing — CoPP —
rate-limits traffic hitting the routing process, blunting control-plane denial
of service. The router's brain gets a bodyguard.

**[SECTION — Detection and the SIEM — ~3:50]**
Prevention is never perfect, so monitor. Log routing changes and feed them to
a SIEM. Alert on unexpected neighbours, prefix origin changes, sudden table
churn, and authentication failures. Each of those is the control plane telling
you something changed — and "what changed" is always the first question.

BGP monitoring services and route-origin feeds catch hijacks that your own
routers cannot see — the view from outside your network. This is the same
detect-and-investigate discipline as the platform's log-triage and SIEM labs,
applied to the control plane. The tools differ; the mindset is identical:
collect, correlate, investigate.

**[COMMON MISTAKES — ~4:50]**
Three traps. One: authenticating the IGP but leaving BGP on MD5-less sessions
— or the reverse. Every adjacency, every protocol, gets authentication. Two:
forgetting passive interfaces on host ports — authentication means nothing if
a rogue can peer from a wall jack. Three: treating RPKI as optional garnish.
Origin validation is the only defence that checks whether the announcer owns
what it announces.

**[RECAP — ~5:15]**
Rogue routers inject false routes; prefix hijacks announce space they do not
own — remember 2008; route leaks misdirect transit against policy; and
unauthenticated IGP adjacencies invite crafted LSAs. Defend with cryptographic
adjacency authentication — HMAC-SHA keychains for the IGPs, TCP-AO or MD5 for
BGP — passive host-facing interfaces, prefix filtering with prefix-lists,
AS_PATH filters and max-prefix limits, RPKI origin validation, and CoPP
guarding the control plane. Detect with logged routing changes in the SIEM:
unexpected neighbours, origin changes, table churn, auth failures — plus
outside-in BGP monitoring. Trust nothing by default, verify everything,
watch always.

## On-screen visuals

- HOOK: a rogue router peering and traffic diverting into a blackhole.
- The threats SECTION: the four-threat escalation — rogue adjacency, the 2008
  prefix hijack, the route leak pulling transit, crafted LSA injection.
- The defences SECTION: the defence stack — HMAC-SHA keychains, passive
  interfaces, prefix-list/AS_PATH/max-prefix filters, RPKI ROA validation, and
  CoPP rate-limiting the control plane.
- Detection and the SIEM SECTION: routing-change logs feeding a SIEM dashboard
  with the four alert types, plus the outside-in BGP monitoring view.
- COMMON MISTAKES: the every-adjacency and passive-port callouts.
- RECAP: the cheat-sheet rows as a clean summary card.
