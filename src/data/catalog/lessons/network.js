// Reading content for the Network Engineering course, keyed by lesson (deck) id.
// Strings support `inline code` only. See the LessonContent typedef in ../schema.js.

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'net-osi': {
    overview: [
      'Every network conversation, whether it is a browser loading a page or a switch forwarding a frame, is a stack of smaller jobs handled in a fixed order. Layered models give each job a name. That gives engineers a shared vocabulary ("it is a Layer 2 problem") and a disciplined way to troubleshoot: test one layer, prove it works, then move to the next.',
      'By the end of this lesson you will be able to name the seven OSI layers in order, say what each one does, identify the data unit at each layer, explain encapsulation, and map OSI onto the four-layer TCP/IP model that real networks run on.',
    ],
    learn: [
      {
        heading: 'Why networks are described in layers',
        body: [
          'A layer is a job with a clear boundary. Each layer serves the layer above it and relies on the layer below, without needing to know how either one works inside. That separation is why you can replace Wi-Fi with Ethernet without changing your browser, or move a website from HTTP to HTTPS without rewiring the building.',
        ],
        points: [
          'Vocabulary: "a Layer 3 issue" tells a colleague to check IP addressing and routing, not cabling.',
          'Troubleshooting: test layer by layer and stop at the first one that fails.',
          'Interoperability: because each boundary is standardised, equipment from different vendors works together.',
        ],
      },
      {
        heading: 'The seven OSI layers',
        body: [
          'The Open Systems Interconnection (OSI) model, published by ISO, divides network communication into seven layers. Layer 1 sits closest to the wire and Layer 7 closest to the user. Read the stack from the bottom up, the way data arrives off the network.',
        ],
        visual: 'osi-stack',
        points: [
          'Media layers: Layers 1 to 3 move data between devices, hop by hop, across the network.',
          'Host layers: Layers 4 to 7 run end to end, between the two hosts that are talking.',
          'In practice: Layers 5 and 6 rarely appear as separate protocols. Their jobs are usually done inside the application or by TLS, which exams place at Layer 6.',
        ],
        note: {
          label: 'Memory aid',
          text: 'From Layer 1 up: "Please Do Not Throw Sausage Pizza Away" (Physical, Data Link, Network, Transport, Session, Presentation, Application). From Layer 7 down: "All People Seem To Need Data Processing."',
        },
      },
      {
        heading: 'PDUs and encapsulation',
        body: [
          'Each layer has its own name for the unit of data it handles, called its protocol data unit (PDU). Using the right name tells people which layer you mean: a switch forwards frames, while a router forwards packets.',
          'As data moves down the sender\'s stack, each layer wraps what it receives in its own header. This is encapsulation. The Data Link layer also adds a trailer, the frame check sequence (FCS), which lets the receiver detect a corrupted frame. The receiver reverses the process, removing one header per layer on the way up. This is de-encapsulation.',
        ],
        visual: 'encapsulation',
        table: {
          columns: ['Layer', 'PDU', 'What its header adds'],
          rows: [
            ['4 Transport', 'Segment (TCP) or datagram (UDP)', 'Source and destination port numbers'],
            ['3 Network', 'Packet', 'Source and destination IP addresses'],
            ['2 Data Link', 'Frame', 'Source and destination MAC addresses, plus the FCS trailer'],
            ['1 Physical', 'Bits', 'No header: the frame becomes signals on the medium'],
          ],
        },
        note: {
          label: 'Exam tip',
          text: 'A router de-encapsulates only as far as Layer 3. It discards the incoming frame, reads the destination IP address, and builds a new frame for the next link. The IP packet crosses the whole path; the frame is rebuilt at every hop.',
        },
      },
      {
        heading: 'The TCP/IP model',
        body: [
          'OSI is the reference language. TCP/IP is the protocol suite the internet actually runs on, and its model has four layers. Each TCP/IP layer covers one or more OSI layers.',
        ],
        visual: 'tcpip-map',
        note: {
          label: 'Watch for',
          text: 'The original specification (RFC 1122) defines four layers. Some textbooks split Link into Physical and Data Link to make a five-layer model. If a question says "the TCP/IP model" without qualification, assume four layers.',
        },
      },
      {
        heading: 'Using the model to troubleshoot',
        body: [
          'Layers turn a vague complaint such as "the internet is down" into an ordered set of tests. Start at the bottom, confirm each layer works, and stop at the first one that fails. That is where the fault is.',
        ],
        table: {
          columns: ['Layer', 'Question to ask', 'Quick check'],
          rows: [
            ['1 Physical', 'Is there a signal?', 'Link light on, cable seated, Wi-Fi associated'],
            ['2 Data Link', 'Can I reach the local network?', '`arp -a` lists the default gateway\'s MAC address'],
            ['3 Network', 'Do I have a valid address and route?', '`ipconfig` or `ip addr`, then `ping` the gateway'],
            ['4 Transport', 'Is the service port reachable?', '`Test-NetConnection host -Port 443`'],
            ['7 Application', 'Does the service respond correctly?', '`nslookup` the name, then open the URL'],
          ],
        },
      },
    ],
    cheatSheet: [
      ['L7 Application', 'Network services for apps: HTTP, DNS, SMTP, SSH'],
      ['L6 Presentation', 'Encoding, compression, encryption (TLS)'],
      ['L5 Session', 'Opens, manages and closes sessions'],
      ['L4 Transport', 'Ports; segments (TCP) or datagrams (UDP)'],
      ['L3 Network', 'IP addressing and routing; packets; routers'],
      ['L2 Data Link', 'MAC addressing; frames; switches'],
      ['L1 Physical', 'Signals, cables, connectors; bits; hubs'],
      ['Encapsulation', 'Each layer adds a header on the way down; L2 also adds the FCS'],
      ['TCP/IP model', 'Link (L1–2), Internet (L3), Transport (L4), Application (L5–7)'],
      ['Mnemonic (1 to 7)', 'Please Do Not Throw Sausage Pizza Away'],
    ],
  },

  'net-ports': {
    overview: [
      'A port number tells the receiving host which service a segment is for. Knowing the common ports lets you read firewall rules, spot suspicious traffic and answer a large share of Network+ and Security+ questions.',
      'This lesson covers TCP versus UDP, the three-way handshake, and the well-known ports grouped by job, including which cleartext protocols to replace with secure ones.',
    ],
    learn: [
      {
        heading: 'TCP and UDP',
        body: [
          'TCP is connection-oriented. It opens a connection with a three-way handshake (SYN, SYN-ACK, ACK), numbers every byte, acknowledges receipt, retransmits losses and delivers data in order. It closes with FIN/ACK exchanges, or abruptly with RST.',
          'UDP is connectionless and best-effort: no handshake, no acknowledgements, no ordering. That makes it lighter and faster, which suits DNS queries, VoIP, video, and protocols that handle reliability themselves, such as QUIC (HTTP/3 runs over UDP 443).',
        ],
      },
      {
        heading: 'Remote access and file transfer',
        body: [
          'SSH uses 22/TCP and also carries SFTP and SCP. Telnet (23/TCP) sends everything, passwords included, in cleartext; replace it with SSH. RDP uses 3389/TCP and should never be exposed directly to the internet.',
          'FTP uses 21/TCP for control and 20/TCP for active-mode data, all in cleartext. SMB, Windows file sharing, uses 445/TCP; block it at the internet edge.',
        ],
      },
      {
        heading: 'Web, email and infrastructure services',
        body: [
          'HTTP uses 80/TCP and HTTPS 443/TCP. SMTP uses 25/TCP between mail servers; mail submission from clients uses 587, and SMTPS 465.',
          'DNS uses 53: UDP for most queries, TCP for zone transfers and large responses. DHCP uses UDP 67 (server) and 68 (client). NTP uses 123/UDP, and accurate time is critical for Kerberos authentication and log correlation.',
          'For management and directories: SNMP uses UDP 161 for polling and 162 for traps (use SNMPv3 for encryption), Syslog 514/UDP (6514/TCP when protected with TLS), LDAP 389 and LDAPS 636.',
        ],
      },
    ],
    examples: [
      {
        title: 'See what is listening, and test one port',
        code: [
          '# Windows: listening ports with the owning process ID',
          'netstat -ano | findstr LISTENING',
          '',
          '# Linux: listening TCP/UDP sockets and processes',
          'ss -tulpn',
          '',
          '# Test whether a remote TCP port answers (PowerShell)',
          'Test-NetConnection 10.0.0.5 -Port 3389',
        ].join('\n'),
        explanation: 'Compare what is listening with what should be: an unexpected 23 or 3389 is worth investigating.',
      },
    ],
    cheatSheet: [
      ['20/21 TCP', 'FTP data / control (cleartext)'],
      ['22 TCP', 'SSH, SFTP, SCP'],
      ['23 TCP', 'Telnet (cleartext: replace with SSH)'],
      ['25 / 587 / 465', 'SMTP / submission / SMTPS'],
      ['53 UDP+TCP', 'DNS (TCP for zone transfers)'],
      ['67/68 UDP', 'DHCP server / client'],
      ['80 / 443', 'HTTP / HTTPS (HTTP/3 on UDP 443)'],
      ['123 UDP', 'NTP'],
      ['161/162 UDP', 'SNMP polling / traps'],
      ['389 / 636', 'LDAP / LDAPS'],
      ['445 TCP', 'SMB'],
      ['514 UDP', 'Syslog (6514/TCP with TLS)'],
      ['3389 TCP', 'RDP'],
      ['SYN, SYN-ACK, ACK', 'TCP three-way handshake'],
    ],
  },

  'net-devices-media': {
    overview: [
      'Before any protocol matters, traffic needs something to travel over and devices to move it. Choosing the right cable, knowing its limits, and understanding what each device does with traffic are the foundations of every network design and many troubleshooting calls.',
      'This lesson covers hubs, switches, routers and load balancers, collision and broadcast domains, copper and fibre media, connectors, Power over Ethernet and the common topologies.',
    ],
    learn: [
      {
        heading: 'Devices and domains',
        body: [
          'A hub is a Layer 1 device that repeats every signal out every port, so all attached devices share one collision domain. Hubs are obsolete. A switch is a Layer 2 device that learns which MAC address lives on which port and forwards each frame only where it needs to go, so every switch port is its own collision domain.',
          'A switch still floods broadcasts to every port in the same VLAN, so the whole switch (per VLAN) is one broadcast domain. A router is a Layer 3 device that forwards packets between networks by IP address and does not forward broadcasts, so each router interface separates broadcast domains.',
          'A load balancer distributes incoming traffic across several servers, improving availability and scale, and often terminates TLS.',
        ],
      },
      {
        heading: 'Copper and fibre',
        body: [
          'Twisted-pair Ethernet (Cat 5e, Cat 6, Cat 6a) is terminated with RJ45 connectors; RJ11 is the smaller telephone connector. Copper Ethernet runs are limited to 100 metres. Cat 6 carries 10 Gbps only to about 55 metres, while Cat 6a carries 10 Gbps the full 100 metres.',
          'Fibre is immune to electrical interference and goes much farther. Single-mode fibre uses a laser and a narrow core to reach kilometres; multimode fibre uses a wider core for shorter runs inside buildings and data centres. Common fibre connectors include LC and SC.',
          'Power over Ethernet (PoE) delivers power over the data cable to phones, wireless access points and cameras: 802.3af (PoE), 802.3at (PoE+) and 802.3bt (PoE++), each supplying more power than the last.',
        ],
      },
      {
        heading: 'Topologies',
        body: [
          'In a star topology every node connects to a central device; most Ethernet LANs are a star, or a hierarchy of stars, around switches. A full mesh connects every node to every other node, giving the most redundancy but needing n(n-1)/2 links, so it is usually reserved for the network core or the WAN.',
        ],
      },
    ],
    cheatSheet: [
      ['Hub', 'L1: repeats everything; one collision domain'],
      ['Switch', 'L2: forwards by MAC; each port a collision domain'],
      ['Router', 'L3: forwards by IP; separates broadcast domains'],
      ['Load balancer', 'Spreads traffic across servers'],
      ['100 m', 'Maximum copper Ethernet run'],
      ['Cat 6a', '10 Gbps to 100 m (Cat 6: ~55 m)'],
      ['Single-mode fibre', 'Laser, narrow core, kilometres'],
      ['Multimode fibre', 'Wider core, shorter runs'],
      ['RJ45 / RJ11', 'Ethernet / telephone'],
      ['PoE: af / at / bt', 'PoE / PoE+ / PoE++'],
      ['Full mesh links', 'n(n-1)/2'],
    ],
  },

  'net-ip-subnet': {
    overview: [
      'Subnetting is the maths behind every IP plan, firewall rule and routing table. It looks intimidating until you see it is just counting in powers of two, and then it becomes one of the fastest points to win on an exam.',
      'This lesson covers CIDR prefixes and masks, counting hosts, finding network and broadcast addresses, private and special ranges, NAT, and the IPv6 basics every administrator needs.',
    ],
    learn: [
      {
        heading: 'CIDR, masks and host counts',
        body: [
          'An IPv4 address is 32 bits. The CIDR prefix says how many leading bits are the network part: in /24 the first 24 bits are network and the remaining 8 are host. The subnet mask writes the same thing in dotted decimal: /24 is 255.255.255.0, and /27 is 255.255.255.224, because the last octet is 11100000.',
          'Usable hosts = 2^(host bits) − 2, since the first address is the network address and the last is the broadcast. A /24 has 8 host bits: 256 − 2 = 254. A /26 has 6: 64 − 2 = 62. A /30 has 2: 4 − 2 = 2, the classic size for point-to-point links (RFC 3021 also allows /31 there).',
        ],
      },
      {
        heading: 'Network and broadcast addresses: the block-size method',
        body: [
          'The block size is 256 minus the interesting octet of the mask. For /26 the mask ends in 192, so blocks are 256 − 192 = 64 addresses long: .0, .64, .128, .192.',
          'To place 192.168.10.64/26, find the block it falls in: .64 to .127. So the network address is 192.168.10.64, the broadcast is 192.168.10.127, and hosts run from .65 to .126.',
        ],
      },
      {
        heading: 'Private, special and translated addresses',
        body: [
          'RFC 1918 reserves three private ranges that are not routed on the internet: 10.0.0.0/8, 172.16.0.0/12 (172.16.0.0 to 172.31.255.255) and 192.168.0.0/16.',
          '127.0.0.1 is the IPv4 loopback address. A host showing 169.254.x.x has given itself an APIPA address because DHCP failed: check the DHCP server, scope exhaustion, cabling or the VLAN.',
          'NAT translates private addresses to a public one at the edge; PAT (port address translation) lets many hosts share a single public IP by tracking source ports. NAT hides addresses but is not a security control on its own.',
        ],
      },
      {
        heading: 'IPv6 essentials',
        body: [
          'IPv6 addresses are 128 bits, written as eight groups of four hex digits. Leading zeros in a group can be dropped, and one run of all-zero groups can be replaced with `::`. The loopback is `::1`.',
          'Every IPv6 interface automatically has a link-local address in `fe80::/10`, which is never routed. SLAAC (Stateless Address Autoconfiguration) lets a host build its own global address from router advertisements; DHCPv6 is the stateful alternative.',
        ],
      },
    ],
    examples: [
      {
        title: 'Worked example: 192.168.10.64/26',
        code: [
          'Prefix      /26  -> 26 network bits, 6 host bits',
          'Mask        255.255.255.192',
          'Block size  256 - 192 = 64   -> blocks .0 .64 .128 .192',
          'Network     192.168.10.64',
          'First host  192.168.10.65',
          'Last host   192.168.10.126',
          'Broadcast   192.168.10.127',
          'Usable      2^6 - 2 = 62 hosts',
        ].join('\n'),
        explanation: 'The same four steps work for any prefix: host bits, block size, find the block, then first, last and broadcast.',
      },
      {
        title: 'Check a host\'s addressing',
        code: [
          'ipconfig /all          # Windows: address, mask, gateway, DNS, DHCP server',
          'ip addr                # Linux: addresses per interface (IPv4 and IPv6)',
          'ip route               # Linux: routing table and default gateway',
        ].join('\n'),
        explanation: 'A 169.254 address or a missing default gateway here usually means DHCP never answered.',
      },
    ],
    cheatSheet: [
      ['Usable hosts', '2^(host bits) − 2'],
      ['/24 · /26 · /30', '254 · 62 · 2 hosts'],
      ['/27 mask', '255.255.255.224'],
      ['Block size', '256 − interesting mask octet'],
      ['RFC 1918', '10/8, 172.16/12, 192.168/16'],
      ['169.254.x.x', 'APIPA: DHCP failed'],
      ['127.0.0.1 / ::1', 'IPv4 / IPv6 loopback'],
      ['IPv6 length', '128 bits (IPv4: 32)'],
      ['fe80::/10', 'IPv6 link-local'],
      ['SLAAC', 'IPv6 self-configuration from router advertisements'],
      ['PAT', 'Many private hosts share one public IP via ports'],
    ],
  },

  'net-services-wireless': {
    overview: [
      'Users never see DNS or DHCP until they break, and then nothing works. Wireless is now the default way most devices connect. Together these services decide whether people can get on the network and find anything once they are there.',
      'This lesson covers DNS record types, how DHCP hands out addresses (and relays across subnets), Wi-Fi standards and channels, and securing wireless with WPA3 and 802.1X.',
    ],
    learn: [
      {
        heading: 'DNS records',
        body: [
          'DNS translates names into addresses. An A record maps a name to an IPv4 address and AAAA to IPv6. A CNAME makes one name an alias for another; a CNAME cannot sit at the zone apex (example.com itself), which is why many providers offer an ALIAS record type.',
          'MX records name a domain\'s mail servers, each with a preference value where lower is preferred. PTR records do reverse lookups (IP to name) in the in-addr.arpa (IPv4) or ip6.arpa zones. TXT records hold free text, which email security relies on: SPF, DKIM and DMARC policies all live in TXT records, as do domain-verification strings.',
        ],
      },
      {
        heading: 'DHCP',
        body: [
          'A client gets its address through four messages, remembered as DORA: Discover, Offer, Request, Acknowledge. Discover and Request are broadcasts from the client, because it has no address yet.',
          'Routers do not forward broadcasts, so a central DHCP server serving many subnets needs a DHCP relay (called an IP helper on Cisco) on each subnet\'s router interface. The relay forwards the broadcasts to the server as unicast.',
        ],
      },
      {
        heading: 'Wi-Fi standards and channels',
        body: [
          'Wi-Fi 6 is 802.11ax; Wi-Fi 6E extends it into the 6 GHz band, and Wi-Fi 7 is 802.11be. In the 2.4 GHz band only channels 1, 6 and 11 do not overlap (in the US), so plan access points on those three to avoid co-channel and adjacent-channel interference.',
          'The SSID is simply the network\'s name. Hiding it is not a security control: the name still appears in client probes.',
        ],
      },
      {
        heading: 'Securing wireless',
        body: [
          'Use WPA3 today. WPA3-Personal replaces the pre-shared-key handshake with SAE, which resists offline password guessing; WPA3-Enterprise authenticates each user with 802.1X. WEP and the original WPA are broken.',
          '802.1X is port-based network access control, used on wired switch ports as well as Wi-Fi. It has three roles: the supplicant (the client), the authenticator (the switch or access point) and the authentication server (usually RADIUS). No traffic passes until the server approves the client.',
        ],
      },
    ],
    examples: [
      {
        title: 'Query records directly',
        code: [
          'nslookup -type=MX example.com',
          'dig example.com AAAA +short',
          'dig -x 8.8.8.8 +short          # reverse (PTR) lookup',
          'dig example.com TXT +short     # SPF / verification records',
        ].join('\n'),
        explanation: 'Querying a record type directly shows exactly what DNS returns, bypassing application caches.',
      },
      {
        title: 'DHCP relay on a router interface (Cisco IOS)',
        code: ['interface Vlan20', ' ip address 10.20.0.1 255.255.255.0', ' ip helper-address 10.0.0.10'].join('\n'),
        explanation: 'Clients in VLAN 20 broadcast Discover; the router forwards it to the DHCP server at 10.0.0.10.',
      },
    ],
    cheatSheet: [
      ['A / AAAA', 'Name → IPv4 / IPv6'],
      ['CNAME', 'Alias to another name (not at the apex)'],
      ['MX', 'Mail servers; lower preference wins'],
      ['PTR', 'Reverse lookup, IP → name'],
      ['TXT', 'SPF, DKIM, DMARC, verification'],
      ['DORA', 'Discover, Offer, Request, Acknowledge'],
      ['DHCP relay / IP helper', 'Forwards DHCP broadcasts across subnets'],
      ['802.11ax / be', 'Wi-Fi 6 / Wi-Fi 7 (6E adds 6 GHz)'],
      ['1, 6, 11', 'Non-overlapping 2.4 GHz channels (US)'],
      ['WPA3 (SAE)', 'Current Wi-Fi security; WEP/WPA broken'],
      ['802.1X', 'Supplicant, authenticator, RADIUS server'],
    ],
  },

  'net-troubleshoot': {
    overview: [
      'Troubleshooting is the skill employers actually pay for, and it is a quarter of the Network+ exam. A consistent method stops you from changing three things at once and never learning which one fixed it.',
      'This lesson covers the CompTIA seven-step methodology, the command-line tools for each layer, and how to read the classic symptoms back to their likely causes.',
    ],
    learn: [
      {
        heading: 'The seven-step method',
        body: [
          '1. Identify the problem: gather information, question users, identify symptoms, determine what changed recently, and duplicate the problem if you can. 2. Establish a theory of probable cause, questioning the obvious. 3. Test the theory to determine the cause; if it fails, establish a new theory or escalate.',
          '4. Establish a plan of action to resolve the problem and identify potential effects. 5. Implement the solution, or escalate. 6. Verify full system functionality and, if applicable, implement preventive measures. 7. Document findings, actions, outcomes and lessons learned.',
        ],
      },
      {
        heading: 'Tools, layer by layer',
        body: [
          '`ipconfig /all` (Windows) or `ip addr` (Linux) shows a host\'s addressing, gateway and DNS servers. `ping` tests reachability, and `traceroute` (`tracert` on Windows) shows each router hop by sending packets with increasing TTL values and collecting the ICMP Time Exceeded replies.',
          '`nslookup` or the richer `dig` query DNS directly. `netstat` (or `ss` on Linux) lists connections and listening ports; `netstat -ano` on Windows adds the owning process ID. `arp -a` shows the local IP-to-MAC table, useful for spotting duplicate IPs or ARP spoofing.',
          'Wireshark (or `tcpdump` on the command line) captures packets for deep analysis. Display filters such as `tcp.port == 443` or `ip.addr == 10.0.0.5` cut a capture down to what matters.',
        ],
      },
      {
        heading: 'Reading symptoms',
        body: [
          'Users can reach IP addresses but not names: a DNS problem. Check the DNS server settings, then test with `nslookup`. A link with high CRC errors: a Physical layer issue such as a bad cable, interference or a duplex mismatch, so start at Layer 1.',
          'Two hosts with the same IP give intermittent connectivity and IP-conflict warnings: check DHCP scopes and static assignments, and compare `arp -a` output.',
        ],
      },
    ],
    examples: [
      {
        title: 'A bottom-up check from a Windows client',
        code: [
          'ipconfig /all              # 1. valid address, mask, gateway, DNS?',
          'ping 10.0.0.1              # 2. can I reach my default gateway?',
          'ping 8.8.8.8               # 3. can I reach the internet by IP?',
          'nslookup example.com       # 4. does name resolution work?',
          'tracert example.com        # 5. where along the path does it stop?',
        ].join('\n'),
        explanation: 'Each step rules out a layer. If step 3 works and step 4 fails, you have found a DNS problem in under a minute.',
      },
      {
        title: 'Capture only the traffic you care about',
        code: [
          'tcpdump -i eth0 -n host 10.0.0.5 and port 443 -w web.pcap',
          '',
          '# then in Wireshark, display filters such as:',
          'ip.addr == 10.0.0.5 && tcp.flags.reset == 1',
        ].join('\n'),
        explanation: 'Capture narrowly, then filter: a burst of TCP resets points at a firewall or an application refusing connections.',
      },
    ],
    cheatSheet: [
      ['1. Identify', 'Gather info, question users, what changed?'],
      ['2. Theorise', 'Probable cause; question the obvious'],
      ['3. Test', 'Confirm the cause, or new theory / escalate'],
      ['4–5. Plan, implement', 'Consider effects; fix or escalate'],
      ['6. Verify', 'Full functionality; preventive measures'],
      ['7. Document', 'Findings, actions, outcomes, lessons'],
      ['traceroute / tracert', 'Hops via TTL expiry'],
      ['nslookup / dig', 'Query DNS directly'],
      ['netstat -ano / ss', 'Connections, ports, process IDs'],
      ['arp -a', 'IP → MAC table: duplicates, spoofing'],
      ['High CRC errors', 'Layer 1: cable, interference, duplex'],
      ['IPs work, names do not', 'DNS'],
    ],
  },

  'net-ops': {
    overview: [
      'A network that works today still has to be watched, documented, changed safely and recovered when something fails. Operations is what keeps it that way, and it is where most real-world outages are either prevented or caused.',
      'This lesson covers monitoring (SNMPv3, NetFlow, baselines), high availability, disaster recovery targets and sites, reliability metrics, power, change management, SD-WAN and infrastructure as code.',
    ],
    learn: [
      {
        heading: 'Monitoring',
        body: [
          'SNMP polls devices for counters such as interface traffic, errors and CPU. Versions 1 and 2c authenticate with cleartext community strings; SNMPv3 adds authentication and encryption, so use it. NetFlow (and IPFIX or sFlow) records traffic metadata: who talked to whom, on which ports, and how much. That is ideal for capacity planning and for spotting data exfiltration.',
          'A baseline is a record of normal performance. You cannot recognise an anomaly, or prove an improvement, without knowing what normal looks like.',
        ],
      },
      {
        heading: 'High availability and power',
        body: [
          'In an active-active pair both nodes serve traffic; in active-passive one stands by until the other fails. Active-active needs capacity planning, because a single surviving node must carry the full load. MTBF (mean time between failures) describes how reliable a component is; MTTR (mean time to repair) describes how quickly you recover.',
          'A UPS provides short-term battery power and clean power, bridging the gap until a generator takes over for long outages.',
        ],
      },
      {
        heading: 'Disaster recovery targets and sites',
        body: [
          'RPO (recovery point objective) is the maximum acceptable data loss, measured in time: an RPO of one hour means backing up or replicating at least hourly. RTO (recovery time objective) is the maximum acceptable time to restore service.',
          'The RTO drives the recovery site. A hot site is fully equipped with current data and can take over almost immediately. A warm site has hardware but not current data. A cold site offers only space and power, so it is the cheapest and the slowest.',
        ],
      },
      {
        heading: 'Change, automation and SD-WAN',
        body: [
          'Most outages follow a change. Configuration and change management control and document changes: review, schedule, test, and always have a rollback plan.',
          'Infrastructure as code defines network configuration in version-controlled files, deployed with tools such as Ansible or Terraform through pipelines, so every change is repeatable and reviewable. SD-WAN is a software-defined WAN that steers traffic across broadband, LTE and MPLS links by policy and live link quality, managed centrally.',
        ],
      },
    ],
    cheatSheet: [
      ['SNMPv3', 'Adds authentication and encryption (v1/v2c cleartext)'],
      ['NetFlow', 'Flow metadata: who, where, how much'],
      ['Baseline', 'Normal performance to compare against'],
      ['RPO', 'Max data loss, in time'],
      ['RTO', 'Max time to restore service'],
      ['Hot / warm / cold site', 'Ready now / hardware only / space and power'],
      ['MTBF / MTTR', 'Time between failures / time to repair'],
      ['Active-active vs passive', 'Both serve vs one on standby'],
      ['UPS vs generator', 'Bridge the gap vs long outages'],
      ['Change management', 'Review, schedule, rollback plan'],
      ['SD-WAN', 'Policy-based steering over mixed links'],
    ],
  },

  'net-security': {
    overview: [
      'Attackers who get onto a network, even as a guest, often start at Layer 2, where many switches trust by default. Good network security removes that trust, segments what remains, and only allows the traffic that is needed.',
      'This lesson covers the classic Layer 2 attacks and their switch defences, VLAN hopping, evil twins, segmentation with a screened subnet, ACLs and least privilege, VPNs, DDoS and network access control.',
    ],
    learn: [
      {
        heading: 'Layer 2 attacks and defences',
        body: [
          'ARP spoofing (poisoning) sends forged ARP replies so the attacker\'s MAC is associated with, for example, the gateway\'s IP, making them the man in the middle. Dynamic ARP Inspection (DAI) blocks it by checking ARP messages against known bindings.',
          'A rogue DHCP server hands out a malicious gateway or DNS server. DHCP snooping stops it by marking which ports may send DHCP offers (trusted uplinks), and it builds the binding table that DAI uses.',
          'MAC flooding fills a switch\'s CAM table with fake addresses so it falls back to flooding frames out every port like a hub. Port security limits the number of MAC addresses per port.',
        ],
      },
      {
        heading: 'VLAN hopping and wireless attacks',
        body: [
          'VLAN hopping reaches another VLAN either by switch spoofing (negotiating a trunk with DTP) or by double tagging (abusing the native VLAN). Defend by disabling DTP, hard-coding access ports, and setting the native VLAN to an unused VLAN on both ends of every trunk.',
          'An evil twin is a rogue access point impersonating a legitimate SSID. WPA3-Enterprise with certificate validation on clients defeats it, because the fake AP cannot prove its identity.',
          'Disable unused switch ports and assign them to an unused "black hole" VLAN so nobody can simply plug in.',
        ],
      },
      {
        heading: 'Segmentation and filtering',
        body: [
          'A screened subnet (DMZ) holds public-facing services, isolated from the internal LAN, with firewalls controlling traffic between the internet, the DMZ and the inside. A compromised web server should not be one hop from the database of every customer.',
          'An access control list permits or denies traffic by address, port and protocol. ACLs are evaluated top-down, first match wins, and most end with an implicit deny. Apply least privilege: default deny, then explicitly allow only what is required.',
        ],
      },
      {
        heading: 'Remote access, DDoS and NAC',
        body: [
          'A site-to-site VPN connects whole networks, commonly with IPsec; a client-to-site VPN connects individual remote users, over TLS or IPsec.',
          'A DDoS attack overwhelms a target with traffic from many sources. Mitigate it upstream with scrubbing services and CDNs, plus rate limiting, because a link that is already full cannot be defended at its far end.',
          'Network Access Control checks a device\'s identity and posture (patched, encrypted, running EDR) before granting access; non-compliant devices land in a quarantine VLAN.',
        ],
      },
    ],
    architecture: {
      caption: 'A screened subnet: public services sit between two filtering points, so the internet never reaches the internal LAN directly.',
      diagram: [
        'Internet',
        '   |',
        '[ Firewall ]--- allow 443 --->  DMZ: web server, reverse proxy, mail relay',
        '   |                                  |',
        '   |                 allow only app -> db:5432',
        '   |                                  v',
        'Internal LAN: users, databases, domain controllers   (default deny inbound)',
      ].join('\n'),
    },
    examples: [
      {
        title: 'Harden access ports (Cisco IOS)',
        code: [
          'interface range GigabitEthernet0/1 - 20',
          ' switchport mode access',
          ' switchport nonegotiate                 # no DTP',
          ' switchport port-security',
          ' switchport port-security maximum 2',
          ' switchport port-security violation restrict',
          '',
          'interface range GigabitEthernet0/21 - 24',
          ' switchport access vlan 999              # unused "black hole" VLAN',
          ' shutdown',
        ].join('\n'),
        explanation: 'Access ports cannot become trunks, each allows at most two MACs, and unused ports are dead.',
      },
      {
        title: 'DHCP snooping and Dynamic ARP Inspection (Cisco IOS)',
        code: [
          'ip dhcp snooping',
          'ip dhcp snooping vlan 10',
          'ip arp inspection vlan 10',
          '',
          'interface GigabitEthernet0/48            # uplink to the real DHCP server',
          ' ip dhcp snooping trust',
          ' ip arp inspection trust',
        ].join('\n'),
        explanation: 'Only the trusted uplink may send DHCP offers, and ARP replies must match the snooping bindings.',
      },
    ],
    cheatSheet: [
      ['ARP spoofing', 'Forged ARP → MITM; stop with DAI'],
      ['Rogue DHCP', 'Stop with DHCP snooping (trusted ports)'],
      ['MAC flooding', 'CAM overflow; stop with port security'],
      ['VLAN hopping', 'Disable DTP, unused native VLAN, access mode'],
      ['Evil twin', 'Rogue AP; WPA3-Enterprise + cert validation'],
      ['Screened subnet (DMZ)', 'Public services isolated from the LAN'],
      ['ACL', 'Top-down, first match, implicit deny'],
      ['Least privilege', 'Default deny, explicit allow'],
      ['Site-to-site vs client VPN', 'Networks vs individual users'],
      ['NAC', 'Identity + posture check, else quarantine VLAN'],
      ['Unused ports', 'Shut down, black-hole VLAN'],
    ],
  },

  'net-switch-route': {
    overview: [
      'Switches move frames inside a network; routers move packets between networks. Almost every connectivity problem you will ever troubleshoot comes down to one of those two decisions going wrong.',
      'This lesson covers how a switch learns where devices are, how VLANs split one switch into several isolated networks, how trunks carry those VLANs between switches, and how routers choose a path using their routing table.',
    ],
    learn: [
      {
        heading: 'How a switch forwards frames',
        body: [
          'A switch reads the source MAC address of every frame it receives and records which port it arrived on in its MAC address table (the CAM table).',
          'To forward, it looks up the destination MAC. Known address: send out that one port. Unknown address or broadcast (`ff:ff:ff:ff:ff:ff`): flood out every port in the same VLAN except the one it came in on.',
        ],
      },
      {
        heading: 'VLANs and trunks',
        body: [
          'A VLAN is a separate broadcast domain on shared hardware. Hosts in VLAN 10 cannot reach hosts in VLAN 20 without a router or layer 3 switch, which is what makes VLANs a segmentation control.',
          'An access port belongs to one VLAN and carries untagged frames. A trunk port carries many VLANs between switches, adding an 802.1Q tag to each frame so the far side knows which VLAN it belongs to. Frames on the native VLAN cross the trunk untagged.',
        ],
      },
      {
        heading: 'Spanning Tree Protocol',
        body: [
          'Redundant links between switches create loops, and Ethernet has no TTL to kill a looping frame, so a single broadcast can multiply until the network melts down (a broadcast storm).',
          'STP (802.1D; RSTP is 802.1w) elects a root bridge and blocks just enough ports to leave one loop-free path, unblocking them automatically if the active path fails.',
        ],
      },
      {
        heading: 'How a router chooses a path',
        body: [
          'A router matches each packet’s destination against its routing table and uses the longest prefix match: a `/24` route beats a `/16`, which beats the default route `0.0.0.0/0`.',
          'Routes come from directly connected networks, static routes you configure, or dynamic routing protocols. When several sources offer the same prefix, the lowest administrative distance wins (connected 0, static 1, OSPF 110, RIP 120).',
          'OSPF is a link-state protocol: each router floods its links, builds a full map of the area and runs Dijkstra’s shortest-path algorithm, using cost (based on bandwidth) as the metric. BGP is the path-vector protocol that routes between organisations on the internet.',
        ],
      },
    ],
    architecture: {
      caption: 'Two VLANs on two switches, joined by an 802.1Q trunk, with a router providing inter-VLAN routing.',
      diagram: [
        '                 [ Router R1 ]',
        '         Gi0/0.10 |       | Gi0/0.20      (router-on-a-stick sub-interfaces)',
        '                  +---+---+',
        '                      | 802.1Q trunk (VLANs 10, 20)',
        '                 [ Switch SW1 ] ======= trunk ======= [ Switch SW2 ]',
        '                   |        |                            |        |',
        '              VLAN 10   VLAN 20                     VLAN 10   VLAN 20',
        '              PC-A      PC-B                        PC-C      PC-D',
        '',
        '  PC-A <-> PC-C : same VLAN, switched across the trunk (no router needed)',
        '  PC-A <-> PC-D : different VLANs, must be routed by R1',
      ].join('\n'),
    },
    examples: [
      {
        title: 'Create a VLAN and an access port (Cisco IOS)',
        code: ['vlan 10', ' name USERS', 'interface GigabitEthernet0/5', ' switchport mode access', ' switchport access vlan 10'].join('\n'),
        explanation: 'The port now carries untagged frames for VLAN 10 only.',
      },
      {
        title: 'Configure a trunk (Cisco IOS)',
        code: ['interface GigabitEthernet0/1', ' switchport mode trunk', ' switchport trunk allowed vlan 10,20'].join('\n'),
        explanation: 'Restricting allowed VLANs keeps unneeded broadcast traffic (and attack surface) off the link.',
      },
      {
        title: 'A static and a default route (Cisco IOS)',
        code: ['ip route 10.20.0.0 255.255.0.0 192.168.1.2', 'ip route 0.0.0.0 0.0.0.0 203.0.113.1'].join('\n'),
        explanation: 'Traffic for 10.20.0.0/16 goes to 192.168.1.2; anything with no more specific match follows the default route.',
      },
      {
        title: 'Verify what you built',
        code: ['show vlan brief', 'show interfaces trunk', 'show ip route', 'show ip ospf neighbor'].join('\n'),
        explanation: 'Check VLAN membership, which VLANs each trunk carries, the routing table, and OSPF adjacencies.',
      },
    ],
    cheatSheet: [
      ['CAM / MAC table', 'Switch map of MAC address → port, learned from source addresses'],
      ['Access port', 'One VLAN, untagged frames'],
      ['Trunk port', 'Many VLANs, 802.1Q-tagged frames (native VLAN untagged)'],
      ['STP / RSTP', '802.1D / 802.1w: blocks redundant links to prevent loops'],
      ['Longest prefix match', 'The most specific matching route wins'],
      ['Administrative distance', 'Trust in a route source: connected 0, static 1, OSPF 110, RIP 120'],
      ['OSPF', 'Link-state IGP, cost metric, Dijkstra SPF, AD 110'],
      ['BGP', 'Path-vector EGP that routes between autonomous systems'],
      ['Default route', '0.0.0.0/0, used when nothing more specific matches'],
    ],
  },
};
