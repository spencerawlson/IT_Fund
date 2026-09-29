// Reading content for the Cloud Computing course, keyed by lesson (deck) id.
// Strings support `inline code` only. Aligned with src/data/academy/cloud.js.

const code = (...lines) => lines.join('\n');

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'cl-concepts': {
    overview: [
      'Cloud computing changed how organisations buy and run IT: capacity on demand, paid for as it is used, managed through APIs. It also changed who is responsible for what, and misunderstanding that split is behind many cloud breaches.',
      'This lesson covers the NIST definition, the service and deployment models, the shared responsibility model, CapEx versus OpEx, elasticity, regions, availability zones and edge locations, and vendor lock-in.',
    ],
    learn: [
      {
        heading: 'What makes something "cloud"',
        body: [
          'NIST SP 800-145 defines five essential characteristics: on-demand self-service, broad network access, resource pooling, rapid elasticity and measured service. If you cannot provision it yourself in minutes and pay by use, it is hosting, not cloud.',
          'Elasticity means resources scale up and down automatically with demand. Scalability is the ability to grow; elasticity is doing it automatically, in both directions. Financially, cloud shifts spending from CapEx (buying hardware up front) to OpEx (pay as you go).',
        ],
      },
      {
        heading: 'Service and deployment models',
        body: [
          'In IaaS (infrastructure as a service) the provider runs hardware, virtualisation and facilities, and the customer manages the operating system and everything above it. PaaS adds the OS and runtime to the provider\'s side. Serverless or FaaS, such as AWS Lambda or Azure Functions, is a form of PaaS: you deploy functions and the provider runs and scales the servers. In SaaS the provider runs the whole application.',
          'Deployment models: public cloud, private cloud, community cloud (shared by organisations with common needs) and hybrid cloud, a mix of on-premises or private and public cloud working together.',
        ],
      },
      {
        heading: 'Shared responsibility',
        body: [
          'The provider secures the cloud itself (data centres, hardware, the virtualisation layer); the customer secures what they put in the cloud. The split shifts with the model: in IaaS you patch the OS; in SaaS you do not.',
          'Some responsibilities never move. In every model, the customer owns their data, their users, and access configuration. A misconfigured public storage bucket is always the customer\'s problem.',
        ],
      },
      {
        heading: 'Where cloud runs',
        body: [
          'A region is a geographic area; an availability zone (AZ) is one or more isolated data centres within a region, with independent power and networking. Spread workloads across AZs for high availability, and across regions for disaster recovery. Edge locations cache content close to users as part of a CDN, such as CloudFront, Azure Front Door or Cloud CDN.',
          'Vendor lock-in is dependence on one provider\'s proprietary services. Reduce it with open standards, containers and portable infrastructure as code, and accept it deliberately where a managed service is worth it.',
        ],
      },
    ],
    cheatSheet: [
      ['NIST 800-145', '5 characteristics: self-service, network access, pooling, elasticity, measured'],
      ['IaaS', 'Customer manages the OS and up'],
      ['PaaS / FaaS', 'Provider runs OS and runtime / functions (Lambda)'],
      ['SaaS', 'Customer still owns data, users, access'],
      ['Hybrid / community', 'On-prem + public / shared by a sector'],
      ['Shared responsibility', 'Provider: of the cloud; customer: in the cloud'],
      ['CapEx → OpEx', 'Pay as you go'],
      ['Elasticity', 'Automatic scaling both ways'],
      ['Region vs AZ', 'Geography vs isolated data centres'],
      ['Edge location', 'CDN cache near users'],
      ['Lock-in', 'Mitigate: open standards, containers, IaC'],
    ],
  },

  'cl-core-services': {
    overview: [
      'Every cloud offers the same building blocks under different names: virtual machines, storage, databases, networks, identity and logging. Once you know the categories and one provider\'s names, the others map quickly.',
      'This lesson maps the core services across AWS, Azure and Google Cloud, covers storage classes and managed databases, and explains why multi-account organisation is the real isolation boundary.',
    ],
    learn: [
      {
        heading: 'Compute and storage',
        body: [
          'Virtual machines are EC2 on AWS, Virtual Machines on Azure and Compute Engine on GCP. Managed Kubernetes is EKS, AKS and GKE.',
          'Object storage (S3, Azure Blob Storage, Google Cloud Storage) holds files as objects in buckets, accessed over HTTPS: cheap, durable and effectively unlimited. Block storage (EBS on AWS) is a virtual disk attached to one instance; EFS provides shared file storage. For rarely accessed archives, S3 Glacier classes are far cheaper, with Deep Archive the cheapest, but retrieval takes minutes to hours.',
        ],
      },
      {
        heading: 'Databases and networking',
        body: [
          'Managed relational databases (RDS and Aurora on AWS, Azure SQL Database, Cloud SQL) take over patching, backups and failover. Managed NoSQL key-value stores include DynamoDB, Cosmos DB, and Firestore or Bigtable.',
          'Your isolated virtual network is a VPC on AWS, a VNet on Azure and a VPC on GCP (where VPCs are global rather than regional).',
        ],
      },
      {
        heading: 'Identity, audit and monitoring',
        body: [
          'Identity is IAM on AWS (with IAM Identity Center for single sign-on), Microsoft Entra ID on Azure and Cloud IAM on GCP. Every API call can be recorded for auditing: CloudTrail on AWS, the Activity Log on Azure and Cloud Audit Logs on GCP. Metrics and logs go to CloudWatch, Azure Monitor, or Cloud Monitoring and Logging.',
          'AWS Organizations centrally manages many accounts with Service Control Policies. Separate accounts for production, development and security are the recommended isolation boundary, because a problem in one account cannot directly touch another.',
        ],
      },
    ],
    cheatSheet: [
      ['VMs', 'EC2 · Azure VMs · Compute Engine'],
      ['Object storage', 'S3 · Blob Storage · Cloud Storage'],
      ['Block / file', 'EBS (one instance) / EFS (shared)'],
      ['Archive', 'S3 Glacier (Deep Archive cheapest)'],
      ['Relational DB', 'RDS/Aurora · Azure SQL · Cloud SQL'],
      ['NoSQL', 'DynamoDB · Cosmos DB · Firestore/Bigtable'],
      ['Network', 'VPC · VNet · VPC (global on GCP)'],
      ['Identity', 'IAM · Entra ID · Cloud IAM'],
      ['API audit', 'CloudTrail · Activity Log · Cloud Audit Logs'],
      ['Monitoring', 'CloudWatch · Azure Monitor · Cloud Monitoring'],
      ['Kubernetes', 'EKS · AKS · GKE'],
      ['AWS Organizations', 'Multi-account management with SCPs'],
    ],
  },

  'cl-billing-support': {
    overview: [
      'Cloud bills surprise people because everything is metered and nothing stops you from spending. Cost control and basic account governance belong on day one, not after the first shocking invoice.',
      'This lesson covers pricing models, tagging, budgets, egress charges, rightsizing, FinOps and TCO, protecting the root account, and landing zones.',
    ],
    learn: [
      {
        heading: 'Pricing models',
        body: [
          'On-demand pricing is flexible and the most expensive per hour. Reserved Instances and Savings Plans give large discounts for committing to steady usage for one to three years. Spot instances are the cheapest, up to about 90% off, but AWS can reclaim them with two minutes\' notice, so they suit interruptible jobs such as batch processing and CI.',
          'Egress, data leaving the cloud to the internet or crossing regions, is charged; ingress is usually free. Architectures that move a lot of data out can cost far more than the compute.',
        ],
      },
      {
        heading: 'Keeping costs visible',
        body: [
          'Tag every resource (owner, environment, cost-center) for cost allocation, ownership, automation and policy. Set a budget alert on day one of any account, so you are notified when spend crosses a threshold.',
          'Rightsizing, matching instance size to actual usage, is often the quickest cost win. FinOps is collaborative cloud financial management across engineering and finance, in a cycle of inform, optimise and operate. TCO (total cost of ownership) comparisons must include hidden on-premises costs such as power, cooling, staff and hardware refresh.',
        ],
      },
      {
        heading: 'Account governance',
        body: [
          'The root account has unrestricted power and cannot be limited by IAM policies. Enable MFA on it, lock the credentials away, and do daily work through role-based admin accounts instead.',
          'A landing zone is a pre-configured, secure multi-account baseline (accounts, logging, guardrails, networking) that every new workload starts from. AWS Control Tower and Azure Landing Zones build one for you.',
        ],
      },
    ],
    cheatSheet: [
      ['Spot', 'Up to ~90% off; 2-minute reclaim notice'],
      ['Reserved / Savings Plans', 'Commit 1–3 years for discounts'],
      ['Egress', 'Data out costs; ingress usually free'],
      ['Tags', 'owner, environment, cost-center'],
      ['Budget alert', 'Set it on day one'],
      ['Rightsizing', 'Match size to real usage'],
      ['FinOps', 'Inform, optimise, operate'],
      ['TCO', 'Include power, staff, hardware refresh'],
      ['Root account', 'MFA, lock away, never daily'],
      ['Landing zone', 'Secure multi-account baseline (Control Tower)'],
    ],
  },

  'cl-networking': {
    overview: [
      'Cloud networking looks like on-premises networking with the cables replaced by API calls. The same concepts (subnets, routes, firewalls, DNS) apply, but a single route table entry can make a database internet-facing.',
      'This lesson covers public and private subnets, NAT gateways, security groups versus network ACLs, connecting VPCs and on-premises networks, private endpoints, load balancers, Route 53, IP planning, secure admin access and flow logs.',
    ],
    learn: [
      {
        heading: 'Subnets and routing',
        body: [
          'In AWS a subnet is "public" only because its route table has a route to an Internet Gateway. Private subnets have no such route; they reach the internet outbound through a NAT gateway, which allows outbound connections (for patches and API calls) but never lets the internet initiate a connection inward.',
          'Plan IP space centrally before you build: VPCs with overlapping CIDR blocks cannot be peered or routed cleanly, and fixing that later means rebuilding.',
        ],
      },
      {
        heading: 'Filtering traffic',
        body: [
          'Security groups are stateful and attach to instances (network interfaces): return traffic is allowed automatically, and rules can only allow. Network ACLs are stateless and apply to whole subnets: they can allow and deny, are evaluated in rule-number order, and need explicit rules for return traffic.',
          'VPC Flow Logs record IP traffic metadata (source, destination, ports, bytes, accept or reject) for network interfaces. They are essential for investigations, but they do not contain payloads.',
        ],
      },
      {
        heading: 'Connecting networks and services',
        body: [
          'VPC peering privately connects two VPCs but is not transitive: A to B and B to C does not give A to C. Transit Gateway scales to a hub-and-spoke design. Direct Connect (AWS), ExpressRoute (Azure) and Cloud Interconnect (GCP) are private, dedicated links from on-premises.',
          'VPC endpoints (PrivateLink) reach cloud services privately without the public internet: gateway endpoints for S3 and DynamoDB, interface endpoints for most others.',
          'The Application Load Balancer works at Layer 7 with path- and host-based routing; the Network Load Balancer works at Layer 4 with extreme performance and static IPs. Route 53 provides DNS with health checks and latency-based, weighted, failover and geolocation routing.',
        ],
      },
      {
        heading: 'Admin access',
        body: [
          'A bastion host is a hardened jump box that admins SSH through. The modern alternative, AWS Systems Manager Session Manager, needs no open inbound ports at all and logs every session.',
        ],
      },
    ],
    architecture: {
      caption: 'A classic two-tier VPC across two availability zones. Only the load balancer is reachable from the internet.',
      diagram: code(
        '                      Internet',
        '                         |',
        '                 [ Internet Gateway ]',
        '                         |',
        '   AZ a                  |                  AZ b',
        ' +------ public subnet --+-- public subnet ------+',
        ' |  [ ALB node ]  [ NAT GW ]      [ ALB node ]   |',
        ' +-----------------------------------------------+',
        '        |   (SG: 443 from ALB only)   |',
        ' +------ private subnet ------ private subnet ---+',
        ' |  [ app ]  [ app ]            [ app ]  [ app ] |   outbound via NAT GW',
        ' |  [ DB primary ]  == sync ==  [ DB standby ]   |   S3 via gateway endpoint',
        ' +-----------------------------------------------+',
      ),
    },
    cheatSheet: [
      ['Public subnet', 'Route table → Internet Gateway'],
      ['NAT gateway', 'Outbound only from private subnets'],
      ['Security group', 'Stateful, instance-level, allow only'],
      ['Network ACL', 'Stateless, subnet-level, allow + deny, by rule number'],
      ['VPC peering', 'Private, not transitive (Transit Gateway scales)'],
      ['Direct Connect', 'Dedicated on-prem link (ExpressRoute, Interconnect)'],
      ['VPC endpoint', 'Private access to services (PrivateLink)'],
      ['ALB / NLB', 'Layer 7 path routing / Layer 4 performance'],
      ['Route 53', 'DNS + health checks + routing policies'],
      ['Session Manager', 'Admin access with no inbound ports'],
      ['Flow Logs', 'Traffic metadata, no payloads'],
    ],
  },

  'cl-architecture': {
    overview: [
      'Cloud makes it cheap to build systems that survive failure, but only if you design for it. The Well-Architected Framework and a handful of patterns (statelessness, loose coupling, multi-AZ, immutable deployments) cover most of what good cloud architecture means.',
      'This lesson covers the six pillars, horizontal scaling and stateless tiers, loose coupling, Auto Scaling, multi-AZ databases, the four DR strategies, immutable infrastructure and safe deployment patterns.',
    ],
    learn: [
      {
        heading: 'The Well-Architected Framework',
        body: [
          'AWS\'s framework has six pillars: operational excellence, security, reliability, performance efficiency, cost optimisation, and sustainability, the most recent (added in 2021), which minimises the environmental impact of workloads. Azure and Google publish equivalent frameworks.',
        ],
      },
      {
        heading: 'Scaling and resilience patterns',
        body: [
          'Horizontal scaling adds more instances; vertical scaling makes one instance bigger. Horizontal scaling needs stateless application tiers, where any instance can serve any request, so keep sessions in a shared cache or database. An Auto Scaling group maintains and adjusts the instance count based on health and demand, replacing failed instances automatically.',
          'Loose coupling means components interact through queues or APIs so a failure in one does not cascade. SQS (queues), SNS (pub/sub) and EventBridge (events) decouple services on AWS.',
          'A multi-AZ database deployment keeps a synchronous standby in another AZ with automatic failover. Read replicas are different: they scale reads, are often asynchronous, and are not a failover guarantee.',
        ],
      },
      {
        heading: 'Disaster recovery strategies',
        body: [
          'From cheapest and slowest to most expensive and fastest: backup and restore; pilot light (core data replicated and minimal services running, scaled up on failover); warm standby (a scaled-down but fully working copy); and multi-site active/active. Choose by the RTO and RPO the business actually needs.',
        ],
      },
      {
        heading: 'Deploying safely',
        body: [
          'Immutable infrastructure replaces servers with new images rather than patching them in place, eliminating configuration drift. Blue/green deployment runs two environments and switches traffic to the new one, with instant rollback by switching back. A canary release shifts a small share of traffic to the new version first and watches the metrics before going further.',
        ],
      },
    ],
    cheatSheet: [
      ['6 pillars', 'Ops excellence, security, reliability, performance, cost, sustainability'],
      ['Newest pillar', 'Sustainability (2021)'],
      ['Horizontal vs vertical', 'More instances vs a bigger instance'],
      ['Stateless tier', 'Sessions in shared cache/DB'],
      ['Loose coupling', 'Queues/APIs: SQS, SNS, EventBridge'],
      ['Auto Scaling group', 'Right count, replaces unhealthy'],
      ['Multi-AZ DB', 'Synchronous standby, auto failover'],
      ['Read replica', 'Scale reads (often async)'],
      ['DR ladder', 'Backup/restore → pilot light → warm standby → active/active'],
      ['Immutable infra', 'Replace, don\'t patch in place'],
      ['Blue/green vs canary', 'Switch all vs shift a slice first'],
    ],
  },

  'cl-containers-iac': {
    overview: [
      'Containers package an application with everything it needs; Kubernetes runs them at scale; infrastructure as code defines the environment they run in. Together they make deployments repeatable, and they introduce their own security defaults you must fix.',
      'This lesson covers containers versus VMs, Dockerfiles, the core Kubernetes objects, Secrets and NetworkPolicies, Terraform plan and state, GitOps, and hardening containers.',
    ],
    learn: [
      {
        heading: 'Containers',
        body: [
          'Containers share the host\'s kernel, while each virtual machine runs a full operating system. That makes containers lighter and faster to start; VMs give stronger isolation.',
          'A Dockerfile is the recipe for building an image, and each instruction creates a cached layer. Run containers as a non-root user, drop unneeded Linux capabilities, and use read-only file systems where possible, to limit the damage if a container is compromised.',
        ],
      },
      {
        heading: 'Kubernetes objects',
        body: [
          'The Pod is the smallest deployable unit: one or more containers sharing network and storage. A Deployment keeps a desired number of pod replicas running and performs rolling updates, using ReplicaSets under the hood. A Service gives a stable IP and DNS name that load-balances across a set of pods (types ClusterIP, NodePort and LoadBalancer).',
          'Two defaults surprise people. Kubernetes Secrets are only base64-encoded unless you configure encryption at rest for etcd or use an external secrets manager. And pods can talk to each other freely until a NetworkPolicy restricts which pods may talk to which.',
          'Health checks: a readiness probe keeps traffic away from a pod until it can serve; a liveness probe restarts a stuck container.',
        ],
      },
      {
        heading: 'Infrastructure as code and GitOps',
        body: [
          '`terraform plan` shows the changes Terraform would make without making them; review the plan in pull requests before `terraform apply`. Store Terraform state remotely with locking to prevent concurrent corruption. State can contain secrets, so encrypt it and restrict access.',
          'GitOps makes Git the source of truth: an agent such as Argo CD or Flux continuously reconciles the cluster to what is in the repository, so every change is a reviewed commit and drift is corrected automatically.',
        ],
      },
    ],
    examples: [
      {
        title: 'A hardened Dockerfile',
        code: code(
          'FROM python:3.12-slim',
          'WORKDIR /app',
          'COPY requirements.txt .',
          'RUN pip install --no-cache-dir -r requirements.txt',
          'COPY . .',
          'RUN useradd --uid 10001 --no-create-home app',
          'USER app                      # never run as root',
          'CMD ["python", "server.py"]',
        ),
        explanation: 'Dependencies are copied before the code, so the slow install layer stays cached when only code changes.',
      },
      {
        title: 'Default-deny, then allow one path (Kubernetes NetworkPolicy)',
        code: code(
          'apiVersion: networking.k8s.io/v1',
          'kind: NetworkPolicy',
          'metadata:',
          '  name: api-allow-frontend',
          'spec:',
          '  podSelector:',
          '    matchLabels: { app: api }',
          '  policyTypes: [Ingress]',
          '  ingress:',
          '    - from:',
          '        - podSelector:',
          '            matchLabels: { app: frontend }',
          '      ports:',
          '        - port: 8080',
        ),
        explanation: 'Once a policy selects the api pods, only frontend pods may reach them on 8080. Everything else is denied.',
      },
      {
        title: 'The Terraform review loop',
        code: code('terraform init', 'terraform fmt -check && terraform validate', 'terraform plan -out=tfplan      # review this in the pull request', 'terraform apply tfplan'),
        explanation: 'Applying a saved plan guarantees you deploy exactly what was reviewed.',
      },
    ],
    cheatSheet: [
      ['Container vs VM', 'Shared kernel (light) vs full OS (isolated)'],
      ['Dockerfile', 'Image recipe; each instruction a layer'],
      ['Pod', 'Smallest unit; containers share network/storage'],
      ['Deployment', 'Replicas + rolling updates'],
      ['Service', 'Stable IP/DNS to pods'],
      ['Secrets', 'Only base64 unless encrypted at rest'],
      ['NetworkPolicy', 'Pods are open until restricted'],
      ['Readiness / liveness', 'Hold traffic / restart stuck'],
      ['terraform plan', 'Preview changes; review in PRs'],
      ['Remote state + locking', 'Safe sharing; encrypt it'],
      ['GitOps', 'Git is truth; Argo CD / Flux reconcile'],
      ['Non-root containers', 'Limit blast radius'],
    ],
  },

  'cl-security': {
    overview: [
      'In the cloud, identity and configuration are the perimeter. Most cloud breaches come from over-permissive IAM, leaked keys and public resources, not from exotic exploits, which means they are preventable with the right defaults.',
      'This lesson covers IAM policy evaluation, SCP guardrails, roles versus access keys, envelope encryption with KMS, posture management and the tool acronyms (CSPM, CIEM, CNAPP), threat detection, IMDSv2, S3 Block Public Access and break-glass accounts.',
    ],
    learn: [
      {
        heading: 'How IAM decides',
        body: [
          'AWS IAM evaluation starts from an implicit deny: nothing is allowed unless a policy explicitly allows it. An explicit Deny anywhere always wins, overriding any Allow.',
          'Service Control Policies in AWS Organizations set the maximum permissions for accounts. SCPs never grant anything; they are guardrails, such as "no one in this account may disable CloudTrail".',
          'Prefer IAM roles over long-lived access keys. Roles provide short-lived, automatically rotated credentials; use them for EC2, Lambda, and CI pipelines through OIDC federation, so no static key exists to leak.',
        ],
      },
      {
        heading: 'Encryption and keys',
        body: [
          'Envelope encryption encrypts data with a data key, and then encrypts that data key with a master key held in KMS. Bulk encryption happens locally and fast, while the master key never leaves KMS and every use of it is logged.',
        ],
      },
      {
        heading: 'Posture and entitlements',
        body: [
          'CSPM (cloud security posture management) continuously detects misconfigurations against benchmarks such as CIS. CIEM manages cloud entitlements to find excessive permissions; most cloud identities use a tiny share of what they are granted. CNAPP (cloud-native application protection platform) unifies CSPM, CWPP (workload protection), CIEM and more in one platform.',
          'Threat detection services analyse CloudTrail, VPC Flow Logs and DNS logs for attacks: GuardDuty on AWS, Microsoft Defender for Cloud on Azure, Security Command Center on GCP.',
        ],
      },
      {
        heading: 'Defaults that prevent breaches',
        body: [
          'Enforce IMDSv2 on EC2. It requires a session token for the instance metadata service, which blocks most SSRF credential theft; the 2019 Capital One breach involved SSRF to instance metadata. Enable S3 Block Public Access at the account level, which overrides any public ACL or bucket policy.',
          'Keep a break-glass account: a tightly controlled emergency admin account, protected with MFA, monitored, and used only when normal access fails.',
        ],
      },
    ],
    examples: [
      {
        title: 'Least-privilege policy with an explicit deny guardrail',
        code: code(
          '{',
          '  "Version": "2012-10-17",',
          '  "Statement": [',
          '    {',
          '      "Effect": "Allow",',
          '      "Action": ["s3:GetObject"],',
          '      "Resource": "arn:aws:s3:::reports-bucket/*"',
          '    },',
          '    {',
          '      "Effect": "Deny",',
          '      "Action": "s3:*",',
          '      "Resource": ["arn:aws:s3:::reports-bucket", "arn:aws:s3:::reports-bucket/*"],',
          '      "Condition": { "Bool": { "aws:SecureTransport": "false" } }',
          '    }',
          '  ]',
          '}',
        ),
        explanation: 'Read-only access to one bucket, and any request over plain HTTP is explicitly denied, which overrides the allow.',
      },
      {
        title: 'Require IMDSv2 on an existing instance (AWS CLI)',
        code: code('aws ec2 modify-instance-metadata-options \\', '  --instance-id i-0abc123 \\', '  --http-tokens required --http-endpoint enabled'),
        explanation: 'With tokens required, a simple GET from an SSRF bug can no longer read the instance\'s credentials.',
      },
    ],
    cheatSheet: [
      ['IAM evaluation', 'Implicit deny → explicit allow → explicit deny wins'],
      ['SCP', 'Maximum permissions; grants nothing'],
      ['Roles vs keys', 'Short-lived, rotated vs static, leakable'],
      ['OIDC federation', 'CI gets roles without stored keys'],
      ['Envelope encryption', 'Data key encrypted by a KMS master key'],
      ['CSPM', 'Misconfiguration detection (CIS)'],
      ['CIEM', 'Excess permissions'],
      ['CNAPP', 'CSPM + CWPP + CIEM platform'],
      ['GuardDuty', 'Threat detection from CloudTrail, flow, DNS logs'],
      ['IMDSv2', 'Session token blocks SSRF (Capital One 2019)'],
      ['S3 Block Public Access', 'Overrides public ACLs/policies'],
      ['Break-glass account', 'Emergency admin: MFA, monitored'],
    ],
  },

  'cl-ccsp': {
    overview: [
      'Moving data to the cloud does not move legal accountability. Governance questions (where data lives, who can audit, how it is destroyed) are what the CCSP certification focuses on, and what regulators and customers ask about.',
      'This lesson covers the cloud data lifecycle, crypto-shredding, data sovereignty, key management options, the CSA Cloud Controls Matrix, multi-tenancy, e-discovery, SLAs, the right to audit and FedRAMP.',
    ],
    learn: [
      {
        heading: 'The data lifecycle and destruction',
        body: [
          'The Cloud Security Alliance defines six stages: create, store, use, share, archive and destroy. Apply controls at each one, such as classification at creation, encryption in storage, DLP when sharing and retention rules for archives.',
          'You cannot degauss a provider\'s disks, so crypto-shredding is the practical way to sanitise cloud data: destroy the encryption keys, and the encrypted data becomes unrecoverable.',
        ],
      },
      {
        heading: 'Sovereignty and key control',
        body: [
          'Data sovereignty means data is subject to the laws of the country where it is stored. It drives region selection and data residency controls.',
          'BYOK (bring your own key) lets you supply the key the provider uses for encryption; HYOK (hold your own key) keeps it outside the provider entirely. More control over keys means more operational responsibility: lose the key and you lose the data.',
        ],
      },
      {
        heading: 'Shared infrastructure and legal process',
        body: [
          'Multi-tenancy risk is that an isolation failure could expose one customer\'s data to another; providers mitigate it with hypervisor and logical isolation. E-discovery is harder in the cloud because data is distributed, multi-tenant and controlled by the provider, so contracts must define support for legal holds and data access.',
        ],
      },
      {
        heading: 'Assurance',
        body: [
          'A cloud SLA should define availability targets, support response times and remedies. Service credits rarely cover real business losses, so plan resilience yourself.',
          'Providers rarely allow individual customer audits (the "right to audit" problem), so you rely on third-party attestations: SOC 2, ISO 27001 and FedRAMP. The CSA Cloud Controls Matrix is a cloud-specific control framework, and the CSA STAR registry publishes provider self-assessments and audits against it.',
          'FedRAMP is the US government\'s authorisation programme for cloud services, with Low, Moderate and High baselines built on NIST SP 800-53 controls.',
        ],
      },
    ],
    cheatSheet: [
      ['Data lifecycle', 'Create, store, use, share, archive, destroy'],
      ['Crypto-shredding', 'Destroy keys to sanitise data'],
      ['Data sovereignty', 'Laws of the storage country apply'],
      ['BYOK / HYOK', 'Supply your key / keep it outside the provider'],
      ['Multi-tenancy risk', 'Isolation failure between customers'],
      ['E-discovery', 'Contracts must cover legal hold'],
      ['SLA', 'Availability, support, remedies; credits ≠ losses'],
      ['Right to audit', 'Rely on SOC 2, ISO 27001, FedRAMP'],
      ['CSA CCM / STAR', 'Cloud control framework / assessment registry'],
      ['FedRAMP', 'US gov: Low, Moderate, High (NIST 800-53)'],
    ],
  },

  'cl-sre': {
    overview: [
      'Site reliability engineering treats reliability as an engineering problem with numbers attached. Instead of "never go down", teams agree how reliable a service must be, measure it, and spend the remaining margin on shipping changes.',
      'This lesson covers SLIs, SLOs and SLAs, error budgets, observability and the golden signals, actionable alerting, chaos engineering, blameless postmortems, toil, and Kubernetes health probes.',
    ],
    learn: [
      {
        heading: 'SLIs, SLOs, SLAs and error budgets',
        body: [
          'An SLI (service level indicator) is a measurement, such as the share of requests served under 300 ms. An SLO (objective) is the internal target, such as 99.9% of requests under 300 ms over 30 days. An SLA (agreement) is the contractual promise to customers, with penalties, and is usually looser than the SLO.',
          'The error budget is the unreliability the SLO allows. At 99.9% over a 30-day month, that is about 43 minutes of downtime. While budget remains, ship features; when it is spent, prioritise reliability work.',
        ],
      },
      {
        heading: 'Observability',
        body: [
          'The three pillars are metrics (numbers over time), logs (discrete events) and traces (one request\'s path across services). OpenTelemetry is the open standard for collecting all three. Distributed tracing finds the slow or failing hop in a request that crosses many services.',
          'Google\'s four golden signals are latency, traffic, errors and saturation. An actionable alert signals real user impact and has a clear response: alert on symptoms, such as SLO burn rate, rather than on every possible cause.',
        ],
      },
      {
        heading: 'Culture and practice',
        body: [
          'Chaos engineering deliberately injects failures, such as killing instances or adding latency, to test resilience. Start small, in staging, with a defined blast radius.',
          'A blameless postmortem reviews an incident in terms of systems and processes, not individuals, which encourages honest reporting and real fixes. Toil is manual, repetitive, automatable operational work; Google SRE aims to keep it under 50% of an engineer\'s time and automate the rest.',
          'In Kubernetes, a readiness probe keeps traffic away from a pod until it can serve, and a liveness probe restarts a container that has become stuck.',
        ],
      },
    ],
    examples: [
      {
        title: 'Error budget arithmetic',
        code: code(
          'SLO 99.9% over 30 days',
          '30 days x 24 h x 60 min = 43,200 minutes',
          'Error budget = 0.1% x 43,200 = 43.2 minutes',
          '',
          'SLO 99.99%  ->  4.3 minutes per month',
        ),
        explanation: 'Each extra nine cuts the budget tenfold, which is why the target should match what users actually need.',
      },
    ],
    cheatSheet: [
      ['SLI / SLO / SLA', 'Measurement / internal target / contract'],
      ['Error budget', 'Allowed unreliability: 99.9% ≈ 43 min/month'],
      ['Three pillars', 'Metrics, logs, traces'],
      ['OpenTelemetry', 'Open standard for telemetry'],
      ['Golden signals', 'Latency, traffic, errors, saturation'],
      ['Actionable alert', 'User impact + clear response'],
      ['Distributed tracing', 'Find the slow hop'],
      ['Chaos engineering', 'Inject failure; small blast radius'],
      ['Blameless postmortem', 'Systems, not people'],
      ['Toil', 'Manual repetitive work; keep under 50%'],
      ['Readiness / liveness', 'Hold traffic / restart stuck'],
    ],
  },
};
