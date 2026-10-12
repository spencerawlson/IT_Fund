# Ports & Protocols: TCP, UDP and the Well-Known Ports — Avatar Tutor Script

**Lesson ID:** net-ports
**Track:** Network+
**Estimated runtime:** ~6 minutes (~776 words)

## Spoken script

**[HOOK — 0:00]**
A firewall log shows traffic on port 23. Routine — or a red flag? Ports are how
you read a network's intentions. Learn them, and a rule base stops being
alphabet soup.

**[WHY IT MATTERS — ~0:15]**
A port number tells the receiving host which service a segment is for — so you
can read firewall rules, spot suspicious traffic, and answer a large share of
Network+ and Security+ questions. This lesson: TCP versus UDP, the three-way
handshake, and the well-known ports grouped by job, with full names, and which
cleartext protocols to replace.

**[SECTION — TCP and UDP — ~0:45]**
TCP is connection-oriented: it opens with the three-way handshake — SYN,
SYN-ACK, ACK — like a phone call where both sides agree they are on the line
first. TCP numbers every byte, acknowledges receipt, retransmits losses and
delivers in order, closing politely with FIN/ACK or abruptly with RST.

UDP is connectionless and best-effort: no handshake, no acknowledgements, no
ordering. A postcard in the mail — lighter and faster, suiting DNS queries,
VoIP and video, and protocols that handle reliability themselves, like QUIC.
HTTP/3 runs over UDP 443.

**[SECTION — Remote access — ~1:30]**
Remote administration is the highest-value target, so its ports deserve the
most scrutiny. SSH, port 22, is the secure workhorse: an encrypted shell that
also carries SFTP and SCP — one port for shell and file transfer. Telnet, port
23, is its unencrypted ancestor: usernames, passwords and keystrokes in
cleartext. Finding 23 open means replacing it with SSH. RDP, port 3389, is
Microsoft's graphical remote desktop: powerful, dangerous when exposed — never
on the internet without a VPN.

**[SECTION — File transfer — ~2:05]**
The oldest file protocols move credentials and data in cleartext. FTP uses
ports 20 and 21 — 21 control, 20 active-mode data — with everything, including
the login, in cleartext: replace it with SFTP on 22. SMB, port 445, is Windows
file and printer sharing, the protocol behind mapped drives and a favourite of
ransomware worms: block it at the internet edge. TFTP, port 69 over UDP, is
FTP's stripped-down, unauthenticated cousin for pushing firmware to network
devices — simple, fast and trusting, by design.

**[SECTION — Web traffic — ~2:40]**
The web is two ports: a private conversation versus a postcard. HTTP, port 80,
is unencrypted — fine for public content, unacceptable for logins. HTTPS, port
443, is HTTP wrapped in TLS: encrypted and authenticated. And HTTP/3, built on
QUIC, also uses 443 — but over UDP instead of TCP.

**[SECTION — Email — ~3:05]**
Email is three jobs, each with its own port. SMTP, port 25, carries mail server
to server; clients submit on 587, and legacy SMTPS uses 465. POP3, port 110,
retrieves mail by downloading it — historically deleting the server copy —
with POP3S on 995. IMAP, port 143, leaves mail on the server so devices stay
in sync — the modern default — with IMAPS on 993.

**[SECTION — Name, address and time services — ~3:40]**
The invisible plumbing. DNS, port 53, translates names to IPs — mostly UDP,
TCP for zone transfers and oversized responses. DHCP, ports 67 and 68 over
UDP, hands out addresses: server on 67, client on 68, in the four-step DORA
exchange — Discover, Offer, Request, Acknowledge. NTP, port 123 over UDP, keeps
clocks synchronised — not cosmetic: Kerberos fails when clocks drift, and
forensic log correlation depends on it.

**[SECTION — Management and directories — ~4:20]**
The protocols that watch the network, and the directories that know everyone.
SNMP, port 161 over UDP: managers poll on 161, agents send traps on 162.
Versions 1 and 2c use cleartext community strings — use SNMPv3. Syslog, port
514 over UDP, ships logs to a central collector; with TLS it commonly moves to
6514 over TCP. LDAP, port 389 over TCP, queries directories like Active
Directory; LDAPS wraps it in TLS on 636.

**[COMMON MISTAKES — ~5:00]**
Two traps. One: 587 versus 25 — clients submit on 587; 25 is server-to-server
relay. Two: the port tells you the protocol, not the security. 389 is LDAP;
the secure variant, LDAPS, is the second number in the pair, 636.

**[RECAP — ~5:15]**
TCP is the phone call — handshake, order, retransmission; UDP is the postcard.
22 SSH, 23 Telnet — replace it — 3389 RDP, never exposed. FTP on 20/21 in
cleartext, SMB on 445, TFTP on 69. 80 HTTP, 443 HTTPS. 25 relay, 587 submit,
110 and 143 retrieve, 995 and 993 encrypted. DNS 53, DHCP 67/68, NTP 123.
SNMP 161/162, syslog 514, LDAP 389, LDAPS 636. Learn the pairs, and the logs
start talking to you.

## On-screen visuals

- HOOK: a firewall rule table with port 23 highlighted as an alert row.
- TCP and UDP SECTION: a handshake diagram — SYN, SYN-ACK, ACK — beside a
  postcard-style UDP datagram flow.
- Remote access SECTION: the remote-access port stack — 22, 23, 3389 — with the
  cleartext warning on Telnet.
- File transfer SECTION: the file-transfer port stack with FTP's control/data
  channel split and the SMB edge-block note.
- Web traffic SECTION: two-port comparison card — 80 postcard versus 443 sealed
  envelope, with the HTTP/3 UDP note.
- Email SECTION: the email port stack — 25 relay, 587 submit, 110/143 retrieve —
  with encrypted variants beside each.
- Name, address and time services SECTION: the infrastructure port stack, with
  the DORA four-step exchange and the Kerberos clock warning.
- Management and directories SECTION: the management port stack, with SNMPv3 and
  TLS variants called out.
- COMMON MISTAKES: 587 versus 25, and the 389/636 secure-variant pattern.
- RECAP: the cheat-sheet rows as a clean summary card.
