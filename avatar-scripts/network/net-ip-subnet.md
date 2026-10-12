# IPv4, IPv6 & Subnetting: CIDR, Host Counts and NAT — Avatar Tutor Script

**Lesson ID:** net-ip-subnet
**Track:** Network+
**Estimated runtime:** ~6 minutes (~783 words)

## Spoken script

**[HOOK — 0:00]**
Subnetting looks intimidating until you see it is just counting in powers of
two. Then it becomes one of the fastest points to win on any networking exam.
Let me show you.

**[WHY IT MATTERS — ~0:15]**
Subnetting is the maths behind every IP plan, every firewall rule and every
routing table. This lesson covers CIDR prefixes and masks, counting hosts,
finding network and broadcast addresses, private and special ranges, NAT, and
the IPv6 basics every administrator needs.

**[SECTION — CIDR, masks and host counts — ~0:45]**
An IPv4 address is 32 bits. The CIDR prefix says how many leading bits are the
network part: in a /24 the first 24 bits are network, and the remaining 8 are
host. The subnet mask writes the same thing in dotted decimal. /24 is
255.255.255.0. And /27? That is 255.255.255.224 — because the last octet is
11100000 in binary. The prefix and the mask are the same idea in two costumes.

Now the money question: how many usable hosts? Take two to the power of the
host bits, minus two. Why minus two? The first address is the network address
and the last is the broadcast — neither can be assigned to a host. So a /24
has 8 host bits: 256 minus 2 equals 254. A /26 has 6: 64 minus 2 equals 62. A
/30 has 2: 4 minus 2 equals 2 — the classic size for point-to-point links. The
lesson even notes that RFC 3021 allows /31 on point-to-point links, squeezing
out both addresses. But for the exam: two to the host bits, minus two.

**[SECTION — Network and broadcast addresses: the block-size method — ~2:10]**
Finding the network and broadcast addresses is a recipe. First, the block size:
256 minus the interesting octet of the mask. For /26 the mask ends in 192, so
blocks are 64 addresses long: .0, .64, .128, .192.

Now place an address. Take 192.168.10.64/26. It falls in the .64 to .127
block. So the network address is 192.168.10.64, the broadcast is 192.168.10.127,
and the hosts run from .65 to .126. Four steps, every time: host bits, block
size, find the block, then network, first, last and broadcast. Practise it until
it is boring — then it is fast.

**[SECTION — Private, special and translated addresses — ~3:20]**
Three ranges are reserved by RFC 1918 for private use and are not routed on the
internet: 10.0.0.0/8, 172.16.0.0/12 — that is 172.16.0.0 through 172.31.255.255
— and 192.168.0.0/16. These are the addresses your LAN lives on.

Two special ones to know. 127.0.0.1 is the IPv4 loopback — your own machine.
And if a host shows 169.254.x.x, it has given itself an APIPA address because
DHCP failed. That address is a symptom, not a diagnosis: check the DHCP server,
scope exhaustion, cabling or the VLAN.

At the network edge, NAT translates private addresses to a public one. PAT —
port address translation — lets many hosts share a single public IP by tracking
source ports, which is how your whole office hides behind one address. But do
not mistake hiding for security: NAT hides addresses; it is not a security
control on its own.

**[SECTION — IPv6 essentials — ~4:25]**
IPv6 is not optional trivia — know the basics. Addresses are 128 bits, written
as eight groups of four hex digits. Two shortening rules: leading zeros in a
group can be dropped, and one run of all-zero groups can be replaced with a
double colon. The loopback is ::1.

Every IPv6 interface automatically has a link-local address in fe80::/10, which
is never routed — think of it as the interface's private whisper to its own
segment. And hosts can configure themselves: SLAAC lets a host build its own
global address from router advertisements, while DHCPv6 is the stateful
alternative.

**[COMMON MISTAKES — ~5:15]**
Three traps. One: forgetting the minus two in the host count — the network and
broadcast addresses are not hosts. Two: 169.254.x.x does not mean "no cable";
it means DHCP failed, and cabling is only one of the possible causes. Three:
172.16.0.0/12 runs to 172.31, not 172.16 through 172.255 — the /12 boundary is
the trap.

**[RECAP — ~5:35]**
Usable hosts equal two to the host bits minus two: 254 in a /24, 62 in a /26,
2 in a /30. The block size is 256 minus the interesting mask octet. Private
ranges: 10/8, 172.16/12, 192.168/16. Loopback is 127.0.0.1, and 169.254.x.x
means DHCP failed. NAT translates at the edge; PAT shares one public IP across
many hosts by tracking ports. IPv6: 128 bits, eight hex groups, ::1 loopback,
fe80::/10 link-local, SLAAC for self-configuration. Four steps, powers of two —
that is the whole trick.

## On-screen visuals

- HOOK: 2-to-the-power-of-n bars growing — 2, 4, 64, 256 — with minus two
  applied.
- CIDR, masks and host counts SECTION: a 32-bit bar splitting into network and
  host bits for /24, /26, /27 and /30, with the mask's last octet in binary.
- Network and broadcast addresses SECTION: the worked 192.168.10.64/26 example —
  block grid .0/.64/.128/.192, network, first, last and broadcast highlighted.
- Private, special and translated addresses SECTION: the three RFC 1918 ranges,
  the APIPA symptom-to-cause chain, and the NAT/PAT edge diagram.
- IPv6 essentials SECTION: a 128-bit address with the shortening rules applied,
  the ::1 loopback, and the fe80::/10 link-local note.
- COMMON MISTAKES: the /12 boundary and minus-two reminders.
- RECAP: the cheat-sheet rows as a clean summary card.
