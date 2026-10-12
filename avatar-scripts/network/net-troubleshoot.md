# Troubleshooting Methodology & Tools: The Seven-Step Method — Avatar Tutor Script

**Lesson ID:** net-troubleshoot
**Track:** Network+
**Estimated runtime:** ~5 minutes (~686 words)

## Spoken script

**[HOOK — 0:00]**
Troubleshooting is the skill employers actually pay for. It is a quarter of the
Network+ exam — and the difference between a two-minute fix and a two-hour
outage is having a method.

**[WHY IT MATTERS — ~0:15]**
A consistent method stops you from changing three things at once and never
learning which one fixed it. This lesson covers CompTIA's seven-step
methodology, the command-line tools for each layer, and how to read the classic
symptoms back to their likely causes.

**[SECTION — The seven-step method — ~0:45]**
CompTIA's troubleshooting methodology runs in seven steps, and you work them
in order. Skipping straight to a fix is how outages get longer.

Step one: identify the problem. Gather information, question users, identify
symptoms, determine what changed recently, and duplicate the problem if you can.

Step two: establish a theory. Form a probable cause — and question the obvious.
Step three: test the theory. Determine the cause; if the theory fails,
establish a new one or escalate. Step four: establish a plan of action to
resolve the problem, and identify its potential effects. Step five: implement
the solution — or escalate.

Step six: verify full system functionality and, if applicable, implement
preventive measures. Step seven: document findings, actions, outcomes and
lessons learned. Documentation is the step everyone skips and everyone later
wishes they had. Notice the method is a loop: failed theory means a new theory,
not a bigger hammer.

**[SECTION — Tools, layer by layer — ~2:25]**
Now the toolbox. Start at the host: ipconfig /all on Windows, or ip addr on
Linux, shows the addressing, gateway and DNS servers. ping tests reachability.
traceroute — tracert on Windows — shows each router hop, by sending packets
with increasing TTL values and collecting the ICMP Time Exceeded replies.
Each hop that answers narrows down where the path breaks.

For name resolution, nslookup or the richer dig query DNS directly — bypassing
the application's cache to show you exactly what DNS returns. netstat on
Windows, or ss on Linux, lists connections and listening ports; netstat -ano
adds the owning process ID, which answers "what is actually listening here?"
arp -a shows the local IP-to-MAC table — useful for spotting duplicate IPs or
ARP spoofing.

And for deep analysis: Wireshark, or tcpdump on the command line, captures
packets. The trick is filtering. Display filters such as tcp.port == 443 or
ip.addr == 10.0.0.5 cut a capture of thousands of packets down to the ones that
matter. Capture narrowly, then filter.

**[SECTION — Reading symptoms — ~3:50]**
The exam loves symptom-to-cause questions, so practise reading them backwards.

Users can reach IP addresses but not names: a DNS problem. Check the DNS server
settings, then test with nslookup. A link with high CRC errors: a Physical
layer issue — a bad cable, interference or a duplex mismatch. Start at Layer 1
and work up; never start at Layer 7 for a CRC problem.

Two hosts with the same IP give intermittent connectivity and IP-conflict
warnings. Check the DHCP scopes and static assignments, and compare arp -a
output to find the offender. Each symptom is a shortcut — but only if you have
seen the pattern before. That is what this section is for.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: running the steps out of order — theorising before you have
identified the problem. Two: changing several things at once, so the fix
teaches you nothing. Three: treating symptoms. If a duplicate IP keeps coming
back, the DHCP scope or the static assignment is the disease; the conflict
warning is just the fever.

**[RECAP — ~5:05]**
Identify, theorise, test, plan, implement, verify, document — in order. Host
addressing with ipconfig and ip addr; reachability with ping; the path with
traceroute and tracert; DNS with nslookup and dig; connections with netstat and
ss; the MAC table with arp -a; and Wireshark or tcpdump with tight display
filters for the deep dives. IPs work but names do not: DNS. High CRC errors:
Layer 1. Intermittent with conflict warnings: duplicate IP. One method, one
variable at a time — that is the whole discipline.

## On-screen visuals

- HOOK: a timeline comparing a two-minute fix with a method against a two-hour
  outage without one.
- The seven-step method SECTION: the seven-step stack — identify through
  document — with the "what changed" callout on step one.
- Tools, layer by layer SECTION: command cards — ipconfig, ping, traceroute's
  TTL hops, nslookup/dig, netstat -ano, arp -a — and a Wireshark capture with
  display filters applied.
- Reading symptoms SECTION: the symptom-to-cause table — names failing, CRC
  errors, duplicate IPs.
- COMMON MISTAKES: the out-of-order and multiple-changes warnings.
- RECAP: the cheat-sheet rows as a clean summary card.
