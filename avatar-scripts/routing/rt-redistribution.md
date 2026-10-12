# Route Redistribution: Metrics, Loops and Filters — Avatar Tutor Script

**Lesson ID:** rt-redistribution
**Track:** Routing Protocols
**Estimated runtime:** ~4 minutes (~609 words)

## Spoken script

**[HOOK — 0:00]**
Redistribution injects routes learned by one routing protocol into another —
advertising OSPF routes into EIGRP so two domains can reach each other. It is
powerful, often necessary during migrations — and one of the easiest ways to
create routing loops.

**[WHY IT MATTERS — ~0:15]**
Networks are rarely one protocol end to end. This lesson covers seed metrics,
route tagging and filtering, administrative-distance tuning, OSPF external
route types, and the discipline that keeps mutual redistribution safe.

**[SECTION — Why metrics do not translate — ~0:50]**
Each protocol measures paths differently. OSPF cost means nothing to EIGRP,
whose composite metric means nothing to RIP. They are different currencies with
no exchange rate. So when you redistribute, you must supply a seed — a default
metric — for the injected routes, giving them a sensible starting value in the
receiving protocol. No seed, no usable route.

When redistributing into OSPF, the injected routes become external. By default
they are External Type 2 — E2 — carrying only the seed cost, unchanged, all the
way through the OSPF domain. E1 is the alternative: it adds the internal OSPF
cost along the way, so the total reflects the real path. E2 says "it costs
this much to get here from outside"; E1 says "plus whatever it costs to cross
our network too."

**[SECTION — The loop problem and how to break it — ~2:10]**
Now the danger. With two-way redistribution between two protocols, a route can
leave domain A, enter domain B, and be redistributed straight back into A — now
looking like an external route. The result: loops and suboptimal paths, as the
two domains argue over a route that keeps changing costume.

The fixes are tags and filters. Tag routes as they leave a domain, and deny
tagged routes from re-entering it — a route carrying your tag coming back in is
caught at the door. The lesson's Cisco example shows the pattern in action: a
route-map whose first entry denies anything carrying tag 110 — the tag stamped
on the way out — while a later entry permits the rest and stamps them with tag
100 for the return trip. And raise the administrative distance of redistributed
routes, so native routes stay preferred over redistributed copies. A route the
domain learned itself should always beat a photocopy from next door.

Prefer a single, well-controlled redistribution point where possible. Every
extra boundary multiplies the risk: one door is guardable, five doors are a
sieve.

**[SECTION — Verify, always — ~3:30]**
After configuring redistribution, read show ip route on both domains and run
traceroute to confirm paths are correct and loop-free. Do not trust the
configuration — trust the table. The table is the truth; the configuration is
the intention.

And one specific caution: be careful with redistribute connected. Without a
route-map, it can leak management or transit subnets you never meant to
advertise — interfaces you forgot were even in the game. A route-map is the
difference between "advertise these" and "advertise everything."

**[COMMON MISTAKES — ~4:25]**
Three traps. One: redistributing without a seed metric — the routes arrive with
no usable value. Two: two-way redistribution with no tags or filters, which is
a loop waiting for a topology change. Three: redistribute connected without a
route-map, leaking subnets that were never meant to leave the router.

**[RECAP — ~4:50]**
Redistribution injects one protocol's routes into another; metrics do not cross
protocols, so every injection needs a seed metric. Into OSPF, externals are E2
by default — seed cost only — while E1 adds internal cost along the way. Loops
come from two-way redistribution; break them with route tags and filters that
deny re-entry, raised AD on redistributed routes so native routes win, and a
single redistribution point. Verify with show ip route on both domains plus
traceroute. And never redistribute connected without a route-map. Power tool,
sharp edges — handle with tags.

## On-screen visuals

- HOOK: OSPF routes flowing into the EIGRP domain, with a loop forming at the
  second boundary.
- Why metrics do not translate SECTION: the three protocol metrics as
  incompatible currencies, the seed metric being stamped on, and the E2/E1
  cost comparison.
- The loop problem and how to break it SECTION: the A-to-B-to-A loop animation,
  the tag-and-deny filter catching the returning route, and the raised-AD
  preference.
- Verify, always SECTION: the show ip route and traceroute verification pair,
  with the redistribute-connected leak warning.
- COMMON MISTAKES: the missing-seed and missing-route-map callouts.
- RECAP: the cheat-sheet rows as a clean summary card.
