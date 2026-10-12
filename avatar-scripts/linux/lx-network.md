# Networking Tools: ip, ss and the SSH Workflow — Avatar Tutor Script

**Lesson ID:** lx-network
**Track:** Linux Administration
**Estimated runtime:** ~6 minutes (~776 words)

## Spoken script

**[HOOK — 0:00]**
When the app cannot reach the database, somebody has to answer the question:
is it DNS, the routing, the firewall, or the service itself? Guessing is
expensive — every wrong guess is twenty minutes. The network tools in this
lesson turn that guess into a procedure: check each layer in order until one
of them confesses. Linux replaced the old net-tools long ago, so we learn the
modern kit.

**[WHY IT MATTERS — ~0:25]**
Network troubleshooting is the skill that makes you the person people call.
The tools are few — ip, ss, curl, ping, ssh, scp, nc — but used in the right
order they isolate any connectivity problem in minutes. And the SSH half of
this lesson is daily life for every remote admin: keys, copying files, jumping
between hosts. This is the lesson you will use literally every day.

**[SECTION — The modern toolkit: ip and ss — ~0:50]**
First, unlearn the old commands. ifconfig and netstat are deprecated —
present on some systems, missing on others, and missing features everywhere.
The modern replacements come from iproute2. ip addr shows interfaces and
addresses; ip minus brief addr gives the compact view for a quick scan. ip
route shows the routing table, and here is the power move: ip route get
8.8.8.8 reveals exactly which interface and source IP the kernel would use to
reach that address. When traffic goes out the wrong interface, this command
shows you why.

ss minus tulpn is the fast, modern netstat: listening TCP and UDP sockets with
process names. When you need to know what is actually on port 5432 — and which
process owns it — this is the command. Memorise the letters; you will type
them weekly.

For HTTP, curl minus capital I sends a HEAD request and prints just the
headers: status codes, redirects, server banners. It answers "is the web
server responding and what is it saying about itself" without downloading the
page. And ping: ping minus c 4 host sends four ICMP echoes and stops, because
plain ping runs forever on Linux and you will forget it is running. One
critical limitation to burn into memory: ping cannot test ports. ICMP has no
port concept. "The host pings but the app is down" tells you the machine is
alive and nothing about the service.

**[SECTION — SSH, copying, and name resolution — ~2:30]**
SSH is the remote admin's lifeline. ssh minus i ~/.ssh/deploy.pem user@host
connects with a specific key — the basis of automation and jump hosts, where
one machine is the doorway to the rest. scp copies files over that same
encrypted channel: scp file.txt user@host:/tmp/, minus r for directories.
For repeated syncs, rsync is the grown-up answer, but scp is the quick one you
reach for first.

Name resolution has an order: the system checks /etc/hosts before DNS — a stale
hosts entry overrides real DNS and sends you chasing a phantom DNS problem. The
order is configured in /etc/nsswitch.conf; /etc/resolv.conf names the DNS
servers. When a name resolves wrong, check hosts first; it is the embarrassing
answer more often than anyone admits.

And to test a TCP port properly: nc minus vz host 443. The three outcomes are
the whole diagnostic. Open means the service is reachable. Refused means you
reached the host but nothing listens — the service is down. Timeout means
something in between ate your packets — the firewall, or the route. Open,
refused, timeout: service, host, or path. That is the answer key.

The lesson's drill strings it together: getent hosts db.internal — does the
name resolve? ip route get 10.0.5.8 — which interface would we use? nc minus
vz 10.0.5.8 5432 — is the port reachable? ss minus tulpn pipe grep 5432 on
the server — is anything listening? Resolve, route, connect, listen: isolate
the layer before you guess.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: using ping to test a port. It cannot — ICMP has no ports —
so "it pings" proves the host is up and nothing else. Two: reaching for
ifconfig and netstat on a modern system where they are missing or lobotomised.
Learn ip and ss; the old tools are museum pieces. Three: forgetting /etc/hosts
during DNS debugging. The hosts file wins over DNS, and a forgotten entry
there has wasted many an afternoon.

**[RECAP — ~4:50]**
ip addr and ip route replaced ifconfig and route — ip route get shows the
kernel's path decision. ss minus tulpn replaced netstat. curl minus capital I
reads HTTP headers, ping minus c 4 stops after four, and ping never tests
ports. ssh minus i picks your key, scp copies over the encrypted channel,
/etc/hosts beats DNS per nsswitch.conf. nc minus vz gives the three answers:
open, refused, timeout — the service, the host, or the path. Resolve, route,
connect, listen: troubleshooting without guessing.

## On-screen visuals

- HOOK: app-to-database connection failing; four suspects — DNS, routing, firewall, service — in a lineup.
- WHY IT MATTERS: on-call admin isolating a connectivity fault in minutes with the toolkit.
- The modern toolkit: ip addr/route output; ip route get path decision highlighted; ss -tulpn listening sockets; curl -I headers; ping -c 4 vs endless ping; "ping has no ports" warning.
- SSH, copying, and name resolution: ssh -i key flow with jump host; scp file transfer; /etc/hosts → nsswitch.conf → resolv.conf resolution order; nc -vz three outcomes (open/refused/timeout); the four-step drill as a flowchart.
- RECAP: cheat-sheet terms as a clean summary card.
