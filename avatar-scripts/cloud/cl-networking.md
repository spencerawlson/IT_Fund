# Cloud Networking: Subnets, Filters and Private Roads — Avatar Tutor Script

**Lesson ID:** cl-networking
**Track:** Cloud Computing & Security
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
Cloud networking looks like on-premises networking with the cables replaced
by API calls. Same concepts — subnets, routes, firewalls, DNS — but a single
route table entry can make a database internet-facing. In the cloud,
networking mistakes become security incidents at API speed.

**[WHY IT MATTERS — ~0:25]**
Misconfigured networks cause a huge share of cloud breaches, and the exam
tests every distinction in this lesson: public versus private, stateful
versus stateless, peering versus transit. Learn the building blocks precisely
— the rest of cloud security assumes you have.

**[SECTION — Subnets and routing — ~0:50]**
In AWS, a subnet is "public" only because its route table has a route to an
Internet Gateway. That is the whole definition — no gateway route, not
public. Private subnets have no such route; they reach the internet outbound
through a NAT gateway, which allows outbound connections for patches and API
calls but never lets the internet initiate a connection inward. Outbound yes,
inbound no — that asymmetry is the point.

Plan IP space centrally before you build. VPCs with overlapping CIDR blocks
cannot be peered or routed cleanly, and fixing that later means rebuilding.
Address planning is boring until it is an outage.

**[SECTION — Filtering traffic — ~1:50]**
Security groups and network ACLs sound similar and behave differently — the
exam's favourite networking trap. Security groups are stateful and attach to
instances: return traffic is allowed automatically, and rules can only allow.
Network ACLs are stateless and apply to whole subnets: they can allow and
deny, are evaluated in rule-number order, and need explicit rules for return
traffic. Stateful versus stateless, instance versus subnet, allow-only versus
allow-and-deny. Keep those three pairs straight.

VPC Flow Logs record IP traffic metadata — source, destination, ports, bytes,
accept or reject — for network interfaces. They are essential for
investigations: who talked to whom, and was it allowed? But they do not
contain payloads. Flow logs tell you the envelope was delivered; they never
show you the letter inside.

**[SECTION — Connecting networks and services — ~2:55]**
VPC peering privately connects two VPCs — but it is not transitive. A to B
and B to C does not give A to C. For hub-and-spoke at scale, Transit Gateway
is the answer. For private, dedicated links from on-premises: Direct Connect
on AWS, ExpressRoute on Azure, Cloud Interconnect on GCP.

VPC endpoints — PrivateLink — reach cloud services privately without
touching the public internet: gateway endpoints for S3 and DynamoDB,
interface endpoints for most others. Your traffic to the provider's own
services never leaves the private road.

Load balancers split by layer. The Application Load Balancer works at Layer 7
with path- and host-based routing — content-aware decisions. The Network Load
Balancer works at Layer 4 with extreme performance and static IPs. And Route
53 provides DNS with health checks and routing policies: latency-based,
weighted, failover, and geolocation. DNS plus health awareness is how traffic
finds the healthy path automatically.

**[SECTION — Admin access — ~4:05]**
A bastion host is a hardened jump box that admins SSH through — one
fortified door into the private network. The modern alternative is AWS
Systems Manager Session Manager: no open inbound ports at all, and every
session is logged. Fewer doors, full audit trail. When the exam asks for the
most secure admin access, Session Manager is usually the answer it wants.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: assuming peering is transitive. It is not — A to B to C
does not connect A to C. Two: mixing up security groups and NACLs. Stateful,
instance-level, allow-only versus stateless, subnet-level, allow-and-deny,
rule-number order. Three: expecting payloads in Flow Logs. Metadata only —
source, destination, ports, bytes, accept or reject.

**[RECAP — ~4:50]**
A subnet is public only via its Internet Gateway route; private subnets go
outbound through a NAT gateway. Security groups are stateful, instance-level,
allow-only; NACLs are stateless, subnet-level, allow-and-deny by rule
number. Flow Logs record metadata, never payloads. Peering is private but
not transitive — Transit Gateway scales; Direct Connect, ExpressRoute, and
Interconnect are the dedicated on-premises links. VPC endpoints keep service
traffic private; ALB routes at Layer 7, NLB performs at Layer 4; Route 53
adds health-checked DNS routing. And for admin access, Session Manager beats
the bastion — no inbound ports, every session logged. Private roads, precise
filters. That is cloud networking.

## On-screen visuals

- HOOK: on-premises cables dissolving into API calls; one route table entry
  flipping a database to internet-facing.
- Subnets/routing: route table with Internet Gateway route marking a subnet
  public; NAT gateway allowing outbound-only from private subnets;
  overlapping CIDR blocks blocking a peering.
- Filtering: security group vs NACL comparison — stateful/instance/allow-only
  vs stateless/subnet/allow-and-deny with rule numbers; Flow Logs sample
  showing metadata fields, payload crossed out.
- Connecting: peering diagram showing non-transitivity (A-B, B-C, no A-C);
  Transit Gateway hub-and-spoke; dedicated links (Direct Connect,
  ExpressRoute, Interconnect); PrivateLink endpoints bypassing the internet;
  ALB vs NLB layer split; Route 53 routing policies.
- Admin access: bastion host jump box vs Session Manager with no inbound
  ports and session logging.
- RECAP: the cheat-sheet terms as a clean summary card.
