# Static & Default Routing: Pins, Backups and Gotchas — Avatar Tutor Script

**Lesson ID:** rt-static
**Track:** Routing Protocols
**Estimated runtime:** ~5 minutes (~648 words)

## Spoken script

**[HOOK — 0:00]**
Static routes are paths you configure by hand. No protocol overhead, completely
predictable, impossible for a neighbour to manipulate — and utterly unable to
adapt when the topology changes. Know exactly when that trade is worth it.

**[WHY IT MATTERS — ~0:15]**
This lesson covers static and default routes, recursive versus
directly-attached statics, floating statics for backup, and the security
implications of getting a default route wrong. Even in networks that run
dynamic protocols everywhere, statics handle the edges — the stub sites, the
default gateways, the backups.

**[SECTION — Static and default routes — ~0:45]**
A static route pins a destination to a next hop or an exit interface. You type
it, the router obeys it, and nothing changes it until you do. That is the
whole appeal: no chatter, no surprises.

The most important static of all is the default route: 0.0.0.0/0 — or ::/0 for
IPv6. It is the gateway of last resort: it matches anything no more-specific
route covers, which is how stub sites reach the internet. Think of it as the
"everything else goes out this door" rule.

Two flavours of static. A recursive static names only a next-hop IP, so the
router must resolve that IP to an interface — a second lookup. A
directly-attached static names the exit interface itself and avoids the second
lookup. Same destination, one less step. On a busy router, those steps add up.

**[SECTION — Floating static routes — ~2:15]**
Here is the clever trick. A floating static is a backup with a deliberately
higher administrative distance than the preferred route. While the primary —
lower AD — path is up, the floating route stays out of the table, invisible.
When the primary disappears, the backup installs automatically. No protocol
needed, no human paged.

The lesson warns about a common mix-up, so hear it clearly: you raise the
floating static's AD above the dynamic protocol so it only wins when the
dynamic route is gone. A backup that is more trusted than the primary is not a
backup — it is a hijack of your own traffic.

**[SECTION — Security implications — ~3:15]**
Now the gotchas, because statics are sharp tools. A single wrong default route
can blackhole or misdirect every unmatched packet in the network. Every packet
with nowhere better to go follows it — so verify with show ip route after any
change. The lesson is blunt about this, and production will be blunter.

The security upside: statics cannot be spoofed by a rogue neighbour. There is
no protocol to lie to, no adjacency to hijack. That makes them attractive on
small, trusted, single-path links. But on anything larger, their lack of
self-healing is a liability. A dynamic protocol reroutes around a dead link;
a static route points at it forever, patiently, wrongly.

**[COMMON MISTAKES — ~4:25]**
Three traps. One: configuring a floating static with a lower AD than the
primary — it will win immediately and your "backup" becomes the path. Raise
the AD, not lower it. Two: forgetting that a default route matches everything
unmatched — one typo redirects the entire internet-bound flow. Three: reaching
for statics in a large or changing topology. Predictable is a virtue on a stub
link and a vice in a mesh.

**[RECAP — ~4:50]**
A static route pins a destination to a next hop or exit interface — predictable,
no overhead, no self-healing. The default route, 0.0.0.0/0 or ::/0, is the
gateway of last resort. Recursive statics name a next-hop IP and need a second
lookup; directly-attached statics name the exit interface and skip it. A
floating static is a backup with a higher AD that installs only when the
primary fails. Verify with show ip route — a wrong default blackholes
everything unmatched. And remember: statics cannot be spoofed, which is why
they suit small trusted links and fail large changing ones.

## On-screen visuals

- HOOK: a hand-typed route pinning traffic to a path, beside a dynamic protocol
  rerouting around a failure.
- Static and default routes SECTION: the static-versus-recursive-versus-directly-
  attached comparison, and the 0.0.0.0/0 gateway-of-last-resort flow.
- Floating static routes SECTION: the AD ladder — primary at low AD installed,
  floating static at high AD waiting — then the failover swap.
- Security implications SECTION: the wrong-default-route blackhole animation
  and the show ip route verification step.
- COMMON MISTAKES: the raised-versus-lowered AD trap and the default-route
  blast-radius callout.
- RECAP: the cheat-sheet rows as a clean summary card.
