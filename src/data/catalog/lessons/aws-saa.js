// Reading content for the AWS Solutions Architect – Associate track (src/data/academy/aws-saa.js).
// Keyed by deck id. Professional voice — narrative, precise, confident.

export default {
  'saa-iam': {
    overview: [
      'Every AWS architecture stands on identity. Before a single packet routes or a single byte is stored, someone — a person, an application, a deployment pipeline — must prove who they are and what they are allowed to do. IAM is that gatekeeper, and the exam treats it as the foundation of the entire security domain: roughly a third of your score rests on designing secure architectures, and most of those questions begin with an identity decision.',
      'This lesson covers the IAM building blocks the exam expects you to reason with fluently: users, groups, and roles; identity versus resource policies; how explicit denies and permission boundaries shape effective permissions; and the modern patterns — short-lived credentials, federation, Identity Center, and organizational guardrails — that replace the old habit of handing out access keys.',
    ],
    learn: [
      {
        heading: 'Roles, not keys: the credential model',
        body: [
          'The single most important IAM habit is also the simplest: never use long-lived credentials where a role will do. An IAM role is an identity with no permanent password and no permanent access key. Instead, the Security Token Service issues temporary credentials that expire — in minutes or hours — and every AWS service knows how to request them. When a question describes developers, applications, or pipelines needing AWS access, the exam-correct answer is almost always a role.',
          'For applications on EC2, the mechanism is the instance profile: a role attached to the instance, from which the application transparently receives rotating temporary credentials. Nothing is stored on disk, nothing is embedded in configuration files, and there is nothing to leak. The same pattern covers the two-hour debugging session — assume a scoped-down role via STS rather than minting a user — and the CI/CD pipeline, where OIDC federation lets GitHub Actions or a build server assume a role with no stored AWS key at all.',
          'Identity Center is the workforce-facing side of the same idea: single sign-on for humans across accounts and applications, replacing the sprawl of IAM users created per person per account. And the root account sits outside all of this — it cannot be constrained by IAM policies, which is exactly why it gets MFA, locked-away credentials, and is never used for daily work.',
        ],
      },
      {
        heading: 'How permissions are actually evaluated',
        body: [
          'Two kinds of policy govern access. Identity policies attach to users, groups, and roles and declare what that identity may do. Resource policies attach to the resource itself — S3 bucket policies and KMS key policies are the classic examples — and declare who may use it. Cross-account access needs both sides to agree: a trust policy on the role in the target account plus a resource policy (or identity policy) permitting the action. One side alone is never enough.',
          'Evaluation follows strict rules. An explicit Deny in any applicable policy wins over every Allow, everywhere — there is no override, no admin exception. A permission boundary sets a maximum: the effective permissions are the intersection of the boundary and the identity policies, which makes boundaries the right tool for delegating administration without delegating the crown jewels. Service control policies play the same role one level up, as guardrails on entire accounts or organizational units; they filter what is possible but grant nothing themselves.',
          'Conditions sharpen all of this. A single condition key can restrict an action to a source IP range, require MFA, or limit access to resources carrying a specific tag. The exam loves the VPC-endpoint variant: a bucket policy that denies every principal except requests arriving through a named VPC endpoint, enforced with the aws:sourceVpce condition — private S3 access with no public surface at all.',
        ],
      },
      {
        heading: 'Least privilege as a practice, not a slogan',
        body: [
          'Least privilege fails in practice for one reason: permissions are easy to grant and tedious to review. The exam expects you to know the machinery that makes review feasible. When two engineers need identical, frequently changing permissions, you do not clone policies — you put both engineers in a group and manage the policy once. Groups are the unit of shared human access; roles are the unit of temporary and cross-account access.',
          'IAM Access Analyzer closes the loop by finding unused permissions. It analyzes CloudTrail history and produces findings showing which granted actions were never exercised, so policies can be tightened toward what is actually used. Combined with permission boundaries for delegated admins and SCPs at the organization level, this is what a least-privilege architecture looks like in production: layered, reviewed, and shrinking toward necessity.',
          'Two permissions deserve special attention because they are easy to misjudge. iam:PassRole does not grant access to anything directly — it controls who may hand a role to an AWS service, which is why a user who can pass an overpowered role to EC2 can effectively escalate. And access keys, where they still exist, should be rotated on a schedule — but the better answer, the one the exam rewards, is to eliminate them entirely in favor of roles.',
        ],
      },
    ],
    cheatSheet: [
      ['IAM role', 'Identity with temporary STS credentials; preferred over long-lived keys.'],
      ['Instance profile', 'Attaches a role to EC2 so applications get rotating credentials automatically.'],
      ['Identity policy', 'Attached to users, groups, or roles; declares what the identity may do.'],
      ['Resource policy', 'Attached to a resource (S3 bucket, KMS key); declares who may use it.'],
      ['Explicit deny', 'Wins over every Allow in policy evaluation — no exceptions.'],
      ['Permission boundary', 'Maximum-permissions guardrail; effective rights are the intersection with identity policies.'],
      ['SCP', 'Service control policy: organization-level guardrail that filters permissions but grants none.'],
      ['IAM Identity Center', 'Workforce single sign-on across accounts and applications.'],
      ['OIDC federation', 'External identity providers (e.g. GitHub Actions) assume roles — no stored AWS keys.'],
      ['iam:PassRole', 'Controls who may hand a role to an AWS service; a quiet escalation path if over-granted.'],
    ],
  },

  'saa-network-security': {
    overview: [
      'A VPC is a private network you fully control, and network security on AWS is the discipline of deciding, packet by packet, what may cross its boundaries. The exam tests this as layered defense: no single control is trusted alone, and every tier of the architecture — edge, subnet, instance — gets its own filtering.',
      'This lesson covers the two packet filters and how they differ, the private-connectivity options that keep traffic off the internet, and the edge services — WAF, Shield, and GuardDuty — that protect what must face the public. The through-line is defense in depth: stateful and stateless filters, overlapping, so that one misconfiguration is never the whole story.',
    ],
    learn: [
      {
        heading: 'Two filters, two temperaments',
        body: [
          'Security groups and network ACLs both filter traffic, and confusing them is one of the exam\'s favorite traps. A security group is stateful and attached to resources: it allows traffic in, and the response flows back out automatically. It speaks only Allow — there is no deny rule — and it evaluates all rules together, so the most permissive matching rule wins. When a web server must accept HTTPS only from the internet, the security group carries an inbound rule for port 443 from 0.0.0.0/0 and nothing else.',
          'A NACL is stateless and attached to the subnet: every packet is judged on its own, inbound and outbound separately, which means return traffic needs its own explicit rule — including the ephemeral ports clients use for replies. Rules are numbered and evaluated lowest-first, with the first match deciding; unlike security groups, NACLs support explicit Deny. That makes the NACL the right tool when the requirement says stateful-allow plus explicit-deny at the subnet boundary.',
          'Defense in depth means using both. The security group expresses intent per workload — this database accepts traffic only from the app tier\'s security group, referenced by ID rather than by address — while the NACL provides a coarse subnet-level backstop. And when an instance is compromised, the fastest network-level containment is not a firewall rule change: it is swapping the instance\'s security group for a quarantine group that severs its connectivity instantly.',
        ],
      },
      {
        heading: 'Keeping traffic off the internet',
        body: [
          'Traffic that never leaves AWS cannot be intercepted on the public internet, and the exam rewards designs that exploit this. Instances in private subnets reach S3 and DynamoDB through gateway endpoints — a route-table entry, not a NAT gateway, not an internet hop. For other AWS services and for private APIs, interface endpoints (PrivateLink) place an elastic network interface inside your VPC, so calls to the service travel the AWS backbone with a private DNS name.',
          'The same thinking extends to hybrid access. On-premises users reach an internal load balancer over VPN or Direct Connect rather than through a public endpoint, and a company inspecting all outbound VPC traffic centrally builds an inspection VPC — typically fronted by a Gateway Load Balancer chaining appliance fleets — with spoke VPCs routing egress through it. Centralized, logged, and consistent.',
          'A Lambda function placed inside a VPC loses its default internet access, which surprises people exactly once: to call a third-party HTTPS API it needs a route to a NAT gateway in a public subnet. And S3 access can be fenced to a single VPC by combining a gateway endpoint with a bucket policy keyed on the aws:sourceVpce condition — the same condition pattern that secures cross-service private access throughout the exam.',
        ],
      },
      {
        heading: 'Protecting what must face the public',
        body: [
          'What cannot be made private must be hardened at the edge. AWS WAF is the Layer-7 firewall: it inspects HTTP requests for SQL injection, cross-site scripting, and bot patterns, and it attaches to the Application Load Balancer, CloudFront, and API Gateway. It is not a DDoS service and not a network firewall — it is the web-application layer, and the exam will test whether you place it there.',
          'DDoS protection comes from Shield. Shield Standard is automatic and free for every customer — network and transport-layer absorption you already have. Shield Advanced is the paid tier: around-the-clock response team, deeper attack telemetry, and cost protection against the usage spike an attack causes. The canonical pairing the exam asks for — DDoS protection plus a web application firewall — is Shield Advanced in front of WAF.',
          'Two more guardrails round out the picture. S3 Block Public Access, enabled at the account level, overrides any bucket policy or ACL that would expose data — the emergency brake for accidental publicity. And for detection rather than prevention, GuardDuty flags exposed access keys and anomalous API activity while IAM Access Analyzer surfaces unintended cross-account access: the services that tell you something already went wrong.',
        ],
      },
    ],
    cheatSheet: [
      ['Security group', 'Stateful, allow-only, attached to resources; return traffic is automatic.'],
      ['NACL', 'Stateless subnet filter; numbered rules evaluated lowest-first; supports explicit Deny.'],
      ['Ephemeral ports', 'NACLs must explicitly allow return traffic on high ports — they are stateless.'],
      ['Gateway endpoint', 'Private route-table path to S3/DynamoDB; no NAT, no internet.'],
      ['PrivateLink', 'Interface endpoint exposing a service privately inside your VPC.'],
      ['aws:sourceVpce', 'Policy condition restricting access to a specific VPC endpoint.'],
      ['AWS WAF', 'Layer-7 firewall for SQLi/XSS; attach to ALB, CloudFront, API Gateway.'],
      ['Shield Standard', 'Free, automatic network-layer DDoS protection for everyone.'],
      ['Shield Advanced', 'Paid: 24/7 response team, attack telemetry, DDoS cost protection.'],
      ['S3 Block Public Access', 'Account/bucket-level override blocking any public exposure.'],
    ],
  },

  'saa-data-protection': {
    overview: [
      'Data protection on AWS is encryption plus key management plus the operational discipline around both. The exam does not ask you to implement cryptography; it asks you to choose correctly between the managed options — which SSE mode, which key store, which secret store — and to know who holds the keys and who can prove they were used properly.',
      'This lesson covers envelope encryption and KMS, the three S3 server-side encryption modes, where secrets and certificates live, and the S3 features that protect data against deletion and ransomware. The recurring theme is control: AWS can manage the machinery, but you decide the trust boundary.',
    ],
    learn: [
      {
        heading: 'Envelope encryption and KMS',
        body: [
          'AWS encrypts with envelope encryption: a unique data key encrypts the data, and a KMS key encrypts the data key. The encrypted data key travels with the data; the KMS key never leaves KMS. This separation is what makes rotation and auditing tractable — re-encrypting petabytes is never required, because rotating the KMS key only re-wraps the small data keys.',
          'Every KMS key carries a key policy, which is a resource policy: it declares who may use and administer the key, and every use is logged to CloudTrail — who called it, when, from where. That audit trail is the exam\'s answer to proving key usage. Customer-managed keys can enable automatic annual rotation; AWS-managed keys rotate on their own schedule. When compliance demands keys in single-tenant hardware, the answer is CloudHSM, and workloads needing FIPS 140-2 validated cryptography use KMS\'s FIPS-validated endpoints.',
          'One operational rule matters more than the rest: KMS keys are regional. Data replicated cross-region stays decryptable only if a replica key exists there — multi-Region keys exist precisely for this. Disaster-recovery designs that replicate KMS-encrypted data without planning key replication fail at the worst possible moment.',
        ],
      },
      {
        heading: 'Choosing server-side encryption for S3',
        body: [
          'S3 offers three server-side modes, and the exam tests the trade-off directly. SSE-S3 uses S3-managed AES-256 keys: the simplest option, no key management, no per-request KMS charges. SSE-KMS uses keys you control in KMS: you gain an audit trail of every decryption, granular key policies, and the ability to revoke — at the cost of KMS API charges and request quotas. SSE-C lets you supply your own key with each request: maximum control, but you own secure transport, storage, and rotation of that key with no help from AWS.',
          'The default posture has simplified: new buckets encrypt with SSE-S3 automatically. Compliance requirements push toward SSE-KMS for the audit trail, and toward SSE-C only when a regulator or contract insists the cloud provider never hold the key. For EBS, encryption by default at the account level removes the decision entirely; an existing unencrypted RDS database is fixed by snapshotting, copying the snapshot with encryption enabled, and restoring — there is no in-place flip.',
        ],
      },
      {
        heading: 'Secrets, certificates, and surviving ransomware',
        body: [
          'Database credentials belong in Secrets Manager, not in code, not in environment variables, not in a wiki. Secrets Manager stores them encrypted and — the deciding feature — rotates them automatically on a schedule, including for RDS. Systems Manager Parameter Store is the cheaper alternative for configuration and secrets that rotate rarely or manually; the exam frames it as the cost-conscious choice when automatic rotation is not required.',
          'TLS certificates come from ACM: free public certificates with automatic renewal, attached to load balancers, CloudFront distributions, and API Gateway. Terminate TLS at the edge — the ALB or CloudFront — rather than passing encrypted traffic through to instances you then must manage certificates on. For discovering what sensitive data already exists, Macie applies machine learning to S3 buckets to find PII at scale.',
          'Ransomware resilience is a data-protection design, not just a backup plan. S3 versioning turns overwrites and deletes into new versions rather than destruction; MFA Delete — enabled only by the root account — requires a hardware token to permanently delete versions; and S3 Object Lock in Compliance mode makes objects immutable for the retention period, undeletable by anyone including the root user. Together they mean an attacker with stolen credentials still cannot destroy the data.',
        ],
      },
    ],
    cheatSheet: [
      ['Envelope encryption', 'Data key encrypts data; a KMS key encrypts the data key.'],
      ['SSE-S3', 'S3-managed AES-256 keys; simplest, no KMS charges.'],
      ['SSE-KMS', 'KMS-managed keys with audit trail and key policies; per-request KMS cost.'],
      ['SSE-C', 'You supply the key per request; you own its storage and rotation.'],
      ['KMS key policy', 'Resource policy on the key; every use is logged to CloudTrail.'],
      ['CloudHSM', 'Single-tenant hardware key storage for strict compliance.'],
      ['Secrets Manager', 'Encrypted secrets with automatic rotation; the home for DB credentials.'],
      ['Parameter Store', 'Cheaper config/secret store; choose when rotation is manual.'],
      ['ACM', 'Free public TLS certificates with automatic renewal; terminate TLS at the edge.'],
      ['S3 Object Lock', 'WORM immutability; Compliance mode cannot be shortened by anyone.'],
    ],
  },

  'saa-ha-compute': {
    overview: [
      'Resilient architectures assume failure. An Availability Zone will eventually have a bad day, and the exam expects your designs to survive it without a human being paged: traffic reroutes, unhealthy instances are replaced, and the database fails over on its own. Roughly a quarter of the exam tests this domain, and nearly every question is a variation on one theme — no single point of failure.',
      'This lesson covers the three pillars of highly available compute: spreading work across zones, balancing and scaling it automatically, and routing around failure with DNS. The details matter — ALB versus NLB, Multi-AZ versus read replica, target tracking versus step scaling — because the exam distinguishes designs by exactly these choices.',
    ],
    learn: [
      {
        heading: 'Designing for the zone that fails',
        body: [
          'The minimum viable resilient network spans two Availability Zones; production VPCs routinely span three. Every tier that can be multi-AZ should be: compute in an Auto Scaling group across zones, data in a replicated store, and nothing stateful trapped on a single instance. The exam\'s bluntest resilience question — survive an AZ failure with no manual intervention — is answered by this shape every time.',
          'State is the enemy of horizontal scaling. A web application that stores sessions on local disk breaks the moment the load balancer sends a returning user to a different instance, so sessions move to ElastiCache or DynamoDB and instances become interchangeable. Where affinity is genuinely required, it is configured at the load balancer as stickiness — a deliberate choice, not an accident of local disks.',
          'For the database tier, RDS Multi-AZ provides automatic failover to a synchronous standby in another zone; the standby takes no reads and exists solely to be promoted. Read replicas are a different tool: asynchronous copies that absorb read traffic and can be promoted manually, including across regions. The exam tests the distinction relentlessly — automatic failover means Multi-AZ, read scaling means replicas — and for Aurora, a reader endpoint load-balances reads across replicas while the cluster handles failover itself.',
        ],
      },
      {
        heading: 'Balancing and scaling the fleet',
        body: [
          'Load balancers come in three flavors, chosen by layer. The Application Load Balancer works at Layer 7: path- and host-based routing for HTTP and HTTPS, the default for web tiers. The Network Load Balancer works at Layer 4: static IP addresses, ultra-low latency, preservation of the client source IP, and millions of requests per second — the choice for TCP workloads and for anything that must present a fixed IP. The Gateway Load Balancer exists for one job: chaining third-party virtual appliances like firewalls and intrusion detection into the traffic path.',
          'Auto Scaling groups keep the fleet at the right size and the right health. A target-tracking policy holds a metric at a set value — request count per target is the canonical example — scaling out under load and in on calm. Health checks do the janitorial work: when an instance fails its checks, the group terminates it and launches a replacement without being asked. Lifecycle hooks pause those transitions for custom actions — warming a cache on launch, draining connections on termination.',
          'Scale-in deserves the same care as scale-out. Terminating an instance mid-request drops work, so the load balancer\'s deregistration delay gives in-flight requests time to finish before the target is removed. And for the legacy application that cannot scale at all, the exam still has an answer: an Auto Scaling group with minimum, maximum, and desired all set to one, spread across zones — it cannot grow, but it auto-recovers.',
        ],
      },
      {
        heading: 'DNS as a control plane',
        body: [
          'Route 53 is more than a phone book; its routing policies are failover machinery. Failover routing pairs a primary record with a secondary, flipping traffic when health checks declare the primary unhealthy — the standard shape for active/passive multi-region designs. Weighted routing splits traffic by proportion, which makes it the tool for blue/green deployments and canary releases. Latency-based routing sends each user to the region that answers fastest.',
          'Health checks are the senses of this system, and they must monitor what users actually experience: a check against the application endpoint, not just a ping of the host. Target-group health checks and Route 53 health checks serve different masters — the former decides whether a load balancer sends traffic to an instance, the latter decides whether DNS sends traffic to a region — and a resilient design uses both.',
          'For disciplined failover at organizational scale, Route 53 Application Recovery Controller adds readiness checks — continuous verification that the recovery environment can actually take over — and routing controls, the authoritative switches operators flip during an event. Geolocation routing answers by the user\'s location for compliance and localization; geoproximity adds a bias knob so traffic can be steered toward or away from a region by distance.',
        ],
      },
    ],
    cheatSheet: [
      ['Multi-AZ baseline', 'Production spans 2+ AZs; single-AZ designs fail the resilience bar.'],
      ['ALB', 'Layer-7 balancer: path/host routing for HTTP(S) web tiers.'],
      ['NLB', 'Layer-4 balancer: static IPs, ultra-low latency, preserves source IP.'],
      ['GWLB', 'Chains third-party virtual appliances (firewalls, IDS) into traffic.'],
      ['Target tracking', 'ASG policy holding a metric — e.g. requests per target — at a set value.'],
      ['Lifecycle hook', 'Pauses scale-out/in for custom warm-up or drain actions.'],
      ['Deregistration delay', 'Lets in-flight requests finish before a target is removed.'],
      ['RDS Multi-AZ', 'Synchronous standby with automatic failover; takes no reads.'],
      ['Read replica', 'Asynchronous readable copy for read scaling; promotable, not automatic.'],
      ['Route 53 ARC', 'Readiness checks plus routing controls for disciplined failover.'],
    ],
  },

  'saa-decoupling': {
    overview: [
      'Tightly coupled architectures fail together: one slow component backs up into the next until the whole system stalls. Decoupled architectures fail separately — a queue absorbs the surge, a failed message is isolated and retried, and each tier scales on its own schedule. This is the heart of the resilience domain, and the exam returns to it constantly.',
      'This lesson covers the decoupling toolkit: SQS queues that buffer, SNS topics that fan out, EventBridge for event-driven routing, and Step Functions for orchestrated workflows. The skill being tested is selection — knowing which service fits which shape of problem — and the failure modes each one exists to contain.',
    ],
    learn: [
      {
        heading: 'Queues absorb, topics broadcast',
        body: [
          'SQS is a pull-based buffer between producers and consumers. When a web tier spikes and the backend cannot keep up, messages wait in the queue instead of overwhelming workers; when a downstream API rate-limits you, the queue meters the work to a pace it can accept. Consumers poll, process, and delete — and if processing fails, the message simply becomes visible again for another attempt.',
          'Two queue types serve two contracts. Standard queues offer at-least-once delivery, best-effort ordering, and near-unlimited throughput — the default for decoupled work. FIFO queues offer exactly-once processing and strict ordering within a message group, at lower throughput: the choice when messages must be processed in exact order per customer, with the customer ID as the message group. Retention stretches to 14 days, and long polling — waiting for messages rather than returning empty — cuts both cost and latency versus short polling.',
          'SNS is the complementary shape: push-based publish/subscribe. One message published to a topic fans out to every subscriber — SQS queues, Lambda functions, email endpoints — simultaneously. The canonical fan-out pattern is an SNS topic feeding one SQS queue per consumer, so inventory, billing, and shipping each process the same order event at their own pace, in their own queue, with their own retries.',
        ],
      },
      {
        heading: 'Poison pills and idempotency',
        body: [
          'Every queue eventually receives a message no consumer can process — malformed data, a poison pill that crashes each worker that touches it. Without protection, that message cycles forever, consuming capacity. The dead-letter queue is the isolation ward: after a configured number of failed receives, the message is moved aside for inspection, and once the bug is fixed it can be redriven back into the main queue.',
          'Because standard queues deliver at-least-once, duplicates are a fact of life: a consumer can crash after processing but before deleting, and the message returns. Consumers must therefore be idempotent — processing the same message twice produces the same result as once. Deduplication keys, conditional writes, and transactional outboxes are the implementation; the exam tests the principle, which is that retries are safe only when repetition is harmless.',
          'The visibility timeout is the mechanism that makes all of this work. When a consumer receives a message, it becomes invisible to other consumers for the timeout period — long enough to finish processing. Set it too short and a slow consumer\'s message reappears mid-processing, creating duplicates; set it generously relative to actual processing time and the system stays calm.',
        ],
      },
      {
        heading: 'Orchestration and events',
        body: [
          'Some workflows are not a queue but a sequence: step one, then step two, with retries, branching, and occasionally a human approval in the middle. Step Functions orchestrates these — state machines that coordinate Lambda functions and services, retry failed steps with backoff, and pause for human input via callbacks. A saga across microservices, where each step needs a compensating action on failure, is the textbook case.',
          'EventBridge is the event bus for loosely coupled systems: producers emit events, rules route them to targets based on content, and a schema registry keeps everyone honest about the shape. Choose it over SNS when routing logic matters — events filtered by type, transformed en route, or sourced from SaaS applications — and keep SNS for simple fan-out. EventBridge Scheduler, the successor to scheduled CloudWatch rules, fires one-time or recurring schedules without running any infrastructure.',
          'Two integration patterns tie the toolkit together. When Lambda throttles on a burst of S3 uploads, inserting an SQS queue between the S3 event notification and the function absorbs the spike — data waits instead of being lost. And when the workload is a true stream — ordered, replayable, consumed by many analytics applications at scale — Kinesis Data Streams replaces the queue with a sharded, replayable log. Queues carry discrete messages; streams carry ordered history.',
        ],
      },
    ],
    cheatSheet: [
      ['SQS standard', 'At-least-once, best-effort ordering, near-unlimited throughput.'],
      ['SQS FIFO', 'Exactly-once, ordered per message group; lower throughput.'],
      ['Visibility timeout', 'How long a received message hides; must exceed processing time.'],
      ['Dead-letter queue', 'Isolates repeatedly failing messages; redrive after fixing.'],
      ['SNS', 'Pub/sub fan-out: one message pushed to many subscribers.'],
      ['Fan-out pattern', 'SNS topic feeding one SQS queue per consumer team.'],
      ['Step Functions', 'Orchestrates sequential workflows with retries and human approval.'],
      ['EventBridge', 'Event bus with content-based rules, schema registry, SaaS sources.'],
      ['Idempotency', 'Safe to process twice; required because queues deliver at-least-once.'],
      ['Kinesis Data Streams', 'Ordered, replayable streams; choose over SQS at streaming scale.'],
    ],
  },

  'saa-backup-dr': {
    overview: [
      'Every disaster-recovery decision is a negotiation between two numbers: how long you can be down, and how much data you can afford to lose. The exam frames the entire backup and DR landscape through RTO and RPO, and the winning design is the cheapest one that still meets both — not the most elaborate one you can draw.',
      'This lesson covers the four DR strategies in cost order, the backup machinery that makes them real, and the operational discipline — testing, runbooks, rehearsal — that separates a plan from a hope. Recovery is a system you operate, not a document you file.',
    ],
    learn: [
      {
        heading: 'RTO, RPO, and the strategy spectrum',
        body: [
          'RTO — recovery time objective — is how long the business can wait for the system to return. RPO — recovery point objective — is how much data loss is tolerable, measured as the age of the newest restorable backup. A seconds-level RPO demands continuous replication; a 24-hour RPO is satisfied by nightly backups. Every DR question on the exam is answered by matching the strategy\'s cost and recovery profile to these two numbers.',
          'The four strategies form a ladder. Backup and restore is the cheapest and slowest: data is backed up, infrastructure is rebuilt from scratch on failure — fine for dev environments and tolerant workloads. Pilot light keeps a minimal core running in the recovery region — the database replicating, the essential services idling — and scales to full capacity on failover. Warm standby runs a scaled-down but fully functional copy, cutting over faster. Multi-site active/active serves traffic from two or more regions continuously: the fastest recovery and the highest bill.',
          'The exam\'s classic trap is recommending active/active for a workload whose RTO tolerates hours. Cost-optimization applies to resilience too: buy the recovery speed the business case requires, and not a minute faster.',
        ],
      },
      {
        heading: 'Backups that survive the worst day',
        body: [
          'AWS Backup is the centralized control plane: one place to define backup policies, schedules, and retention across EC2, RDS, EFS, and DynamoDB, instead of per-service scripts that drift. For ransomware resistance, Vault Lock puts backups in WORM compliance mode — immutable for the retention period, undeletable even by a compromised admin account. The 3-2-1 rule translates cleanly: versioned S3 as the second copy, cross-region replication as the offsite third, vault-locked backups as the immutable last resort.',
          'RDS offers two backup shapes with different jobs. Automated backups give point-in-time recovery within the retention window — up to 35 days — and vanish with the instance. Manual snapshots persist until deleted, are the unit of cross-region copy, and are how you seed new environments. EBS snapshots work the same way: incremental, stored in S3, copied across regions for DR.',
          'Know the difference between a snapshot and an AMI, because the exam asks. A snapshot is a point-in-time copy of a disk. An AMI is a launchable image — snapshots plus the metadata describing how to boot them. For fast instance recovery, keep AMIs current with EC2 Image Builder pipelines that rebuild golden images on a schedule, so failover launches today\'s software, not last quarter\'s.',
        ],
      },
      {
        heading: 'Failover mechanics and rehearsal',
        body: [
          'Data replication sets the RPO floor. S3 Cross-Region Replication copies objects — including, with the right configuration, existing objects and delete markers — to a second region, underpinning static-website and data-lake DR. For relational data with seconds-level RPO, Aurora Global Database maintains cross-region clusters with typically sub-second replication lag and managed failover measured in seconds, not hours.',
          'Traffic failover is Route 53\'s job: health checks against real application endpoints drive failover routing to the recovery region, or Application Recovery Controller\'s routing controls flip traffic under operator command. The runbook is the human half of the system — it names who decides, the exact sequence of steps, how to verify each one, and the rollback criteria — and it is tested, not shelved.',
          'Testing without impacting production is a design requirement, not a luxury. Fail over to isolated environments, run game days against the recovery region, and use ARC readiness checks to verify continuously that the recovery environment could take over today. An untested DR plan is a hypothesis; the exam treats rehearsal as part of the architecture.',
        ],
      },
    ],
    cheatSheet: [
      ['RTO / RPO', 'How long recovery may take / how much data loss is tolerable.'],
      ['Backup and restore', 'Cheapest DR; slowest — rebuild from backups on failure.'],
      ['Pilot light', 'Minimal core idles in the recovery region; scale up on failover.'],
      ['Warm standby', 'Scaled-down live copy; faster cutover than pilot light.'],
      ['Multi-site active/active', 'Full capacity in 2+ regions; fastest recovery, highest cost.'],
      ['AWS Backup', 'Centralized backup policies across EC2, RDS, EFS, DynamoDB.'],
      ['Vault Lock', 'WORM compliance lock; backups survive even compromised admins.'],
      ['Aurora Global Database', 'Cross-region clusters, typically sub-second replication lag.'],
      ['RDS automated backup', 'Point-in-time recovery; retained up to 35 days.'],
      ['Snapshot vs AMI', 'Snapshot = disk copy. AMI = launchable image (snapshots + boot metadata).'],
    ],
  },

  'saa-storage': {
    overview: [
      'Storage questions reward a simple mental model: block, file, and object storage solve different problems, and the exam tests whether you can match the workload to the shape. A database wants block. A hundred web servers sharing uploads want file. A data lake queried by Athena wants object. Get the shape right and the service choice usually follows.',
      'This lesson maps the storage portfolio — EBS and instance store, EFS and FSx, S3 — and the data-movement tools that get bytes in and out at speed. The through-line is fitness for purpose: each service has a workload it was built for and several it merely tolerates.',
    ],
    learn: [
      {
        heading: 'Three shapes of storage',
        body: [
          'EBS is network-attached block storage for a single instance in a single Availability Zone: the virtual hard drive behind EC2. Volumes persist independently of the instance, which is why databases and stateful applications live on them. Within EBS, gp3 is the general-purpose default — baseline 3,000 IOPS with throughput and IOPS tunable independently of size — while io2 serves latency-sensitive databases needing up to 64,000 provisioned IOPS. Instance store is the opposite shape: physically attached, ephemeral disks that are fast and free but lose everything on stop or termination — scratch space, caches, nothing you cannot rebuild.',
          'EFS is the shared file option: a POSIX file system that hundreds of instances mount simultaneously across Availability Zones, with file locking intact — the answer for the CMS cluster or the hundred web servers sharing uploads. Infrequent Access lifecycle management moves cold files to a cheaper tier automatically. When the workload needs Windows SMB shares, it is FSx for Windows File Server; when it needs raw throughput for a render farm or HPC scratch, FSx for Lustre; ONTAP and OpenZFS cover the remaining enterprise file shapes.',
          'S3 is object storage: flat, effectively unlimited, with strong read-after-write consistency for all operations. It is the data lake\'s home — Athena, EMR, and Redshift Spectrum query it in place — and the durable tier everything else archives to. The exam\'s storage-selection questions are usually decided here: shared POSIX means EFS, SMB means FSx Windows, analytics over a lake means S3, a single instance\'s disk means EBS.',
        ],
      },
      {
        heading: 'Sharing disks and copying them',
        body: [
          'EBS volumes attach to one instance — with one exception. Multi-Attach lets io1 and io2 volumes attach to multiple instances in the same AZ, which is how clustered file systems and tightly coupled database clusters share block storage. It is a specialist feature for specialist software; reaching for it for ordinary sharing is a design smell, and the exam will offer EFS as the correct alternative.',
          'EBS snapshots are the copy mechanism: incremental point-in-time copies stored in S3, so only changed blocks are billed after the first. They are the unit of backup, of cross-region DR for stateful instances, and of volume migration. An AMI builds on them — snapshots plus the launch metadata that turns a disk copy into a bootable image — which is why golden-image pipelines snapshot, register, and test on a schedule.',
          'S3 has its own selection tools for getting data out selectively. S3 Select filters and retrieves a subset of an object\'s data without downloading the whole thing — ideal for pulling a few columns from a large CSV. Athena is the heavier instrument: SQL across many objects and prefixes. The rule of thumb is scope: one object, S3 Select; a dataset, Athena.',
        ],
      },
      {
        heading: 'Moving data at speed and at scale',
        body: [
          'Large uploads from a single host go through multipart upload: the object is split, parts upload in parallel, and the transfer is resumable — interrupted uploads pick up where they stopped rather than starting over. For clients far from the bucket\'s region, Transfer Acceleration routes uploads through the nearest CloudFront edge location onto the AWS backbone, which beats the public internet across oceans.',
          'Hybrid architectures bridge on-premises storage with Storage Gateway: file, volume, and tape gateway modes that present familiar interfaces locally while tiering to S3 behind the scenes. It is the answer for the workload that cannot move yet but must stop growing on-premises. And for the 50 TB migration over a constrained link, the exam\'s answer is offline: a Snowball appliance ships the data physically, because no clever protocol beats a truck full of disks when bandwidth is the constraint.',
          'S3 Object Lambda adds a final twist: transform data on retrieval. Instead of storing a redacted copy, a thumbnail copy, and a full copy, store one object and let Object Lambda derive the variants as they are requested — less duplication, one source of truth, transformations applied at read time.',
        ],
      },
    ],
    cheatSheet: [
      ['EBS', 'Persistent block storage for one instance in one AZ.'],
      ['Instance store', 'Ephemeral attached disks; fastest, but data dies with the host.'],
      ['gp3', 'General-purpose SSD; IOPS and throughput tuned independently of size.'],
      ['io2', 'Provisioned-IOPS SSD for latency-sensitive databases (to 64,000 IOPS).'],
      ['EFS', 'Shared POSIX file system across AZs; IA tier for cold files.'],
      ['FSx', 'Managed file systems: Windows (SMB), Lustre (HPC), ONTAP, OpenZFS.'],
      ['S3', 'Object storage with strong consistency; the data-lake default.'],
      ['EBS Multi-Attach', 'Share io1/io2 volumes across instances; for clustered file systems only.'],
      ['Multipart upload', 'Parallel, resumable uploads for large objects.'],
      ['AWS Snowball', 'Offline bulk-transfer appliance for tens of terabytes.'],
    ],
  },

  'saa-databases': {
    overview: [
      'Database selection is the exam\'s purest test of architectural judgment: a dozen managed engines, each with a workload it dominates and several it merely survives. The questions describe access patterns — millisecond key lookups at planetary scale, petabyte joins, graph traversals — and the correct answer is the engine built for that pattern.',
      'This lesson covers the relational core (RDS and Aurora), the purpose-built engines (DynamoDB, ElastiCache, Neptune, Redshift, and the rest), and migration with minimal downtime. The decision framework is consistent throughout: match the data model and the access pattern first, and let cost and operations follow.',
    ],
    learn: [
      {
        heading: 'Relational: RDS and Aurora',
        body: [
          'RDS is managed relational database service in the straightforward sense: you keep your engine — PostgreSQL, MySQL, MariaDB, Oracle, SQL Server — and AWS handles patching, backups, and failover mechanics. Choose it when the workload is relational but ordinary: moderate throughput, standard availability needs, and a budget that appreciates RDS\'s lower price. Aurora is the cloud-native sibling: same wire compatibility with PostgreSQL and MySQL, but a distributed storage layer that delivers higher throughput, faster failover, and storage that grows automatically.',
          'Scaling reads and surviving failure are separate mechanisms. Read replicas are asynchronous copies that absorb read traffic — including across regions — and can be promoted to standalone primaries; they do not provide automatic failover. Multi-AZ standby is the failover mechanism: a synchronous copy in another zone that takes over automatically but serves no reads. Aurora unifies more of this: an Aurora reader endpoint load-balances reads across replicas while the cluster manages failover internally.',
          'Two features solve specific pain the exam likes to probe. Aurora Serverless v2 scales capacity in fine-grained units for workloads with variable or unpredictable load — pay for the ACUs you use, not the instance you sized. RDS Proxy sits between application fleets and the database as a connection pooler: thousands of Lambda invocations share a small pool of database connections instead of overwhelming the engine with a connection storm, which is exactly the failure mode serverless applications hit at scale.',
        ],
      },
      {
        heading: 'Purpose-built engines',
        body: [
          'DynamoDB is the serverless NoSQL answer for key-value access at any scale: single-digit-millisecond reads and writes, flexible schema, throughput that scales without servers. The design discipline is the partition key — high-cardinality keys spread load evenly, while a low-cardinality key funnels traffic into a hot partition that throttles. Billing follows the access pattern: provisioned capacity with auto scaling for predictable workloads, on-demand for spiky or unknown traffic; Global Tables replicate across regions for active-active applications.',
          'Caching layers sit in front of the database, not beside it. DAX is DynamoDB\'s dedicated in-memory cache, dropping reads to microseconds for the hottest keys. ElastiCache is the general cache: choose Redis for rich data structures — sorted sets powering leaderboards, pub/sub channels, persistence options — and Memcached for simple, multithreaded key-value caching with no need for replication or persistence.',
          'The remaining engines each own a pattern. Neptune traverses relationships in milliseconds for fraud detection and recommendation graphs. DocumentDB serves MongoDB-compatible document workloads. Timestream is built for time-series telemetry. Redshift is the petabyte OLAP warehouse for complex analytic joins. The exam\'s phrasing is the giveaway: millisecond graph traversals mean Neptune, petabyte joins mean Redshift, flexible-schema millisecond reads mean DynamoDB.',
        ],
      },
      {
        heading: 'Migration with minimal downtime',
        body: [
          'Moving a production database is a migration, not a copy, and the exam cares about the downtime. AWS Database Migration Service performs the full load of existing data and then continuously replicates changes — change data capture — so the cutover window shrinks to minutes: the classic answer for migrating Oracle to Aurora PostgreSQL without extended outage. The Schema Conversion Tool handles the heterogeneous half, translating schemas and flagging the constructs that need human attention.',
          'The RDS-versus-DynamoDB decision deserves its own framing because it recurs across the exam. Choose RDS when the workload needs the relational model: complex joins, ad-hoc SQL, transactions across entities, and a schema the business already understands. Choose DynamoDB when the access pattern is key-based at scale: known query shapes, single-digit-millisecond latency, flexible schema, and traffic that would require constant re-sharding on a relational engine.',
          'A final operational note: encrypt the database, and plan for it early. An existing unencrypted RDS instance cannot be flipped in place — the path is snapshot, copy the snapshot with encryption enabled, restore — which is one more reason new databases launch encrypted by default and stay that way.',
        ],
      },
    ],
    cheatSheet: [
      ['RDS', 'Managed relational engines; AWS handles patching, backups, failover mechanics.'],
      ['Aurora', 'Cloud-native relational: faster failover, auto-growing storage, global clusters.'],
      ['Read replica', 'Async readable copy for read scaling; promotable, not automatic failover.'],
      ['DynamoDB', 'Serverless NoSQL; single-digit-ms at any scale; partition-key design is the discipline.'],
      ['Hot partition', 'Low-cardinality key funneling traffic; fix with higher-cardinality keys.'],
      ['DAX', 'In-memory microsecond cache dedicated to DynamoDB.'],
      ['ElastiCache Redis', 'Rich structures (sorted sets, pub/sub) with persistence options.'],
      ['ElastiCache Memcached', 'Simple multithreaded cache; no replication, no persistence.'],
      ['RDS Proxy', 'Connection pooling that shields RDS from Lambda connection storms.'],
      ['AWS DMS', 'Minimal-downtime migration via full load plus continuous change capture.'],
    ],
  },

  'saa-caching-cdn': {
    overview: [
      'Performance on AWS is rarely about bigger instances; it is about putting data closer to the request. Edge caches absorb global traffic, in-memory caches absorb database load, and each layer you add multiplies the capacity of the layers beneath it. The exam tests caching as architecture: where the cache sits, what it holds, and what happens when it misses.',
      'This lesson covers CloudFront and Global Accelerator at the edge, the caching strategies inside the architecture, and the cost and consistency trade-offs every cache introduces. A cache is a performance decision with a correctness bill attached — the lesson is in reading both sides.',
    ],
    learn: [
      {
        heading: 'CloudFront as the front door',
        body: [
          'CloudFront is the content delivery network: a global mesh of edge locations that cache responses close to viewers, so a user in Sydney does not wait on an origin in Virginia. It serves static assets by default and accelerates dynamic content too, and private S3 origins stay private through Origin Access Control — the bucket policy grants access to the CloudFront distribution, never to the public.',
          'Restricted content uses signed URLs or signed cookies: time-limited, optionally IP-bound tokens that grant access without exposing the origin. When deployments change content, invalidation purges the edge cache — effective but metered, which is why versioned filenames (app-v2.js rather than app.js) are the cleaner pattern: new names bypass the cache naturally, no purge required. Origin failover adds resilience: a primary origin group with a secondary that takes over when health checks fail.',
          'Edge compute splits by weight. CloudFront Functions run lightweight JavaScript at viewer request and response — header rewrites, simple redirects, token checks. Lambda@Edge runs full Lambda functions at more trigger points, including origin request and response, for heavier work like authentication flows and content transformation. The exam\'s distinction is scope: simple and viewer-facing means CloudFront Functions; complex or origin-touching means Lambda@Edge.',
        ],
      },
      {
        heading: 'When the CDN is not enough',
        body: [
          'CloudFront speaks HTTP and HTTPS. For everything else — gaming protocols, VoIP, custom TCP and UDP — Global Accelerator provides two static anycast IP addresses that route each user to the optimal AWS endpoint. The static IPs solve real operational problems: client firewalls can allowlist them, DNS propagation delay disappears from failover, and users get the AWS backbone instead of the public internet from the nearest edge.',
          'Route 53\'s latency-based routing is the DNS-layer complement: each user resolves to the region with the lowest measured latency. API Gateway caching plays the same role one layer up, caching API responses at the gateway so repeated identical calls never reach the backend. The pattern is consistent: identify the repeated work, intercept it as close to the requester as possible.',
          'Price classes are CloudFront\'s cost lever: restrict the distribution to fewer edge locations — North America and Europe only, say — when the audience is regional and the global footprint is wasted spend. Performance design and cost design are the same exercise here, which is why the exam places caching questions in both the performance and cost domains.',
        ],
      },
      {
        heading: 'Caching inside the architecture',
        body: [
          'Behind the edge, application caches protect the database. Cache-aside is the default strategy for read-heavy workloads: the application checks the cache, falls back to the database on a miss, and populates the cache with the result — the catalog page that is read a thousand times for every write. Write-through suits write-heavy consistency needs but is rarer in exam scenarios. ElastiCache implements both: Redis for data structures and persistence, Memcached for simple multithreaded speed.',
          'Every cache introduces two failure modes the exam probes. Stale data: TTLs must reflect how fresh the answer needs to be, and invalidation must be a designed path, not an afterthought. Thundering herd: when a popular key expires, a thousand simultaneous misses slam the database — mitigated with jittered TTLs, staggered expirations, request coalescing, or serving slightly stale data while refreshing in the background.',
          'Two cost details hide in caching designs. Cross-AZ data transfer is billed, so chatty services — application tiers hammering a cache cluster — should sit in the same AZ as their cache, or use zonal endpoints to keep traffic local. And DAX versus ElastiCache is a scoping question: DAX is DynamoDB\'s dedicated microsecond cache, while ElastiCache serves any workload — choose the specialist when the database is DynamoDB and the generalist otherwise.',
        ],
      },
    ],
    cheatSheet: [
      ['CloudFront', 'Global CDN caching at edge locations for low-latency delivery.'],
      ['Origin Access Control', 'Lets CloudFront serve private S3 content securely.'],
      ['Signed URLs/cookies', 'Time-limited access tokens for private CloudFront content.'],
      ['CloudFront Functions', 'Lightweight edge code at viewer request/response.'],
      ['Lambda@Edge', 'Full Lambda at more edge triggers; heavier than CF Functions.'],
      ['Global Accelerator', 'Static anycast IPs for TCP/UDP; optimal-endpoint routing off the internet.'],
      ['Cache-aside', 'App checks cache, falls back to DB, populates on miss; best read-heavy.'],
      ['ElastiCache Redis', 'Rich structures (sorted sets, pub/sub) with persistence options.'],
      ['ElastiCache Memcached', 'Simple multithreaded cache; no replication, no persistence.'],
      ['Price classes', 'Restrict CloudFront edge locations to cut cost for regional audiences.'],
    ],
  },

  'saa-compute-cost': {
    overview: [
      'Compute is usually the largest line on an AWS bill, and the exam treats cost optimization as a design discipline, not an accounting afterthought. The same workload can cost triple or a third depending on three decisions: which pricing model matches its shape, whether it is sized correctly, and whether it runs only when needed.',
      'This lesson covers the EC2 pricing ladder, commitment instruments, rightsizing and scheduling, and the serverless trade-offs. The mental model is simple: pay for flexibility where you need it, commit where you are certain, and never pay for idle.',
    ],
    learn: [
      {
        heading: 'The pricing ladder',
        body: [
          'On-Demand is the top of the ladder: no commitment, highest price, the right choice for unpredictable, spiky, or short-lived workloads — the startup whose traffic cannot be forecast buys flexibility here. Spot instances are the bottom: spare EC2 capacity at discounts up to around 90%, reclaimable with two minutes\' notice, perfect for fault-tolerant batch jobs that run nightly and tolerate interruption. Spot Fleets improve on single requests by diversifying across instance pools and maintaining target capacity as prices shift.',
          'Steady-state workloads commit. Reserved Instances lock a configuration for one or three years at a deep discount; Savings Plans commit to a dollar-per-hour spend instead, which is why the exam prefers them — a Compute Savings Plan applies across instance families, regions, operating systems, Fargate, and even Lambda, trading a slightly smaller discount for far more flexibility. An EC2 Instance Savings Plan goes deeper but stays narrow: one family, one region.',
          'The web tier running 24/7 for two years is the textbook commitment case: a Compute Savings Plan for flexibility, or an EC2 Instance Savings Plan if the family is certain. Unpredictable traffic stays On-Demand. Nightly interruptible batch goes Spot. The exam\'s cost questions are almost always this matching exercise in disguise.',
        ],
      },
      {
        heading: 'Rightsizing and scheduling',
        body: [
          'The most expensive instance is the one doing nothing. Compute Optimizer applies machine learning to CloudWatch history and recommends smaller instance types, and the exam expects you to reach for it whenever a question mentions over-provisioned or underutilized fleets. The quieter version of the same waste is the over-provisioned Auto Scaling minimum: capacity that never scales in still bills around the clock.',
          'Scheduling attacks the time dimension. A development environment used eight hours a day on weekdays has no business running the other 128 hours — Instance Scheduler stops and starts resources on a timetable, and scheduled scaling adjusts ASG minimums for known patterns. Idle resources that nobody remembers are found through Cost Explorer and Trusted Advisor, which flag the unattached volumes and forgotten instances every account accumulates.',
          'Graviton changes the price-performance math itself: ARM-based instances delivering materially better price-performance — AWS cites up to 40% — for compatible workloads, which increasingly means most of them. And Lambda inverts the comparison for spiky APIs: when traffic is intermittent, paying per request beats paying per hour for an instance waiting between requests. Fargate sits between: pay-per-use containers without server management, cheaper than idle EC2 at low utilization, more expensive than well-packed EC2 at sustained high utilization.',
        ],
      },
      {
        heading: 'Structure and visibility',
        body: [
          'Multiple AWS accounts are a cost-management tool, not just a security one. Separate accounts isolate each team\'s spend for chargeback, let service control policies guard the expensive actions, and still aggregate under consolidated billing so volume discounts apply across the organization. The Cost and Usage Report provides the line-item detail — every hour of every resource — that feeds serious analysis and anomaly detection.',
          'Dedicated tenancy has its own pricing shape worth knowing. Dedicated Instances run on isolated hardware billed per instance — the compliance answer for noisy-neighbor concerns. Dedicated Hosts allocate whole physical servers, billed per host, and exist for socket-based licensing: bring your own Oracle or Windows Server licenses and the host-level visibility satisfies the auditors.',
          'The Free Tier deserves a cautionary paragraph because the exam sets traps there. The tier covers specific usage amounts of specific services — and nothing else. Forgotten resources keep billing after the trial project ends, and services the tier does not cover, like NAT gateway hours and data transfer, bill from the first byte. The trap is assuming \'free tier\' means \'free account\'.',
        ],
      },
    ],
    cheatSheet: [
      ['On-Demand', 'No commitment; for unpredictable, spiky, or short-lived workloads.'],
      ['Spot', 'Spare capacity up to ~90% off; for interruption-tolerant batch.'],
      ['Compute Savings Plan', 'Commit $/hour for 1–3 years; flexible across family, region, Fargate, Lambda.'],
      ['EC2 Instance Savings Plan', 'Deeper discount locked to one instance family and region.'],
      ['Compute Optimizer', 'ML-driven rightsizing recommendations from CloudWatch history.'],
      ['Graviton', 'ARM instances with materially better price-performance for compatible workloads.'],
      ['Instance Scheduler', 'Stops dev/test resources on a timetable instead of 24/7.'],
      ['CUR', 'Cost and Usage Report: line-item detail for deep cost analysis.'],
      ['Consolidated billing', 'One payer account aggregates volume discounts across accounts.'],
      ['Dedicated Hosts', 'Whole physical servers for socket-based BYOL licensing.'],
    ],
  },

  'saa-storage-cost': {
    overview: [
      'Storage bills hide in the details: the tier an object sits in, the requests made against it, the transfers that move it, and the queries that scan it. S3 is cheap per gigabyte and expensive per mistake — the exam\'s cost questions probe exactly the mistakes: objects in the wrong tier, chatty request patterns, forgotten multipart uploads, and Athena queries scanning terabytes of CSV.',
      'This lesson covers lifecycle-driven tiering, the hidden meters of requests and transfer, and data-format economics. The discipline is lifecycle thinking: data has a temperature, and every temperature has a price.',
    ],
    learn: [
      {
        heading: 'Tiering as a strategy',
        body: [
          'S3 lifecycle policies automate the temperature curve: recent logs sit in Standard, age into Infrequent Access after 30 days, then into Glacier Flexible and finally Deep Archive for the seven-year compliance tail. Each tier trades retrieval speed for price, and each carries a minimum storage duration — 30 days for IA, 90 for Glacier Flexible, 180 for Deep Archive — billed pro-rata if you delete early. Tiering data you will retrieve next week into Deep Archive is not savings; it is a penalty with extra steps.',
          'Choose the tier by access pattern, not by price tag alone. S3 Intelligent-Tiering monitors access and moves objects between frequent and infrequent tiers automatically — the answer when patterns are unknown or shifting, for a small monitoring fee. Standard-IA versus One Zone-IA is a durability question: One Zone-IA is cheaper because it stores in a single AZ, suitable only for reproducible data like transcoded media. Glacier Deep Archive, at roughly a dollar per terabyte-month, is the cheapest retention for the annual-audit backup set — with 12-to-48-hour retrieval that annual audits easily tolerate.',
          'Two subtleties catch people. Small objects in Glacier tiers incur minimum billable sizes, so archiving millions of tiny files costs more than the bytes suggest — aggregate first. And Object Lock in Compliance mode makes retention a cost commitment: objects cannot be deleted early by anyone, so an over-long retention period bills in full with no escape hatch.',
        ],
      },
      {
        heading: 'The hidden meters: requests and transfer',
        body: [
          'S3 charges per request as well as per byte, and high-request workloads can spend more on GETs and LISTs than on storage. The fixes are architectural: fewer, larger objects instead of millions of tiny ones; lifecycle rules instead of application-driven transitions; CloudFront in front of hot objects so the edge absorbs repeat requests. A workload doing ten million small reads a day is a request-cost problem wearing a storage costume.',
          'Incomplete multipart uploads are pure waste: every part uploaded so far is billed until the upload completes or is aborted. The exam\'s answer is a lifecycle rule that aborts incomplete uploads after N days — set it on every bucket that takes large uploads. Replication doubles the storage bill plus cross-region transfer fees, so replicate selectively with prefix or tag filters rather than whole buckets.',
          'Data transfer has its own geography. Transfer into AWS is free; transfer out to the internet is billed; transfer between AZs is billed; same-region transfers between AWS services — EC2 to S3 in the same region, for example — are generally free. CloudFront reduces the egress bill two ways: cached content serves from the edge, and price classes trim the edge footprint for regional audiences. EBS snapshots bill incrementally per gigabyte-month of changed blocks, which is why snapshot retention policies matter as much as snapshot schedules.',
        ],
      },
      {
        heading: 'Data-format and query economics',
        body: [
          'Athena bills per terabyte scanned, which makes data format a cost decision. Partitioning by date lets queries skip entire prefixes; columnar formats like Parquet let queries read only the columns they need; compression shrinks everything. The same query over CSV can cost orders of magnitude more than over partitioned Parquet — the exam\'s data-lake cost question is always answered with format and partitioning, never with a bigger budget.',
          'EBS rightsizing follows the same \'measure, then tune\' loop as compute: CloudWatch reveals the actual IOPS and throughput, gp3 lets you dial provisioned IOPS and throughput independently of volume size, and unused provisioned IOPS on io volumes are money for nothing. Downsizing is safe when the metrics support it; the waste is in the volumes nobody measured.',
          'Visibility closes the loop. S3 Storage Lens gives organization-wide insight into usage, access patterns, and cost drivers across every bucket — the tool for finding the anomalies. Cost-allocation tags, activated in the Billing console, let Cost Explorer break spend down by team or project for chargeback. And before any of it is built, the AWS Pricing Calculator models the architecture\'s cost so the estimate exists before the bill does.',
        ],
      },
    ],
    cheatSheet: [
      ['Lifecycle policy', 'Automates tier transitions and expiry by age, prefix, or tag.'],
      ['S3 Intelligent-Tiering', 'Auto-moves objects by access pattern; for unknown or shifting access.'],
      ['Glacier Deep Archive', 'Cheapest long-term retention; 12–48h retrieval, 180-day minimum.'],
      ['One Zone-IA', 'Cheaper IA in a single AZ; only for reproducible data.'],
      ['Minimum durations', 'IA 30 days, Glacier Flexible 90, Deep Archive 180 — early delete bills the rest.'],
      ['Incomplete multipart uploads', 'Billed until aborted; add a lifecycle rule to clean them up.'],
      ['S3 Storage Lens', 'Org-wide visibility into S3 usage, activity, and cost drivers.'],
      ['Athena pricing', 'Per TB scanned; Parquet plus partitioning cuts the bill dramatically.'],
      ['Data transfer OUT', 'Internet egress is billed; same-region AWS-to-AWS is generally free.'],
      ['Cost-allocation tags', 'Activate in Billing to split spend by team or project in Cost Explorer.'],
    ],
  },
};
