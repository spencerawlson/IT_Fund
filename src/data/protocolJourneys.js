// Protocol journeys: simulated, step-by-step packet walkthroughs in the style of a
// Wireshark capture — an endpoint diagram, a packet table, and a byte-by-byte decode
// of every packet. Rendered by components/lab/PacketJourney.jsx.
//
// These are SIMULATED walkthroughs, not real captures: times, sizes, and sequence
// numbers are realistic and internally consistent, and every protocol fact follows
// its RFC (DNS 1035, TCP 793, HTTP 9110/9112, TLS 1.3 8446). Real captures use
// random initial sequence numbers; the journeys say so where it matters.
import {
  Search, Server, Globe, ArrowRightLeft, Lock, KeyRound, FileText,
  RefreshCw, Zap, ShieldCheck, Eye, Monitor, Database, Send,
} from 'lucide-react';

export const PROTOCOL_JOURNEYS = {
  'proto-page-load': {
    id: 'proto-page-load',
    title: 'Load a Web Page',
    blurb: 'Follow one page load: DNS lookup, TCP handshake, HTTP request, and the 200 OK answer.',
    intro: 'You type www.example.com and press Enter. Seven packets later the page is on its way. This is the whole journey, in order.',
    simulatedNote: 'Simulated walkthrough — times and sizes are realistic, and the sequence numbers are simplified to 0 so the handshake is easy to follow. In a real capture the starting numbers are random.',
    endpoints: [
      { label: 'Client', ip: '192.168.1.10', role: 'Your computer' },
      { label: 'DNS Resolver', ip: '8.8.8.8', role: 'Looks up names' },
      { label: 'Web Server', ip: '203.0.113.10', role: 'Serves the page' },
    ],
    nodes: [
      { title: 'DNS query', icon: Search, accent: 'blue', body: 'The client asks the resolver for the IPv4 address of www.example.com.' },
      { title: 'DNS answer', icon: Server, accent: 'blue', body: 'The resolver answers: 203.0.113.10. Now the client knows where to connect.' },
      { title: 'SYN', icon: ArrowRightLeft, accent: 'teal', body: 'The client opens a TCP connection: “Can we talk? My starting number is 0.”' },
      { title: 'SYN-ACK', icon: ArrowRightLeft, accent: 'teal', body: 'The server agrees and sends its own starting number. Two of three handshake steps done.' },
      { title: 'ACK', icon: ArrowRightLeft, accent: 'teal', body: 'The client confirms. The connection is open — ESTABLISHED.' },
      { title: 'HTTP GET', icon: Send, accent: 'amber', body: 'Now the application talks: “GET / HTTP/1.1” — send me the home page.' },
      { title: '200 OK', icon: FileText, accent: 'amber', body: 'The server answers 200 OK and the page arrives in 9 segments.' },
    ],
    protocols: [
      { name: 'DNS', layer: 'Application (Layer 7)', port: '53 (UDP)', transport: 'UDP', format: 'Binary (header + question + answers)', rfc: 'RFC 1035', href: 'https://www.rfc-editor.org/rfc/rfc1035', blurb: 'Turns names into addresses. One question, one answer, no connection needed.' },
      { name: 'TCP', layer: 'Transport (Layer 4)', port: '80 / 443', transport: '—', format: '20-byte header + data', rfc: 'RFC 793', href: 'https://www.rfc-editor.org/rfc/rfc793', blurb: 'Reliable, ordered delivery: handshake, sequence numbers, acknowledgements, retransmission.' },
      { name: 'HTTP', layer: 'Application (Layer 7)', port: '80 (HTTPS: 443)', transport: 'TCP', format: 'Text (headers + optional body)', rfc: 'RFC 9110, RFC 9112', href: 'https://www.rfc-editor.org/rfc/rfc9110', blurb: 'The protocol of the web: one request, one response, written as readable text in HTTP/1.1.' },
    ],
    packets: [
      {
        no: 1, time: '0.000s', source: '192.168.1.10', dest: '8.8.8.8', protocol: 'DNS',
        info: 'Standard query A www.example.com', size: '75 B',
        decode: {
          title: 'DNS query — “what is the address of www.example.com?”',
          fields: [
            { name: 'Transaction ID', value: '0x3f21', meaning: 'Matches this query to its answer — the resolver echoes it back.' },
            { name: 'Flags', value: 'RD set', meaning: 'Recursion desired: the resolver should do the whole lookup for us.' },
            { name: 'QDCOUNT', value: '1', meaning: 'One question in this packet.' },
            { name: 'QNAME', value: 'www.example.com', meaning: 'The name being looked up.' },
            { name: 'QTYPE', value: 'A (1)', meaning: 'Asking for an IPv4 address.' },
            { name: 'QCLASS', value: 'IN (1)', meaning: 'Internet class — what every real query uses.' },
          ],
          note: 'No connection is opened for DNS — one UDP datagram out, one back.',
        },
      },
      {
        no: 2, time: '0.012s', source: '8.8.8.8', dest: '192.168.1.10', protocol: 'DNS',
        info: 'Standard query response A 203.0.113.10', size: '91 B',
        decode: {
          title: 'DNS answer — the name resolves',
          fields: [
            { name: 'Transaction ID', value: '0x3f21', meaning: 'Same ID as the query — this answer belongs to it.' },
            { name: 'Flags', value: 'QR + RA set, RCODE 0', meaning: 'This is a response (QR), recursion is available (RA), and there was no error (RCODE 0).' },
            { name: 'ANCOUNT', value: '1', meaning: 'One answer record follows.' },
            { name: 'Answer', value: 'www.example.com → A 203.0.113.10', meaning: 'The IPv4 address the client will connect to.' },
            { name: 'TTL', value: '300 seconds', meaning: 'The client and resolver may cache this answer for 5 minutes.' },
          ],
          note: 'The client now knows the server’s address — the web can begin.',
        },
      },
      {
        no: 3, time: '0.024s', source: '192.168.1.10', dest: '203.0.113.10', protocol: 'TCP',
        info: '52344 → 80 [SYN] Seq=0', size: '66 B',
        decode: {
          title: 'TCP SYN — opening the connection',
          fields: [
            { name: 'Source port', value: '52344', meaning: 'The client’s ephemeral port — the return address for replies.' },
            { name: 'Destination port', value: '80', meaning: 'HTTP. The service being reached.' },
            { name: 'Sequence number', value: '0', meaning: 'The client’s starting number — “my data will start at byte 0.”' },
            { name: 'Flags', value: 'SYN', meaning: 'Synchronize: let’s open a connection.' },
            { name: 'Window', value: '64240 bytes', meaning: 'How much the client is willing to receive — flow control.' },
            { name: 'Options', value: 'MSS 1460', meaning: '“Send me segments of at most 1460 bytes” — sized to fit a standard Ethernet frame.' },
          ],
          note: 'No data yet — the SYN only negotiates the connection.',
        },
      },
      {
        no: 4, time: '0.041s', source: '203.0.113.10', dest: '192.168.1.10', protocol: 'TCP',
        info: '80 → 52344 [SYN, ACK] Seq=0 Ack=1', size: '66 B',
        decode: {
          title: 'TCP SYN-ACK — the server agrees',
          fields: [
            { name: 'Sequence number', value: '0', meaning: 'The server’s own starting number.' },
            { name: 'Acknowledgement number', value: '1', meaning: '“I got your SYN — your next byte should be 1.”' },
            { name: 'Flags', value: 'SYN + ACK', meaning: 'Two jobs in one packet: acknowledge the client’s SYN and send the server’s own.' },
            { name: 'Window', value: '65160 bytes', meaning: 'How much the server is willing to receive.' },
          ],
          note: 'Two of the three handshake steps are done.',
        },
      },
      {
        no: 5, time: '0.058s', source: '192.168.1.10', dest: '203.0.113.10', protocol: 'TCP',
        info: '52344 → 80 [ACK] Seq=1 Ack=1', size: '60 B',
        decode: {
          title: 'TCP ACK — connection open',
          fields: [
            { name: 'Sequence number', value: '1', meaning: 'One past the SYN — the client has sent 1 byte of sequence space (the SYN itself).' },
            { name: 'Acknowledgement number', value: '1', meaning: '“I got your SYN — your next byte should be 1.”' },
            { name: 'Flags', value: 'ACK', meaning: 'Pure acknowledgement — no data, no new negotiation.' },
          ],
          note: 'Both sides are now ESTABLISHED. The handshake cost three packets and 0.034 seconds.',
        },
      },
      {
        no: 6, time: '0.058s', source: '192.168.1.10', dest: '203.0.113.10', protocol: 'HTTP',
        info: 'GET / HTTP/1.1', size: '484 B',
        decode: {
          title: 'HTTP request — asking for the page',
          fields: [
            { name: 'Request line', value: 'GET / HTTP/1.1', meaning: 'Method GET, path /, version HTTP/1.1.' },
            { name: 'Host', value: 'www.example.com', meaning: 'Which site on this server — one IP can host many sites.' },
            { name: 'User-Agent', value: 'Mozilla/5.0 …', meaning: 'The browser identifying itself.' },
            { name: 'Accept', value: 'text/html', meaning: '“I want an HTML page, please.”' },
          ],
          note: 'HTTP rides on the TCP connection — it never sees the handshake, it just uses it.',
        },
      },
      {
        no: 7, time: '0.076s', source: '203.0.113.10', dest: '192.168.1.10', protocol: 'HTTP',
        info: 'HTTP/1.1 200 OK (text/html), 9 segments', size: '12.8 KB',
        decode: {
          title: 'HTTP response — the page arrives',
          fields: [
            { name: 'Status line', value: 'HTTP/1.1 200 OK', meaning: '200 means success — the page exists and here it is.' },
            { name: 'Content-Type', value: 'text/html', meaning: 'The body is an HTML page.' },
            { name: 'Content-Length', value: '12,845 bytes', meaning: 'How many bytes of page to expect, so the browser knows when it is complete.' },
            { name: 'Segments', value: '9', meaning: 'TCP split the 12.8 KB page into 9 segments — each one sequenced and acknowledged.' },
          ],
          note: 'From keystroke to first byte of the page: 0.076 seconds and seven packets.',
        },
      },
    ],
    callouts: [
      { title: 'Why three packets to say hello?', body: 'TCP needs both sides to agree on starting sequence numbers. The client proposes one (SYN), the server acknowledges it and proposes its own (SYN-ACK), the client acknowledges that (ACK). Only then can data flow without either side guessing.' },
      { title: 'The sequence numbers here are simplified', body: 'Real initial sequence numbers are random 32-bit values (RFC 6528) — predictable ones let attackers inject forged segments. This walkthrough uses 0 so the +1 arithmetic is visible.' },
    ],
    questions: [
      {
        q: 'What does the DNS query ask for?',
        options: ['The IPv4 address of www.example.com', 'The MAC address of the web server', 'The server’s TLS certificate', 'The fastest route to the server'],
        answer: 0,
        explain: 'DNS maps names to addresses. The query asks for an A record — the IPv4 address of www.example.com — and gets 203.0.113.10 back.',
      },
      {
        q: 'How many packets make up the TCP handshake?',
        options: ['Two — SYN and ACK', 'Three — SYN, SYN-ACK, ACK', 'Four — SYN, SYN-ACK, ACK, FIN', 'One — the SYN does it all'],
        answer: 1,
        explain: 'Three: the client’s SYN, the server’s SYN-ACK, and the client’s ACK. Only then is the connection ESTABLISHED.',
      },
      {
        q: 'What does Ack=1 in the server’s SYN-ACK mean?',
        options: ['The server received 1 byte of data', 'The server expects the client’s next byte to be number 1', 'The server’s window is 1 byte', 'The connection will close after 1 second'],
        answer: 1,
        explain: 'An acknowledgement number is always “the next byte I expect.” Ack=1 means the server received everything up to byte 0 (the SYN) and expects byte 1 next.',
      },
    ],
  },

  'proto-dns': {
    id: 'proto-dns',
    title: 'DNS Deep Dive',
    blurb: 'Follow one name through the whole hierarchy — resolver, root, TLD, authoritative — and learn the record types.',
    intro: 'Your resolver does not know every name on Earth. It walks the DNS hierarchy: root, then the .com servers, then the servers for example.com itself.',
    simulatedNote: 'Simulated walkthrough — a real recursive lookup follows exactly this chain; the times and sizes are realistic.',
    endpoints: [
      { label: 'Client', ip: '192.168.1.10', role: 'Asks the question' },
      { label: 'Recursive Resolver', ip: '8.8.8.8', role: 'Walks the tree' },
      { label: 'Root (.)', ip: '198.41.0.4', role: 'Knows the TLDs' },
      { label: 'TLD (.com)', ip: '192.5.6.30', role: 'Knows example.com’s servers' },
      { label: 'Authoritative', ip: '192.0.2.53', role: 'Knows the answer' },
    ],
    nodes: [
      { title: 'Ask the resolver', icon: Search, accent: 'blue', body: 'The client asks 8.8.8.8 for the A record of www.example.com — with recursion desired.' },
      { title: 'Root referral', icon: Globe, accent: 'slate', body: 'The root server does not know the answer, but it knows who does: the .com servers.' },
      { title: 'TLD referral', icon: Globe, accent: 'slate', body: 'The .com server also refers down: ask example.com’s own nameservers.' },
      { title: 'Authoritative answer', icon: Server, accent: 'teal', body: 'The authoritative server knows the zone — it answers: 93.184.216.34.' },
      { title: 'Cached reply', icon: Database, accent: 'amber', body: 'The resolver hands the answer to the client and caches it for the TTL, so the next lookup is instant.' },
    ],
    protocols: [
      { name: 'DNS', layer: 'Application (Layer 7)', port: '53 (UDP/TCP)', transport: 'UDP (TCP for large answers)', format: 'Binary (header + question + answers)', rfc: 'RFC 1035', href: 'https://www.rfc-editor.org/rfc/rfc1035', blurb: 'A distributed database: no single server knows every name, so resolvers walk the hierarchy.' },
    ],
    records: [
      { type: 'A', name: 'IPv4 address', meaning: 'A name → an IPv4 address.', example: 'www.example.com → 93.184.216.34' },
      { type: 'AAAA', name: 'IPv6 address', meaning: 'A name → an IPv6 address.', example: 'www.example.com → 2606:2800:220:1:248:1893:25c8:1946' },
      { type: 'CNAME', name: 'Canonical name', meaning: 'An alias: one name points at another name.', example: 'www.example.com → example.com' },
      { type: 'MX', name: 'Mail exchange', meaning: 'Which servers accept mail for this domain.', example: 'example.com → mail.example.com (priority 10)' },
      { type: 'NS', name: 'Name server', meaning: 'Which servers are authoritative for this zone.', example: 'example.com → ns1.example.com' },
      { type: 'TXT', name: 'Text', meaning: 'Free text — SPF, DKIM, verification tokens.', example: '"v=spf1 -all"' },
    ],
    packets: [
      {
        no: 1, time: '0.000s', source: '192.168.1.10', dest: '8.8.8.8', protocol: 'DNS',
        info: 'Standard query A www.example.com (RD)', size: '75 B',
        decode: {
          title: 'Client → resolver: “find this for me”',
          fields: [
            { name: 'Flags', value: 'RD set', meaning: 'Recursion desired — the resolver must do the whole walk.' },
            { name: 'QNAME', value: 'www.example.com', meaning: 'The name being looked up.' },
            { name: 'QTYPE', value: 'A (1)', meaning: 'Asking for an IPv4 address.' },
          ],
          note: 'The client asks once and waits. The resolver does the work.',
        },
      },
      {
        no: 2, time: '0.008s', source: '8.8.8.8', dest: '198.41.0.4', protocol: 'DNS',
        info: 'Standard query A www.example.com', size: '75 B',
        decode: {
          title: 'Resolver → root: the walk begins',
          fields: [
            { name: 'Flags', value: 'RD clear', meaning: 'The resolver asks iteratively — it wants a referral, not a full answer.' },
            { name: 'Destination', value: '198.41.0.4', meaning: 'One of the 13 root servers (a.root-servers.net). Every resolver knows these addresses.' },
          ],
          note: 'The root never answers names directly — it only points down the tree.',
        },
      },
      {
        no: 3, time: '0.021s', source: '198.41.0.4', dest: '8.8.8.8', protocol: 'DNS',
        info: 'Referral: ask the .com servers (NS records)', size: '124 B',
        decode: {
          title: 'Root referral — “not me, try .com”',
          fields: [
            { name: 'ANCOUNT', value: '0', meaning: 'No answer — the root does not know this name.' },
            { name: 'NSCOUNT', value: '13', meaning: 'Thirteen NS records: the .com nameservers.' },
            { name: 'Authority section', value: 'com. NS a.gtld-servers.net …', meaning: '“The .com zone is served by these servers — go ask them.”' },
          ],
          note: 'A referral is not a failure — it is how the hierarchy works.',
        },
      },
      {
        no: 4, time: '0.033s', source: '8.8.8.8', dest: '192.5.6.30', protocol: 'DNS',
        info: 'Standard query A www.example.com', size: '75 B',
        decode: {
          title: 'Resolver → TLD: one level down',
          fields: [
            { name: 'Destination', value: '192.5.6.30', meaning: 'a.gtld-servers.net — one of the .com nameservers from the referral.' },
            { name: 'QNAME', value: 'www.example.com', meaning: 'Same question, asked of a server one level closer to the answer.' },
          ],
          note: 'Each step narrows the search by one label.',
        },
      },
      {
        no: 5, time: '0.047s', source: '192.5.6.30', dest: '8.8.8.8', protocol: 'DNS',
        info: 'Referral: ask example.com’s servers (NS records)', size: '118 B',
        decode: {
          title: 'TLD referral — “not me, try example.com”',
          fields: [
            { name: 'ANCOUNT', value: '0', meaning: 'Still no answer — the TLD only knows the zone’s nameservers.' },
            { name: 'Authority section', value: 'example.com. NS ns1.example.com', meaning: '“example.com is served by ns1.example.com — go ask it.”' },
          ],
          note: 'The .com server knows every .com zone’s nameservers, but not the records inside them.',
        },
      },
      {
        no: 6, time: '0.058s', source: '8.8.8.8', dest: '192.0.2.53', protocol: 'DNS',
        info: 'Standard query A www.example.com', size: '75 B',
        decode: {
          title: 'Resolver → authoritative: the last hop',
          fields: [
            { name: 'Destination', value: '192.0.2.53', meaning: 'ns1.example.com — the server that actually holds the zone file.' },
            { name: 'QNAME', value: 'www.example.com', meaning: 'Same question, now asked of the server that can answer it.' },
          ],
          note: 'Authoritative servers are the only ones that can answer for their zone.',
        },
      },
      {
        no: 7, time: '0.071s', source: '192.0.2.53', dest: '8.8.8.8', protocol: 'DNS',
        info: 'Standard query response A 93.184.216.34', size: '91 B',
        decode: {
          title: 'Authoritative answer — the name resolves',
          fields: [
            { name: 'Flags', value: 'QR + AA set', meaning: 'A response (QR) from an authoritative server (AA) — this answer is definitive.' },
            { name: 'Answer', value: 'www.example.com → A 93.184.216.34', meaning: 'The real IPv4 address of the site.' },
            { name: 'TTL', value: '86400 seconds', meaning: 'Cache this for a day — the zone owner set a long TTL.' },
          ],
          note: 'The AA flag is what makes this answer authoritative rather than cached.',
        },
      },
      {
        no: 8, time: '0.084s', source: '8.8.8.8', dest: '192.168.1.10', protocol: 'DNS',
        info: 'Standard query response A 93.184.216.34', size: '91 B',
        decode: {
          title: 'Resolver → client: the answer, delivered',
          fields: [
            { name: 'Flags', value: 'QR + RA set', meaning: 'A response, and recursion was available — the resolver did the walk for us.' },
            { name: 'Answer', value: 'www.example.com → A 93.184.216.34', meaning: 'Same answer, now handed to the client.' },
            { name: 'Cached', value: 'Yes, for the TTL', meaning: 'The next lookup for this name skips the whole walk — the resolver answers from cache.' },
          ],
          note: 'Eight packets, four servers, 0.084 seconds — and the next lookup costs one.',
        },
      },
    ],
    callouts: [
      { title: 'What if the name does not exist?', body: 'The authoritative server answers with RCODE 3 — NXDOMAIN (“non-existent domain”). The resolver passes that back, and the browser shows an error. NXDOMAIN is an answer, not a failure: the server is saying “I checked, and there is no such name.”' },
      { title: 'Why two kinds of query?', body: 'Your computer asks recursively (“do the whole job for me”). The resolver asks iteratively (“just tell me the next server”). Recursion is a service the resolver offers you; between servers, iteration keeps the load spread out.' },
    ],
    questions: [
      {
        q: 'Which server gives the final answer for www.example.com?',
        options: ['The root server', 'The .com TLD server', 'The authoritative nameserver for example.com', 'Your ISP’s router'],
        answer: 2,
        explain: 'Only the authoritative nameserver holds the zone file for example.com. The root and the TLD only hand out referrals pointing down the tree.',
      },
      {
        q: 'What does an NXDOMAIN response mean?',
        options: ['The DNS server is down', 'The name does not exist', 'The answer is cached', 'The query timed out'],
        answer: 1,
        explain: 'NXDOMAIN (RCODE 3) means the authoritative server checked and there is no such name. It is a definitive answer, not an error in the lookup itself.',
      },
      {
        q: 'What does a CNAME record do?',
        options: ['Points a name at an IPv4 address', 'Maps one name to another name (an alias)', 'Lists the mail servers for a domain', 'Stores a text verification token'],
        answer: 1,
        explain: 'A CNAME is an alias: www.example.com → example.com means “look up example.com instead.” The A record lives on the canonical name.',
      },
    ],
  },

  'proto-tcp': {
    id: 'proto-tcp',
    title: 'TCP Deep Dive',
    blurb: 'The handshake, data and ACKs, a lost segment that gets retransmitted, and the four-packet goodbye.',
    intro: 'TCP promises reliable, ordered delivery. This journey shows how it keeps that promise: sequence numbers, acknowledgements, and a retransmission when a segment vanishes.',
    simulatedNote: 'Simulated walkthrough — sequence numbers are simplified to 0 and 100 so the +1 arithmetic is visible. In a real capture both starting numbers are random.',
    endpoints: [
      { label: 'Client', ip: '192.168.1.10', role: 'Sends and receives' },
      { label: 'Server', ip: '93.184.216.34', role: 'Sends and receives' },
    ],
    nodes: [
      { title: 'SYN', icon: Send, accent: 'teal', body: 'The client opens the connection with its starting sequence number.' },
      { title: 'SYN-ACK', icon: ArrowRightLeft, accent: 'teal', body: 'The server agrees and sends its own starting number.' },
      { title: 'ACK — open', icon: ShieldCheck, accent: 'teal', body: 'The client confirms. The connection is ESTABLISHED.' },
      { title: 'Data + ACK', icon: FileText, accent: 'amber', body: 'Segments flow both ways; every byte is acknowledged.' },
      { title: 'Lost segment', icon: Eye, accent: 'rose', body: 'One segment never arrives. The sender notices — no ACK comes back.' },
      { title: 'Retransmit', icon: RefreshCw, accent: 'rose', body: 'The sender sends the same segment again, same sequence number.' },
      { title: 'FIN teardown', icon: Lock, accent: 'slate', body: 'Both sides close politely — four packets, then the connection is gone.' },
    ],
    protocols: [
      { name: 'TCP', layer: 'Transport (Layer 4)', port: '80 / 443', transport: '—', format: '20-byte header + data', rfc: 'RFC 793', href: 'https://www.rfc-editor.org/rfc/rfc793', blurb: 'Reliable, ordered, connection-oriented delivery: handshake, sequence numbers, acknowledgements, retransmission, flow control.' },
    ],
    packets: [
      {
        no: 1, time: '0.000s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 80 [SYN] Seq=0', size: '66 B',
        decode: {
          title: 'SYN — “can we talk?”',
          fields: [
            { name: 'Sequence number', value: '0', meaning: 'The client’s starting number (ISN).' },
            { name: 'Flags', value: 'SYN', meaning: 'Synchronize — open a connection.' },
            { name: 'Window', value: '64240', meaning: 'How many bytes the client can receive.' },
            { name: 'Options', value: 'MSS 1460', meaning: '“Send me at most 1460 bytes per segment.”' },
          ],
          note: 'The SYN itself consumes one sequence number — the next byte is 1.',
        },
      },
      {
        no: 2, time: '0.018s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TCP',
        info: '80 → 52344 [SYN, ACK] Seq=100 Ack=1', size: '66 B',
        decode: {
          title: 'SYN-ACK — “yes, and here is my number”',
          fields: [
            { name: 'Sequence number', value: '100', meaning: 'The server’s starting number.' },
            { name: 'Acknowledgement number', value: '1', meaning: '“I got your SYN — your next byte should be 1.”' },
            { name: 'Flags', value: 'SYN + ACK', meaning: 'Acknowledge the client’s SYN and send the server’s own in one packet.' },
          ],
          note: 'Two of three handshake steps done.',
        },
      },
      {
        no: 3, time: '0.032s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 80 [ACK] Seq=1 Ack=101', size: '60 B',
        decode: {
          title: 'ACK — connection open',
          fields: [
            { name: 'Sequence number', value: '1', meaning: 'One past the SYN.' },
            { name: 'Acknowledgement number', value: '101', meaning: '“I got your SYN — your next byte should be 101.”' },
            { name: 'Flags', value: 'ACK', meaning: 'Pure acknowledgement.' },
          ],
          note: 'ESTABLISHED. Both sides know each other’s starting numbers.',
        },
      },
      {
        no: 4, time: '0.045s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 80 [PSH, ACK] Seq=1 Ack=101 Len=50', size: '114 B',
        decode: {
          title: 'Data — the client sends 50 bytes',
          fields: [
            { name: 'Sequence number', value: '1', meaning: 'This data starts at byte 1 and runs to byte 50.' },
            { name: 'Acknowledgement number', value: '101', meaning: 'Still expecting the server’s byte 101 — nothing received yet.' },
            { name: 'Flags', value: 'PSH + ACK', meaning: 'PSH asks the receiver to hand the data to the application now, not buffer it.' },
            { name: 'Length', value: '50 bytes', meaning: 'Payload size — the data itself (“Hello …”).' },
          ],
          note: 'The segment occupies sequence numbers 1–50. The next one must start at 51.',
        },
      },
      {
        no: 5, time: '0.060s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TCP',
        info: '80 → 52344 [ACK] Seq=101 Ack=51', size: '60 B',
        decode: {
          title: 'ACK — the server got the data',
          fields: [
            { name: 'Sequence number', value: '101', meaning: 'The server has sent nothing yet, so its next byte is still 101.' },
            { name: 'Acknowledgement number', value: '51', meaning: '“I have everything up to byte 50 — send me 51 next.”' },
          ],
          note: 'Acknowledgements are cumulative: one ACK covers everything received so far.',
        },
      },
      {
        no: 6, time: '0.075s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 80 [PSH, ACK] Seq=51 Ack=101 Len=50', size: '114 B',
        decode: {
          title: 'Data — the client sends the next 50 bytes',
          fields: [
            { name: 'Sequence number', value: '51', meaning: 'Continues exactly where the last segment ended.' },
            { name: 'Length', value: '50 bytes', meaning: 'Payload — bytes 51–100.' },
          ],
          note: 'This segment is about to vanish. Watch what happens next.',
        },
      },
      {
        no: 7, time: '0.090s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 80 [PSH, ACK] Seq=51 Ack=101 Len=50 (retransmission)', size: '114 B',
        decode: {
          title: 'Retransmission — same segment, sent again',
          fields: [
            { name: 'Sequence number', value: '51', meaning: 'Identical to the lost segment — the sender does not renumber data.' },
            { name: 'Length', value: '50 bytes', meaning: 'Same 50 bytes, sent a second time.' },
            { name: 'Why', value: 'Retransmission timeout', meaning: 'No ACK for bytes 51–100 arrived in time, so the sender assumed the segment was lost and sent it again.' },
          ],
          note: 'The receiver will accept it once and discard any duplicate — the sequence number makes duplicates visible.',
        },
      },
      {
        no: 8, time: '0.104s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TCP',
        info: '80 → 52344 [ACK] Seq=101 Ack=101', size: '60 B',
        decode: {
          title: 'ACK — everything is now received',
          fields: [
            { name: 'Sequence number', value: '101', meaning: 'The server has sent nothing yet, so its next byte is still 101.' },
            { name: 'Acknowledgement number', value: '101', meaning: '“I have everything up to byte 100 — send me 101 next.”' },
          ],
          note: 'One ACK now covers both the original 50 bytes and the retransmitted 50.',
        },
      },
      {
        no: 9, time: '0.120s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 80 [FIN, ACK] Seq=101 Ack=101', size: '60 B',
        decode: {
          title: 'FIN — the client is done sending',
          fields: [
            { name: 'Flags', value: 'FIN + ACK', meaning: '“I have no more data to send” — while still acknowledging the server’s bytes.' },
            { name: 'Sequence number', value: '101', meaning: 'The FIN itself consumes one sequence number, like the SYN did.' },
          ],
          note: 'FIN closes one direction only. The server can still send data until it closes its side.',
        },
      },
      {
        no: 10, time: '0.134s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TCP',
        info: '80 → 52344 [ACK] Seq=101 Ack=102', size: '60 B',
        decode: {
          title: 'ACK — server acknowledges the FIN',
          fields: [
            { name: 'Sequence number', value: '101', meaning: 'The server has sent nothing yet, so its next byte is still 101.' },
            { name: 'Acknowledgement number', value: '102', meaning: '“I got your FIN (byte 101) — your next byte would be 102.”' },
          ],
          note: 'The client’s side is now closed. The server’s side is still open.',
        },
      },
      {
        no: 11, time: '0.148s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TCP',
        info: '80 → 52344 [FIN, ACK] Seq=101 Ack=102', size: '60 B',
        decode: {
          title: 'FIN — the server is done too',
          fields: [
            { name: 'Sequence number', value: '101', meaning: 'The server’s FIN consumes one sequence number, like its SYN did.' },
            { name: 'Flags', value: 'FIN + ACK', meaning: 'The server closes its direction as well.' },
          ],
          note: 'A connection is two one-way pipes — each side closes its own.',
        },
      },
      {
        no: 12, time: '0.162s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 80 [ACK] Seq=102 Ack=102', size: '60 B',
        decode: {
          title: 'Final ACK — connection closed',
          fields: [
            { name: 'Sequence number', value: '102', meaning: 'One past the FIN the client sent (byte 101).' },
            { name: 'Acknowledgement number', value: '102', meaning: '“I got your FIN.”' },
          ],
          note: 'Four packets to say goodbye: FIN, ACK, FIN, ACK. The client then waits in TIME_WAIT (twice the maximum segment lifetime) before the port can be reused.',
        },
      },
    ],
    callouts: [
      { title: 'Why retransmission works', body: 'Every byte has a number, and the receiver only ACKs what it actually has. If an ACK never arrives, the sender cannot tell whether the segment or the ACK was lost — so it sends the segment again. The receiver recognises the duplicate by its sequence number and drops it. Reliability is built from numbering, not from hoping.' },
      { title: 'SYN and FIN both consume a sequence number', body: 'That is why the ACK after a SYN is 1, not 0: the SYN occupied one sequence position. The same applies to FIN. Data bytes occupy one position each.' },
    ],
    questions: [
      {
        q: 'The server ACKs with Ack=51 after receiving a 50-byte segment that started at Seq=1. Why 51?',
        options: ['51 is the segment’s length plus one', 'Ack always means “the next byte I expect” — bytes 1–50 are received, so 51 is next', 'The server counted 51 bytes', '51 is the server’s window size'],
        answer: 1,
        explain: 'An acknowledgement number is the next byte the receiver expects. Bytes 1–50 arrived, so the next expected byte is 51.',
      },
      {
        q: 'How does TCP recover a lost segment?',
        options: ['The receiver asks the sender to resend by sequence number', 'The sender retransmits after a timeout because no ACK arrived', 'The router stores the segment and delivers it later', 'UDP delivers it on the second try'],
        answer: 1,
        explain: 'TCP is sender-driven: when no ACK arrives for a segment within the retransmission timeout, the sender sends the same segment again with the same sequence number.',
      },
      {
        q: 'How many packets does a clean TCP teardown take?',
        options: ['Two — one FIN each way', 'Three — like the handshake', 'Four — FIN, ACK, FIN, ACK', 'One — a RST closes it instantly'],
        answer: 2,
        explain: 'Four: each side closes its direction with a FIN, and each FIN is acknowledged. (A RST does close a connection instantly, but that is an abrupt abort, not a clean teardown.)',
      },
    ],
  },

  'proto-tls': {
    id: 'proto-tls',
    title: 'HTTPS / TLS',
    blurb: 'From a plain TCP connection to an encrypted one: ClientHello, certificate, key exchange, and the encrypted request.',
    intro: 'HTTPS is HTTP inside a TLS tunnel. The tunnel is built first — in one round trip on TLS 1.3 — and only then does the browser send its request.',
    simulatedNote: 'Simulated walkthrough — the handshake messages and their sizes are realistic for TLS 1.3; the certificate is shown as the values a browser checks, not as raw bytes.',
    endpoints: [
      { label: 'Client', ip: '192.168.1.10', role: 'Your browser' },
      { label: 'Server', ip: '93.184.216.34', role: 'www.example.com' },
    ],
    nodes: [
      { title: 'TCP handshake', icon: ArrowRightLeft, accent: 'teal', body: 'TLS needs a reliable connection first — the usual three-packet handshake, on port 443.' },
      { title: 'ClientHello', icon: Send, accent: 'blue', body: 'The client offers its TLS versions, cipher suites, and a key share — plus the name it wants (SNI).' },
      { title: 'ServerHello', icon: Server, accent: 'blue', body: 'The server picks TLS 1.3 and a cipher, and sends its own key share.' },
      { title: 'Certificate + Finished', icon: ShieldCheck, accent: 'amber', body: 'The server proves who it is with its certificate — then both sides switch to encrypted messages.' },
      { title: 'Encrypted HTTP', icon: Lock, accent: 'amber', body: 'The GET request and the 200 OK travel inside the tunnel. Anyone watching sees only ciphertext.' },
    ],
    protocols: [
      { name: 'TLS 1.3', layer: 'Between transport and application', port: '443', transport: 'TCP', format: 'Records (handshake, then encrypted application data)', rfc: 'RFC 8446', href: 'https://www.rfc-editor.org/rfc/rfc8446', blurb: 'Encrypts the connection: authentication, confidentiality, and integrity — in one round trip.' },
      { name: 'TCP', layer: 'Transport (Layer 4)', port: '443', transport: '—', format: '20-byte header + data', rfc: 'RFC 793', href: 'https://www.rfc-editor.org/rfc/rfc793', blurb: 'The reliable pipe TLS runs inside — same handshake, different port.' },
      { name: 'HTTP', layer: 'Application (Layer 7)', port: '443 (HTTPS)', transport: 'TCP + TLS', format: 'Text — encrypted by TLS', rfc: 'RFC 9110, RFC 9112', href: 'https://www.rfc-editor.org/rfc/rfc9110', blurb: 'Exactly the same HTTP as before — only the transport changed. That is the whole point of HTTPS.' },
    ],
    packets: [
      {
        no: 1, time: '0.000s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 443 [SYN] Seq=0', size: '66 B',
        decode: {
          title: 'TCP SYN — the pipe first',
          fields: [
            { name: 'Destination port', value: '443', meaning: 'HTTPS — the TLS port. Port 443 is what tells the server “expect TLS, not plain HTTP.”' },
            { name: 'Flags', value: 'SYN', meaning: 'Open the connection.' },
          ],
          note: 'TLS cannot run without TCP underneath — the handshake comes first.',
        },
      },
      {
        no: 2, time: '0.018s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TCP',
        info: '443 → 52344 [SYN, ACK] Seq=0 Ack=1', size: '66 B',
        decode: {
          title: 'TCP SYN-ACK',
          fields: [
            { name: 'Acknowledgement number', value: '1', meaning: 'The server received the SYN.' },
            { name: 'Flags', value: 'SYN + ACK', meaning: 'Handshake step two of three.' },
          ],
          note: 'Nothing encrypted yet — the tunnel does not exist.',
        },
      },
      {
        no: 3, time: '0.032s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TCP',
        info: '52344 → 443 [ACK] Seq=1 Ack=1', size: '60 B',
        decode: {
          title: 'TCP ACK — connection open',
          fields: [
            { name: 'Sequence number', value: '1', meaning: 'One past the SYN.' },
            { name: 'Flags', value: 'ACK', meaning: 'Handshake complete. Now the TLS handshake can start.' },
          ],
          note: 'Three packets for TCP, then the TLS handshake begins.',
        },
      },
      {
        no: 4, time: '0.045s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TLSv1.3',
        info: 'ClientHello — TLS 1.3, SNI www.example.com', size: '512 B',
        decode: {
          title: 'ClientHello — “here is what I can do”',
          fields: [
            { name: 'Version offered', value: 'TLS 1.3', meaning: 'The newest version the client supports.' },
            { name: 'SNI', value: 'www.example.com', meaning: 'Server Name Indication — which site the client wants, so the server picks the right certificate. Sent in cleartext.' },
            { name: 'Cipher suites offered', value: 'TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256', meaning: 'The three ciphers TLS 1.3 allows — all AEAD (authenticated encryption). No weak options are offered.' },
            { name: 'Key share', value: 'X25519 (ephemeral)', meaning: 'The client’s half of the key exchange — a fresh, one-time key. This is what makes the session forward-secret.' },
            { name: 'Random', value: '32 bytes', meaning: 'Fresh randomness, mixed into the session keys.' },
          ],
          note: 'ClientHello is the only TLS message the client sends in cleartext.',
        },
      },
      {
        no: 5, time: '0.062s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TLSv1.3',
        info: 'ServerHello — TLS_AES_128_GCM_SHA256', size: '122 B',
        decode: {
          title: 'ServerHello — “agreed, here is my half”',
          fields: [
            { name: 'Version chosen', value: 'TLS 1.3', meaning: 'The highest version both sides support.' },
            { name: 'Cipher chosen', value: 'TLS_AES_128_GCM_SHA256', meaning: 'AES-128 in GCM mode — authenticated encryption with a 128-bit key.' },
            { name: 'Key share', value: 'X25519 (ephemeral)', meaning: 'The server’s half. Combined with the client’s half, both sides now derive the same session keys.' },
          ],
          note: 'From here on, everything the server sends is encrypted — starting with the very next message.',
        },
      },
      {
        no: 6, time: '0.062s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TLSv1.3',
        info: 'EncryptedExtensions + Certificate + CertificateVerify + Finished', size: '1,240 B',
        decode: {
          title: 'Certificate — “here is who I am, and proof”',
          fields: [
            { name: 'EncryptedExtensions', value: 'ALPN: h2', meaning: '“We will speak HTTP/2 inside the tunnel” — negotiated, then encrypted.' },
            { name: 'Certificate', value: 'CN=www.example.com', meaning: 'The server’s X.509 certificate: its name, its public key, its issuer, its expiry. The client checks the name matches the URL and the chain leads to a trusted CA.' },
            { name: 'CertificateVerify', value: 'Signature over the handshake', meaning: 'The server signs the whole handshake so far with its certificate’s private key — proving it actually holds the key, not just a copy of the certificate.' },
            { name: 'Finished', value: 'MAC over the handshake', meaning: 'A message-authentication code over everything exchanged — proving nobody tampered with the handshake.' },
          ],
          note: 'In TLS 1.3 the certificate is encrypted. In TLS 1.2 it was sent in the clear.',
        },
      },
      {
        no: 7, time: '0.078s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TLSv1.3',
        info: 'Finished', size: '68 B',
        decode: {
          title: 'Client Finished — the handshake is done',
          fields: [
            { name: 'Finished', value: 'MAC over the handshake', meaning: 'The client’s proof that it derived the same keys and saw the same handshake.' },
            { name: 'Encryption', value: 'Encrypted with the handshake keys', meaning: 'The first encrypted message the client sends — if the keys did not match, the server could not read it.' },
          ],
          note: 'One round trip after ClientHello, the tunnel is up. TLS 1.2 needed two.',
        },
      },
      {
        no: 8, time: '0.078s', source: '192.168.1.10', dest: '93.184.216.34', protocol: 'TLSv1.3',
        info: 'Application Data — GET / (encrypted)', size: '254 B',
        decode: {
          title: 'Application data — the request, encrypted',
          fields: [
            { name: 'Content', value: 'GET / HTTP/1.1 …', meaning: 'The same HTTP request as the plain journey — now ciphertext.' },
            { name: 'Visible to an observer', value: 'Only the endpoints and the size', meaning: 'An eavesdropper sees the two IP addresses, port 443, and that 254 bytes moved — not the path, not the headers, not the cookies.' },
          ],
          note: 'TLS protects the content, not the metadata: who talked to whom, when, and how much are still visible.',
        },
      },
      {
        no: 9, time: '0.095s', source: '93.184.216.34', dest: '192.168.1.10', protocol: 'TLSv1.3',
        info: 'Application Data — HTTP/1.1 200 OK (encrypted)', size: '1,480 B',
        decode: {
          title: 'Application data — the page, encrypted',
          fields: [
            { name: 'Content', value: 'HTTP/1.1 200 OK + HTML', meaning: 'The response, encrypted with the session key.' },
            { name: 'Integrity', value: 'AEAD tag on every record', meaning: 'Each record carries an authentication tag — any tampering is detected and the connection dies.' },
          ],
          note: 'From the first SYN to the page: 0.095 seconds. Encryption cost one round trip.',
        },
      },
    ],
    callouts: [
      { title: 'TLS 1.2 → 1.3: what actually changed', body: 'TLS 1.3 (RFC 8446) cut the handshake from two round trips to one, removed the weak options — RSA key exchange, static Diffie-Hellman, CBC ciphers, SHA-1, renegotiation — and encrypts the certificate. Ephemeral key exchange is now mandatory, so every session is forward-secret: even if the server’s private key leaks later, past sessions cannot be decrypted.' },
      { title: 'What the certificate proves — and what it does not', body: 'The certificate proves the server holds the private key for the name in the certificate, and that a trusted CA vouches for that binding. It does not prove the site is honest, safe, or who you think it is beyond the name — a phishing site can have a perfectly valid certificate for its own domain.' },
    ],
    questions: [
      {
        q: 'What does the server’s certificate prove to the browser?',
        options: ['That the site is trustworthy and safe', 'That the server holds the private key for the name in the certificate, vouched for by a trusted CA', 'That the connection cannot be observed at all', 'That the site’s content is encrypted at rest'],
        answer: 1,
        explain: 'The certificate binds a name to a public key through a CA’s signature, and CertificateVerify proves the server holds the matching private key. It says nothing about whether the site itself is honest — a phishing site can hold a valid certificate for its own domain.',
      },
      {
        q: 'In TLS 1.3, what is encrypted after ServerHello?',
        options: ['Only the application data', 'Everything — including the certificate and extensions', 'Only the Finished message', 'Nothing; TLS 1.3 encrypts only the key exchange'],
        answer: 1,
        explain: 'Once ServerHello is sent, both sides have derived the handshake keys, so EncryptedExtensions, the certificate, CertificateVerify, and Finished are all encrypted. In TLS 1.2 the certificate travelled in cleartext.',
      },
      {
        q: 'What is the biggest handshake improvement in TLS 1.3 over 1.2?',
        options: ['Longer keys', 'One round trip instead of two, with weak ciphers and RSA key exchange removed', 'Certificates are no longer needed', 'It runs over UDP instead of TCP'],
        answer: 1,
        explain: 'TLS 1.3 completes the handshake in one round trip (1-RTT) and removed RSA key exchange, static DH, CBC ciphers, and renegotiation — leaving only ephemeral, forward-secret AEAD ciphers.',
      },
    ],
  },
};

export function getProtocolJourney(id) {
  return PROTOCOL_JOURNEYS[id];
}

export function listProtocolJourneys() {
  return Object.values(PROTOCOL_JOURNEYS);
}

