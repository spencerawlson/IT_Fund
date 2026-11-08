import { describe, it, expect } from 'vitest';
import {
  internetChecksum,
  verifyChecksum,
  parseIpv4,
  encodeDomainName,
  buildDnsQuery,
  buildTcpSegment,
  buildIpv4Packet,
  bytesToHexDump,
  bytesToHex,
} from './packetBuilder';

describe('internetChecksum', () => {
  it('returns 0xffff for an empty input', () => {
    expect(internetChecksum(new Uint8Array([]))).toBe(0xffff);
  });

  it('computes the RFC 1071 example: 0x0001 0xf203 → 0x0dfb', () => {
    // The classic worked example from RFC 1071: sum of 0x0001 + 0xf203 = 0xf204,
    // one's complement = 0x0dfb.
    expect(internetChecksum(new Uint8Array([0x00, 0x01, 0xf2, 0x03]))).toBe(0x0dfb);
  });

  it('handles an odd-length input by padding the last byte', () => {
    // 0x00 0x01 0x02 -> words 0x0001 + 0x0200 = 0x0201 -> complement 0xfdfe.
    expect(internetChecksum(new Uint8Array([0x00, 0x01, 0x02]))).toBe(0xfdfe);
  });

  it('verifyChecksum is true exactly when the checksum is correct', () => {
    const data = new Uint8Array([0x45, 0x00, 0x00, 0x14, 0x12, 0x34, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00, 0xc0, 0xa8, 0x01, 0x0a, 0xcb, 0x00, 0x71, 0x0a]);
    const sum = internetChecksum(data);
    data[10] = (sum >> 8) & 0xff;
    data[11] = sum & 0xff;
    expect(verifyChecksum(data)).toBe(true);
    data[3] = 0x15; // flip one byte -> checksum no longer valid
    expect(verifyChecksum(data)).toBe(false);
  });
});

describe('parseIpv4', () => {
  it('parses a valid address', () => {
    expect(parseIpv4('192.168.1.10')).toEqual({ octets: [192, 168, 1, 10] });
    expect(parseIpv4('  8.8.8.8 ')).toEqual({ octets: [8, 8, 8, 8] });
  });

  it('rejects bad addresses with a message', () => {
    expect(parseIpv4('192.168.1').error).toMatch(/four numbers/);
    expect(parseIpv4('192.168.1.256').error).toMatch(/0 to 255/);
    expect(parseIpv4('192.168.1.x').error).toMatch(/not a number/);
    expect(parseIpv4('').error).toBeTruthy();
  });
});

describe('encodeDomainName', () => {
  it('encodes www.example.com as length-prefixed labels + zero', () => {
    const { bytes } = encodeDomainName('www.example.com');
    expect(bytes).toEqual([3, 119, 119, 119, 7, 101, 120, 97, 109, 112, 108, 101, 3, 99, 111, 109, 0]);
  });

  it('is case-insensitive and tolerates a trailing dot', () => {
    const a = encodeDomainName('WWW.Example.COM.');
    expect(a.bytes).toEqual(encodeDomainName('www.example.com').bytes);
  });

  it('rejects empty labels and bad characters', () => {
    expect(encodeDomainName('www..example.com').error).toMatch(/empty/);
    expect(encodeDomainName('exa_mple.com').error).toMatch(/cannot contain/);
    expect(encodeDomainName('-bad.com').error).toMatch(/hyphen/);
    expect(encodeDomainName('').error).toBeTruthy();
  });
});

describe('buildDnsQuery', () => {
  it('builds the exact bytes for www.example.com, id 0x1234, RD set, type A', () => {
    const r = buildDnsQuery({ id: 0x1234, name: 'www.example.com', qtype: 1, recursionDesired: true });
    expect(r.error).toBeUndefined();
    expect(r.length).toBe(33);
    // Header: 12 34 | 01 00 (RD) | 00 01 | 00 00 | 00 00 | 00 00
    // QNAME: 03 www 07 example 03 com 00 | QTYPE 00 01 | QCLASS 00 01
    expect(bytesToHex(r.bytes)).toBe(
      '12 34 01 00 00 01 00 00 00 00 00 00 03 77 77 77 07 65 78 61 6d 70 6c 65 03 63 6f 6d 00 00 01 00 01',
    );
    expect(r.fields.find((f) => f.name === 'QTYPE').value).toBe('A (1)');
    expect(r.fields.find((f) => f.name === 'Flags').value).toBe('0x0100 (RD)');
  });

  it('clears the RD bit when recursion is not desired', () => {
    const r = buildDnsQuery({ id: 0x0001, name: 'example.com', recursionDesired: false });
    expect(r.bytes[2]).toBe(0x00);
    expect(r.bytes[3]).toBe(0x00);
  });

  it('encodes AAAA (28) and MX (15) types', () => {
    expect(buildDnsQuery({ name: 'example.com', qtype: 28 }).bytes.slice(-4)).toEqual(
      new Uint8Array([0x00, 0x1c, 0x00, 0x01]),
    );
    expect(buildDnsQuery({ name: 'example.com', qtype: 15 }).bytes.slice(-4)).toEqual(
      new Uint8Array([0x00, 0x0f, 0x00, 0x01]),
    );
  });

  it('returns an error instead of bytes for bad input', () => {
    expect(buildDnsQuery({ name: 'not a domain!' }).error).toBeTruthy();
    expect(buildDnsQuery({ id: 70000, name: 'example.com' }).error).toMatch(/0 to 65535/);
    expect(buildDnsQuery({ name: 'example.com', qtype: 99 }).error).toBeTruthy();
  });
});

describe('buildTcpSegment', () => {
  const SYN = { srcPort: 52344, dstPort: 80, seq: 0, ack: 0, flags: { syn: true }, window: 64240, srcIp: '192.168.1.10', dstIp: '203.0.113.10' };

  it('builds the exact header bytes for a SYN (except the checksum)', () => {
    const r = buildTcpSegment(SYN);
    expect(r.error).toBeUndefined();
    expect(r.length).toBe(20);
    const b = r.bytes;
    expect(b[0]).toBe(0xcc); expect(b[1]).toBe(0x78); // source port 52344
    expect(b[2]).toBe(0x00); expect(b[3]).toBe(0x50); // dest port 80
    expect(b[4]).toBe(0); expect(b[7]).toBe(0); // seq 0
    expect(b[8]).toBe(0); expect(b[11]).toBe(0); // ack 0
    expect(b[12]).toBe(0x50); // data offset 5
    expect(b[13]).toBe(0x02); // SYN only
    expect(b[14]).toBe(0xfa); expect(b[15]).toBe(0xf0); // window 64240
    expect(b[18]).toBe(0); expect(b[19]).toBe(0); // urgent pointer
    expect(r.fields.find((f) => f.name === 'Flags').value).toBe('SYN');
  });

  it('computes a real checksum that verifies over the pseudo-header', () => {
    const r = buildTcpSegment(SYN);
    // Rebuild the pseudo-header + segment and check the sum is 0xffff.
    const src = [192, 168, 1, 10];
    const dst = [203, 0, 113, 10];
    const pseudo = new Uint8Array([...src, ...dst, 0, 6, 0, 20]);
    const combined = new Uint8Array([...pseudo, ...r.bytes]);
    expect(verifyChecksum(combined)).toBe(true);
    expect(r.checksum).toBe((r.bytes[16] << 8) | r.bytes[17]);
    expect(r.checksum).not.toBe(0);
  });

  it('changes the checksum when any field changes', () => {
    const a = buildTcpSegment(SYN).checksum;
    const b = buildTcpSegment({ ...SYN, seq: 1 }).checksum;
    const c = buildTcpSegment({ ...SYN, window: 1000 }).checksum;
    expect(b).not.toBe(a);
    expect(c).not.toBe(a);
  });

  it('appends ASCII data and grows the segment', () => {
    const r = buildTcpSegment({ ...SYN, flags: { ack: true, psh: true }, seq: 1, ack: 101, data: 'GET /' });
    expect(r.length).toBe(25);
    expect(r.bytes.slice(20)).toEqual(new Uint8Array([0x47, 0x45, 0x54, 0x20, 0x2f]));
    expect(r.fields.find((f) => f.name === 'Flags').value).toBe('ACK + PSH');
    const src = [192, 168, 1, 10];
    const dst = [203, 0, 113, 10];
    const pseudo = new Uint8Array([...src, ...dst, 0, 6, 0, 25]);
    expect(verifyChecksum(new Uint8Array([...pseudo, ...r.bytes]))).toBe(true);
  });

  it('encodes all six flags in the right bit positions', () => {
    const r = buildTcpSegment({ ...SYN, flags: { urg: true, ack: true, psh: true, rst: true, syn: true, fin: true } });
    expect(r.bytes[13]).toBe(0x3f);
  });

  it('returns errors for out-of-range fields and bad IPs', () => {
    expect(buildTcpSegment({ ...SYN, srcPort: 70000 }).error).toMatch(/Source port/);
    expect(buildTcpSegment({ ...SYN, seq: -1 }).error).toMatch(/Sequence number/);
    expect(buildTcpSegment({ ...SYN, srcIp: '999.1.1.1' }).error).toMatch(/Source IP/);
    expect(buildTcpSegment({ ...SYN, data: 'café' }).error).toMatch(/ASCII/);
  });
});

describe('buildIpv4Packet', () => {
  const BASE = { srcIp: '192.168.1.10', dstIp: '203.0.113.10', ttl: 64, protocol: 6, identification: 0x1234, dontFragment: true };

  it('builds the exact header bytes (except the checksum)', () => {
    const r = buildIpv4Packet(BASE);
    expect(r.error).toBeUndefined();
    expect(r.length).toBe(20);
    const b = r.bytes;
    expect(b[0]).toBe(0x45); // version 4, IHL 5
    expect(b[1]).toBe(0x00);
    expect(b[2]).toBe(0x00); expect(b[3]).toBe(0x14); // total length 20
    expect(b[4]).toBe(0x12); expect(b[5]).toBe(0x34); // identification
    expect(b[6]).toBe(0x40); expect(b[7]).toBe(0x00); // DF set, offset 0
    expect(b[8]).toBe(64); // TTL
    expect(b[9]).toBe(6); // TCP
    expect(b[12]).toBe(192); expect(b[15]).toBe(10); // source
    expect(b[16]).toBe(203); expect(b[19]).toBe(10); // destination
    expect(r.fields.find((f) => f.name === 'Protocol').value).toBe('TCP (6)');
    expect(r.fields.find((f) => f.name === 'Flags').value).toBe('DF set, MF clear');
  });

  it('computes a real header checksum that verifies', () => {
    const r = buildIpv4Packet(BASE);
    expect(verifyChecksum(r.bytes.slice(0, 20))).toBe(true);
    expect(r.checksum).toBe((r.bytes[10] << 8) | r.bytes[11]);
  });

  it('grows total length with the payload and sets MF/offset when asked', () => {
    const r = buildIpv4Packet({ ...BASE, payload: 'hello', dontFragment: false, moreFragments: true, fragmentOffset: 2 });
    expect(r.length).toBe(25);
    expect(r.bytes[2]).toBe(0x00); expect(r.bytes[3]).toBe(0x19); // 25
    expect(r.bytes[6]).toBe(0x20); expect(r.bytes[7]).toBe(0x02); // MF + offset 2
    expect(r.bytes.slice(20)).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]));
    expect(verifyChecksum(r.bytes.slice(0, 20))).toBe(true);
  });

  it('supports UDP and ICMP protocol numbers', () => {
    expect(buildIpv4Packet({ ...BASE, protocol: 17 }).bytes[9]).toBe(17);
    expect(buildIpv4Packet({ ...BASE, protocol: 1 }).bytes[9]).toBe(1);
    expect(buildIpv4Packet({ ...BASE, protocol: 99 }).error).toBeTruthy();
  });

  it('rejects bad TTLs and bad IPs', () => {
    expect(buildIpv4Packet({ ...BASE, ttl: 0 }).error).toMatch(/TTL/);
    expect(buildIpv4Packet({ ...BASE, ttl: 256 }).error).toMatch(/TTL/);
    expect(buildIpv4Packet({ ...BASE, dstIp: '10.0.0' }).error).toMatch(/Destination IP/);
  });
});

describe('bytesToHexDump', () => {
  it('renders offset, hex, and ASCII columns', () => {
    const dump = bytesToHexDump(new Uint8Array([0x47, 0x45, 0x54, 0x20, 0x2f]));
    expect(dump.startsWith('0000')).toBe(true);
    expect(dump).toContain('47 45 54 20 2f');
    expect(dump.endsWith('GET /')).toBe(true);
    // Exactly one line for 5 bytes, with the ASCII column after the hex.
    expect(dump.split('\n')).toHaveLength(1);
  });

  it('wraps at 16 bytes per line', () => {
    const bytes = new Uint8Array(Array.from({ length: 20 }, (_, i) => i));
    const lines = bytesToHexDump(bytes).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^0000/);
    expect(lines[1]).toMatch(/^0010/);
  });
});
