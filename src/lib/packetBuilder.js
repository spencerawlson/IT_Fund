// Real, deterministic packet building: DNS queries, TCP segments, and IPv4 packets.
// Every byte is computed from the chosen header fields — field widths, byte order
// (network order, big-endian), and checksums are all real (RFC 791, RFC 793, RFC 1035).
// No fake bytes: if the inputs are invalid the builder returns { error } instead.

const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

/** One's-complement Internet checksum (RFC 1071) over a byte array. */
export function internetChecksum(bytes) {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const hi = bytes[i];
    const lo = i + 1 < bytes.length ? bytes[i + 1] : 0;
    sum += (hi << 8) | lo;
    // Fold carries as we go so the sum stays small.
    sum = (sum & 0xffff) + (sum >> 16);
  }
  return (~sum) & 0xffff;
}

/** Verify a checksum: the one's-complement sum over the data (checksum included)
 * is 0xffff, so internetChecksum() returns 0 exactly when it is correct. */
export function verifyChecksum(bytes) {
  return internetChecksum(bytes) === 0;
}

/** Strict IPv4 parse. Returns { octets: [a,b,c,d] } or { error }. */
export function parseIpv4(str) {
  if (typeof str !== 'string') return { error: 'Enter an IPv4 address like 192.168.1.10.' };
  const parts = str.trim().split('.');
  if (parts.length !== 4) return { error: 'An IPv4 address has four numbers separated by dots.' };
  const octets = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return { error: `"${p}" is not a number from 0 to 255.` };
    const n = Number(p);
    if (n < 0 || n > 255) return { error: `"${p}" is not a number from 0 to 255.` };
    octets.push(n);
  }
  return { octets };
}

function ipBytes(str) {
  const parsed = parseIpv4(str);
  return parsed.error ? null : parsed.octets;
}

/** Encode a domain name as DNS labels: length-prefixed labels + terminating zero. */
export function encodeDomainName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    return { error: 'Enter a domain name, for example www.example.com.' };
  }
  const clean = name.trim().replace(/\.$/, '').toLowerCase();
  if (clean.length > 253) return { error: 'Domain names are at most 253 characters.' };
  const labels = clean.split('.');
  const out = [];
  for (const label of labels) {
    if (label.length === 0) return { error: 'Domain labels cannot be empty — check for ".." or a leading dot.' };
    if (label.length > 63) return { error: `Label "${label}" is longer than 63 characters.` };
    if (!/^[a-z0-9-]+$/.test(label)) {
      return { error: `Label "${label}" has characters DNS names cannot contain (letters, digits, hyphens only).` };
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return { error: `Label "${label}" cannot start or end with a hyphen.` };
    }
    out.push(label.length);
    for (let i = 0; i < label.length; i++) out.push(label.charCodeAt(i));
  }
  out.push(0);
  return { bytes: out };
}

export const DNS_QTYPES = [
  { value: 1, label: 'A — IPv4 address' },
  { value: 28, label: 'AAAA — IPv6 address' },
  { value: 5, label: 'CNAME — canonical name (alias)' },
  { value: 15, label: 'MX — mail exchange' },
  { value: 2, label: 'NS — name server' },
  { value: 16, label: 'TXT — text record' },
];

const DNS_QTYPE_NAMES = { 1: 'A', 28: 'AAAA', 5: 'CNAME', 15: 'MX', 2: 'NS', 16: 'TXT' };

/**
 * Build a DNS query (RFC 1035 §4.1). 12-byte header + question section.
 * @param {{ id?: number, name: string, qtype?: number, recursionDesired?: boolean }} opts
 */
export function buildDnsQuery({ id = 0x1234, name, qtype = 1, recursionDesired = true } = {}) {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff) {
    return { error: 'Transaction ID must be a whole number from 0 to 65535.' };
  }
  if (!Object.prototype.hasOwnProperty.call(DNS_QTYPE_NAMES, qtype)) {
    return { error: 'Pick a record type from the list.' };
  }
  const encoded = encodeDomainName(name);
  if (encoded.error) return { error: encoded.error };

  const flags = recursionDesired ? 0x0100 : 0x0000; // RD bit set, everything else zero for a query.
  const header = [
    ...u16(id),
    ...u16(flags),
    ...u16(1), // QDCOUNT
    ...u16(0), // ANCOUNT
    ...u16(0), // NSCOUNT
    ...u16(0), // ARCOUNT
  ];
  const question = [...encoded.bytes, ...u16(qtype), ...u16(1)]; // QCLASS IN = 1
  const bytes = new Uint8Array([...header, ...question]);
  const qname = name.trim().replace(/\.$/, '').toLowerCase();
  return {
    bytes,
    hex: bytesToHexDump(bytes),
    length: bytes.length,
    fields: [
      { name: 'Transaction ID', value: `0x${id.toString(16).padStart(4, '0')}`, meaning: 'Matches this query to its response — the resolver echoes it back.' },
      { name: 'Flags', value: recursionDesired ? '0x0100 (RD)' : '0x0000', meaning: recursionDesired ? 'RD (recursion desired) is set: the resolver should do the whole walk for us.' : 'RD is clear: the server answers only from what it already knows.' },
      { name: 'QDCOUNT', value: '1', meaning: 'One question follows in this packet.' },
      { name: 'ANCOUNT / NSCOUNT / ARCOUNT', value: '0 / 0 / 0', meaning: 'A query carries no answers — those sections are empty.' },
      { name: 'QNAME', value: qname, meaning: 'The name being looked up, as length-prefixed labels ending in a zero byte.' },
      { name: 'QTYPE', value: `${DNS_QTYPE_NAMES[qtype]} (${qtype})`, meaning: `Asking for ${DNS_QTYPE_NAMES[qtype]} records.` },
      { name: 'QCLASS', value: 'IN (1)', meaning: 'Internet class — the class every real query uses.' },
    ],
  };
}

export const TCP_FLAG_BITS = [
  { key: 'urg', bit: 0x20, label: 'URG — urgent pointer is valid' },
  { key: 'ack', bit: 0x10, label: 'ACK — acknowledgement number is valid' },
  { key: 'psh', bit: 0x08, label: 'PSH — push data to the application now' },
  { key: 'rst', bit: 0x04, label: 'RST — reset the connection' },
  { key: 'syn', bit: 0x02, label: 'SYN — synchronize sequence numbers' },
  { key: 'fin', bit: 0x01, label: 'FIN — no more data from the sender' },
];

const TCP_FLAG_NAMES = { urg: 'URG', ack: 'ACK', psh: 'PSH', rst: 'RST', syn: 'SYN', fin: 'FIN' };

function tcpFlagsByte(flags) {
  let b = 0;
  for (const { key, bit } of TCP_FLAG_BITS) if (flags[key]) b |= bit;
  return b;
}

function flagList(flags) {
  return TCP_FLAG_BITS.filter(({ key }) => flags[key]).map(({ key }) => TCP_FLAG_NAMES[key]);
}

/**
 * Build a TCP segment (RFC 793). 20-byte header + optional ASCII data.
 * The checksum is computed for real over the pseudo-header + segment.
 * @param {{ srcPort?: number, dstPort?: number, seq?: number, ack?: number, flags?: object, window?: number, srcIp?: string, dstIp?: string, data?: string }} opts
 */
export function buildTcpSegment({
  srcPort = 52344, dstPort = 80, seq = 0, ack = 0,
  flags = { syn: true }, window = 64240,
  srcIp = '192.168.1.10', dstIp = '203.0.113.10', data = '',
} = {}) {
  const range = (n, max, label) => (Number.isInteger(n) && n >= 0 && n <= max
    ? null : `${label} must be a whole number from 0 to ${max}.`);
  const bad = range(srcPort, 65535, 'Source port') || range(dstPort, 65535, 'Destination port')
    || range(seq, 0xffffffff, 'Sequence number') || range(ack, 0xffffffff, 'Acknowledgement number')
    || range(window, 65535, 'Window size');
  if (bad) return { error: bad };
  const src = ipBytes(srcIp);
  const dst = ipBytes(dstIp);
  if (!src) return { error: `Source IP: ${parseIpv4(srcIp).error}` };
  if (!dst) return { error: `Destination IP: ${parseIpv4(dstIp).error}` };

  const dataBytes = [];
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    if (code > 127) return { error: 'Payload text must be plain ASCII (letters, digits, punctuation).' };
    dataBytes.push(code);
  }

  const flagsByte = tcpFlagsByte(flags);
  // Data offset 5 (20-byte header) in the top 4 bits; reserved + NS are zero.
  const header = [
    ...u16(srcPort), ...u16(dstPort),
    ...u32(seq), ...u32(ack),
    0x50, flagsByte,
    ...u16(window),
    0, 0, // checksum placeholder
    ...u16(0), // urgent pointer
  ];
  const segment = new Uint8Array([...header, ...dataBytes]);
  // Pseudo-header: source + destination + zero + protocol (6) + TCP length.
  const pseudo = new Uint8Array([...src, ...dst, 0, 6, ...u16(segment.length)]);
  const combined = new Uint8Array([...pseudo, ...segment]);
  const checksum = internetChecksum(combined);
  segment[16] = (checksum >> 8) & 0xff;
  segment[17] = checksum & 0xff;

  const flagNames = flagList(flags);
  return {
    bytes: segment,
    hex: bytesToHexDump(segment),
    length: segment.length,
    checksum,
    fields: [
      { name: 'Source port', value: String(srcPort), meaning: 'The sender’s ephemeral port — the return address for replies.' },
      { name: 'Destination port', value: String(dstPort), meaning: dstPort === 80 ? 'Port 80: HTTP. The service being reached.' : dstPort === 443 ? 'Port 443: HTTPS (TLS over TCP).' : dstPort === 53 ? 'Port 53: DNS.' : 'The service being reached.' },
      { name: 'Sequence number', value: String(seq), meaning: 'The byte number this segment starts at — how the receiver orders the stream.' },
      { name: 'Acknowledgement number', value: flagNames.includes('ACK') ? String(ack) : '0 (ACK not set)', meaning: flagNames.includes('ACK') ? (ack > 0 ? `The next byte the sender expects to receive — "I have everything up to ${ack - 1}."` : 'The next byte the sender expects to receive.') : 'Ignored unless the ACK flag is set.' },
      { name: 'Data offset', value: '5 (20 bytes)', meaning: 'The header is 5 × 4 = 20 bytes; data starts right after.' },
      { name: 'Flags', value: flagNames.length ? flagNames.join(' + ') : '(none)', meaning: flagNames.length ? flagNames.map((f) => ({ SYN: 'open a connection', ACK: 'confirm receipt', PSH: 'deliver data now', FIN: 'no more data', RST: 'abort the connection', URG: 'urgent data follows' }[f])).join('; ') + '.' : 'No flags set — a bare segment.' },
      { name: 'Window', value: `${window} bytes`, meaning: 'How many more bytes the sender is willing to receive — flow control.' },
      { name: 'Checksum', value: `0x${checksum.toString(16).padStart(4, '0')}`, meaning: 'Computed over the pseudo-header + segment — the receiver recomputes it to catch corruption.' },
      { name: 'Urgent pointer', value: '0', meaning: 'Only meaningful with the URG flag.' },
      ...(dataBytes.length ? [{ name: 'Payload', value: `${dataBytes.length} bytes: "${data}"`, meaning: 'Application data carried after the 20-byte header.' }] : []),
    ],
  };
}

export const IP_PROTOCOLS = [
  { value: 6, label: 'TCP (6)' },
  { value: 17, label: 'UDP (17)' },
  { value: 1, label: 'ICMP (1)' },
];

const IP_PROTOCOL_NAMES = { 6: 'TCP', 17: 'UDP', 1: 'ICMP' };

/**
 * Build an IPv4 packet (RFC 791). 20-byte header + optional ASCII payload.
 * The header checksum is computed for real.
 * @param {{ srcIp?: string, dstIp?: string, ttl?: number, protocol?: number, identification?: number, dontFragment?: boolean, moreFragments?: boolean, fragmentOffset?: number, payload?: string }} opts
 */
export function buildIpv4Packet({
  srcIp = '192.168.1.10', dstIp = '203.0.113.10', ttl = 64, protocol = 6,
  identification = 0x1234, dontFragment = true, moreFragments = false,
  fragmentOffset = 0, payload = '',
} = {}) {
  const src = ipBytes(srcIp);
  const dst = ipBytes(dstIp);
  if (!src) return { error: `Source IP: ${parseIpv4(srcIp).error}` };
  if (!dst) return { error: `Destination IP: ${parseIpv4(dstIp).error}` };
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 255) return { error: 'TTL must be a whole number from 1 to 255.' };
  if (!Object.prototype.hasOwnProperty.call(IP_PROTOCOL_NAMES, protocol)) return { error: 'Pick a protocol from the list.' };
  if (!Number.isInteger(identification) || identification < 0 || identification > 0xffff) {
    return { error: 'Identification must be a whole number from 0 to 65535.' };
  }
  if (!Number.isInteger(fragmentOffset) || fragmentOffset < 0 || fragmentOffset > 8191) {
    return { error: 'Fragment offset must be a whole number from 0 to 8191.' };
  }
  const payloadBytes = [];
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    if (code > 127) return { error: 'Payload text must be plain ASCII (letters, digits, punctuation).' };
    payloadBytes.push(code);
  }

  const totalLength = 20 + payloadBytes.length;
  const flagsOffset = (dontFragment ? 0x4000 : 0) | (moreFragments ? 0x2000 : 0) | (fragmentOffset & 0x1fff);
  const header = [
    0x45, // version 4, header length 5 (20 bytes)
    0x00, // DSCP/ECN: best effort
    ...u16(totalLength),
    ...u16(identification),
    ...u16(flagsOffset),
    ttl,
    protocol,
    0, 0, // header checksum placeholder
    ...src, ...dst,
  ];
  const checksum = internetChecksum(new Uint8Array(header));
  header[10] = (checksum >> 8) & 0xff;
  header[11] = checksum & 0xff;
  const bytes = new Uint8Array([...header, ...payloadBytes]);

  return {
    bytes,
    hex: bytesToHexDump(bytes),
    length: bytes.length,
    checksum,
    fields: [
      { name: 'Version / IHL', value: '4 / 5 (20 bytes)', meaning: 'IPv4, and the header is 5 × 4 = 20 bytes — no options.' },
      { name: 'Total length', value: `${totalLength} bytes`, meaning: 'Header + payload, in bytes. Routers use it to find the packet’s end.' },
      { name: 'Identification', value: `0x${identification.toString(16).padStart(4, '0')}`, meaning: 'Tags every fragment of one datagram so the receiver can reassemble them.' },
      { name: 'Flags', value: `${dontFragment ? 'DF set' : 'DF clear'}${moreFragments ? ', MF set' : ', MF clear'}`, meaning: dontFragment ? 'DF (Don’t Fragment): routers must drop rather than split this packet — too big means an ICMP "fragmentation needed" comes back.' : 'DF is clear, so routers may split this packet if a link’s MTU is too small.' },
      { name: 'Fragment offset', value: String(fragmentOffset), meaning: 'Where this fragment belongs in the original datagram, in units of 8 bytes.' },
      { name: 'TTL', value: String(ttl), meaning: 'Hops left. Every router subtracts 1; at 0 the packet is dropped, so a routing loop cannot spin forever.' },
      { name: 'Protocol', value: `${IP_PROTOCOL_NAMES[protocol]} (${protocol})`, meaning: `The payload is a ${IP_PROTOCOL_NAMES[protocol]} ${protocol === 6 ? 'segment' : protocol === 17 ? 'datagram' : 'message'} — the receiver hands it to that protocol.` },
      { name: 'Header checksum', value: `0x${checksum.toString(16).padStart(4, '0')}`, meaning: 'Computed over the 20-byte header only — routers recompute it at every hop (TTL changes, so the checksum is rewritten each hop).' },
      { name: 'Source / Destination', value: `${srcIp} → ${dstIp}`, meaning: 'Who sent it, and who it is for. Routers forward on the destination.' },
      ...(payloadBytes.length ? [{ name: 'Payload', value: `${payloadBytes.length} bytes: "${payload}"`, meaning: 'The data carried after the 20-byte header.' }] : []),
    ],
  };
}

/** Hex dump: offset, 16 bytes per line, ASCII column — the shape Wireshark shows. */
export function bytesToHexDump(bytes) {
  const lines = [];
  for (let off = 0; off < bytes.length; off += 16) {
    const chunk = bytes.slice(off, off + 16);
    const hex = Array.from(chunk, (b) => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(chunk, (b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
    lines.push(`${off.toString(16).padStart(4, '0')}  ${hex.padEnd(48, ' ')}  ${ascii}`);
  }
  return lines.join('\n');
}

/** Flat hex string (no offsets) — handy for copying. */
export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
}
