# Network Services & Wireless: DNS, DHCP and Wi-Fi — Avatar Tutor Script

**Lesson ID:** net-services-wireless
**Track:** Network+
**Estimated runtime:** ~6 minutes (~793 words)

## Spoken script

**[HOOK — 0:00]**
Users never see DNS or DHCP until they break — and then nothing works. These
invisible services decide whether people can get on the network and find
anything once they are there.

**[WHY IT MATTERS — ~0:15]**
This lesson covers DNS record types, how DHCP hands out addresses and relays
across subnets, Wi-Fi standards and channels, and securing wireless with WPA3
and 802.1X. Wireless is now the default way most devices connect, so the
standards and the security both earn exam questions and real-world relevance.

**[SECTION — DNS records — ~0:45]**
DNS translates names into addresses, but "translates" covers several jobs —
forward lookups, aliases, mail routing, reverse lookups and policy text. Each
job has its own record type, and the exam expects you to match them without
hesitation.

A maps a hostname to its IPv4 address — the workhorse record. AAAA maps to
IPv6; four As because IPv6 is 128 bits, four times IPv4's 32. CNAME makes one
name an alias of another — but it can never sit at the zone apex, the domain
itself. MX names the mail servers for a domain; each carries a preference
value, lower is preferred, and mail falls through the list. PTR is reverse
lookup — IP back to name — living in in-addr.arpa and ip6.arpa, and mail
servers check it to fight spam. TXT holds free-form text: SPF, DKIM and DMARC
policies all live here, as do domain-verification strings.

**[SECTION — DHCP — ~2:00]**
A client gets its address through four messages, remembered as DORA: Discover,
Offer, Request, Acknowledge. Discover and Request are broadcasts — the client
has no address yet, so it cannot do anything else.

The wrinkle: routers do not forward broadcasts. So a central DHCP server
serving many subnets needs a DHCP relay — an IP helper on Cisco — on each
subnet's router interface, forwarding broadcasts to the server as unicast. One
server, many subnets.

**[SECTION — Wi-Fi standards and channels — ~2:40]**
The 802.11 amendments arrived one era at a time, and the Wi-Fi Alliance
numbered them retroactively — which is what the exam uses. Learn the pairs.

802.11a was the first 5 GHz standard, 1999, OFDM at 54 Mbps — but early 5 GHz
radios were expensive, so 802.11b won the market: the original mainstream
Wi-Fi, 2.4 GHz at 11 Mbps, sharing the band with microwaves and Bluetooth.
802.11g brought 54 Mbps to 2.4 GHz in 2003 — but one b client drags a mixed
network down to b rates.

Then the numbered era. 802.11n, Wi-Fi 4, was the first MIMO standard in 2009:
multiple antennas, 40 MHz bonding, dual band, about 600 Mbps. 802.11ac, Wi-Fi
5, went 5 GHz only in 2013 — the exam loves that — with 80 and 160 MHz
channels, beamforming and downlink MU-MIMO, about 6.9 Gbps. 802.11ax, Wi-Fi 6,
traded speed for efficiency in 2019: OFDMA carpools clients into one
transmission, plus uplink MU-MIMO and target wake time for IoT batteries. Wi-Fi
6E extends it into the clean 6 GHz band. 802.11be, Wi-Fi 7, uses multi-link
operation — 2.4, 5 and 6 GHz simultaneously — pushing near 46 Gbps.

Two practical notes: in 2.4 GHz, only channels 1, 6 and 11 do not overlap in
the US — plan access points on those three. And the SSID is just the network's
name; hiding it is not a security control, since the name still appears in
client probes.

**[SECTION — Securing wireless — ~4:25]**
Use WPA3 today. WPA3-Personal replaces the pre-shared-key handshake with SAE,
which resists offline password guessing; WPA3-Enterprise authenticates each
user with 802.1X. WEP and original WPA are broken — the wrong answer in any
question.

802.1X is port-based network access control, on wired switch ports as well as
Wi-Fi. Three roles: the supplicant is the client, the authenticator is the
switch or access point, and the authentication server — usually RADIUS —
decides. No traffic passes until the server approves the client.

**[COMMON MISTAKES — ~5:00]**
Three traps. One: 802.11ac is 5 GHz only — an ac network on 2.4 GHz is a lie.
Two: a hidden SSID is not a security control. Three: WPA3-Personal uses SAE;
802.1X belongs to the Enterprise side. Do not cross the streams.

**[RECAP — ~5:20]**
A to IPv4, AAAA to IPv6, CNAME aliases names, MX routes mail with lower
preference winning, PTR reverses IPs to names, TXT carries SPF, DKIM and
DMARC. DHCP is DORA, with a relay or IP helper crossing subnets. Wi-Fi 4
through 7 are n, ac, ax and be; ac is 5 GHz only; 1, 6 and 11 are the
non-overlapping 2.4 GHz channels. Secure it with WPA3 — SAE for Personal,
802.1X with RADIUS for Enterprise — and treat a hidden SSID as decoration, not
defence.

## On-screen visuals

- HOOK: a user device failing to load a page, with DNS and DHCP marked as the
  invisible services behind it.
- DNS records SECTION: the DNS record-type stack — A, AAAA, CNAME, MX, PTR,
  TXT — each with its job and the "four As" and lower-preference callouts.
- DHCP SECTION: the four-step DORA exchange animation, then the relay/IP helper
  bridging broadcasts across subnets.
- Wi-Fi standards and channels SECTION: the Wi-Fi standards stack from 802.11a
  to be with band, speed and Wi-Fi number, plus the 1-6-11 channel plan.
- Securing wireless SECTION: the 802.1X three-role diagram — supplicant,
  authenticator, RADIUS server — and the WPA3 versus WEP comparison.
- COMMON MISTAKES: the ac-on-5GHz-only and hidden-SSID callouts.
- RECAP: the cheat-sheet rows as a clean summary card.
