// Detailed notes: concept id (or "term:<Term>") -> { body, example, tip }.
// Modules: DHCP & IP Addressing, Networking Basics, OSI & Core Protocols, Network Devices & Tools,
// Cloud Networking, Cloud DNS & CDN, Edge Networking & WAN, Advanced Cloud Networking.
const n = (body, example, tip) => ({ body, example, tip });

export default {
  // ---------- Shared terms (used by more than one module) ----------
  'term:NAT': n(
    "Network Address Translation rewrites IP addresses as packets cross a router, usually between a private internal network and the public internet. When an internal device at 192.168.1.20 sends traffic out, the router replaces the private source address with its own public address, records the mapping, and reverses the change on replies.\n\nNAT was introduced to stretch the limited IPv4 address space: an entire office can share a single public IP. Static NAT maps one private address to one public address (for example, to publish a server), while dynamic NAT and PAT share a pool. A side effect is that outside hosts cannot start connections to internal devices unless a port forward is configured, which hides internal addressing but is not a security control by itself.",
    "A home router gives every device a 192.168.x.x address and translates all of them to the single public IP the ISP assigned.",
    "NAT is not a firewall. It hides addresses, but you still need filtering rules. IPv6 generally removes the need for NAT."
  ),
  'term:Load Balancer': n(
    "A load balancer sits in front of a pool of servers and spreads incoming requests across them, so no single server is overwhelmed and the service survives individual server failures. It continuously health-checks each target and stops sending traffic to any that fail.\n\nLayer 4 load balancers route on IP address and TCP/UDP port, which is very fast and protocol-agnostic. Layer 7 load balancers understand HTTP, so they can route by URL path, host name, header, or cookie, terminate TLS, and add features such as sticky sessions and web application firewall rules. Common algorithms include round robin, least connections, and hashing on the client IP.",
    "An online shop runs six web servers behind a load balancer; during a sale, two more are added and start receiving traffic automatically, and one crashed server is silently removed from rotation.",
    "Health checks must test something meaningful (for example a /health endpoint that checks the database), not just that the port is open."
  ),
  'term:CDN': n(
    "A Content Delivery Network is a globally distributed set of edge servers (points of presence) that cache copies of your content close to users. When someone requests an image, script, video, or even a whole page, the nearest edge answers from its cache instead of sending the request across the world to your origin server.\n\nThis cuts latency, reduces load and bandwidth costs on the origin, and absorbs traffic spikes. Freshness is controlled with Cache-Control headers, TTLs, and explicit invalidation (purging). Modern CDNs such as CloudFront, Cloudflare, Akamai, and Fastly also terminate TLS, compress responses, filter bots, and absorb DDoS attacks at the edge.",
    "A news site's homepage images are served from a London edge to UK readers in 15 ms instead of 150 ms from the US origin, and a sudden traffic spike barely touches the origin servers.",
    "Never let a CDN cache personalised or authenticated responses under a shared cache key. That mistake has exposed other users' account pages."
  ),
  'term:Cloud DNS': n(
    "Cloud DNS services (AWS Route 53, Azure DNS, Google Cloud DNS) host your DNS zones on the provider's global anycast network, giving high availability and fast responses without running your own DNS servers. You manage records through a console, an API, or infrastructure-as-code tools.\n\nBeyond basic resolution, they add health checks and smart routing (failover, latency-based, weighted, and geolocation answers), private hosted zones that resolve only inside your VPCs, and integration with IAM for controlling who can change records. Because DNS is on the path of every connection, it is a critical dependency: protect it with MFA, change control, and registrar lock.",
    "Route 53 health-checks a primary region; when it fails, DNS automatically starts answering with the disaster-recovery region's address.",
    "Protect the DNS and registrar accounts carefully. Hijacked DNS lets attackers redirect all traffic and even obtain valid TLS certificates."
  ),
  'term:WAN': n(
    "A Wide Area Network connects networks across large geographic distances: branch offices, data centres, cloud regions, and remote users. The internet is the largest WAN. Enterprise WANs are built from carrier services such as MPLS, leased lines, broadband internet, 4G/5G, and satellite, often combined for resilience.\n\nCompared with a LAN, WAN links have higher latency, lower bandwidth per dollar, and more variable quality (jitter and packet loss), and they usually cost a recurring fee. This shapes application design: chatty protocols that work fine on a LAN can be slow across a WAN. Modern designs use SD-WAN to steer traffic across several links based on real-time performance.",
    "A retailer links 300 stores to its head office and cloud applications over a mix of broadband and 4G backup, managed as one SD-WAN.",
    "Latency matters as much as bandwidth over a WAN. A 1 Gbps link with 150 ms latency still feels slow to chatty applications."
  ),

  // ---------- DHCP & IP Addressing ----------
  'm6-1': n(
    "Every IPv4 address is 32 bits split into two parts: the network ID, which identifies the network (subnet) the device belongs to, and the host ID, which identifies the individual device on that network. The subnet mask or CIDR prefix decides where the split falls.\n\nIn 192.168.1.10/24, the first 24 bits (192.168.1) are the network and the last 8 bits (.10) are the host, so the network ID is 192.168.1.0. The all-zeros host address is the network address itself and the all-ones host address (192.168.1.255) is the broadcast address; neither can be assigned to a device. Hosts with the same network ID communicate directly; traffic to any other network must go through a router.",
    "Two PCs at 10.0.5.20/24 and 10.0.6.20/24 are on different networks, so they need a router between them even if they plug into the same switch.",
    "Usable hosts per subnet = 2^(host bits) − 2. A /24 has 8 host bits: 256 − 2 = 254 usable addresses."
  ),
  'm6-2': n(
    "A subnet mask is a 32-bit value in which the 1-bits mark the network portion of an address and the 0-bits mark the host portion. 255.255.255.0 is 24 ones followed by 8 zeros, written /24 in CIDR notation. Masks are always contiguous ones followed by zeros.\n\nA device applies its mask to a destination address with a bitwise AND to decide whether the destination is on its own network (deliver directly using ARP) or remote (send to the default gateway). If two devices on the same segment have mismatched masks, one may think the other is local while the other thinks it is remote, producing strange one-way or intermittent connectivity.",
    "A printer manually set to 255.255.0.0 while everything else uses 255.255.255.0 can reach some devices but not others, and replies go astray.",
    "Memorise the mask octet values: 128, 192, 224, 240, 248, 252, 254, 255 (for 1 to 8 network bits)."
  ),
  'm6-3': n(
    "Before CIDR, IPv4 addresses were divided into classes by their first octet. Class A (1–126) used a /8 default mask, providing about 16 million hosts per network for very large organisations. Class B (128–191) used /16 with about 65,000 hosts. Class C (192–223) used /24 with 254 hosts.\n\nClass D (224–239) is reserved for multicast and Class E (240–255) for experimental use. 127.0.0.0/8 is set aside for loopback, so 127.0.0.1 always means 'this machine'. Classful addressing wasted enormous numbers of addresses, which is why CIDR replaced it in the 1990s, but the class ranges still appear on exams and in older documentation.",
    "A company that needed 500 addresses under classful rules had to take a whole Class B with 65,534 addresses. CIDR would give it a /23 instead.",
    "First-octet ranges: A 1–126, B 128–191, C 192–223, D 224–239 (multicast), E 240–255. 127 is loopback."
  ),
  'm6-4': n(
    "Classless Inter-Domain Routing (CIDR) replaced fixed classes with variable-length prefixes written after a slash. The prefix is the number of network bits: /24 leaves 8 host bits (256 addresses), /25 leaves 7 (128), /26 leaves 6 (64), /30 leaves 2 (4 addresses, 2 usable). Networks can be sized to real needs.\n\nCIDR also enables route aggregation (supernetting): many contiguous networks can be advertised as one shorter prefix, such as 10.0.0.0/16 covering all 256 /24s inside it, which keeps internet routing tables smaller. Variable-length subnet masking (VLSM) applies the same idea inside an organisation, giving each subnet exactly the size it needs.",
    "A point-to-point link between two routers uses a /30 (or /31) instead of wasting a /24, while a user VLAN of 400 people gets a /23.",
    "Block size = 256 − the mask's interesting octet. For /26 (255.255.255.192), subnets start every 64: .0, .64, .128, .192."
  ),
  'm6-5': n(
    "RFC 1918 reserves three IPv4 ranges for private use: 10.0.0.0/8, 172.16.0.0/12 (172.16.0.0–172.31.255.255), and 192.168.0.0/16. Anyone can use them internally without asking permission, and the same ranges are reused in millions of homes and companies.\n\nInternet routers do not route private addresses, so a device with only a private IP needs NAT to reach the internet. Choose private ranges carefully in larger organisations: overlapping ranges between sites, partners, or cloud VPCs cause painful routing conflicts when networks are later connected, for example after a merger or when setting up a VPN.",
    "A company uses 10.0.0.0/8 internally, carving 10.1.0.0/16 for London and 10.2.0.0/16 for New York so the sites can be joined by VPN without overlap.",
    "172.16.0.0/12 runs to 172.31.255.255. 172.32.x.x is public, a classic trick question."
  ),
  'm6-6': n(
    "A public IP address is globally unique and routable on the internet. Addresses are allocated by IANA to five Regional Internet Registries, which assign them to ISPs and large organisations, and ISPs assign them to customers. Every public-facing service, from websites to mail servers, needs a public address (or sits behind a load balancer or CDN that has one).\n\nIPv4's roughly 4.3 billion addresses are exhausted at the registry level, so public IPv4 addresses are scarce and are now bought, sold, and charged for, including by cloud providers. This scarcity is why NAT, carrier-grade NAT, and IPv6 adoption exist. Anything with a public IP is directly exposed to internet-wide scanning within minutes.",
    "Searching 'what is my IP' from a home laptop shows the router's public address, not the laptop's 192.168.x.x private address.",
    "Assume anything with a public IP will be scanned constantly. Expose only the ports you need and put management interfaces behind a VPN."
  ),
  'm6-7': n(
    "Bogons are IP addresses that should never appear as the source of traffic arriving from the internet: RFC 1918 private ranges, 127.0.0.0/8 loopback, 169.254.0.0/16 link-local, 0.0.0.0/8, multicast and reserved space, documentation ranges, and address blocks that no registry has allocated.\n\nBecause legitimate internet traffic never uses these as a source, their presence indicates spoofing (common in DDoS reflection attacks) or a misconfigured device leaking internal traffic. Edge routers and firewalls should drop inbound packets with bogon sources, and outbound packets that do not carry your own addresses (anti-spoofing, BCP 38). Bogon lists change as space gets allocated, so use a maintained feed.",
    "A firewall logs thousands of inbound packets claiming to come from 10.0.0.5 on its internet-facing interface. They are spoofed and should be dropped.",
    "Ingress filtering drops bogon sources coming in; egress filtering (BCP 38) stops your network from sending spoofed traffic out."
  ),
  'm6-8': n(
    "The default gateway is the router address a host sends packets to when the destination is not on its local subnet. Each host compares the destination address with its own network ID: if they match, it delivers the packet directly on the LAN using ARP; if not, it forwards the packet to the gateway, which routes it onwards.\n\nThe gateway must be on the same subnet as the host, and it is usually the router's LAN interface, such as 192.168.1.1. It is normally handed out by DHCP. For redundancy, protocols such as VRRP and HSRP let two routers share one virtual gateway address, so a router failure does not cut off the subnet.",
    "A laptop can print to the printer next to it but cannot open any website. `ipconfig` shows no default gateway, so the DHCP scope is missing its router option.",
    "Classic symptom: local access works, remote does not. Check the gateway first, then DNS."
  ),
  'm6-9': n(
    "A static IP address is configured manually and stays the same until someone changes it. It suits infrastructure that other systems must always find at a known address: servers, printers, network devices, firewalls, and DNS servers. A dynamic IP is leased automatically by DHCP and can change over time, which suits laptops, phones, and most desktops.\n\nMany organisations use DHCP reservations as a middle ground: the DHCP server always gives a specific MAC address the same IP, keeping central management while providing a predictable address. Statically assigned addresses must sit outside the DHCP pool (or be excluded from it), otherwise the server may lease the same address to another device and cause a conflict.",
    "A network printer set to a static IP inside the DHCP range works until the server hands that same address to a new laptop; then both drop off intermittently.",
    "Document static assignments in an IPAM spreadsheet or tool, and exclude them from DHCP scopes."
  ),
  'm6-10': n(
    "Dynamic Host Configuration Protocol automatically provides clients with their network settings: IP address, subnet mask, default gateway, DNS servers, lease time, and optional values such as a domain name or PXE boot server. It uses UDP port 67 (server) and 68 (client).\n\nThe exchange is DORA: the client broadcasts a Discover, servers reply with an Offer, the client broadcasts a Request for one offer, and the server confirms with an Acknowledge. Clients renew at 50% of the lease time. Because Discover is a broadcast, DHCP does not cross routers on its own; a DHCP relay (ip helper-address) on the router forwards requests to a central server.",
    "New laptops plugged into any office VLAN get the correct subnet, gateway, and DNS automatically, because each VLAN interface relays to the central DHCP server.",
    "Rogue DHCP servers can hijack clients (man-in-the-middle). Enable DHCP snooping on switches to allow offers only from trusted ports."
  ),
  'm6-11': n(
    "Automatic Private IP Addressing is the fallback Windows (and other OSs, as 'link-local' addressing) uses when a DHCP-configured device cannot reach a DHCP server. The device picks a random address in 169.254.0.0/16, checks that no one else is using it, and assigns it to itself.\n\nWith an APIPA address the device can talk only to other link-local devices on the same segment. It has no default gateway and no DNS, so there is no internet or cross-subnet access. A 169.254.x.x address is therefore a clear diagnostic signal: the DHCP process failed because of a server outage, exhausted scope, broken relay, wrong VLAN, or physical problem.",
    "Several users suddenly show 169.254 addresses after a new switch is installed. The uplink was put in the wrong VLAN, so DHCP requests never reach the server.",
    "169.254.x.x = DHCP failure. Check cable and link lights, VLAN, relay, and the DHCP scope, then run `ipconfig /renew`."
  ),
  'm6-12': n(
    "Network Address Translation rewrites the addresses in packets as they cross a router. The classic use is letting a private network (RFC 1918 addresses) reach the internet through one or a few public addresses: outbound packets have their private source replaced with the router's public address, and replies are translated back using the NAT table.\n\nTypes include static NAT (one private to one public, often used to publish a server), dynamic NAT (private addresses drawn from a pool of public ones), and PAT/overload (many private addresses sharing one public address using different ports). NAT conserves IPv4 addresses and hides internal addressing, but breaks end-to-end connectivity, which complicates inbound services, VoIP, and some VPNs.",
    "A small office's 40 devices all appear on the internet as the router's single public IP, and a web server is published with a static NAT and port forward.",
    "NAT is not a security boundary on its own. Always pair it with firewall rules; inbound port forwards expose services directly."
  ),
  'm6-13': n(
    "Port Address Translation, also called NAT overload, lets many internal devices share one public IP at the same time. For each outbound connection the router assigns a unique source port on its public address and records the mapping from private IP and port to public IP and port. Replies arrive at that public port and the router translates them back to the right internal device.\n\nBecause there are about 64,000 ports per public IP and protocol, one address can support thousands of simultaneous connections. At very large scale, such as carrier-grade NAT or busy cloud NAT gateways, the port pool can be exhausted, causing new connections to fail even though bandwidth is available.",
    "A family's twelve phones, laptops, and TVs all browse at once through one ISP-assigned address. The router tells them apart by port numbers.",
    "PAT = many-to-one using ports. It is the most common form of NAT on home and branch routers."
  ),
  'm6-14': n(
    "The NAT table (translation table) is the router's record of every active translation. Each entry maps an inside local address and port (the private device) to an inside global address and port (the public side), along with the outside address it is talking to and a timer.\n\nOutbound traffic creates entries; inbound replies are matched against them and forwarded to the correct internal host. Unsolicited inbound traffic that matches no entry is dropped, unless a static mapping or port forward exists. Entries expire after inactivity: short timeouts for UDP and longer ones for established TCP. Long-idle connections such as SSH sessions or database pools can therefore silently break unless keepalives are used.",
    "`show ip nat translations` on a Cisco router lists each internal host's private IP:port and the public IP:port it has been mapped to.",
    "Idle sessions dropping after a few minutes through NAT or a firewall usually means a translation timeout. Enable TCP keepalives."
  ),
  'm6-15': n(
    "A floating IP (also called a virtual IP or elastic IP) is an address that is not permanently tied to one server. It can be moved between servers quickly by an API call or a clustering protocol, so clients keep using the same address while the machine behind it changes.\n\nFloating IPs support high availability and maintenance: when the active server fails, the standby takes over the address within seconds, far faster than waiting for DNS TTLs to expire. On-premises clusters use protocols such as VRRP, keepalived, or Pacemaker; cloud providers offer Elastic IPs (AWS), reserved public IPs (Azure), and floating IPs (DigitalOcean, OpenStack).",
    "A primary database server fails and keepalived moves 10.0.1.50 to the standby within about 3 seconds; applications reconnect to the same address.",
    "Test failover regularly. A floating IP only helps if the standby is healthy and its data is current."
  ),

  // ---------- Computer Networking Basics ----------
  'm31-1': n(
    "A computer network is two or more devices connected so they can exchange data and share resources such as files, printers, internet access, and applications. Devices (nodes) connect through media (copper cable, fibre optics, or radio waves) and communicate using agreed rules called protocols, mostly from the TCP/IP suite.\n\nNetworks are described by scale (PAN, LAN, CAN, MAN, WAN), topology (star, mesh, and so on), architecture (client-server or peer-to-peer), and whether they are wired or wireless. Key building blocks are NICs in each device, switches that connect devices locally, routers that connect networks together, and services such as DHCP and DNS.",
    "A small office network: laptops and printers connect by Wi-Fi and Ethernet to a switch, and a router links the office to the internet.",
    "Most network troubleshooting follows the stack from the bottom: physical connection, then addressing, then routing, then applications."
  ),
  'm31-2': n(
    "A Personal Area Network connects devices within a few metres of one person. It links things you carry or wear: phones, earbuds, smartwatches, fitness trackers, keyboards and mice, and medical sensors. Bluetooth is the dominant technology (around 10 metres for common devices), along with USB, NFC (a few centimetres, used for contactless payment), and Zigbee or UWB in some devices.\n\nPANs are convenient but add attack surface. Poorly secured Bluetooth has seen attacks such as BlueBorne and bluesnarfing, and devices left discoverable can be probed by anyone nearby. Keep Bluetooth firmware updated, turn off discoverability when not pairing, and remove unused pairings.",
    "A phone connected to wireless earbuds and a smartwatch, with contactless payments via NFC, forms a personal area network.",
    "Bluetooth attacks: bluejacking (unsolicited messages), bluesnarfing (data theft), bluebugging (device takeover)."
  ),
  'm31-3': n(
    "A Local Area Network covers a limited area such as a home, office floor, school, or single building. LANs are privately owned, offer high bandwidth (1–10 Gbps and up) with very low latency, and are built mainly with Ethernet switches and Wi-Fi access points.\n\nA LAN usually forms one or more broadcast domains. Larger LANs are divided into VLANs to separate traffic (staff, guests, voice, servers) for performance and security. A router or Layer 3 switch connects the LAN to other networks and the internet. Because LAN devices trust each other more than internet traffic, attackers who get onto a LAN (for example via a rogue device) can do real damage, which is why network access control matters.",
    "An office LAN of 80 PCs, 10 printers, and Wi-Fi access points hangs off a pair of switches, with separate VLANs for guests and VoIP phones.",
    "Treat the LAN as untrusted too (zero trust). Segment it, and use 802.1X/NAC to control which devices can connect."
  ),
  'm31-4': n(
    "A Campus Area Network interconnects the LANs of several buildings owned by one organisation within a limited geographic area, such as a university campus, hospital complex, military base, or corporate park. Buildings are typically linked by high-speed fibre that the organisation owns or controls.\n\nCampus networks commonly use a hierarchical design: an access layer where users connect, a distribution layer aggregating each building, and a redundant core layer linking buildings. Because the organisation owns the links, bandwidth between buildings is high and costs are lower than leasing carrier WAN circuits.",
    "A university connects its library, labs, and dorms over its own fibre ring, with a data centre in one building serving the whole campus.",
    "The three-tier design is access → distribution → core; smaller sites often collapse distribution and core into one layer."
  ),
  'm31-5': n(
    "A Metropolitan Area Network spans a city or large metropolitan region, larger than a campus but smaller than a WAN, typically tens of kilometres across. MANs connect multiple sites across a city using fibre rings or wireless links, often provided by a telecom carrier or built by a city government.\n\nMetro Ethernet services let businesses link offices across town with Ethernet-style connections, and cable companies and city councils run MANs for public services, CCTV, traffic control, and municipal Wi-Fi. MANs are often designed as redundant rings so a single fibre cut does not isolate sites.",
    "A city council links its town hall, libraries, and traffic control centre over a metro fibre ring leased from a local carrier.",
    "Size order to remember: PAN < LAN < CAN < MAN < WAN."
  ),
  'm31-7': n(
    "Ethernet (IEEE 802.3) is the standard technology for wired LANs. Data is sent in frames that carry source and destination MAC addresses, a type field, the payload, and a frame check sequence for error detection. Modern Ethernet runs full duplex through switches, so collisions no longer occur.\n\nCommon standards include 1000BASE-T (1 Gbps over Cat5e/Cat6 copper up to 100 m), 10GBASE-T (Cat6a), and fibre standards that reach from hundreds of metres to many kilometres. Ethernet is favoured for servers, desktops, and backbone links because it is faster, lower latency, more consistent, and harder to eavesdrop on than Wi-Fi. Power over Ethernet (PoE) can also power phones, cameras, and access points over the same cable.",
    "Desks in a trading office are wired with Cat6 Ethernet because traders need consistent low latency that Wi-Fi cannot guarantee.",
    "Copper Ethernet's standard maximum run is 100 metres. Beyond that use fibre, or add a switch."
  ),
  'm31-8': n(
    "Wi-Fi (IEEE 802.11) sends network data over radio. It uses the 2.4 GHz band (longer range, more interference, only three non-overlapping channels in most regions), the 5 GHz band (faster, more channels, shorter range), and, with Wi-Fi 6E and 7, the 6 GHz band. Generations include 802.11n (Wi-Fi 4), 802.11ac (Wi-Fi 5), 802.11ax (Wi-Fi 6/6E), and 802.11be (Wi-Fi 7).\n\nWi-Fi is a shared, half-duplex medium: devices take turns, so performance drops as more devices join, and walls, distance, and interference weaken the signal. Secure it with WPA3 (or at minimum WPA2 with AES), use 802.1X enterprise authentication in organisations, and keep guest networks isolated from internal resources.",
    "A crowded conference hall's Wi-Fi slows to a crawl: hundreds of devices share the same channels, so the design adds more access points on 5 GHz with smaller cells.",
    "Avoid WEP and WPA/TKIP entirely; they are broken. Use WPA3 or WPA2-AES."
  ),
  'm31-9': n(
    "A Network Interface Card (network adapter) connects a device to a network. It can be built into the motherboard, added as a PCIe card, a USB adapter, or a wireless chip. The NIC handles the physical layer (turning bits into electrical, light, or radio signals) and the data link layer (framing and MAC addressing).\n\nEvery NIC has a MAC address assigned by the manufacturer. Server NICs add features such as multiple ports, offloading work from the CPU (checksum and TCP segmentation offload), and teaming or bonding several ports for more bandwidth and redundancy. Virtual machines and containers get virtual NICs connected to virtual switches.",
    "A server uses two 10 Gbps NIC ports bonded together, so it keeps working if one cable or switch fails.",
    "Link lights on the NIC and switch port are your fastest Layer 1 check: no light usually means cable, port, or NIC trouble."
  ),
  'm31-10': n(
    "A MAC (Media Access Control) address is a 48-bit hardware identifier for a network interface, written as six hex pairs such as 00:1A:2B:3C:4D:5E. The first three bytes are the OUI (Organizationally Unique Identifier), which identifies the manufacturer; the last three are assigned by that manufacturer.\n\nMAC addresses work at Layer 2 and matter only within the local network segment: switches learn which MAC is on which port, and ARP maps IPs to MACs. Routers replace MAC headers at each hop, so MAC addresses do not travel across the internet. They can be changed in software (spoofed), and phones now randomise their Wi-Fi MAC per network for privacy, which weakens MAC-based access control.",
    "A switch's MAC address table shows 00:1A:2B:3C:4D:5E on port Gi0/12, telling a technician exactly where a device is physically plugged in.",
    "MAC filtering is weak security, because addresses are trivially spoofed. Use 802.1X authentication instead."
  ),
  'm31-11': n(
    "IPv4 uses 32-bit addresses written in dotted decimal (192.168.1.1), which gives about 4.3 billion addresses. The registries have run out, so the internet stretches IPv4 with NAT and private addressing. IPv6 uses 128-bit addresses written as eight groups of hexadecimal (2001:0db8:0000:0000:0000:0000:0000:0001, shortened to 2001:db8::1), giving an effectively unlimited supply.\n\nIPv6 also simplifies networking: devices can configure themselves with SLAAC, there are no broadcasts (multicast and neighbour discovery replace them), headers are simpler, and NAT is generally unnecessary. Key IPv6 address types include global unicast (2000::/3), link-local (fe80::/10), and unique local (fc00::/7). Most networks today run dual stack, with IPv4 and IPv6 side by side.",
    "A phone on a mobile network often has only IPv6 and reaches IPv4-only sites through the carrier's translation gateway (NAT64).",
    "Security teams must monitor and firewall IPv6 too. Attackers use it when defences only watch IPv4."
  ),
  'm31-12': n(
    "As data moves down the network stack, each layer wraps it in its own header, and the resulting unit has a specific name, its Protocol Data Unit (PDU). At the Transport layer, TCP produces a segment and UDP a datagram, each carrying source and destination ports. The Network layer wraps that in a packet with source and destination IP addresses.\n\nThe Data Link layer wraps the packet in a frame with source and destination MAC addresses and a trailer checksum. At the Physical layer it is simply bits: electrical pulses, light, or radio. Using the right term (frame, packet, segment) tells colleagues precisely which layer and which headers you are talking about.",
    "'We're seeing CRC errors on frames' points to a Layer 1/2 cabling or NIC problem, while 'packets are being dropped at the firewall' points to Layer 3/4 filtering.",
    "PDU order, top to bottom: data → segment/datagram → packet → frame → bits. Mnemonic: 'Don't Some People Fear Birthdays?'"
  ),
  'm31-13': n(
    "Encapsulation is how data is prepared for the network. An application creates data; the Transport layer adds a TCP or UDP header (ports and sequence numbers); the Network layer adds an IP header (addresses and TTL); the Data Link layer adds an Ethernet header and trailer (MAC addresses and checksum); the Physical layer transmits the bits.\n\nThe receiver performs de-encapsulation in reverse, each layer reading and removing its own header and passing the rest upward. Each layer only understands its own header, which keeps the layers independent. Tunnelling protocols (VPNs, VXLAN, GRE) encapsulate a whole packet inside another packet, which is why they add overhead and can require a smaller MTU.",
    "A VPN wraps your entire IP packet inside a new encrypted packet, so the ISP sees only traffic to the VPN server.",
    "Extra encapsulation adds bytes. If large packets fail over a VPN while small ones work, suspect MTU or fragmentation."
  ),
  'm31-14': n(
    "Communication modes describe who receives a transmission. Unicast is one-to-one, the normal case for web browsing and SSH. Broadcast is one-to-all devices on the local segment (for example ARP requests and DHCP Discover). Routers do not forward broadcasts, which is what defines a broadcast domain. Multicast is one-to-many for devices that have joined a group (224.0.0.0/4 in IPv4), which is efficient for video streaming, market data, and routing protocols.\n\nAnycast is one-to-nearest: many servers share the same IP address, and routing delivers each client to the closest one. DNS root servers, public resolvers such as 1.1.1.1 and 8.8.8.8, and CDNs use anycast for speed and DDoS resilience. IPv6 has no broadcast and uses multicast instead.",
    "A misbehaving device flooding broadcasts slows down every host on its VLAN, because every device must process each broadcast frame.",
    "Large broadcast domains hurt performance. Segment with VLANs and routers to contain broadcasts."
  ),
  'm31-15': n(
    "Transmission modes describe the direction of data flow. Simplex is one direction only, like a traditional TV broadcast or a sensor that only transmits. Half-duplex allows both directions but only one at a time, like a walkie-talkie, early Ethernet hubs, and Wi-Fi's shared radio channel. Full duplex allows both directions simultaneously, like a phone call or modern switched Ethernet, which effectively doubles usable capacity and removes collisions.\n\nEthernet ports usually auto-negotiate speed and duplex. If one side is hard-coded to full duplex while the other auto-negotiates and falls back to half duplex, the result is a duplex mismatch: the link works but suffers late collisions, CRC errors, and severe slowness under load.",
    "A server link runs fine for small transfers but crawls for large ones; the switch port shows late collisions, a textbook duplex mismatch.",
    "Configure both ends of a link the same way: both auto, or both hard-set to the same speed and duplex."
  ),
  'm31-16': n(
    "A topology is the arrangement of network connections, physical (how the cables run) or logical (how data flows). Bus uses a single shared backbone cable; it is cheap but one break disables it (legacy). Ring passes data around a loop (legacy Token Ring, FDDI, and metro fibre rings with dual rings for redundancy). Star connects every device to a central switch, the dominant LAN design.\n\nMesh connects devices with multiple paths; full mesh links every node to every other (n(n−1)/2 links), while partial mesh gives important nodes redundant paths. Tree (hierarchical) and hybrid topologies combine these, like the access, distribution, and core layers of an enterprise network. Choosing a topology trades cost and simplicity against redundancy and performance.",
    "An enterprise uses a star at each floor (PCs to access switches), and a partial mesh between core switches and data-centre routers for resilience.",
    "Full mesh link count = n(n−1)/2. Ten nodes need 45 links, which is why full mesh is rare beyond the core."
  ),
  'm31-17': n(
    "In a star topology, every device connects to a central switch or access point. It is easy to install, manage, and troubleshoot: a single cable failure affects only one device, and devices can be added without disruption. Its weakness is the central device, a single point of failure; if the switch dies, everything on it loses connectivity.\n\nIn a mesh topology, devices connect to multiple others, so traffic can take alternative paths when a link or node fails. Full mesh gives maximum resilience but needs many links, ports, and configuration. Real networks combine both: stars at the edge where users connect, and redundant (partial mesh) links between core switches, routers, and data centres.",
    "A hospital adds a second core switch and dual uplinks from every floor switch, turning single points of failure into a resilient partial mesh.",
    "Identify single points of failure in any design question, then add redundancy where the business impact justifies the cost."
  ),
  'm31-18': n(
    "A workgroup is a peer-to-peer network in which each computer manages its own local user accounts, passwords, and sharing settings. It works for small setups (Microsoft suggests roughly 10–20 machines), but each user needs an account on every machine they use, and there is no central policy.\n\nA domain is a client-server model: domain controllers running Active Directory Domain Services hold all user and computer accounts centrally. Users sign in once with the same credentials on any domain-joined machine; administrators push settings through Group Policy, manage permissions with security groups, and audit centrally. Domains scale to hundreds of thousands of objects and are the standard in organisations.",
    "A five-person office shares files via a workgroup; after growing to 60 staff, it moves to a domain so accounts and policies are managed in one place.",
    "Domain controllers are crown jewels. Compromising one gives control of every domain-joined machine, so protect them with tiered admin access."
  ),

  // ---------- OSI Model & Core Protocols ----------
  'n1-1': n(
    "The Open Systems Interconnection model divides network communication into seven layers: 1 Physical, 2 Data Link, 3 Network, 4 Transport, 5 Session, 6 Presentation, 7 Application. Each layer provides services to the layer above and relies on the layer below, so each can change independently: Wi-Fi can replace Ethernet at Layers 1–2 without changing HTTP at Layer 7.\n\nReal networks run the TCP/IP model (Link, Internet, Transport, Application), which maps loosely onto OSI; Layers 5–7 are usually handled together by applications. OSI's lasting value is as a shared vocabulary and troubleshooting framework: you can say a problem is 'Layer 1' (cabling) or 'Layer 7' (application) and colleagues know exactly where to look.",
    "A user cannot reach a website: check the link light (L1), IP and gateway (L3), port reachability (L4), then the application response (L7), isolating the failing layer step by step.",
    "Mnemonic from Layer 1 up: 'Please Do Not Throw Sausage Pizza Away'. From 7 down: 'All People Seem To Need Data Processing'."
  ),
  'n1-2': n(
    "The Physical layer transmits raw bits over a medium. It defines electrical voltages and signal timing on copper, light pulses on fibre, and radio frequencies for wireless. It also defines connectors (RJ45, LC and SC fibre), pinouts (T568A/B), cable categories (Cat5e, Cat6, Cat6a), and maximum distances.\n\nDevices at this layer include cables, connectors, repeaters, hubs, transceivers, and media converters; they forward signals without understanding them. A large share of real-world network problems are Layer 1: damaged or poorly terminated cables, cables longer than 100 m, bad patch panels, failed transceivers, electromagnetic interference, or simply an unplugged cable.",
    "A desk loses connection whenever the chair rolls over the cable; replacing the crushed patch cable fixes the 'network problem'.",
    "Always check Layer 1 first: link lights, cable seating, cable type and length. Use a cable tester or tone generator to trace faults."
  ),
  'n1-3': n(
    "The Data Link layer delivers frames between devices on the same local network segment. It is split into two sublayers: LLC (Logical Link Control) and MAC (Media Access Control). It adds MAC addresses, frames the data, and detects errors with a frame check sequence (CRC). Ethernet and Wi-Fi are Layer 2 technologies, as are 802.1Q VLAN tagging and Spanning Tree Protocol.\n\nSwitches are the key Layer 2 devices: they learn source MAC addresses into a MAC address (CAM) table and forward frames only to the port where the destination lives, flooding unknown destinations. Layer 2 attacks include MAC flooding, ARP spoofing, VLAN hopping, and rogue DHCP. Mitigations include port security, dynamic ARP inspection, DHCP snooping, and disabling unused ports.",
    "A switch floods frames out every port after an attacker fills its MAC table with fake addresses. Port security limiting MACs per port stops this.",
    "Layer 2 = MAC addresses, frames, switches, VLANs, STP. Broadcasts stay within a Layer 2 domain."
  ),
  'n1-4': n(
    "The Network layer moves packets between different networks using logical addresses: IPv4 and IPv6. It handles addressing, routing (choosing a path through intermediate routers), and fragmentation when a packet is larger than a link's MTU. Each router decrements the packet's TTL (hop limit) so packets caught in loops eventually expire.\n\nRouters and Layer 3 switches operate here, making forwarding decisions from routing tables built statically or by routing protocols (OSPF, EIGRP, BGP). ICMP, which reports errors and supports ping and traceroute, and IPsec also operate at Layer 3. Firewall rules and ACLs that filter by IP address act at this layer.",
    "A packet from London to a Tokyo server passes through a dozen routers, each examining only the destination IP to choose the next hop.",
    "Layer 3 = IP addresses, packets, routers. If you can ping the gateway but not remote networks, suspect routing."
  ),
  'n1-5': n(
    "The Transport layer provides end-to-end communication between applications on two hosts. Port numbers identify which application a segment belongs to (for example HTTPS on 443, SSH on 22). TCP is connection-oriented: it opens a connection with the three-way handshake (SYN, SYN-ACK, ACK), numbers every byte, acknowledges receipt, retransmits lost data, reorders out-of-order segments, and applies flow and congestion control.\n\nUDP is connectionless: it simply sends datagrams with no handshake, acknowledgement, or ordering. It is lighter and faster, which suits DNS queries, VoIP, video streaming, gaming, and QUIC/HTTP-3 (which rebuilds reliability on top of UDP). Stateful firewalls track TCP connection states and UDP 'flows' at this layer.",
    "A video call uses UDP because a late packet is useless, while a file download uses TCP because every byte must arrive intact.",
    "TCP = reliable, ordered, handshake, slower. UDP = best-effort, no handshake, faster. SYN floods abuse the TCP handshake."
  ),
  'n1-6': n(
    "The Session layer (Layer 5) establishes, manages, and ends conversations (sessions) between applications, including checkpointing and resuming long transfers. Examples usually cited include RPC, NetBIOS sessions, and the session management inside SMB or SQL protocols.\n\nThe Presentation layer (Layer 6) makes sure data is in a form both sides understand: character encoding (ASCII, UTF-8), data serialisation (JSON, XML), compression, and encryption. TLS is often described as sitting at Layer 6 (or between 4 and 7). In the TCP/IP model and in practice, both layers are implemented by applications and libraries rather than as separate protocol layers, which is why they are mostly used as concepts when troubleshooting.",
    "A web page shows garbled accented characters because the server declares one character encoding and the data uses another, a Presentation-layer mismatch.",
    "Exam questions often place encryption, compression, and format translation at Layer 6, and session setup and teardown at Layer 5."
  ),
  'n1-7': n(
    "The Application layer is where network services interact with software and users. It contains the protocols applications use to exchange meaningful data: HTTP/HTTPS for the web, DNS for name resolution, SMTP, IMAP, and POP3 for email, FTP/SFTP for file transfer, SSH for remote shells, SNMP for monitoring, LDAP for directories, and DHCP for configuration.\n\nMost modern attacks and defences live here: phishing, SQL injection, cross-site scripting, credential stuffing, and API abuse, countered by web application firewalls, secure email gateways, proxies, and application-aware (next-generation) firewalls. Layer 7 visibility requires understanding the protocol content, often after TLS decryption.",
    "A next-generation firewall blocks a file upload to a personal cloud storage site by recognising the application at Layer 7, even though it uses the same port 443 as every other website.",
    "Application-layer problems show up as 'the network works, but the service returns errors'. Check logs, status codes, and certificates."
  ),
  'n1-8': n(
    "The Domain Name System translates human-friendly names like example.com into IP addresses. When you look up a name, your stub resolver asks a recursive resolver (your ISP's, the company's, or a public one such as 1.1.1.1). If the answer is not cached, the resolver walks the hierarchy: a root server points to the .com TLD servers, which point to the domain's authoritative name servers, which return the answer.\n\nCommon records include A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail servers), TXT (verification, SPF, DKIM, DMARC), NS (delegation), PTR (reverse lookup), and SOA (zone authority). DNS mainly uses UDP port 53, and TCP port 53 for large responses and zone transfers. Encrypted DNS (DoH, DoT) protects queries from eavesdropping.",
    "An email system decides where to deliver mail for example.com by querying its MX records, then the A/AAAA records of those mail servers.",
    "'It's always DNS.' If a name fails but the IP works, the fault is name resolution, not connectivity."
  ),
  'n1-9': n(
    "Every DNS record has a TTL (time to live) in seconds that tells resolvers how long they may cache the answer. Caching happens at several levels: the browser, the operating system's resolver, the recursive resolver, and sometimes the application. Caching makes most lookups instant and dramatically reduces load on authoritative servers.\n\nThe trade-off is freshness. After you change a record, clients keep using the old cached answer until its TTL expires, which is what people call 'DNS propagation'. Before a planned migration, lower the TTL (for example from 86,400 to 300 seconds) a day or more in advance, make the change, then raise it again. Clear local caches with ipconfig /flushdns on Windows, or by restarting systemd-resolved or dnsmasq on Linux.",
    "A website moved to a new server an hour ago works for some users but not others, because resolvers cached the old A record with a 24-hour TTL.",
    "DNS cache poisoning attacks try to insert fake answers into resolver caches. DNSSEC validation defends against them."
  ),
  'term:ARP': n(
    "Address Resolution Protocol maps an IPv4 address to the MAC address of the device on the local segment, which is needed to build an Ethernet frame. When a host wants to send to an IP on its subnet (or to its default gateway), it broadcasts 'Who has 192.168.1.1? Tell 192.168.1.20.' The owner replies with its MAC address, and the sender caches the answer in its ARP table for a few minutes.\n\nARP has no authentication, so any device can send forged replies (ARP spoofing or poisoning) claiming to be the gateway, redirecting traffic through itself for man-in-the-middle attacks. Switches mitigate this with Dynamic ARP Inspection, which uses DHCP snooping data. IPv6 replaces ARP with Neighbor Discovery Protocol.",
    "An attacker on a café's Wi-Fi poisons ARP caches so that everyone's traffic to the gateway flows through their laptop first.",
    "Duplicate MAC addresses answering for the gateway IP in `arp -a` is a red flag for ARP spoofing."
  ),
  'n1-10': n(
    "Address Resolution Protocol (ARP) connects Layer 3 and Layer 2 on IPv4 networks. To deliver a packet on the local network, a host needs the destination's MAC address, so it broadcasts an ARP request: 'Who has 192.168.1.1? Tell 192.168.1.20.' The device with that IP replies with its MAC, and the sender stores the mapping in its ARP cache for reuse.\n\nFor destinations on other networks, the host ARPs for its default gateway's MAC instead. Gratuitous ARP announcements update other hosts after an IP moves, which is used by failover clusters. Because ARP trusts any reply, attackers can poison caches to intercept traffic; Dynamic ARP Inspection on switches and static entries for critical hosts mitigate this. IPv6 uses Neighbor Discovery instead.",
    "After replacing a failed router with new hardware, some PCs cannot reach the internet until their stale ARP entries for the gateway time out or are cleared.",
    "ARP works only within a broadcast domain. It never crosses a router."
  ),
  'n1-11': n(
    "Internet Control Message Protocol carries error and diagnostic messages for IP rather than user data. Key message types include echo request and echo reply (ping), destination unreachable (with codes for network, host, port, or 'fragmentation needed'), time exceeded (a packet's TTL hit zero, which is how traceroute maps hops), and redirect.\n\nICMP is essential for troubleshooting and for Path MTU Discovery; blocking all of it can silently break large transfers ('black hole' connections). Attackers use it too: ping sweeps for reconnaissance, ICMP floods, and ICMP tunnelling for covert channels. Sensible policy allows the diagnostic types needed internally and rate-limits or filters ICMP at the internet edge.",
    "A traceroute to a remote site shows each router hop because each one returns an ICMP 'time exceeded' message when the TTL expires.",
    "A failed ping does not prove a host is down; ICMP may simply be blocked. Test the actual service port too (for example with `Test-NetConnection -Port 443`)."
  ),
  'n1-12': n(
    "Network Address Translation at the network edge lets devices using private RFC 1918 addresses communicate with the internet. The edge router or firewall rewrites the source address of outgoing packets to its public IP (usually with PAT, adding port translation so many devices share one address), tracks each session in a translation table, and rewrites replies back to the right internal host.\n\nNAT conserves IPv4 addresses and hides internal addressing, but it breaks the end-to-end model: unsolicited inbound connections are dropped unless you configure static NAT or port forwarding, and protocols that embed IP addresses in their payload (older VoIP and FTP) need helper modules. IPv6 restores end-to-end addressing and relies on firewalls instead of NAT.",
    "A company publishes its internal web server by mapping public IP port 443 to 10.0.10.5:443 with a static NAT rule plus a firewall allow rule.",
    "When troubleshooting, remember the 'inside local' (private) address differs from the 'inside global' (public) one. Logs on each side show different IPs."
  ),
  'n1-13': n(
    "HTTP (Hypertext Transfer Protocol) is the request-response protocol of the web, using port 80 by default. Clients send methods (GET, POST, PUT, DELETE) and receive status codes (200 OK, 301 redirect, 404 not found, 500 server error). Plain HTTP is unencrypted, so anyone on the path can read or change it.\n\nHTTPS is HTTP inside TLS, on port 443. It encrypts traffic, protects integrity, and authenticates the server with a certificate; it is now the default for all websites (HTTP/2 and HTTP/3 are used almost exclusively over TLS). SSH (Secure Shell, port 22) provides encrypted remote command-line access, file transfer (SFTP, SCP), and tunnelling, and is the standard way to manage Linux servers and network devices, ideally with key-based authentication rather than passwords.",
    "An admin connects to a Linux server with `ssh -i ~/.ssh/id_ed25519 admin@server`, while users reach the web app at https://app.example.com.",
    "Know the classic ports: 22 SSH, 23 Telnet (insecure), 80 HTTP, 443 HTTPS. Replace Telnet and HTTP with SSH and HTTPS."
  ),
  'n1-14': n(
    "Simple Network Management Protocol lets a network management system (NMS) monitor and manage devices. The NMS polls agents on routers, switches, firewalls, servers, and printers over UDP port 161, reading values from the device's MIB (Management Information Base) such as interface counters, CPU load, temperature, and uptime. Devices can also push unsolicited alerts called traps or informs to the NMS on UDP port 162.\n\nSNMPv1 and v2c authenticate with a 'community string' sent in clear text, and default strings like 'public' and 'private' are notoriously abused. Write access can even let attackers reconfigure devices. SNMPv3 adds user-based authentication and encryption (authPriv) and should be the standard. Restrict SNMP to management networks with ACLs.",
    "A monitoring tool polls each switch's interface counters every minute via SNMPv3 and alerts when an uplink exceeds 80% utilisation.",
    "Default community strings plus SNMP exposed to the internet is a classic finding. Use SNMPv3 and ACLs, and disable write access."
  ),
  'n1-15': n(
    "Server Message Block is the Windows file- and printer-sharing protocol, also used by Samba on Linux and by NAS devices. It provides shared folders accessed by UNC paths such as \\\\fileserver\\finance, mapped drives, printer sharing, and inter-process communication. Modern SMB runs directly over TCP port 445 (older NetBIOS-based SMB used ports 137–139).\n\nSMBv1 is obsolete and insecure; the EternalBlue exploit in SMBv1 powered the WannaCry and NotPetya outbreaks in 2017. Disable SMBv1, use SMBv3 (which supports encryption and signing), require SMB signing to prevent relay attacks, never expose port 445 to the internet, and apply least-privilege share and NTFS permissions.",
    "WannaCry spread across unpatched networks through SMBv1 on port 445, encrypting hundreds of thousands of machines in a day.",
    "Block TCP 445 at the internet edge, disable SMBv1, and enforce SMB signing. These are frequent hardening questions."
  ),
  'n1-16': n(
    "Quality of Service (QoS) decides which traffic gets priority when a link is congested, so latency-sensitive traffic such as voice and video is not delayed behind bulk downloads. QoS involves classifying and marking traffic, queuing it into priority levels, shaping or policing rates, and managing drops.\n\nDifferentiated Services (DiffServ) is the scalable standard: each packet carries a DSCP (Differentiated Services Code Point) value in the IP header. Voice is typically marked EF (Expedited Forwarding, DSCP 46), and other classes use AF (Assured Forwarding) values. Every router along the path applies per-hop behaviour based on the marking, without tracking individual flows. Markings are generally only trusted inside your own network; on the internet they are usually reset.",
    "During a large backup over the WAN, VoIP calls stay clear because voice packets marked EF go into a priority queue ahead of the backup traffic.",
    "QoS cannot create bandwidth; it only decides who waits when the link is full. Mark traffic as close to the source as possible."
  ),

  // ---------- Network Devices & Tools ----------
  'n2-1': n(
    "A router connects two or more different IP networks and forwards packets between them at Layer 3. For each packet it looks up the destination IP address in its routing table, picks the most specific matching route, and sends the packet to the next hop, rewriting the Layer 2 header for each link. Routers separate broadcast domains: broadcasts do not cross them.\n\nEnterprise routers run dynamic routing protocols (OSPF, BGP), terminate VPNs, apply ACLs and QoS, and connect WAN links. A home 'router' is really several devices in one box: a router, a switch, a Wi-Fi access point, a NAT gateway, a DHCP server, a DNS forwarder, and a basic firewall.",
    "A branch router connects the office LAN (10.20.0.0/24) to the company WAN and the internet, choosing between them based on routing table entries.",
    "Routers route on IP addresses (Layer 3); switches forward on MAC addresses (Layer 2)."
  ),
  'n2-2': n(
    "A Layer 2 switch connects devices within a LAN. It learns which MAC address is reachable on which port by reading the source address of incoming frames, stores that in its MAC (CAM) table, and forwards each frame only out the destination's port, flooding unknown destinations and broadcasts. Every switch port is its own collision domain, and the whole switch (per VLAN) is one broadcast domain.\n\nA Layer 3 switch adds routing: it can route between VLANs and subnets in hardware using switched virtual interfaces (SVIs), at wire speed, without sending traffic to a separate router. Managed switches also provide VLANs, trunking (802.1Q), link aggregation (LACP), Spanning Tree, PoE, port security, and monitoring features such as port mirroring.",
    "A data-centre core uses Layer 3 switches to route between server VLANs at 100 Gbps, while floor switches are Layer 2 access switches.",
    "Loops at Layer 2 cause broadcast storms that can take down a network in seconds. Spanning Tree Protocol (STP/RSTP) prevents them."
  ),
  'n2-3': n(
    "A Virtual LAN logically divides one physical switched network into several separate broadcast domains. Ports are assigned to VLANs (for example VLAN 10 for staff, VLAN 20 for voice, VLAN 30 for guests), and devices in different VLANs cannot talk to each other at Layer 2, even on the same switch. Traffic between VLANs must be routed, which is exactly where you can apply firewall rules and ACLs.\n\nVLANs improve security (segmentation), performance (smaller broadcast domains), and flexibility (group users by role rather than by physical location). Trunk links carry multiple VLANs between switches using 802.1Q tags. VLAN hopping attacks (switch spoofing and double tagging) are mitigated by disabling DTP, setting access ports explicitly, and using an unused native VLAN.",
    "A hospital separates medical devices, staff PCs, and guest Wi-Fi into different VLANs so a compromised guest device cannot reach clinical systems.",
    "VLANs segment, but only with filtering between them. Routing everything between VLANs with no ACLs gives little security benefit."
  ),
  'n2-4': n(
    "A trunk link carries traffic for many VLANs between switches (or to routers, hypervisors, and access points). IEEE 802.1Q inserts a 4-byte tag containing a 12-bit VLAN ID into each frame so the receiving switch knows which VLAN it belongs to. The native VLAN is the one exception: its frames cross the trunk untagged, for backwards compatibility with devices that do not understand tags.\n\nBoth ends of a trunk must agree on the native VLAN; a mismatch silently leaks traffic between two VLANs and generates CDP/STP warnings. Security best practice is to change the native VLAN from the default VLAN 1 to an unused VLAN with no hosts, and optionally tag the native VLAN too, which blocks double-tagging VLAN-hopping attacks.",
    "One switch uses native VLAN 1 and its neighbour uses native VLAN 99; untagged traffic from VLAN 1 lands in VLAN 99, merging two networks.",
    "Native VLAN hardening: set it to an unused ID, match it on both ends, and never put user devices in VLAN 1."
  ),
  'n2-5': n(
    "Because VLANs are separate Layer 2 networks, traffic between them must pass through a Layer 3 device. With router-on-a-stick, a single router interface connects to a switch trunk and is split into sub-interfaces, one per VLAN (for example Gi0/0.10 and Gi0/0.20), each with its own IP address acting as that VLAN's default gateway. It is cheap but limited by that one link's bandwidth.\n\nWith a Layer 3 switch, each VLAN gets a switched virtual interface (SVI) that serves as its gateway, and routing happens in the switch hardware at wire speed. This is the modern standard. Either way, the routing point is where you enforce policy between segments with ACLs or by routing through a firewall.",
    "A small office uses router-on-a-stick for three VLANs; a larger campus uses SVIs on core Layer 3 switches and sends inter-VLAN traffic through a firewall for inspection.",
    "Each VLAN is its own subnet and needs its own gateway IP. Hosts in VLAN 10 use the VLAN 10 SVI as their default gateway."
  ),
  'n2-6': n(
    "A routing table lists the networks a router knows about, each with a next hop (or exit interface), a metric, and its source: directly connected, static, or learned by a routing protocol. For each packet, the router uses longest prefix match: the most specific matching route wins, so a /28 beats a /24, which beats the default route.\n\nWhen several sources offer the same prefix, administrative distance (AD) decides which is trusted most (connected 0, static 1, eBGP 20, OSPF 110, RIP 120). Within one protocol, the metric picks the best path. The default route 0.0.0.0/0 (the gateway of last resort) catches everything with no more specific match. Static routes are simple and predictable; dynamic routing adapts to failures automatically.",
    "A router with routes to 10.0.0.0/8 via ISP-A and 10.1.2.0/24 via a VPN sends traffic for 10.1.2.50 over the VPN because /24 is more specific.",
    "Longest prefix match comes first, then administrative distance, then metric."
  ),
  'n2-7': n(
    "Dynamic routing protocols let routers share reachability information and adapt when links fail. Interior protocols run within one organisation: RIP (distance-vector, hop-count metric, max 15 hops, slow convergence, mostly legacy), OSPF (link-state; every router builds a full map of the area and runs Dijkstra's shortest-path algorithm; fast convergence; cost based on bandwidth; uses areas to scale), and EIGRP (Cisco's advanced distance-vector protocol with fast convergence).\n\nBGP is the exterior, path-vector protocol that connects autonomous systems and runs the internet. It chooses paths by policy (attributes such as AS path, local preference, and MED) rather than simply by speed. BGP misconfigurations and hijacks can reroute large parts of the internet, which is why RPKI route origin validation is increasingly deployed.",
    "An enterprise uses OSPF inside its network, and BGP with two ISPs so traffic automatically shifts to the second provider if the first fails.",
    "Types: distance-vector (RIP, EIGRP), link-state (OSPF, IS-IS), path-vector (BGP). BGP runs over TCP port 179."
  ),
  'n2-8': n(
    "A firewall enforces a security policy by allowing or denying traffic based on rules. Packet-filtering firewalls check each packet's IPs, ports, and protocol. Stateful firewalls track connections, so return traffic for an allowed outbound session is permitted automatically while unsolicited inbound traffic is dropped. Next-generation firewalls (NGFWs) add application identification, user identity, TLS inspection, intrusion prevention, and threat intelligence.\n\nRules are processed top-down with the first match winning, and should end with an implicit or explicit 'deny all'. Good practice: least privilege (allow only what is needed), specific rules above general ones, documented business justification for each rule, logging, and regular reviews to remove stale or overly broad 'any-any' rules. Host-based firewalls (Windows Defender Firewall, iptables/nftables) add defence in depth.",
    "A rule allowing 'any to web servers on 443' sits above a rule blocking a known-malicious IP, so the malicious IP still reaches the servers. The order is wrong.",
    "Default deny, then explicitly allow. Review rule order: a broad rule placed early shadows everything below it."
  ),
  'n2-9': n(
    "A load balancer distributes client requests across a pool of servers to add capacity and survive server failures. It runs health checks against each target and removes unhealthy ones from rotation. Algorithms include round robin, weighted round robin, least connections, and IP-hash or source affinity.\n\nLayer 4 load balancers forward TCP/UDP connections based on IPs and ports: fast, simple, and protocol-agnostic. Layer 7 load balancers terminate HTTP or HTTPS and can route by host name, path, or header, rewrite requests, insert headers such as X-Forwarded-For, provide sticky sessions, and offload TLS. Deploy them in redundant pairs so the load balancer itself is not a single point of failure.",
    "A Layer 7 load balancer sends /api/* to API servers and /images/* to a static-content pool, and drains a server gracefully before patching.",
    "Behind a load balancer, application logs show the balancer's IP unless you read the X-Forwarded-For header."
  ),
  'n2-10': n(
    "ping sends ICMP echo request packets to a target and reports echo replies, round-trip time, and packet loss. It is the quickest reachability test and the start of most network troubleshooting.\n\nA structured sequence isolates where things fail: ping 127.0.0.1 (the local TCP/IP stack), then your own IP (the NIC), then the default gateway (the LAN), then a remote IP such as 8.8.8.8 (routing and internet), then a host name such as google.com (DNS). Useful options include -t (continuous, Windows), -c (count, Linux), and -l or -s (packet size) combined with the don't-fragment flag to test MTU. Remember that many hosts and firewalls block ICMP, so no reply does not prove the host is down.",
    "Pinging 8.8.8.8 works but pinging google.com fails, so connectivity is fine and DNS resolution is broken.",
    "High latency or intermittent loss in a continuous ping points to congestion, a bad link, or Wi-Fi interference."
  ),
  'n2-11': n(
    "ipconfig (Windows) and ip addr / ifconfig (Linux and macOS) show a device's network configuration: IP address, subnet mask or prefix, and default gateway. ipconfig /all adds the MAC address, DNS servers, DHCP server, and lease times. On Linux, ip route shows the routing table and resolvectl (or /etc/resolv.conf) shows DNS settings.\n\nUseful Windows actions include ipconfig /release and /renew (get a fresh DHCP lease), ipconfig /flushdns (clear the DNS cache), and ipconfig /displaydns (view cached lookups). These commands quickly reveal common faults: an APIPA 169.254.x.x address (DHCP failure), a wrong subnet mask, a missing gateway, or incorrect DNS servers.",
    "A user cannot browse; `ipconfig /all` shows DNS server 8.8.4.4 instead of the company resolver, which explains why internal sites fail to resolve.",
    "ifconfig is deprecated on modern Linux. Learn `ip addr`, `ip route`, and `ip link`."
  ),
  'n2-12': n(
    "nslookup queries DNS directly and shows the answer and which server provided it. Typing nslookup example.com uses the default resolver; nslookup example.com 1.1.1.1 asks a specific server, which is handy for comparing internal and external views or checking whether a change has reached a particular resolver. You can request specific record types: nslookup -type=mx example.com.\n\nOn Linux and macOS, dig is richer: dig example.com A +short, dig MX example.com, and dig +trace example.com (follow the delegation from the root). PowerShell offers Resolve-DnsName. A 'non-authoritative answer' means the response came from a cache rather than the domain's own name servers.",
    "`nslookup intranet.company.local` returns 'Non-existent domain' from a laptop using public DNS, but works when pointed at the internal DNS server, so the laptop has the wrong resolver.",
    "To prove it is DNS: resolve the name, then connect by IP. If the IP works and the name fails, fix DNS."
  ),
  'n2-13': n(
    "traceroute (Linux/macOS) and tracert (Windows) reveal the path packets take to a destination. They send probes with an increasing TTL: the first router decrements TTL 1 to 0 and replies with ICMP 'time exceeded', revealing itself; the next probe uses TTL 2, and so on, until the destination answers. Each line shows a hop and its round-trip times.\n\nUse it to find where traffic stops or where latency jumps. An asterisk (*) means that hop did not reply within the timeout, often because it rate-limits or blocks ICMP, not because traffic is failing there. If later hops respond, the path is fine. Windows tracert uses ICMP, while Linux traceroute uses UDP by default (-I for ICMP, -T for TCP). pathping and mtr combine traceroute with continuous loss statistics.",
    "A traceroute shows latency jumping from 10 ms to 180 ms at the hop leaving the country, which is expected for an international link, not a fault.",
    "Rising latency that persists on all later hops is real; a spike at one hop only is usually that router deprioritising ICMP."
  ),
  'n2-14': n(
    "netstat lists network connections and listening ports. netstat -an shows all connections numerically (no DNS lookups) with their state (LISTENING, ESTABLISHED, TIME_WAIT, SYN_SENT). On Windows, netstat -ano adds the owning process ID and netstat -b shows the program name (with admin rights); netstat -r shows the routing table.\n\nOn modern Linux, ss replaces netstat: ss -tulpn shows TCP and UDP listening sockets with process names. These tools answer two key questions: is my service actually listening on the expected port and address (for example 0.0.0.0:443 rather than only 127.0.0.1), and what is this machine connected to, which is useful for spotting malware beaconing to unfamiliar addresses.",
    "A web server does not respond; `ss -tulpn` shows nginx listening only on 127.0.0.1:80, so it is not reachable from other machines.",
    "Many SYN_SENT connections to one remote port suggests something outbound is being blocked; many unknown ESTABLISHED sessions deserve investigation."
  ),
  'n2-15': n(
    "The arp command displays and manages the local ARP cache: the IP-to-MAC mappings a machine has learned for devices on its own subnet. arp -a lists all entries; arp -d deletes entries (or arp -d * clears them all on Windows) so they are relearned; on Linux, ip neigh is the modern equivalent.\n\nIt is useful when a device was replaced (the IP now belongs to a new MAC), for spotting duplicate IP addresses, and for detecting ARP spoofing, where the gateway's IP suddenly maps to an unexpected MAC, or one MAC claims several IPs. Entries marked 'dynamic' were learned; 'static' entries were configured manually.",
    "After a firewall hardware swap, some servers lose connectivity until `arp -d` clears the old gateway MAC from their caches.",
    "If the gateway IP in `arp -a` shows the same MAC as another host on your network, suspect ARP poisoning."
  ),
  'n2-16': n(
    "Wireshark is a free, open-source protocol analyser that captures packets on an interface and decodes hundreds of protocols into readable fields. Capture filters (BPF syntax, such as host 10.0.0.5 and port 443) limit what is recorded; display filters (such as ip.addr==10.0.0.5 && tcp.flags.syn==1, or dns) narrow what you view. Features such as Follow TCP Stream, Expert Information, and the statistics tools speed up analysis.\n\nIt is the definitive tool when simpler checks do not explain a problem: TCP retransmissions, resets, TLS handshake failures, DNS errors, and slow application responses become visible. tcpdump and tshark capture from the command line on servers. Captures can contain passwords, session cookies, and personal data, so capture only with authorisation, minimise scope, and store files securely.",
    "A slow file transfer is traced in Wireshark to repeated TCP retransmissions and duplicate ACKs, pointing to packet loss on one faulty switch port.",
    "Capture as close to the problem as possible, and on both ends if you can. Comparing captures shows exactly where packets disappear."
  ),

  // ---------- Cloud Networking ----------
  'cn-1': n(
    "A Virtual Private Cloud is a logically isolated network you define within a public cloud: AWS VPC, Azure Virtual Network (VNet), or Google Cloud VPC. You choose its private IP address range (CIDR block, such as 10.0.0.0/16), divide it into subnets, and control traffic with route tables, gateways, security groups, and network ACLs.\n\nResources launched into a VPC are private by default: nothing is reachable from the internet unless you attach an internet gateway, add routes, and assign public IPs or put a load balancer in front. VPCs are regional; in AWS subnets live in single Availability Zones, while Google Cloud VPCs are global. Many organisations use separate VPCs per environment or application, connected through peering or a transit gateway.",
    "A company creates a production VPC 10.10.0.0/16 with public subnets for load balancers and private subnets for application servers and databases across three AZs.",
    "Plan non-overlapping CIDR ranges across all VPCs and on-premises networks from day one. Overlaps block peering and VPNs later."
  ),
  'cn-2': n(
    "Subnets divide a VPC's address range into smaller segments, each tied to an Availability Zone in AWS. What makes a subnet public or private is its route table: a public subnet has a route (0.0.0.0/0) to an internet gateway, so resources with public IPs can be reached from the internet. A private subnet has no such route; its resources reach the internet outbound only through a NAT gateway, if at all.\n\nA typical three-tier design places load balancers in public subnets, application servers in private subnets, and databases in isolated private subnets with no internet path at all, each tier duplicated across two or three AZs for high availability. Cloud providers reserve a few addresses in every subnet (AWS reserves five), so size subnets with headroom.",
    "An AWS VPC has public subnets 10.0.1.0/24 and 10.0.2.0/24 for ALBs, and private subnets 10.0.11.0/24 and 10.0.12.0/24 for EC2 instances in two AZs.",
    "Never place databases in public subnets. 'Public' is defined by the route table, not by the subnet's name."
  ),
  'cn-3': n(
    "Security groups are virtual firewalls attached to individual resources, such as EC2 instances, database instances, load balancers, and Lambda network interfaces. You write allow rules only (there are no deny rules) for inbound and outbound traffic by protocol, port range, and source or destination, which can be a CIDR or another security group.\n\nThey are stateful: if inbound traffic is allowed, the response is automatically allowed out, and vice versa. Referencing security groups instead of IP addresses ('allow 5432 from the app-tier security group') keeps rules correct as instances scale up and down. Default behaviour denies all inbound traffic. Contrast with network ACLs, which are stateless, subnet-level, ordered, and support deny rules.",
    "The database security group allows port 5432 only from the application security group, so even another instance in the same subnet cannot connect.",
    "Open SSH (22) or RDP (3389) to 0.0.0.0/0 is one of the most common cloud misconfigurations. Use Session Manager or a bastion with restricted sources."
  ),
  'cn-4': n(
    "Cloud load balancers distribute traffic across instances, containers, or functions in multiple Availability Zones and scale automatically. AWS offers the Application Load Balancer (Layer 7 HTTP/HTTPS with host and path routing, WAF integration, and authentication), the Network Load Balancer (Layer 4 TCP/UDP/TLS, ultra-high throughput, static IPs), and the Gateway Load Balancer (for inline security appliances). Azure and Google Cloud offer equivalents.\n\nHealth checks remove unhealthy targets automatically, and integration with auto scaling registers new instances as they launch. The load balancer typically terminates TLS using a managed certificate (for example from AWS Certificate Manager), becoming the single public entry point while backend servers stay in private subnets.",
    "An ALB routes api.example.com to a container service and www.example.com to a web fleet, both across three AZs, with TLS certificates renewed automatically.",
    "Choose L7 (ALB) for HTTP routing features and L4 (NLB) for raw performance, static IPs, or non-HTTP protocols."
  ),
  'cn-7': n(
    "VPC peering connects two VPCs so resources communicate using private IP addresses over the provider's backbone, with no internet gateway, VPN, or single appliance in the path. Peering works across accounts and, with most providers, across regions. Each side must accept the connection and add routes pointing to the other VPC's CIDR, and security groups must allow the traffic.\n\nPeering is non-transitive: if VPC A peers with B and B peers with C, A cannot reach C through B. The CIDR ranges of peered VPCs must not overlap. With many VPCs, full-mesh peering becomes unmanageable (n(n−1)/2 connections), which is where transit gateways come in.",
    "A shared-services VPC with directory and logging servers is peered with each application VPC so they can reach those services privately.",
    "Peering is not transitive and cannot join overlapping CIDRs, two classic exam distractors."
  ),
  'cn-8': n(
    "A NAT gateway lets resources in private subnets start outbound connections to the internet, for downloading patches, calling external APIs, or reaching SaaS services, while blocking any inbound connection initiated from the internet. It sits in a public subnet with an Elastic IP, and private subnets route 0.0.0.0/0 to it.\n\nManaged NAT gateways scale automatically and need no patching, but they are zonal: for high availability, deploy one per Availability Zone and route each AZ's private subnets to their local gateway. They are charged per hour and per GB processed, so heavy traffic to cloud services is better routed through VPC endpoints, which avoids NAT costs and keeps traffic private.",
    "Application servers in private subnets download OS updates through a NAT gateway but cannot be reached directly from the internet.",
    "A NAT gateway provides outbound-only access. For inbound, use a load balancer. For AWS services such as S3, use VPC endpoints instead of NAT."
  ),
  'cn-9': n(
    "AWS Direct Connect, Azure ExpressRoute, and Google Cloud Interconnect provide dedicated private circuits between your data centre (or a colocation facility) and the cloud provider, bypassing the public internet. They offer consistent low latency, high bandwidth (1–100 Gbps), predictable performance, and often lower data-transfer costs than internet egress.\n\nThese links use BGP to exchange routes between your network and the cloud. They are private but not encrypted by default, so sensitive traffic may still need IPsec or MACsec on top. Provisioning takes weeks, and a single circuit is a single point of failure, so production designs use redundant connections at separate locations or a site-to-site VPN as backup.",
    "A bank connects its on-premises core systems to AWS with two Direct Connect circuits in different facilities, and an IPsec VPN as a third backup path.",
    "Private ≠ encrypted. Direct Connect traffic is not encrypted by default."
  ),
  'cn-10': n(
    "A transit gateway (AWS Transit Gateway, Azure Virtual WAN hub, Google Network Connectivity Center) is a managed cloud router that connects many VPCs, VPNs, and dedicated links through one central hub. Each network attaches once to the hub instead of peering with every other network, turning an unmanageable mesh into a hub-and-spoke design.\n\nThe transit gateway's route tables control which attachments can reach which: for example, production and development VPCs can both reach shared services but not each other. Transit gateways also make routing transitive, which peering cannot do, and let you centralise inspection by routing traffic through a security VPC with firewalls.",
    "Fifty application VPCs, two data centres, and branch VPNs all attach to one transit gateway, and route tables keep dev isolated from prod.",
    "Transit gateway = hub-and-spoke, transitive routing, central policy. VPC peering = point-to-point and non-transitive."
  ),

  // ---------- Cloud DNS & CDN ----------
  'cdn-1': n(
    "DNS is a distributed, hierarchical database. At the top are the root servers (13 named root server identities served by hundreds of anycast instances). Below them are the top-level domain (TLD) servers for .com, .org, .uk, .io, and so on, and below those are the authoritative name servers for each domain, which hold the actual records.\n\nWhen a recursive resolver needs www.example.com and has nothing cached, it asks a root server (which refers it to .com), asks a .com server (which refers it to example.com's name servers via NS records), and asks the authoritative server, which returns the answer. The resolver caches every step according to its TTLs. Understanding this chain helps debug delegation errors, stale caches, and propagation delays.",
    "`dig +trace www.example.com` shows the resolver walking from the root to .com to the authoritative server, revealing a mistyped NS record at the registrar.",
    "Changing name servers at the registrar changes delegation at the TLD level, which can take up to 48 hours because of NS record TTLs."
  ),
  'cdn-2': n(
    "Each DNS record type serves a purpose. A maps a name to an IPv4 address, and AAAA to an IPv6 address. CNAME makes a name an alias of another name; it cannot coexist with other records at the same name and is not allowed at the zone apex (providers offer ALIAS or ANAME records to fill that gap). MX lists mail servers with priority values, lower meaning preferred.\n\nTXT holds arbitrary text, heavily used for domain verification and for email security (SPF, DKIM, DMARC). NS delegates a zone or subdomain to name servers. PTR provides reverse lookups (IP to name), which mail servers check. SOA records zone authority and timers, SRV locates services (such as Active Directory and SIP), and CAA restricts which certificate authorities may issue certificates for the domain.",
    "A company adds TXT records for SPF (`v=spf1 include:_spf.google.com -all`) and DMARC to stop attackers spoofing its email domain.",
    "Dangling CNAMEs pointing to deleted cloud resources enable subdomain takeover. Remove DNS records when you decommission services."
  ),
  'cdn-3': n(
    "Managed cloud DNS services (Amazon Route 53, Azure DNS, Google Cloud DNS, Cloudflare DNS) host your authoritative zones on large anycast networks, providing very high availability (Route 53 offers a 100% availability SLA) and low query latency worldwide without running your own BIND servers.\n\nThey add capabilities that are hard to build yourself: health checks, traffic routing policies, private hosted zones that resolve only inside your VPCs, DNSSEC signing, API-driven changes for infrastructure as code, and fine-grained IAM control over who can change which records. Keep internal names in private zones, restrict change permissions tightly, and enable logging of queries and changes.",
    "An app's public zone example.com lives in Route 53 with DNSSEC enabled, while internal.example.com is a private hosted zone visible only inside the company's VPCs.",
    "Manage DNS as code (Terraform, CloudFormation) so every record change is reviewed and reversible."
  ),
  'cdn-4': n(
    "Cloud DNS routing policies make DNS an active traffic-management tool. Simple routing returns one or more fixed answers. Weighted routing splits traffic by percentage, useful for canary releases or gradual migrations. Latency-based routing answers with the region that gives the client the lowest latency. Geolocation routing answers by the user's country or continent, useful for data residency or localised content, and geoproximity biases traffic by distance.\n\nFailover routing returns a primary endpoint while its health check passes and automatically switches to a secondary when it fails. Multivalue answers return several healthy IPs. Combine policies with health checks and suitable TTLs: short TTLs make failover and cutovers quicker but increase query volume and cost.",
    "During a migration, weighted records send 10% of users to the new platform, then 50%, then 100%, with instant rollback by changing the weights.",
    "DNS failover is only as fast as the TTL plus health-check interval. Clients caching old answers keep hitting the failed endpoint until then."
  ),
  'cdn-5': n(
    "A CDN caches content at edge points of presence close to users. When a request arrives, the edge checks its cache using a cache key (typically the URL plus selected headers, query strings, or cookies). On a hit it serves immediately; on a miss it fetches from the origin, caches the result according to Cache-Control headers or CDN rules, and returns it.\n\nFreshness is managed with TTLs, versioned file names (app.3f9c1.js), and invalidation or purge requests. Beyond static files, CDNs accelerate dynamic content with connection reuse and optimised routes, and they terminate TLS, compress with Brotli or gzip, run bot management, and absorb DDoS attacks, so the origin can be locked down to accept traffic only from the CDN.",
    "A software company serves a 2 GB installer through a CDN; millions of downloads during a launch come from edge caches while the origin serves only a few thousand requests.",
    "Restrict the origin to accept only CDN traffic (IP allow-lists or an origin access identity) so attackers cannot bypass the CDN's protections."
  ),
  'cdn-6': n(
    "Edge computing runs code at CDN points of presence or other locations near users, rather than only in central cloud regions. Platforms such as Cloudflare Workers, AWS Lambda@Edge and CloudFront Functions, Fastly Compute, and Vercel Edge Functions execute lightweight functions within milliseconds of the user.\n\nTypical uses include authentication and token checks before requests reach the origin, redirects and URL rewrites, A/B test bucketing, geo-based personalisation, header manipulation, image resizing, and blocking bad bots. Edge functions have constraints: limited execution time and memory, restricted APIs, and data that often lives far away. Keep them small, stateless, and fast.",
    "An edge function validates a JWT and returns 401 at the edge for invalid tokens, so unauthenticated traffic never reaches the application servers.",
    "Use the edge for latency-sensitive, stateless logic; keep heavy business logic and data access in the core."
  ),
  'cdn-7': n(
    "A response can be cached at several layers: the user's browser cache, a CDN edge (and sometimes a regional mid-tier cache), a reverse proxy such as NGINX or Varnish in front of the app, and application or database caches such as Redis. A request stops at the first layer that has a fresh copy; misses fall through towards the origin.\n\nHTTP headers control most of this: Cache-Control (max-age for browsers, s-maxage for shared caches, no-store for sensitive data, private for per-user content), ETag and Last-Modified for revalidation, and Vary to separate variants. Each layer needs its own invalidation strategy. Stale content after a deploy is usually one forgotten layer.",
    "After a release, users still see the old JavaScript because browsers cached it for a year. Versioned file names (hash in the name) solve this cleanly.",
    "Mark authenticated and personal responses `Cache-Control: private, no-store` so shared caches never store them."
  ),
  'cdn-8': n(
    "Edge security stops attacks before they reach your infrastructure. DDoS protection at CDN and anycast scale absorbs volumetric floods (Layer 3/4), and challenges or rate-limits suspicious clients for application-layer (Layer 7) floods. A web application firewall inspects HTTP requests for attacks such as SQL injection, cross-site scripting, path traversal, and known exploits, using managed rule sets (often mapped to the OWASP Top 10) plus custom rules.\n\nBot management separates humans and good bots from scrapers and credential-stuffing tools, and rate limiting protects login and API endpoints. Tune WAF rules in 'count' or log mode first to avoid blocking legitimate users, and lock the origin so attackers cannot bypass the edge.",
    "During a 1 Tbps DDoS attack, the CDN's anycast network absorbs the traffic across hundreds of locations while the site stays online.",
    "A WAF is a compensating layer, not a fix. Still patch and fix the vulnerable code behind it."
  ),
  'cdn-9': n(
    "DNS Security Extensions add cryptographic signatures to DNS records. Each zone signs its records (RRSIG) with a private key; the matching public key (DNSKEY) is vouched for by a DS record in the parent zone, creating a chain of trust up to the root. Validating resolvers check these signatures and reject answers that have been tampered with.\n\nDNSSEC protects integrity and authenticity, which defends against cache poisoning and spoofed responses. It does not encrypt DNS queries; DNS over HTTPS (DoH) and DNS over TLS (DoT) provide confidentiality. DNSSEC adds operational risk: expired signatures or mishandled key rollovers make a domain unresolvable for validating resolvers, so managed providers that automate signing are strongly preferred.",
    "A validating resolver refuses a forged answer for bank.example because its signature does not verify against the zone's DNSKEY.",
    "DNSSEC = integrity and authenticity; DoH/DoT = confidentiality. A classic exam distinction."
  ),
  'cdn-10': n(
    "In dynamic environments such as containers, auto scaling groups, and serverless, service instances come and go with changing IP addresses, so services need a way to find healthy instances of each other. Service discovery maintains a registry of available endpoints and their health.\n\nPatterns include client-side discovery (the client queries a registry such as Consul or Eureka and chooses an instance), server-side discovery (the client calls a stable load balancer address that routes to healthy instances), and DNS-based discovery (Kubernetes Services, AWS Cloud Map), where names resolve to current endpoints. Service meshes such as Istio and Linkerd add discovery plus mutual TLS, retries, and traffic policy.",
    "In Kubernetes, the orders service calls http://payments.prod.svc.cluster.local, and the cluster DNS resolves it to the current healthy payment pods.",
    "Keep DNS TTLs low for discovery records, and health-check endpoints so dead instances drop out quickly."
  ),

  // ---------- Edge Networking & WAN ----------
  'enw-2': n(
    "Multiprotocol Label Switching is a carrier technology for building private WANs. At the edge of the provider network, packets are assigned a short label that represents a predetermined path (a label-switched path); core routers forward on labels rather than full IP lookups. This enables traffic engineering and Layer 3 VPNs that keep each customer's routes separate.\n\nProviders sell MPLS with service-level agreements for bandwidth, latency, jitter, and packet loss, plus QoS classes that prioritise voice and critical applications. It is reliable and predictable but expensive and slow to provision. MPLS is private but not encrypted, and it was designed for traffic to data centres, which fits poorly with cloud and SaaS. Many enterprises now use SD-WAN over broadband alongside or instead of MPLS.",
    "A retailer's MPLS network carries point-of-sale and voice traffic from 200 stores to its data centre with guaranteed low jitter.",
    "MPLS is private, not encrypted. Sensitive traffic may still need IPsec on top."
  ),
  'enw-3': n(
    "Software-defined WAN builds a centrally managed overlay across multiple underlying transports: MPLS, business broadband, 4G/5G, and satellite. Edge appliances at each site form encrypted tunnels with each other and with cloud gateways, while a central controller distributes policy.\n\nSD-WAN continuously measures latency, jitter, and packet loss on every path and steers each application to the best one according to policy, for example voice over the lowest-jitter link, backups over cheap broadband, and failover within seconds when a link degrades. Benefits include lower cost than MPLS alone, zero-touch provisioning of new branches, direct internet breakout for SaaS, and application-level visibility.",
    "When a branch's fibre link starts dropping packets, SD-WAN moves Teams calls to the 5G link within a second, and users notice nothing.",
    "SD-WAN handles connectivity; pair it with security (SASE/SSE) when branches break out directly to the internet."
  ),
  'enw-4': n(
    "Secure Access Service Edge, a term coined by Gartner, converges networking and security into a cloud-delivered service. It combines SD-WAN with Security Service Edge (SSE) components: secure web gateway (SWG), cloud access security broker (CASB), zero trust network access (ZTNA), and firewall as a service (FWaaS), all delivered from the provider's global points of presence.\n\nInstead of backhauling all traffic to a central data centre for inspection, users and branches connect to the nearest SASE PoP, where identity- and context-aware policy is enforced consistently wherever they are. This suits hybrid work and cloud-first organisations, and it simplifies operations by replacing a stack of appliances with one policy engine.",
    "A remote employee in Madrid and a branch in Chicago both reach SaaS apps through nearby SASE PoPs that apply the same DLP, malware scanning, and access policies.",
    "SSE = the security half of SASE (SWG, CASB, ZTNA, FWaaS). SASE = SSE + SD-WAN."
  ),
  'enw-5': n(
    "A Virtual Private Network creates an encrypted tunnel across an untrusted network such as the internet. Site-to-site VPNs connect whole networks (branch to headquarters, data centre to cloud VPC), usually with IPsec: IKE negotiates keys and ESP encrypts packets, typically in tunnel mode. Remote-access VPNs connect individual users, using IPsec/IKEv2 or TLS-based (SSL) VPN clients, or WireGuard.\n\nGood practice: strong modern cipher suites (AES-GCM, SHA-2, Diffie-Hellman group 14 or higher, or elliptic curve), certificate or MFA-based authentication rather than shared keys, split tunnelling decisions made consciously, and prompt patching, because VPN appliances are among the most exploited internet-facing devices. Traditional VPNs grant broad network access, which ZTNA narrows.",
    "A branch office connects to the cloud VPC with a redundant pair of IPsec tunnels using IKEv2 and certificates, with BGP for automatic failover.",
    "Patch VPN concentrators urgently. Many major breaches began with an unpatched VPN appliance vulnerability."
  ),
  'enw-6': n(
    "Zero Trust Network Access applies zero-trust principles to remote access: never trust based on network location, and always verify explicitly. Instead of putting the user 'on the network' as a VPN does, a ZTNA broker grants access to one specific application at a time, after checking user identity (SSO and MFA), device posture (managed, patched, encrypted, EDR running), and context such as location, time, and risk.\n\nApplications are hidden behind the broker ('dark') rather than exposed to the internet, which shrinks the attack surface and blocks lateral movement: a compromised laptop can reach only the apps its user is entitled to. ZTNA is especially valuable for contractors, third parties, and hybrid workforces.",
    "A contractor gets browser-based access to one internal ticketing app through ZTNA, with no route to any other internal system.",
    "ZTNA grants per-application access; a VPN grants network access. That reduces lateral movement after a compromise."
  ),
  'enw-7': n(
    "WAN optimisation improves application performance over slow, expensive, or high-latency links. Techniques include data deduplication (sending references to data already seen instead of repeating it), compression, caching of files and objects at the branch, TCP optimisation (larger windows, selective acknowledgements, reducing the effect of latency on throughput), and protocol acceleration for chatty protocols such as SMB and MAPI.\n\nIt was traditionally delivered by paired appliances at each end (for example Riverbed), and is now often built into SD-WAN or provided as a cloud service. Encryption limits some techniques, since encrypted data does not compress or deduplicate well, and much traffic now goes directly to SaaS rather than across the corporate WAN.",
    "A remote mining site on a satellite link opens large engineering files quickly because the WAN optimiser caches and deduplicates the repeated data.",
    "High latency, not just low bandwidth, is what WAN optimisation mostly fights. Chatty protocols suffer most."
  ),
  'enw-8': n(
    "5G mobile networks offer high bandwidth (hundreds of Mbps to multiple Gbps), low latency (single-digit milliseconds in ideal cases), and support for very dense device populations. Network slicing lets carriers dedicate logical slices with specific performance guarantees.\n\nPrivate LTE and private 5G let an organisation run its own cellular network on licensed, shared (such as CBRS in the US), or local spectrum across a factory, port, mine, or campus. Compared with Wi-Fi, they offer better mobility and handover, longer range, deterministic performance, and SIM-based device identity, which suits robots, autonomous vehicles, sensors, and critical communications. They are often used alongside Wi-Fi rather than replacing it.",
    "A port authority runs private 5G so automated cranes and trucks keep reliable, low-latency connections while moving across a large yard.",
    "SIM-based authentication gives strong device identity, but IoT devices on private cellular still need patching and segmentation."
  ),
  'enw-9': n(
    "Branch networks connect to each other and to central resources in a few patterns. Hub-and-spoke sends all branch traffic through a central hub (a data centre or cloud region), which centralises security inspection and simplifies policy, but adds latency for branch-to-branch traffic and makes the hub critical. Full mesh connects every site directly, giving the lowest latency and no single hub failure, at high cost and complexity.\n\nHybrid designs, made practical by SD-WAN, build dynamic tunnels between branches when needed, send SaaS traffic directly to the internet with local or cloud security, and backhaul only what must go to the data centre. The right choice depends on where applications live, traffic patterns, compliance requirements, and budget.",
    "A company moves from backhauling all traffic to headquarters to direct internet breakout for Microsoft 365, cutting latency for 80 branches.",
    "Design around where applications actually live. Cloud and SaaS-heavy organisations suffer most from full backhaul."
  ),
  'enw-10': n(
    "WAN observability measures how each link and application actually performs. Flow data (NetFlow, sFlow, IPFIX) shows who is talking to whom and which applications consume bandwidth. Synthetic monitoring sends regular test transactions (ping, HTTP, voice-quality probes) across each path to measure latency, jitter, and packet loss even when users are idle. Path intelligence tools (such as ThousandEyes-style path visualisation) show every hop, including inside ISP networks, to locate where degradation occurs.\n\nThis data proves or disproves carrier SLA breaches, pinpoints congestion, validates SD-WAN steering decisions, and speeds troubleshooting: 'is it the network, the ISP, or the SaaS provider?'",
    "Synthetic tests show packet loss starting inside one ISP's network every evening; the evidence gets the carrier to fix a congested peering link.",
    "Baseline normal performance first. You cannot recognise abnormal latency or loss without knowing what normal looks like."
  ),

  // ---------- Advanced Cloud Networking ----------
  'an-1': n(
    "At scale, a transit gateway becomes the backbone of cloud networking. Each VPC, VPN, and Direct Connect attachment connects once to the hub, and multiple transit gateway route tables implement segmentation: for example, production VPCs share one route table, development another, and both can reach a shared-services table, but not each other.\n\nCentralised inspection routes traffic between spokes, or to the internet, through an inspection VPC containing firewalls (often behind a Gateway Load Balancer), giving consistent security policy and logging. Transit gateways can peer across regions for global networks. Design considerations include per-attachment and data-processing costs, route table limits, and appliance mode for symmetric routing through stateful firewalls.",
    "Two hundred AWS accounts share one transit gateway through AWS RAM; all east-west and egress traffic passes through a central firewall VPC.",
    "Enable appliance mode when routing through stateful firewalls, otherwise asymmetric paths cause dropped return traffic."
  ),
  'an-2': n(
    "VPC peering is simple and fast, but it has important limits. It is non-transitive: A↔B and B↔C does not give A access to C, and traffic cannot use a peer's internet gateway, NAT gateway, VPN, or Direct Connect ('no edge-to-edge routing'). Overlapping CIDR blocks cannot be peered at all, and there is a limit on peering connections per VPC.\n\nBecause each connection needs routes on both sides, mesh peering between dozens of VPCs quickly becomes an operational burden. When you need transitive routing, centralised inspection, or many connections, use a transit gateway. When you only need to expose one service to consumers, possibly with overlapping ranges, use PrivateLink.",
    "After an acquisition, the new company's VPCs use the same 10.0.0.0/16 range, so peering fails. PrivateLink exposes the needed services instead.",
    "Overlapping CIDRs block peering. Central IPAM planning prevents it."
  ),
  'an-3': n(
    "AWS PrivateLink (and Azure Private Link, Google Private Service Connect) lets a consumer reach a specific service through a private endpoint in their own VPC, an elastic network interface with a private IP, without peering networks, using public IPs, or traversing the internet. The provider places the service behind a Network Load Balancer and publishes an endpoint service; consumers create interface endpoints to it.\n\nOnly the one service is exposed, not the whole network, which gives tight blast-radius control, and it works even when consumer and provider CIDRs overlap. It is widely used for SaaS vendors serving customers privately, for sharing internal services across accounts, and for reaching cloud provider services (such as S3, STS, and Secrets Manager) without internet paths.",
    "A security vendor offers its log-ingestion API via PrivateLink, so customers send logs from private subnets without any internet egress.",
    "Combine interface endpoints with endpoint policies and security groups to control exactly who can use them."
  ),
  'an-4': n(
    "Border Gateway Protocol is how cloud and on-premises routers exchange routes dynamically over VPNs, Direct Connect, ExpressRoute, and transit gateways. Each side has an autonomous system number (ASN) and advertises the prefixes it owns; when a link fails, routes are withdrawn and traffic shifts to another path automatically, without manual static-route changes.\n\nPath selection is steered with BGP attributes: AS-path prepending makes a path look longer (less preferred), local preference decides which exit your network prefers outbound, MED suggests which entry point a neighbour should use inbound, and communities tag routes for provider-specific behaviour. Plan ASNs, filter which prefixes are advertised and accepted, and use BFD for fast failure detection.",
    "A company advertises its on-prem prefixes over two Direct Connect links, prepending on the backup link so AWS prefers the primary until it fails.",
    "Always filter BGP advertisements. Leaking a default route or wrong prefixes can blackhole traffic across the whole network."
  ),
  'an-5': n(
    "Controlling egress, the traffic leaving your environment, is key both for security (stopping data exfiltration and malware call-backs) and for cost. Options include NAT gateways per AZ, egress-only internet gateways for IPv6, centralised egress VPCs where all outbound traffic passes through firewalls or proxies, domain-based filtering (for example AWS Network Firewall or a secure web gateway), and TLS inspection where policy allows.\n\nAt high scale, NAT has limits: each NAT IP supports about 55,000 simultaneous connections to the same destination IP and port, so large fleets calling one API can hit port exhaustion; the fix is multiple NAT IPs or gateways, connection reuse, and VPC endpoints for provider services. Data-processing charges on NAT gateways can also be surprisingly large.",
    "A batch job opening thousands of short connections to one external API starts failing randomly because it exhausts the NAT gateway's ports to that destination.",
    "Default-deny egress with an allow-list of required domains is one of the most effective defences against exfiltration and C2 traffic."
  ),
  'an-6': n(
    "Network segmentation limits what can talk to what, so one compromised workload cannot freely reach everything else (lateral movement). Cloud networks provide several layers: separate accounts and VPCs per environment or sensitivity, subnet tiers with route tables, network ACLs at subnet boundaries, security groups referencing each other per workload, and micro-segmentation at the workload or container level through Kubernetes network policies and service-mesh authorisation.\n\nZero-trust networking takes this further: every connection is explicitly allowed based on workload identity (not just IP), encrypted (mTLS), and logged. Defence in depth means these controls overlap, so one misconfiguration does not open everything.",
    "A payment service's pods accept connections only from the checkout service's identity via mesh policy, even though both run in the same cluster and subnet.",
    "Segment by sensitivity and blast radius: PCI and production data should be isolated from development and general workloads."
  ),
  'an-7': n(
    "Hybrid cloud routing connects on-premises data centres and branch networks with cloud networks so applications can span both. Connectivity usually combines dedicated links (Direct Connect, ExpressRoute) for performance with IPsec VPNs as backup, attached to virtual gateways or transit gateways, with BGP exchanging routes.\n\nCareful design matters: advertise only the prefixes each side needs (summarise where possible), avoid overlapping ranges, prefer private links over the internet using BGP attributes, keep routing symmetric through stateful firewalls, and plan DNS resolution in both directions (for example Route 53 Resolver inbound and outbound endpoints). BFD detects link failures within a second, so failover happens quickly.",
    "On-prem applications resolve cloud private zones through Route 53 Resolver inbound endpoints, and traffic prefers Direct Connect with a VPN as automatic backup.",
    "Hybrid DNS is the most overlooked part of hybrid networking. Plan conditional forwarding in both directions."
  ),
  'an-8': n(
    "Network observability in the cloud combines several data sources. VPC Flow Logs record metadata for each flow (source and destination IP and port, protocol, bytes, and accept or reject), which shows who talked to whom and which connections were blocked. Traffic or packet mirroring copies full packets to analysis tools. DNS query logs reveal what names workloads resolve, which is valuable for spotting malware. Reachability analysers trace the configured path between two resources through route tables, security groups, and gateways without sending traffic.\n\nSynthetic probes test real connectivity and latency continuously. Together, these catch misconfigurations, micro-outages, and suspicious traffic before users or attackers do, and they are essential evidence during incident response.",
    "Flow logs show thousands of rejected connections from a compromised instance scanning the subnet on port 22, triggering an automated isolation.",
    "Flow logs do not contain payloads. Use traffic mirroring and IDS when you need content."
  ),
  'an-9': n(
    "Cloud load balancers come in modes with different trade-offs. Layer 4 (network) load balancers forward TCP/UDP flows with very high throughput and low latency, can preserve the client's source IP, and support static IPs. Layer 7 (application) load balancers terminate HTTP, inspect it, and route by host, path, header, or query string, adding features such as redirects, authentication, WAF integration, and gRPC and WebSocket support.\n\nProxy load balancers terminate the client connection and open a new one to the backend (full control and visibility, but the backend sees the proxy's IP unless X-Forwarded-For or proxy protocol is used). Pass-through load balancers forward packets without terminating them (lowest latency, less visibility). Modern designs also use mTLS to backends, cross-zone balancing, slow start for new targets, and connection draining.",
    "A gaming backend uses a pass-through NLB for UDP game traffic and an ALB for the HTTP login and matchmaking APIs.",
    "Terminating TLS at the load balancer means traffic to backends may be unencrypted unless you re-encrypt. Check the compliance requirements."
  ),
  'an-10': n(
    "Advanced DNS routing chooses which answer each client receives. Geolocation and geoproximity route by user location for data residency or regional content; latency-based routing picks the fastest region; weighted routing splits traffic for canaries and migrations; failover routing switches to standby endpoints when health checks fail; and IP-based routing (CIDR routing) maps specific client networks to specific endpoints.\n\nThese policies enable active-active global architectures and fast disaster-recovery cutovers. TTLs are the balancing act: low TTLs (30–60 seconds) during change windows make cutovers responsive but increase query volume and cost, while higher TTLs suit stable endpoints. Remember that some clients and resolvers ignore TTLs, so keep old endpoints running briefly after a switch.",
    "A streaming service routes EU users to Frankfurt (data residency), everyone else by latency, and fails over automatically if a region's health checks fail.",
    "Health checks should test the full stack (for example an application endpoint), not just whether the load balancer answers."
  ),
  'acn-1': n(
    "Well-designed VPC architecture starts with clear boundaries. Many organisations use a multi-account strategy (separate accounts for production, development, security, and shared services) with one or more VPCs per account, because accounts provide the strongest isolation for permissions, billing, and blast radius.\n\nInside each VPC: non-overlapping CIDRs from a central IPAM plan, subnet tiers (public, private, isolated data) across at least two or three Availability Zones, route tables per tier, and gateways added only where needed. Connectivity between VPCs uses peering for a few links, a transit gateway for many, and PrivateLink for exposing individual services. Flow logs and DNS logs are enabled everywhere from the start.",
    "A landing zone automatically creates a standardised VPC in each new account, with private subnets across three AZs, attached to the central transit gateway.",
    "Account boundaries are the strongest isolation in the cloud; a VPC boundary is second."
  ),
  'acn-2': n(
    "IP address management (IPAM) plans and tracks address allocation so ranges never overlap across VPCs, regions, accounts, and on-premises networks. Start from a large private block (for example 10.0.0.0/8), assign regions and environments summarisable ranges (10.16.0.0/12 for one region, split further by environment), and record every allocation centrally, for example with AWS VPC IPAM or a dedicated IPAM tool.\n\nSize subnets for growth: container platforms and serverless functions can consume many IPs, and providers reserve some addresses in every subnet. Keep spare ranges for future expansion and inter-VPC links, and adopt IPv6 alongside IPv4 where supported to ease exhaustion. Poor early planning becomes expensive when networks must be joined later.",
    "An EKS cluster runs out of IPs in its /24 subnets because every pod takes a VPC IP; the fix requires adding secondary CIDRs and redesigning subnets.",
    "Summarisable, non-overlapping allocations keep routing tables small and make future mergers and hybrid links far easier."
  ),
  'acn-3': n(
    "Security groups and network ACLs are complementary cloud firewalls. Security groups attach to network interfaces (instances, load balancers, databases), are stateful (return traffic is automatically allowed), support allow rules only, and are evaluated as a whole. Network ACLs attach to subnets, are stateless (you must allow return traffic explicitly, including ephemeral ports 1024–65535), support both allow and deny rules, and are evaluated in rule-number order.\n\nUse security groups as the primary, fine-grained control, referencing other security groups instead of IP ranges. Use NACLs for coarse subnet-level guardrails, such as explicitly denying known-bad ranges or blocking whole categories of traffic between tiers. Together they give defence in depth.",
    "A NACL denies inbound traffic from an attacker's IP range to every subnet, while security groups continue to control which services talk to which.",
    "A stateless NACL that allows inbound 443 but forgets outbound ephemeral ports silently breaks connections. A classic troubleshooting trap."
  ),
  'acn-4': n(
    "Choosing a load-balancing strategy depends on the protocol and the features needed. Layer 4 network load balancers suit TCP/UDP, extreme throughput, static IPs, source IP preservation, and non-HTTP protocols. Layer 7 application load balancers suit HTTP/HTTPS with host and path routing, redirects, header-based rules, authentication integration, TLS termination with managed certificates, and WAF attachment.\n\nWithin a pool, algorithms such as round robin or least outstanding requests spread load, while sticky sessions keep a user on one target (useful for legacy stateful apps, but it hinders even scaling). Global load balancing across regions uses DNS policies or anycast front ends. Balance latency, cost, observability, and security requirements when choosing.",
    "A company uses an ALB with path-based routing for its microservices and a separate NLB for an MQTT IoT broker that needs static IPs for device firewall rules.",
    "Prefer stateless applications over sticky sessions. Stickiness makes scaling uneven and failover disruptive."
  ),
  'acn-5': n(
    "Private connectivity keeps traffic off the public internet or protects it across it. Site-to-site VPNs encrypt traffic over the internet: quick to set up and cheap, but performance varies with internet conditions and each tunnel has limited bandwidth. Dedicated connections (AWS Direct Connect, Azure ExpressRoute, Google Cloud Interconnect) provide private circuits with consistent latency and high bandwidth, but take weeks to provision and are not encrypted by default.\n\nPrivate Link and private endpoints expose individual services privately inside your VPC. Production designs typically combine a dedicated connection for primary traffic, a VPN for backup or encryption overlay, and private endpoints for cloud services, all with BGP for dynamic failover.",
    "A hospital uses ExpressRoute for its EHR integration with Azure, with a site-to-site VPN as backup, and private endpoints for Azure SQL and Storage.",
    "Match the option to the need: fast setup = VPN; consistent high bandwidth = dedicated link; single-service exposure = PrivateLink."
  ),
  'acn-6': n(
    "Cloud DNS is a traffic-management layer. Public hosted zones publish internet-facing names; private hosted zones resolve names only inside associated VPCs, enabling internal names such as db.internal.example.com without exposing them. Hybrid resolvers (such as Route 53 Resolver endpoints) forward queries between on-premises DNS and cloud private zones.\n\nRouting policies (weighted, latency-based, geolocation, and failover with health checks) steer users to the right endpoints, enabling active-active multi-region deployments and disaster-recovery cutovers. Combine low TTLs during changes with higher TTLs for stability, enable DNSSEC for public zones, and log queries for security monitoring.",
    "A two-region application uses latency routing with health checks so users go to the nearest healthy region, while private zones handle internal service names.",
    "DNS query logs are a strong security signal. Malware often reveals itself through unusual domain lookups."
  ),
  'acn-7': n(
    "Service endpoints and private endpoints let workloads reach cloud provider services (object storage, databases, secrets managers, queues) and SaaS offerings over private IP addresses rather than public endpoints. AWS offers gateway endpoints (S3 and DynamoDB, routed through route tables at no extra charge) and interface endpoints powered by PrivateLink; Azure offers Private Endpoints; Google offers Private Service Connect.\n\nBenefits include removing the need for NAT or internet access for these services, reducing data-transfer costs, and a better security posture. Resource policies can require that data is only accessed through your private endpoint (for example an S3 bucket policy with aws:SourceVpce), which blocks access from anywhere else even with valid credentials.",
    "An S3 bucket policy allows access only via the company's VPC endpoint, so stolen access keys used from the internet are denied.",
    "Endpoint policies plus resource policies are a strong defence against data exfiltration with stolen credentials."
  ),
  'acn-8': n(
    "Packet or traffic mirroring copies network traffic from chosen interfaces (entire packets, not just metadata) and sends it to a collector or appliance for analysis. In the cloud, AWS VPC Traffic Mirroring, Azure virtual network TAP, and Google Packet Mirroring provide this without physical taps.\n\nMirrored traffic feeds intrusion detection and prevention systems (Suricata, Snort), network security monitoring tools (Zeek), forensic capture during incidents, and performance troubleshooting. Because full packets can include sensitive data, restrict and secure the collectors. Mirroring every interface all the time is expensive, so mirror critical segments or enable it on demand, and use flow logs for broad coverage.",
    "During an incident, the SOC mirrors a suspected compromised instance's traffic to a Zeek sensor and discovers DNS tunnelling to an attacker's domain.",
    "Flow logs tell you who talked to whom; mirroring tells you what was said. Use each where it fits."
  ),
};
