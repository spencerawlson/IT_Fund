import { describe, it, expect } from 'vitest';
import { PROTOCOL_JOURNEYS, getProtocolJourney, listProtocolJourneys } from '../data/protocolJourneys';

const EXPECTED_JOURNEYS = ['proto-page-load', 'proto-dns', 'proto-tcp', 'proto-tls'];

describe('protocol journeys', () => {
  it('contains exactly the four planned journeys', () => {
    expect(listProtocolJourneys().map((j) => j.id).sort()).toEqual([...EXPECTED_JOURNEYS].sort());
    EXPECTED_JOURNEYS.forEach((id) => expect(getProtocolJourney(id)).toBeDefined());
    expect(getProtocolJourney('nope')).toBeUndefined();
  });

  it.each(EXPECTED_JOURNEYS)('%s has a title, intro, endpoints, nodes, and protocols', (id) => {
    const j = getProtocolJourney(id);
    expect(j.title.length).toBeGreaterThan(0);
    expect(j.blurb.length).toBeGreaterThan(0);
    expect(j.intro.length).toBeGreaterThan(0);
    expect(j.endpoints.length).toBeGreaterThanOrEqual(2);
    j.endpoints.forEach((ep) => {
      expect(ep.label).toBeTruthy();
      expect(ep.ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    });
    expect(j.nodes.length).toBeGreaterThanOrEqual(4);
    j.nodes.forEach((n) => {
      expect(n.title).toBeTruthy();
      expect(n.body).toBeTruthy();
      expect(n.icon).toBeTruthy();
    });
    expect(j.protocols.length).toBeGreaterThanOrEqual(1);
    j.protocols.forEach((p) => {
      expect(p.name).toBeTruthy();
      expect(p.layer).toBeTruthy();
      expect(p.port).toBeTruthy();
      expect(p.rfc).toMatch(/^RFC /);
      expect(p.href).toMatch(/^https:\/\/www\.rfc-editor\.org\/rfc\//);
    });
    expect(j.simulatedNote).toMatch(/Simulated/);
  });

  it.each(EXPECTED_JOURNEYS)('%s has sequential packets, each with a full decode', (id) => {
    const j = getProtocolJourney(id);
    expect(j.packets.length).toBeGreaterThanOrEqual(7);
    j.packets.forEach((pkt, i) => {
      expect(pkt.no).toBe(i + 1);
      expect(pkt.time).toMatch(/^\d+\.\d{3}s$/);
      expect(pkt.source).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(pkt.dest).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(pkt.protocol).toBeTruthy();
      expect(pkt.info).toBeTruthy();
      expect(pkt.size).toBeTruthy();
      expect(pkt.decode.title).toBeTruthy();
      expect(pkt.decode.fields.length).toBeGreaterThanOrEqual(2);
      pkt.decode.fields.forEach((f) => {
        expect(f.name).toBeTruthy();
        expect(f.value).toBeTruthy();
        expect(f.meaning).toBeTruthy();
      });
    });
  });

  it.each(EXPECTED_JOURNEYS)('%s has 2–3 check questions with a valid answer', (id) => {
    const j = getProtocolJourney(id);
    expect(j.questions.length).toBeGreaterThanOrEqual(2);
    expect(j.questions.length).toBeLessThanOrEqual(3);
    j.questions.forEach((q) => {
      expect(q.q).toBeTruthy();
      expect(q.options.length).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.options[q.answer]).toBeTruthy();
      expect(q.explain.length).toBeGreaterThan(20);
    });
  });

  it('the page-load journey matches the reference capture', () => {
    const j = getProtocolJourney('proto-page-load');
    const infos = j.packets.map((p) => p.info);
    expect(infos[0]).toBe('Standard query A www.example.com');
    expect(infos[1]).toBe('Standard query response A 203.0.113.10');
    expect(infos[2]).toBe('52344 → 80 [SYN] Seq=0');
    expect(infos[3]).toBe('80 → 52344 [SYN, ACK] Seq=0 Ack=1');
    expect(infos[4]).toBe('52344 → 80 [ACK] Seq=1 Ack=1');
    expect(infos[5]).toBe('GET / HTTP/1.1');
    expect(infos[6]).toBe('HTTP/1.1 200 OK (text/html), 9 segments');
    expect(j.packets[0].size).toBe('75 B');
    expect(j.packets[1].size).toBe('91 B');
    expect(j.packets[2].size).toBe('66 B');
    expect(j.packets[5].size).toBe('484 B');
    expect(j.packets[6].size).toBe('12.8 KB');
  });

  it('the DNS journey walks root → TLD → authoritative', () => {
    const j = getProtocolJourney('proto-dns');
    expect(j.packets[1].dest).toBe('198.41.0.4'); // root
    expect(j.packets[3].dest).toBe('192.5.6.30'); // .com TLD
    expect(j.packets[5].dest).toBe('192.0.2.53'); // authoritative
    expect(j.packets[6].decode.fields.find((f) => f.name === 'Answer').value).toContain('93.184.216.34');
    expect(j.records.map((r) => r.type)).toEqual(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT']);
  });

  it('the TCP journey shows a retransmission and a 4-packet teardown', () => {
    const j = getProtocolJourney('proto-tcp');
    const retrans = j.packets.find((p) => p.info.includes('retransmission'));
    expect(retrans).toBeDefined();
    expect(retrans.info).toContain('Seq=51');
    expect(j.packets[5].info).toContain('Seq=51'); // the lost original
    expect(j.packets[5].size).toBe(retrans.size);
    const finPackets = j.packets.filter((p) => p.info.includes('[FIN'));
    expect(finPackets.length).toBe(2);
    expect(j.packets[j.packets.length - 1].info).toContain('[ACK]');
  });

  it('the TLS journey completes the handshake in one round trip after TCP', () => {
    const j = getProtocolJourney('proto-tls');
    expect(j.packets[0].info).toContain('443 [SYN]');
    expect(j.packets[3].info).toContain('ClientHello');
    expect(j.packets[4].info).toContain('TLS_AES_128_GCM_SHA256');
    expect(j.packets[5].info).toContain('Certificate');
    expect(j.packets[7].info).toContain('encrypted');
    expect(j.packets[8].info).toContain('200 OK');
  });
});
