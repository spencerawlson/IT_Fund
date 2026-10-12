# Network Security Controls — Filtering, WAF, Shield and Account Boundaries — Avatar Tutor Script

**Lesson ID:** awss-network-security
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~6 minutes (~797 words)

## Spoken script

**[HOOK — 0:00]**
Network security in AWS is a stack of overlapping controls, and the exam tests
whether you know which layer answers which threat. Security groups guard
instances, NACLs guard subnets, WAF guards web applications, Shield guards
against DDoS, and account boundaries guard everything. Misplace a control and
the architecture fails where it matters.

**[WHY IT MATTERS — ~0:25]**
This is the infrastructure-security layer of the specialty exam, and it rewards
precision: stateful versus stateless, Layer 7 versus Layer 3, prevention versus
detection.

**[SECTION — Filtering: security groups and NACLs — ~0:50]**
Security groups and network ACLs both filter traffic, and they behave
differently in the ways that matter. Security groups are stateful: return
traffic for an allowed connection is automatically permitted, so you never
think about ephemeral ports — and they are allow-only, with no deny rule.
NACLs are stateless: each direction is evaluated independently, so a NACL that
allows inbound web traffic must also allow the outbound ephemeral-port range
for the response. NACLs support explicit deny rules, evaluated in ascending
rule-number order with first match winning.

The canonical three-tier layout puts load balancers in public subnets and
application and data tiers in private subnets across at least two Availability
Zones, with NAT gateways for outbound-only internet access. A web
security group allows 443 from the internet; the application security group
allows traffic only from the web security group — referenced by security group
ID, not by IP. For AWS service access without internet exposure, VPC endpoints
keep traffic on the private network: gateway endpoints for S3 and DynamoDB are
free route-table targets; interface endpoints for most other services are
elastic network interfaces with hourly and data charges. Endpoint policies add
a further control: even with broad IAM permissions, an endpoint policy can deny
access to sensitive buckets, containing exfiltration paths. An instance with no
internet route can still be managed — private subnets with interface endpoints
for SSM give you Session Manager with no internet path at all.

**[SECTION — WAF, Shield, and the account boundary — ~2:20]**
AWS WAF filters Layer 7 web traffic — SQL injection, cross-site scripting, bot
control — in front of CloudFront, Application Load Balancers, and API Gateway.
It is not a network firewall; it never sees Layers 3 and 4. Start with AWS
managed rule groups for common threats like the OWASP Top 10, then add custom
rules for business logic. If a managed rule update starts blocking legitimate
traffic, switch it to Count mode: matches are logged but not blocked, so you
can tune exclusions without an outage.

DDoS protection comes in two tiers. Shield Standard is automatic and free for
CloudFront, Route 53, ALBs, and Elastic IPs. Shield Advanced adds cost but
brings 24/7 access to the DDoS Response Team, deeper Layer 7 mitigations, and
cost protection against scaling charges during an attack. The pairing is
deliberate: WAF rate-based rules handle application-layer floods per IP, while
Shield Advanced handles volumetric Layers 3, 4, and 7 attacks — use both. For
centralised, stateful inspection across VPCs, AWS Network Firewall sits as a
transit inspection point — Suricata-compatible rules at Layers 3 through 7 —
typically in a dedicated security VPC in a hub-and-spoke Transit Gateway
design. AWS Firewall Manager then deploys WAF rules, Shield Advanced
protections, and security group policies centrally across the organisation.

Finally, the strongest network boundary in AWS is not a firewall rule but an
account. Separate accounts per environment, governed by SCPs with separate
CloudTrail and Config, eliminate entire classes of accidental cross-environment
privilege paths. Combined with account-level S3 Block Public Access — no bucket
can become public via ACLs or policies regardless of individual settings — the
multi-account structure is the foundation every other network control rests on.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: WAF is Layer 7 — it never stops a volumetric Layer 3 or 4
flood; that is Shield's job. Two: NACLs are stateless — inbound web access
without the outbound ephemeral-port rule breaks the response. Three: the
account boundary beats every firewall rule — per-environment accounts with
SCPs win on blast radius.

**[RECAP — ~5:05]**
Stack the controls at the right layers. Security groups are stateful and
allow-only at the instance; NACLs are stateless with numbered allow and deny
rules at the subnet. Three-tier the VPC
— load balancers public, app and data private — and keep service traffic off
the internet with gateway and interface endpoints, hardened by endpoint
policies. WAF filters Layer 7 with managed groups and Count mode for safe
tuning; Shield Advanced brings the response team and cost protection against
volumetric attacks; Network Firewall centralises stateful inspection; Firewall
Manager deploys it all across the organisation. And beneath it all, the account
boundary plus Block Public Access is the strongest network control you have.

## On-screen visuals

- HOOK: the control stack as layers — instance, subnet, web application, DDoS,
  account boundary — each labelled with its service.
- FILTERING SECTION: stateful security group with automatic return flow beside
  a stateless NACL with numbered rules and an ephemeral-port outbound rule; the
  three-tier VPC layout with SG-ID references; endpoint policies containing
  exfiltration.
- WAF/SHIELD SECTION: WAF filtering Layer-7 attacks in front of an ALB with a
  rule in Count mode logging matches; Shield absorbing a volumetric flood with
  the DRT beside it; Network Firewall as a transit inspection point in a
  security VPC.
- COMMON MISTAKES: three trap cards — "WAF is Layer 7 only", "NACLs need
  return-port rules", "the account is the strongest boundary".
- RECAP: the cheat-sheet terms as a clean summary card.
