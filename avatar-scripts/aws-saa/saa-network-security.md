# VPC and Network Security — Security Groups, Private Connectivity and the Edge — Avatar Tutor Script

**Lesson ID:** saa-network-security
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~5 minutes (~750 words)

## Spoken script

**[HOOK — 0:00]**
A VPC is a private network you fully control, and network security on AWS is
deciding, packet by packet, what may cross its boundaries. The exam tests this
as layered defence: no single control is trusted alone, and every tier — edge,
subnet, instance — gets its own filtering.

**[WHY IT MATTERS — ~0:25]**
Network security questions turn on crisp distinctions: stateful versus
stateless, allow-only versus explicit deny, gateway endpoint versus NAT
gateway.

**[SECTION — Two filters, two temperaments — ~0:50]**
Security groups and network ACLs both filter traffic. A security group is
stateful and attached to resources: it allows traffic in, and the response
flows back out automatically. It speaks only Allow — there is no deny rule —
and the most permissive matching rule wins. A web server accepting HTTPS only
from the internet gets one inbound rule: port 443 from 0.0.0.0/0.

A NACL is stateless and attached to the subnet: every packet is judged on its
own, inbound and outbound separately, so return traffic needs its own explicit
rule — including the ephemeral ports clients use for replies. Rules are
numbered, evaluated lowest-first, first match wins, and unlike security groups,
NACLs support explicit Deny. That makes the NACL the right tool when the
requirement says allow plus explicit-deny at the subnet boundary. Defence in
depth means using both: the security group expresses intent per workload — this
database accepts traffic only from the app tier's security group, referenced
by ID — while the NACL provides a coarse subnet-level backstop. And when an instance is compromised, the fastest network-level
containment is swapping its security group for a quarantine group that severs
connectivity instantly.

**[SECTION — Keeping traffic off the internet — ~2:00]**
Traffic that never leaves AWS cannot be intercepted on the public internet.
Instances in private subnets reach S3 and DynamoDB through gateway endpoints —
a route-table entry, not a NAT gateway, not an internet hop. For other services
and private APIs, interface endpoints — PrivateLink — place an elastic network
interface inside your VPC, so calls travel the AWS backbone with a private DNS
name. The same thinking extends to hybrid access: on-premises users reach an
internal load balancer over VPN or Direct Connect, and a company inspecting all
outbound VPC traffic centrally builds an inspection VPC — typically fronted by
a Gateway Load Balancer chaining appliance fleets — with spoke VPCs routing
egress through it.

Two gotchas. A Lambda function placed inside a VPC loses its
default internet access: to call a third-party HTTPS API it needs a route to a
NAT gateway in a public subnet. And S3 access can be fenced to a single VPC by
combining a gateway endpoint with a bucket policy keyed on the aws:sourceVpce
condition.

**[SECTION — Protecting what must face the public — ~3:10]**
What cannot be made private must be hardened at the edge. AWS WAF is the
Layer-7 firewall: it inspects HTTP requests for SQL injection, cross-site
scripting, and bot patterns, attaching to the Application Load Balancer,
CloudFront, and API Gateway. It is not a DDoS service and not a network
firewall. DDoS protection comes from Shield: Standard is automatic and free for
every customer; Advanced is the paid tier — around-the-clock response team,
deeper attack telemetry, and cost protection against the usage spike an attack
causes.

S3 Block Public Access, enabled at
the account level, overrides any bucket policy or ACL that would expose data —
the emergency brake for accidental publicity. For detection rather than
prevention, GuardDuty flags exposed access keys and anomalous API activity
while IAM Access Analyzer surfaces unintended cross-account access.

**[COMMON MISTAKES — ~4:25]**
Three traps. One: WAF is Layer 7 only — pairing it as the answer to a
volumetric DDoS question is wrong; that is Shield's job. Two: NACLs are
stateless, so return traffic on ephemeral ports needs an explicit outbound
rule. Three: private subnets reach S3 through a gateway endpoint, not a NAT
gateway — reaching for the NAT gateway wastes money and adds an internet hop.

**[RECAP — ~4:50]**
Network security is layered defence. Security groups are stateful and
allow-only at the resource; NACLs are stateless with explicit deny at the
subnet; quarantine a compromised instance by swapping its group. Keep traffic
private with gateway endpoints for S3 and DynamoDB and PrivateLink for
everything else, fenced by aws:sourceVpce. At the edge, WAF filters Layer-7
attacks while Shield absorbs DDoS. Block Public Access plus GuardDuty and
Access Analyzer close the loop between prevention and detection.

## On-screen visuals

- HOOK: a VPC diagram with layered filters lighting up at the edge, the
  subnet, and the instance.
- FILTERS SECTION: side-by-side comparison — stateful security group with
  automatic return flow versus stateless NACL with numbered rules and an
  explicit deny; the ephemeral-port rule highlighted.
- PRIVATE CONNECTIVITY SECTION: gateway endpoint as a route-table entry to S3;
  PrivateLink as an elastic network interface inside the VPC; the inspection
  VPC with a Gateway Load Balancer chaining appliances.
- EDGE SECTION: request flow through WAF at Layer 7 attached to an ALB, with
  Shield absorbing a DDoS flood beneath it; Block Public Access as an
  account-level override switch.
- COMMON MISTAKES: three trap cards — "WAF is not DDoS", "NACLs need return
  rules", "gateway endpoint, not NAT, for S3".
- RECAP: the cheat-sheet terms as a clean summary card.
