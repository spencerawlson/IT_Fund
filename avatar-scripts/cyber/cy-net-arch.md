# Network Architecture & Segmentation: Zones, Bastions and Deception — Avatar Tutor Script

**Lesson ID:** cy-net-arch
**Track:** Cybersecurity Operations
**Estimated runtime:** ~5 minutes (~652 words)

## Spoken script

**[HOOK — 0:00]**
Network architecture is where security policy becomes geography. What sits in
the DMZ, which VLANs can reach each other, where the single guarded entry
point is — get the topology right, and most attacks simply run out of road.
Get it wrong, and no firewall rule can save you.

**[WHY IT MATTERS — 0:25]**
This lesson covers DMZs, segmentation with VLANs and microsegmentation,
bastion hosts, deception with honeypots and honeytokens, air gaps and data
diodes, and the firewall and IDS/IPS concepts that enforce it all. Topology
is strategy made physical.

**[SECTION — Zones and segmentation — 0:50]**
A DMZ — a screened subnet — is a buffer network between the internet and the
internal LAN, firewalled on both sides. Web servers, mail relays, and VPN
concentrators belong there. Databases never do. Here is the logic: if a DMZ
host falls, the data stays inside. The DMZ is a crumple zone — it is allowed
to be hit, because what matters most is not parked there.

Segmentation limits lateral movement and blast radius. The test question
writes itself: a compromised laptop should never reach operational
technology. VLANs separate at Layer 2 — watch for double-tagging VLAN
hopping — while subnets separate at Layer 3. Microsegmentation pushes policy
down to individual workloads, so every flow needs its own explicit rule.

Then the single guarded door: a jump host — a bastion host — is the hardened
entry point for administration. MFA it, log everything, and never RDP to
servers directly from user VLANs. If admins scatter across a hundred paths,
you cannot guard any of them; give them one door and guard it properly.

**[SECTION — Deception, isolation, and enforcement — 2:15]**
Deception turns the attacker's curiosity into your alarm. Honeypots are decoy
systems that alert the instant they are touched — and no legitimate user ever
would, so the signal is nearly pure. Honeynets scale the idea to whole fake
networks. Honeytokens are fake credentials or files — a bogus AWS key
sitting in code — that trip an immediate alert the moment they are used. The
attacker does your detection work for you.

For isolation, air gaps separate physically: no network path at all. Strong
— but USBs and insiders bridge gaps, so do not treat an air gap as magic.
Data diodes enforce one-way flow in hardware: telemetry flows out,
nothing flows back in. Physics as a firewall.

Now enforcement. Stateful firewalls track connections rather than judging
packets alone, and zone policies default-deny between trust zones. A WAF
filters HTTP-layer attacks in front of web apps. An IDS only alerts, while
an IPS blocks inline — and here is the operational wisdom: tune in IDS mode
first, because an IPS with false positives causes outages. Alert before you
block. Finally, reverse proxies terminate client connections so origin
servers stay hidden — the internet talks to the proxy; the real servers stay
invisible.

**[COMMON MISTAKES — 4:10]**
Three traps. One: putting the database in the DMZ. Web servers face the
internet from the DMZ; databases stay inside — the DMZ is a crumple zone,
not a vault. Two: deploying an IPS in blocking mode on day one. Tune in IDS
mode first, or false positives will cause the outages you were trying to
prevent. Three: confusing VLANs with subnets. VLANs separate at Layer 2,
subnets at Layer 3 — and double-tagging is the VLAN-hopping trick to
remember.

**[RECAP — 4:35]**
The DMZ is a buffer, firewalled on both sides: public services in, databases
never. Segment to limit lateral movement — VLANs at Layer 2, subnets at
Layer 3, microsegmentation down to the workload. Administer through one
hardened bastion host, never RDP from user VLANs. Deceive with honeypots,
honeynets, and honeytoken tripwires — any touch is an alert. Isolate with
air gaps, enforce one-way flow with data diodes. Stateful firewalls track
connections, WAFs filter web attacks, IDS alerts while IPS blocks — tune as
IDS first — and reverse proxies keep origin servers hidden.

## On-screen visuals

- HOOK: a network map with the attack path hitting zone walls and stopping —
  "running out of road."
- Zones: DMZ buffer between internet and LAN, firewalled both sides, with
  the database safely inside; VLAN vs subnet Layer 2/Layer 3 split;
  microsegmentation per-workload policy grid; bastion host as the single
  guarded admin door.
- Deception/isolation: honeypot tripwire alerting on first touch; honeytoken
  AWS key in code triggering an alarm; air gap with USB/insider bridge
  warning; data diode one-way hardware flow.
- Enforcement: stateful firewall connection table; WAF in front of a web
  app; IDS-vs-IPS alert-then-block tuning flow; reverse proxy hiding origin
  servers.
- RECAP: the cheat-sheet table as a summary card.
