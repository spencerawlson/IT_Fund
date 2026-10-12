# Network Security & Attacks: Layer 2 Defences and Segmentation — Avatar Tutor Script

**Lesson ID:** net-security
**Track:** Network+
**Estimated runtime:** ~6 minutes (~798 words)

## Spoken script

**[HOOK — 0:00]**
Attackers who get onto a network — even as a guest — often start at Layer 2,
where many switches trust by default. Good network security removes that trust,
segments what remains, and only allows the traffic that is needed.

**[WHY IT MATTERS — ~0:15]**
Layer 2 is where the easy wins live for attackers, which makes it where the
easy wins live for defenders too. This lesson covers the classic Layer 2
attacks and their switch defences, VLAN hopping, evil twins, segmentation with
a screened subnet, ACLs and least privilege, VPNs, DDoS and network access
control.

**[SECTION — Layer 2 attacks and defences — ~0:45]**
Three attacks, three defences — learn them as pairs. ARP spoofing sends forged
ARP replies so the attacker's MAC is associated with, say, the gateway's IP:
everyone's traffic flows to the attacker, a classic man in the middle. The
defence is Dynamic ARP Inspection — DAI — which blocks forged messages by
checking ARP traffic against known bindings.

A rogue DHCP server hands out a malicious gateway or DNS server, becoming the
man in the middle for every client it answers. DHCP snooping stops it by
marking which ports may send offers — trusted uplinks only — and builds the
binding table that DAI uses.

MAC flooding fills the CAM table with fake addresses until it overflows, and
the switch falls back to flooding frames out every port — like a hub, which is
what the attacker wanted. Port security stops it by limiting MAC addresses per
port.

**[SECTION — VLAN hopping and wireless attacks — ~2:10]**
VLAN hopping reaches another VLAN two ways: switch spoofing, where the attacker
negotiates a trunk with DTP, or double tagging, which abuses the native VLAN.
The defence is a checklist: disable DTP, hard-code access ports, and set the
native VLAN to an unused VLAN on both ends of every trunk. No negotiation, no
native-VLAN tricks.

On wireless, the evil twin is a rogue access point impersonating a legitimate
SSID — your laptop joins the attacker's network thinking it is yours. The
defeat is WPA3-Enterprise with certificate validation on clients: the fake
access point cannot prove its identity, so the client refuses it.

And the simplest hardening of all: disable unused switch ports, and assign them
to an unused "black hole" VLAN. Nobody should be able to simply plug in.

**[SECTION — Segmentation and filtering — ~3:20]**
Segmentation limits how far a breach travels. The screened subnet — the DMZ —
holds public-facing services, isolated from the internal LAN, with firewalls
between the internet, the DMZ and the inside. A compromised web server should
not be one hop from the customer database.

Filtering is the access control list: permits or denies traffic by address,
port and protocol, evaluated top-down with first match winning, and ending in
an implicit deny — so order matters enormously. Apply least privilege: default
deny, then explicitly allow only what is required.

**[SECTION — Remote access, DDoS and NAC — ~4:20]**
Two kinds of VPN. A site-to-site VPN connects whole networks, commonly with
IPsec. A client-to-site VPN connects individual remote users, over TLS or
IPsec. Networks versus users — that is the distinction.

A DDoS attack overwhelms a target with traffic from many sources. Here is the
hard truth: mitigate it upstream with scrubbing services and CDNs, plus rate
limiting. A link that is already full cannot be defended at its far end — you
have to stop the flood before it reaches you.

And Network Access Control: NAC checks a device's identity and posture —
patched, encrypted, running EDR — before granting access. Non-compliant devices
land in a quarantine VLAN until they clean up. Trust, but verify, automatically.

**[COMMON MISTAKES — ~5:10]**
Three traps. One: DHCP snooping builds the binding table that DAI uses — do not
describe DAI as the one stopping rogue DHCP servers. Two: in an ACL, first
match wins and the implicit deny is at the end — a permit buried below a deny
never fires. Three: an evil twin impersonates the network, not the password — so a
stronger passphrase does not stop it. Only WPA3-Enterprise with certificate
validation on the client defeats it, because the fake access point cannot prove
its identity.

**[RECAP — ~5:30]**
ARP spoofing is stopped by DAI; rogue DHCP by DHCP snooping; MAC flooding by
port security. Kill VLAN hopping by disabling DTP and parking the native VLAN
on an unused VLAN; kill evil twins with WPA3-Enterprise and certificate
validation; shut unused ports into a black-hole VLAN. Segment with a screened
subnet, filter with top-down ACLs ending in implicit deny, default-deny the
rest. Site-to-site VPNs join networks, client-to-site joins users. Fight DDoS
upstream; let NAC quarantine the unhealthy. Remove the default trust — that is
the whole lesson.

## On-screen visuals

- HOOK: an attacker plugged into a switch port at Layer 2, with the trust
  boundary highlighted.
- Layer 2 attacks and defences SECTION: three attack-defence pairs — ARP
  spoofing with DAI checking bindings, rogue DHCP blocked by snooping's trusted
  ports, CAM overflow versus port security.
- VLAN hopping and wireless attacks SECTION: the DTP and double-tagging paths
  with the hardening checklist, the evil twin beside the certificate-validation
  flow, and unused ports shut into the black-hole VLAN.
- Segmentation and filtering SECTION: the screened-subnet diagram — internet,
  DMZ, inside — with firewalls between, and an ACL evaluated top-down to the
  implicit deny.
- Remote access, DDoS and NAC SECTION: site-to-site versus client-to-site VPN
  diagram, the upstream DDoS scrubbing flow, and the NAC quarantine-VLAN path.
- COMMON MISTAKES: the snooping-versus-DAI pairing and ACL ordering callouts.
- RECAP: the cheat-sheet rows as a clean summary card.
