// Reading content for the AWS Security - Specialty track (src/data/academy/aws-security.js).
// Keyed by deck id. Professional voice — narrative, precise, confident.

export default {
  'awss-threat-detect': {
    overview: [
      'Threat detection in AWS is not one service but a layered system: something that finds the threats, something that collects the findings, something that protects the data those threats target, and something that reconstructs the story after the fact. On SCS-C02, those roles are played by GuardDuty, Security Hub, Macie, and Detective, and the exam expects you to know exactly which one answers which question.',
      'This lesson covers the detection layer end to end: how GuardDuty finds compromise without agents, how Security Hub normalises and prioritises everything into one console, how Macie classifies the sensitive data worth stealing, and how Detective turns scattered findings into an investigation timeline. (SCS-C02 Domain 1.0: Threat Detection and Incident Response.)',
    ],
    learn: [
      {
        heading: 'GuardDuty: detection without agents',
        body: [
          'Amazon GuardDuty is a threat detection service that never installs anything on your workloads. It analyses log sources AWS already collects — CloudTrail management events, VPC Flow Logs, and DNS query logs — with machine learning and threat intelligence, looking for signs of compromise: an EC2 instance talking to a known command-and-control domain, API calls from an unusual geography, a user exfiltrating data to an unfamiliar S3 bucket.',
          'GuardDuty is regional. Enabling it in us-east-1 protects nothing in eu-west-1. The exam will test this relentlessly: the correct multi-account, multi-region answer is always to enable GuardDuty in every region through AWS Organizations with a delegated administrator account, which gives one pane of glass without anyone logging into fifty consoles.',
          'Beyond the foundational sources, GuardDuty offers separately enabled protection plans that cost extra because of their data volume: S3 protection for object-level data events, EBS malware protection, RDS protection, Lambda protection, and EKS protection covering audit logs and runtime monitoring. Findings carry a severity — high means act now, and a high-severity IAM finding (anomalous API calls, unusual credential use) should be treated as compromised credentials until proven otherwise.',
          'The recommended containment for a compromised EC2 instance is instructive about AWS-native IR: isolate the instance by swapping its security group for one that denies all traffic, then take snapshots for forensics. Do not delete it first — deletion destroys the evidence you need to answer what the attacker touched.',
        ],
      },
      {
        heading: 'Security Hub: one console, one format',
        body: [
          'If GuardDuty is the sensor, AWS Security Hub is the dashboard. It aggregates findings from GuardDuty, Inspector, Macie, IAM Access Analyzer, and partner products into the AWS Security Finding Format — ASFF — a normalised schema with standard severity, resource, and remediation fields. Normalisation is the point: automation and SIEMs can parse any finding uniformly instead of learning each product\'s dialect.',
          'Security Hub also runs automated security checks against standards like the CIS AWS Foundations Benchmark, so it doubles as a posture tool: not just "what happened" but "what is misconfigured." Its insights group related findings into patterns — every finding tied to one instance, say — which is how you prioritise during an incident instead of drowning in fifty tabs.',
          'Know the vocabulary distinction cold: a finding is a single detection event; an insight is a grouped collection of findings matching a pattern. Security Hub detects nothing itself — it aggregates, normalises, and prioritises.',
        ],
      },
      {
        heading: 'Macie and Detective: data and investigation',
        body: [
          'Amazon Macie answers a different question: what sensitive data do we actually have? It uses machine learning to discover and classify PII, PHI, and other sensitive data types in S3 buckets — national ID numbers sitting unencrypted in a log bucket, for instance. The remediation pattern is always the same two moves: fix the exposure (enable default encryption, restrict access with bucket policies and Block Public Access), then protect the data class going forward. Macie also feeds findings into Security Hub for continuous monitoring as new objects land.',
          'Amazon Detective is the investigation tool. Where GuardDuty says "this instance talked to a malicious domain," Detective builds a visual entity graph — the IP addresses, users, and roles that interacted over time — so an analyst can answer "what else did this actor touch" without manually correlating logs. It shortens investigations from hours of Athena queries to clicks.',
          'Together the four form the detection story the exam expects you to tell: GuardDuty finds, Security Hub consolidates, Macie watches the data, Detective reconstructs the attack. Any question about centralising threat detection across many accounts resolves to Organizations plus delegated administration — the management pattern, not a bigger console.',
        ],
      },
    ],
    cheatSheet: [
      ['GuardDuty', 'Agentless ML threat detection over CloudTrail, VPC Flow Logs, DNS logs; regional, enable everywhere via delegated admin.'],
      ['Protection plans', 'S3, EBS malware, RDS, Lambda, EKS — enabled and billed separately from foundational detection.'],
      ['High-severity IAM finding', 'Treat as compromised credentials until proven otherwise.'],
      ['Containment', 'Isolate via deny-all security group, snapshot for forensics — never delete first.'],
      ['Security Hub', 'Aggregates findings into ASFF; runs CIS benchmark checks; detects nothing itself.'],
      ['Finding vs insight', 'A finding is one detection event; an insight groups related findings into a pattern.'],
      ['Macie', 'ML discovery and classification of PII/PHI in S3; findings flow to Security Hub.'],
      ['Detective', 'Visual entity graphs and timelines linking findings to users, roles, IPs over time.'],
      ['Delegated admin', 'Central management of GuardDuty/Security Hub/Macie without using the management account daily.'],
      ['ASFF', 'AWS Security Finding Format — normalised severity, resources, remediation across products.'],
    ],
  },

  'awss-logging': {
    overview: [
      'You cannot secure what you cannot see, and in AWS, visibility is a design decision. CloudTrail, CloudWatch Logs, and VPC Flow Logs each record a different slice of reality — API activity, application and system logs, network metadata — and the security architect\'s job is to make sure every slice is collected, tamper-evident, centralised, and queryable when an incident demands it.',
      'This lesson covers the logging foundations the exam builds everything on: management versus data events, organization trails, log file validation, CloudTrail Lake and Athena for analysis, CloudWatch metric filters and alarms, and the immutable log archive that makes the whole edifice trustworthy. (SCS-C02 Domain 2.0: Logging and Monitoring.)',
    ],
    learn: [
      {
        heading: 'CloudTrail: the control plane on record',
        body: [
          'CloudTrail records API activity in your account — who called what, from where, and when. Management events cover control-plane calls (launching instances, changing policies) and are logged by default at no extra charge. Data events cover data-plane calls — S3 object-level access, Lambda invocations — and are billed per event, which is why the exam expects you to enable them selectively on sensitive resources rather than everywhere.',
          'A trail that covers one region is a trail with blind spots. The correct architecture is an organization trail, created in the management account, logging all regions for every member account and delivering to one central S3 bucket. Future regions are included automatically, which closes the gap an attacker would otherwise exploit by operating somewhere logging was never enabled.',
          'Logs must be tamper-evident. Store them in a dedicated log-archive account — not the workload accounts — with restricted write access and MFA Delete, so a compromised admin cannot erase their own trail. Enable log file validation, which writes digest files with hashes proving the delivered logs were not modified after the fact. And for analysis across months of history, CloudTrail Lake provides managed, immutable, SQL-queryable storage with up to seven years of retention; Athena against the raw S3 bucket is the flexible, do-it-yourself alternative.',
        ],
      },
      {
        heading: 'CloudWatch: from log text to alarms',
        body: [
          'CloudWatch Logs collects the logs; the security value comes from what you extract from them. A metric filter watches a log group for a pattern — say, the string "AccessDenied" or console sign-in failures — and publishes a numeric metric every time it matches. A CloudWatch alarm then evaluates that metric: more than five failed console logins in ten minutes, page the security team. The exam\'s canonical root-usage alarm is exactly this pattern: organization trail, metric filter for root API calls, alarm to SNS.',
          'Two defaults deserve attention. CloudWatch log groups retain logs indefinitely ("Never Expire") unless you set a retention period — free only in the sense that nobody configured it, and expensive in storage and incident-scoping terms. Set retention deliberately. And alarms are not just notifications: they can invoke EC2 actions (reboot, stop, terminate, recover an impaired instance), Auto Scaling policies, or EventBridge rules, which makes them the bridge from monitoring to automated response.',
          'For event-driven automation, EventBridge is the evolved successor to CloudWatch Events — the same event-bus concept with SaaS integrations, a schema registry, and archives. GuardDuty findings, Config compliance changes, and alarm state changes all flow through EventBridge to Lambda or Systems Manager Automation runbooks, which is how detection becomes response in seconds.',
        ],
      },
      {
        heading: 'Network visibility and the immutable archive',
        body: [
          'VPC Flow Logs record network metadata — source and destination IPs, ports, protocol, bytes, and whether traffic was accepted or rejected. They do not contain packet payloads; they show who talked to whom, never what was said. For long-term analysis, send them to S3 rather than CloudWatch Logs: S3 is far cheaper for high-volume, long-retention storage and queries directly with Athena.',
          'The archive design ties it together. Seven years of CloudTrail for audit is cheapest as an organization trail to S3 with lifecycle policies transitioning older logs to Glacier and Deep Archive — compliance retention does not need hot, queryable storage. For tamper-proofing beyond digest validation, S3 Object Lock in compliance mode makes the log bucket WORM: not even the root user can delete objects until retention expires.',
          'One more exam favourite: CloudTrail Insights detects unusual API activity — spikes in call volume, anomalous patterns — statistically rather than by signature. It will not find malware or open buckets; it finds behaviour that deviates, which is often the first signal that credentials are being misused.',
        ],
      },
    ],
    cheatSheet: [
      ['Management vs data events', 'Control-plane API calls (free, default) vs data-plane calls like S3 object access (billed per event, enable selectively).'],
      ['Organization trail', 'Logs all regions and member accounts to one central bucket; covers future regions automatically.'],
      ['Log archive account', 'Dedicated, locked-down account for logs with MFA Delete — separation of duties against tampering.'],
      ['Log file validation', 'Digest files with hashes proving delivered logs were not modified.'],
      ['CloudTrail Lake', 'Managed, immutable, SQL-queryable event storage up to 7 years; Athena is the DIY alternative on S3.'],
      ['Metric filter + alarm', 'Extract metrics from log patterns, then alarm on them — the root-usage detection pattern.'],
      ['Log retention default', 'CloudWatch log groups keep logs forever unless you set a retention period.'],
      ['VPC Flow Logs', 'Metadata only (IPs, ports, bytes, action) — no packet payloads; archive in S3 for Athena analysis.'],
      ['CloudTrail Insights', 'Statistical anomaly detection on API activity, not signature matching.'],
      ['Object Lock compliance mode', 'WORM storage for logs: undeletable until retention expires, even by root.'],
    ],
  },

  'awss-iam-foundations': {
    overview: [
      'Identity is the primary security boundary in AWS. There is no corporate firewall that matters more than the question of who — or what — is allowed to call which API on which resource. Every breach story in the cloud eventually resolves to an identity question: a key that should not have existed, a policy broader than the job required, a role assumed from somewhere it should never have been.',
      'This lesson builds the IAM mental model the specialty exam assumes you already own: policy evaluation order, roles versus long-lived keys, identity versus resource policies, MFA, and the hygiene practices — credential reports, policy simulation, least privilege — that keep the identity plane clean. (SCS-C02 Domain 4.0: Identity and Access Management.)',
    ],
    learn: [
      {
        heading: 'How authorization is decided',
        body: [
          'Every API call passes through IAM policy evaluation, and the order is fixed: start with an implicit deny, then look for an explicit allow, then let any explicit deny override everything. The sentence to memorise is that an explicit deny always wins. It wins over allows in identity policies, resource policies, SCPs, and permission boundaries alike, which is why deny-based guardrails are the reliable way to draw lines nobody can cross.',
          'Two kinds of policy attach to two kinds of thing. Identity-based policies attach to users, groups, and roles and describe what that identity may do. Resource-based policies attach to resources — S3 buckets, KMS keys, Lambda functions — and describe who may act on that resource. Cross-account access typically needs both sides to agree: the identity policy allows the action, and the resource policy trusts the external principal.',
          'Within a policy, the elements have distinct jobs. Action names the API calls, Resource scopes where they apply, Condition constrains when, and Effect allows or denies. A policy that allows s3:GetObject on arn:aws:s3:::data/* permits reading objects inside the bucket but not listing the bucket itself — S3 ARNs distinguish bucket-level from object-level permissions, and the exam will catch you if you blur them.',
        ],
      },
      {
        heading: 'Roles, not keys; MFA, not hope',
        body: [
          'Applications running on EC2 — or Lambda, ECS, or anywhere else — should use IAM roles, never embedded access keys. A role delivers temporary credentials through the instance metadata service that rotate automatically; there is no secret to leak, commit to a repository, or forget to rotate. An instance profile is simply the container that passes a role to an EC2 instance. When a human needs elevated access for two hours, the same principle applies: assume a role and let the credentials expire, rather than widening a permanent permission.',
          'MFA protects against credential theft: a stolen password alone no longer suffices. Enforce it for console access and especially for privileged role assumption — a trust policy condition on aws:MultiFactorAuthPresent makes MFA a gate before any session begins. And the root user deserves special handling: no IAM policy or SCP can limit it, so lock it with MFA, never use it for daily work, and alarm on any root API activity at all. Root usage should be rare enough that every occurrence is worth a page.',
          'Hygiene is a practice, not a project. The IAM credential report shows password and key age, MFA status, and last-used timestamps for every user — the fastest way to find stale keys and MFA-less accounts. IAM Access Analyzer goes further, identifying unused permissions and generating policies from actual CloudTrail activity so you can rightsize toward least privilege based on observed behaviour instead of guesses. And before deploying any policy change, run it through the IAM Policy Simulator: it answers "would this allow or deny that action" without touching production.',
        ],
      },
    ],
    cheatSheet: [
      ['Explicit deny', 'Always wins in policy evaluation, over every kind of allow.'],
      ['Identity vs resource policy', 'Identity policies attach to users/groups/roles; resource policies attach to S3 buckets, KMS keys, etc.'],
      ['Roles over keys', 'Temporary, auto-rotating credentials via metadata service — no long-lived secrets to steal.'],
      ['Instance profile', 'Passes an IAM role to an EC2 instance.'],
      ['MFA condition', 'aws:MultiFactorAuthPresent in a trust policy gates privileged role assumption.'],
      ['Root user', 'Unlimited by any policy; lock with MFA, never use daily, alarm on any use.'],
      ['Credential report', 'Key/password age, MFA status, last-used — finds stale credentials fast.'],
      ['Policy Simulator', 'Tests allow/deny outcomes before deploying policy changes.'],
      ['Access Analyzer', 'Finds unused permissions; generates policies from real CloudTrail activity.'],
      ['Action / Resource / Condition', 'Policy elements: what API, where it applies, under what constraints.'],
    ],
  },

  'awss-incident-response': {
    overview: [
      'Incident response in AWS rewards preparation and punishes improvisation. The platform gives you extraordinary leverage — snapshots in seconds, automation that isolates hosts faster than any human, logs centralised by architecture — but only if the runbooks, roles, and forensic accounts exist before the alert fires. The exam tests whether you would reach for the right building blocks in the right order.',
      'This lesson covers the AWS IR playbook: the correct order of operations, forensic preservation with EBS snapshots, session revocation that actually works, EventBridge-driven automated containment, and the rehearsal discipline that makes it all real. (SCS-C02 Domain 1.0: Threat Detection and Incident Response.)',
    ],
    learn: [
      {
        heading: 'The order of operations',
        body: [
          'For a compromised EC2 instance, the sequence is: detect and scope, contain, collect forensic evidence, eradicate, recover, then lessons learned. The ordering is load-bearing. Containment — isolating the instance by replacing its security group with a deny-all — stops lateral movement and exfiltration. Forensic collection — EBS snapshots taken before any remediation — preserves the evidence that tells you what the attacker did. Eradication first destroys both.',
          'Forensic images belong in a dedicated forensic account, not the compromised one. Create EBS snapshots, share or copy them to the isolated account, and restrict access — snapshots are point-in-time and immutable, and the separation maintains chain of custody. Watch for attacker tradecraft in the process: ransomware playbooks specifically include checking for encrypted volumes and unfamiliar snapshots or AMIs shared from other accounts, because attackers plant their own images.',
          'Compromised credentials need more than a password change. Deleting an IAM user\'s access keys does not invalidate already-issued temporary session tokens — the attacker\'s existing session keeps working. The reliable kill is an inline policy with an explicit deny keyed on aws:TokenIssueTime, which invalidates every session issued before a chosen moment, or deleting and deactivating the user and keys together. Treat high-severity GuardDuty IAM findings as credential compromise until proven otherwise, and rotate everything the compromised identity could reach: for a Lambda function, that means its execution role\'s reachable secrets, environment variables, and the code itself if tampered with.',
        ],
      },
      {
        heading: 'Automate the response, rehearse the team',
        body: [
          'Detection-to-containment should be measured in seconds, which means automation. EventBridge rules matching GuardDuty findings can trigger Lambda functions or Systems Manager Automation runbooks — isolate the instance, snapshot the volumes, revoke the sessions — without waiting for a human to finish reading the alert. During a multi-account incident, Security Hub insights group related findings so responders work one prioritised queue instead of dozens of consoles.',
          'Amazon Detective compresses the investigation itself: it pre-correlates GuardDuty findings into timelines of IP, user, and role activity across accounts, so analysts pivot from one finding to the full blast radius in clicks rather than hours of manual log correlation.',
          'None of this matters if the team has never run it. A game day — a simulated incident exercising detection, runbooks, and coordination — is how you discover that the automation role lacks a permission or that nobody knows the forensic account\'s break-glass procedure at 2 AM. The exam expects preparation over improvisation, and it expects the automation itself to follow least privilege: an over-permissive remediation role is both an attack path and an outage waiting to happen. Scope Lambda and SSM response roles to exactly the actions the playbook needs.',
          'After the dust settles, AWS Artifact provides the compliance reports — SOC 2, ISO 27001 — that regulators and customers will demand as breach-notification evidence. Have access to them before you need them; "we are still gathering our audit reports" is not a sentence you want to say during an incident.',
        ],
      },
    ],
    cheatSheet: [
      ['IR order', 'Detect and scope, contain, collect forensics, eradicate, recover, lessons learned.'],
      ['Containment', 'Swap to a deny-all security group; isolate before eradicating.'],
      ['Forensic snapshots', 'EBS snapshots copied to a dedicated forensic account; never analyse in the compromised account.'],
      ['Session revocation', 'Deny on aws:TokenIssueTime — deleting keys alone does not kill live sessions.'],
      ['Automated response', 'EventBridge on GuardDuty findings triggers Lambda or SSM Automation runbooks.'],
      ['Detective', 'Pre-built timelines of IP, user, and role activity — answers "what else did they touch."'],
      ['Game day', 'Simulated incident rehearsing detection, runbooks, and team coordination.'],
      ['Least-privilege automation', 'Scope IR Lambda/SSM roles to exactly the playbook\'s actions.'],
      ['AWS Artifact', 'On-demand compliance reports (SOC 2, ISO) for breach-notification evidence.'],
      ['No managed forensics service', 'The pattern is snapshots plus Inspector/Detective analysis in an isolated account.'],
    ],
  },

  'awss-monitor-analyze': {
    overview: [
      'Logging collects the evidence; monitoring turns it into judgement. This is the detective-control layer of the security program: continuously evaluating whether resources are configured the way policy demands, analysing network and API data at a scale no human can read raw, and surfacing the drift between "approved" and "actual" before an attacker exploits it.',
      'This lesson covers the monitoring toolkit: AWS Config and its rules, conformance packs, and aggregators; large-scale log analysis with Athena and CloudTrail Lake; and the EventBridge wiring that turns a compliance change into a notification or an automatic fix. (SCS-C02 Domain 2.0: Logging and Monitoring.)',
    ],
    learn: [
      {
        heading: 'Config: the compliance sensor',
        body: [
          'CloudTrail tells you who did what; AWS Config tells you what the resource became. It records configuration history and evaluates compliance state continuously: this S3 bucket was compliant yesterday, a policy change at 14:32 made it non-compliant, and here is the API call responsible. The timeline view gives you attribution plus state history in one place, which is exactly what auditors and incident responders need.',
          'Config rules are the evaluations — managed rules for common checks, custom Lambda-backed rules for your own. A conformance pack bundles rules and remediation actions into one deployable package, such as the CIS benchmark, so baseline compliance lands across accounts quickly. And a Config aggregator collects configuration and compliance data from multiple accounts and regions into one central view, which is the only sane way to govern a hundred-account organization.',
          'Know how Config relates to its neighbours. Config rules evaluate resource compliance continuously; Security Hub aggregates those evaluations among its findings. Config is the sensor; Security Hub is one of the dashboards that consumes it. They are complementary, not competing.',
        ],
      },
      {
        heading: 'Analysis at scale, and closing the loop',
        body: [
          'Thirty days of VPC Flow Logs across a fleet is not a dataset you open in a console. The pattern is S3 plus Athena: flow logs delivered to a bucket partitioned by date, queried with SQL for the compromised IP\'s conversations. Partitioning matters — a full scan of unpartitioned data is slow and billed by the byte scanned. CloudTrail Lake is the managed alternative when you want immutable, queryable event storage with up to seven years of retention without managing the S3 lifecycle yourself.',
          'For interactive investigation of centralised logs, CloudWatch Logs Insights runs ad-hoc queries over log groups — all 403s from one IP in the last hour — faster than exporting when the logs are already in place. Sharing KMS-encrypted log groups with a central security account requires both halves of the permission: a resource-based log destination policy and KMS key policies granting the central account decrypt rights.',
          'Monitoring closes the loop when a detection triggers action. A Config rule flags the bucket policy that just went non-compliant; EventBridge catches the compliance-change event and routes it to SNS or a Lambda that remediates. That detect-notify-remediate chain — Config rule plus EventBridge plus response — is the exam\'s standard answer for near-real-time drift detection, whether the drift is an S3 policy, an unencrypted volume, or a security group someone opened to the world.',
          'Cost discipline belongs in the design. Data events are high-volume and billed per event, so enable them on sensitive resources rather than everywhere. Management events already cover the control plane for free. And when retention is about audit rather than investigation, Glacier-class storage behind lifecycle policies beats any queryable store on price.',
        ],
      },
    ],
    cheatSheet: [
      ['Config vs CloudTrail', 'Config tracks resource configuration and compliance over time; CloudTrail logs who did what.'],
      ['Config rule', 'Continuous compliance evaluation; managed or custom Lambda-backed.'],
      ['Conformance pack', 'Bundled Config rules plus remediation, e.g. the CIS benchmark pack.'],
      ['Config aggregator', 'Central compliance view across accounts and regions.'],
      ['Athena on S3', 'SQL analysis of flow logs and trail data at scale; partition by date.'],
      ['CloudTrail Lake', 'Managed immutable SQL-queryable event storage, up to 7-year retention.'],
      ['Logs Insights', 'Ad-hoc queries over CloudWatch log groups during investigations.'],
      ['Detect-notify-remediate', 'Config rule plus EventBridge on compliance change routes to SNS/Lambda.'],
      ['Read vs write events', 'Log mutating calls always; log reads selectively to control volume.'],
      ['Cheapest 7-year retention', 'Organization trail to S3 with lifecycle policies to Glacier/Deep Archive.'],
    ],
  },

  'awss-network-security': {
    overview: [
      'Network security in AWS is a stack of overlapping controls, and the exam tests whether you know which layer answers which threat. Security groups guard instances, NACLs guard subnets, WAF guards web applications, Shield guards against DDoS, and account boundaries guard everything. Misplace a control — expecting WAF to stop a volumetric flood, or a NACL to behave like a security group — and the architecture fails where it matters.',
      'This lesson maps the network security stack: stateful versus stateless filtering, three-tier VPC design, private connectivity through endpoints, Layer 7 protection with WAF, DDoS with Shield, and why multi-account structure is itself a network security decision. (SCS-C02 Domain 3.0: Infrastructure Security.)',
    ],
    learn: [
      {
        heading: 'Filtering: security groups and NACLs',
        body: [
          'Security groups and network ACLs both filter traffic, and they behave differently in the ways that matter. Security groups are stateful: return traffic for an allowed connection is automatically permitted, so you never think about ephemeral ports. They are also allow-only — there is no deny rule in a security group. NACLs are stateless: each direction is evaluated independently, so a NACL that allows inbound web traffic must also allow the outbound ephemeral-port range for the response. And NACLs support explicit deny rules, evaluated in ascending rule-number order with first match winning.',
          'The canonical three-tier layout puts load balancers in public subnets and application and data tiers in private subnets across at least two Availability Zones, with NAT gateways providing outbound-only internet access. A web security group allows 443 from the internet; the application security group allows traffic only from the web security group — referenced by security group ID, not by IP, so the rules stay correct as instances scale. No instance that users reach directly should hold data.',
          'For AWS service access without internet exposure, VPC endpoints keep traffic on the private AWS network. Gateway endpoints for S3 and DynamoDB are route-table targets and free; interface endpoints for most other services are elastic network interfaces with hourly and data charges. Endpoint policies add a further control: even with broad IAM permissions, an endpoint policy can deny access to sensitive buckets, containing exfiltration paths. And an instance with no internet route can still be managed — private subnets with interface endpoints for SSM, EC2 Messages, and SSM Messages give you Session Manager with no internet path at all.',
        ],
      },
      {
        heading: 'WAF, Shield, and the account boundary',
        body: [
          'AWS WAF filters Layer 7 web traffic — SQL injection, cross-site scripting, bot control — in front of CloudFront, Application Load Balancers, and API Gateway. It is not a network firewall; it never sees Layers 3 and 4 the way security groups do. Start with AWS managed rule groups for common threats like the OWASP Top 10, then add custom rules for business logic — blocking specific paths, headers, or geographies. If a managed rule update starts blocking legitimate traffic, switch it to Count mode: matches are logged but not blocked, giving you visibility to tune exclusions without an outage.',
          'DDoS protection comes in two tiers. Shield Standard is automatic and free for CloudFront, Route 53, ALBs, and Elastic IPs. Shield Advanced adds cost but brings 24/7 access to the DDoS Response Team, deeper Layer 7 mitigations, and cost protection against scaling charges during an attack. The exam\'s pairing is deliberate: WAF rate-based rules handle application-layer request floods per IP, while Shield Advanced handles volumetric Layers 3, 4, and 7 attacks. Use both; neither replaces the other.',
          'For centralised, stateful inspection across VPCs — Suricata-compatible rules at Layers 3 through 7 — AWS Network Firewall sits as a transit inspection point, typically in a dedicated security VPC in a hub-and-spoke Transit Gateway design. AWS Firewall Manager then deploys WAF rules, Shield Advanced protections, and security group policies centrally across the organization.',
          'Finally, the strongest network boundary in AWS is not a firewall rule but an account. Separate accounts per environment, governed by SCPs with separate CloudTrail and Config, eliminate entire classes of accidental cross-environment privilege paths. Combined with account-level S3 Block Public Access — which guarantees no bucket can become public via ACLs or policies regardless of individual settings — the multi-account structure is the foundation every other network control rests on.',
        ],
      },
    ],
    cheatSheet: [
      ['Security groups', 'Stateful, allow-only; return traffic automatic; reference peer SGs by ID.'],
      ['NACLs', 'Stateless, allow and deny; evaluated ascending by rule number, first match wins.'],
      ['Three-tier VPC', 'Public subnets for load balancers only; app and data private across 2+ AZs.'],
      ['Gateway vs interface endpoints', 'Gateway (S3, DynamoDB): free route-table targets. Interface: ENIs, hourly plus data charges.'],
      ['WAF', 'Layer 7 filtering (SQLi, XSS, bots) for CloudFront/ALB/API Gateway; managed groups plus custom rules.'],
      ['Count mode', 'Log WAF matches without blocking — tune safely after false positives.'],
      ['Shield Standard vs Advanced', 'Standard: free automatic DDoS protection. Advanced: DRT access, L7 mitigations, cost protection.'],
      ['Network Firewall', 'Centralised stateful L3-7 inspection with Suricata rules; place in a security VPC.'],
      ['Firewall Manager', 'Centrally deploy WAF, Shield Advanced, and SG policies across Organizations.'],
      ['Account-level Block Public Access', 'No bucket in the account can become public, regardless of bucket settings.'],
    ],
  },

  'awss-iam-advanced': {
    overview: [
      'Foundational IAM answers "who can do what." Advanced IAM answers the harder questions: how do you bound what an entire account may do, delegate administration without delegating the keys to the kingdom, trust identities from outside your organization, and eliminate long-lived credentials from machines that were never meant to hold them.',
      'This lesson covers the specialty-level IAM toolkit: Service Control Policies, permission boundaries, cross-account roles and the confused deputy problem, Cognito, IAM Identity Center, and OIDC federation for workloads. (SCS-C02 Domain 4.0: Identity and Access Management.)',
    ],
    learn: [
      {
        heading: 'Guardrails: SCPs and permission boundaries',
        body: [
          'Service Control Policies are the organization\'s ceiling. Attached to organizational units or accounts in AWS Organizations, they define the maximum permissions available — and the critical limitation is that they never grant anything. An SCP that allows an action means nothing without an identity policy that also allows it; the effective permission is the intersection. SCPs also do not apply to the management account, which is one more reason that account stays locked down and workload-free.',
          'Permission boundaries solve a different problem: safe delegation within a single account. A developer who needs to create roles for their service gets an IAM policy that caps the maximum permissions any role they create can ever have. They are free to iterate inside the boundary and structurally unable to exceed it — delegation without the standing risk of a runaway administrator.',
          'The two compose naturally. SCPs cap what the entire account can do; permission boundaries cap what delegated admins can grant inside it. Two ceilings, two scopes, no conflict — and the exam will ask you to place each at the right layer.',
        ],
      },
      {
        heading: 'Trusting outsiders: cross-account roles and federation',
        body: [
          'When a partner needs access to one of your S3 buckets, the secure pattern is a cross-account IAM role with a trust policy limited to the partner\'s account, scoped to that bucket — and an external ID. The external ID exists to defeat the confused deputy problem: without it, a malicious party that also does business with the partner could trick your role into acting on their behalf. Any third-party trust policy without a unique external ID is an exam-wrong answer.',
          'For workforce access across many accounts, IAM Identity Center (the successor to AWS SSO) provides centralised single sign-on with permission sets — one identity, many accounts, no long-lived keys anywhere. For customer-facing applications, Amazon Cognito splits the job in two: User Pools handle authentication (sign-up, sign-in, MFA), while Identity Pools federate those identities into temporary AWS credentials. User Pools are the directory; Identity Pools are the broker to AWS access.',
          'Machine identities deserve the same zero-secret treatment. CI/CD pipelines should authenticate to AWS through OIDC federation — GitHub Actions assuming a short-lived role, for example — so there are no static access keys to rotate, leak, or find in a repository six months later.',
          'Two more advanced controls round out the picture. The aws:PrincipalOrgID condition key restricts a resource policy to callers inside your organization — a data-perimeter guardrail that blocks exfiltration to external accounts even when credentials leak. And KMS is the service where key policies rule: cross-account decryption requires the key policy to explicitly allow the external account, because KMS defaults to key-policy authority in a way most services do not.',
        ],
      },
    ],
    cheatSheet: [
      ['SCPs', 'Organization-level maximum permissions; never grant, and do not apply to the management account.'],
      ['Permission boundaries', 'Cap what delegated admins can grant within one account — safe delegation.'],
      ['Cross-account role pattern', 'Trust policy limited to the partner account plus a unique external ID, scoped to the resource.'],
      ['Confused deputy', 'Attacker tricks your role via a third party; prevented by requiring an external ID.'],
      ['Identity Center', 'Centralised workforce SSO across accounts and apps with permission sets.'],
      ['Cognito', 'User Pools authenticate users; Identity Pools federate identities to temporary AWS credentials.'],
      ['OIDC federation', 'CI/CD assumes short-lived roles — no static access keys in pipelines.'],
      ['aws:PrincipalOrgID', 'Condition key restricting resource policies to callers inside your Organization.'],
      ['KMS key policy authority', 'Cross-account KMS use requires the key policy to allow it; IAM allow alone is insufficient.'],
      ['Service-linked vs service role', 'Service-linked roles are AWS-predefined and uneditable; service roles are customer-created.'],
    ],
  },

  'awss-data-protection': {
    overview: [
      'Data protection is the domain where the exam is most unforgiving, because the distinctions are precise and the wrong choice fails silently. SSE-S3 versus SSE-KMS is not a trivia question — it determines whether every decryption is logged with an identity attached. A key policy is not just another policy — for KMS it is the primary gate, and misunderstanding that breaks cross-account architectures.',
      'This lesson covers the encryption and secrets toolkit in full: KMS key types and policies, envelope encryption, the SSE family, CloudHSM, certificate management with ACM, Secrets Manager, and the data-discovery loop with Macie. (SCS-C02 Domain 5.0: Data Protection.)',
    ],
    learn: [
      {
        heading: 'KMS: keys, policies, and envelope encryption',
        body: [
          'KMS offers three key types. AWS managed keys are the default — AWS controls the policy and rotation. Customer managed keys give you control of the key policy, rotation, and audit granularity, and the exam expects them for regulated or highly sensitive data. AWS owned keys live entirely inside services for their internal use. The practical difference that matters most: with AWS managed keys you cannot view or edit the key policy, which limits both control and auditability.',
          'KMS evaluates the key policy as the primary gate. Cross-account decryption works only if the key policy explicitly allows the external account — an IAM allow in the caller\'s account is insufficient, a reversal of the usual "either side allows" intuition from S3. Grants provide temporary, programmatic delegation without editing the durable policy: an AWS service that needs limited key use gets a scoped, expirable grant instead of a policy change.',
          'Envelope encryption is why KMS scales. Your data is encrypted with a data key; the data key is encrypted by the KMS key. GenerateDataKey returns both the plaintext data key (use it, then discard it from memory) and the encrypted version (store it alongside the ciphertext). Plaintext key material never rests anywhere longer than necessary. Automatic rotation of customer managed keys generates new backing material yearly while retaining the old, so existing ciphertext keeps decrypting — rotation without mass re-encryption.',
        ],
      },
      {
        heading: 'Encryption in practice: S3, EBS, TLS, and secrets',
        body: [
          'For S3, the SSE family is a ladder of control. SSE-S3 is free and simple with AWS-managed keys. SSE-KMS uses your KMS keys and gives you the audit trail — every decryption logged to CloudTrail with the requesting identity — at the cost of KMS API calls, which S3 Bucket Keys reduce by up to 99% by reusing a bucket-level data key. SSE-C means you manage the keys entirely. Enforce encryption with both default bucket encryption and a bucket policy denying PutObject without the encryption header; require TLS in transit with a policy denying requests where aws:SecureTransport is false.',
          'For the strictest requirements — where even AWS personnel must not be able to access key material — CloudHSM provides dedicated, single-tenant FIPS 140-2 Level 3 hardware that you manage, or KMS with an external key store. Standard KMS is multi-tenant and AWS-managed; choose CloudHSM for regulatory mandates and KMS for everything else. And when data must be provably unrecoverable, crypto-shredding — destroying the KMS key material so ciphertext can never be decrypted — is the accepted answer; deleting S3 objects alone leaves replicated copies behind.',
          'Certificates and secrets complete the picture. ACM public certificates with DNS validation renew automatically as long as the validation record persists, and their private keys can never be exported — a security feature, not a limitation. Application secrets belong in Secrets Manager with automatic rotation, retrieved via the SDK at runtime; it wins over Parameter Store SecureString when you need rotation, cross-account sharing, or RDS-integrated rotation. Environment variables and config files are never the answer.',
          'Two immutability controls deserve mention together. S3 Object Lock in compliance mode gives WORM guarantees — objects cannot be deleted or overwritten until retention expires, not even by root — for regulatory retention. Macie closes the discovery loop: beyond initial PII/PHI classification in S3, it continuously monitors for new sensitive data and routes findings to Security Hub, because data protection is a posture that drifts.',
        ],
      },
    ],
    cheatSheet: [
      ['Customer managed keys', 'You control policy, rotation, audit — the exam answer for regulated data.'],
      ['KMS key policy', 'Primary gate; cross-account use requires the key policy to allow it.'],
      ['Envelope encryption', 'Data encrypted with a data key; the data key encrypted by the KMS key.'],
      ['KMS grants', 'Temporary, scoped, programmatic delegation without editing the key policy.'],
      ['SSE-S3 vs SSE-KMS vs SSE-C', 'AWS keys (free) vs your KMS keys (CloudTrail audit per decryption) vs your keys entirely.'],
      ['S3 Bucket Keys', 'Bucket-level KMS data key reused per object; cuts KMS costs up to 99%.'],
      ['CloudHSM', 'Dedicated single-tenant HSM, FIPS 140-2 Level 3; for mandates AWS personnel must not reach keys.'],
      ['Crypto-shredding', 'Destroy key material to make ciphertext permanently unrecoverable.'],
      ['ACM', 'DNS-validated public certs auto-renew; private keys never exportable.'],
      ['Secrets Manager', 'Automatic rotation and cross-account sharing; beats Parameter Store for true secrets.'],
    ],
  },

  'awss-secure-compute': {
    overview: [
      'Compute is where vulnerabilities become breaches. An unpatched library, an instance reachable over SSH from the internet, a metadata service that hands out credentials too freely — each is a small misconfiguration until an attacker assembles them into a path. The specialty exam treats workload hardening as a discipline with specific AWS tools, not general advice.',
      'This lesson covers the compute security toolkit: Inspector for vulnerability assessment, Systems Manager for patching and keyless access, IMDSv2 enforcement and the breach that made it famous, EKS and Lambda hardening, and the golden-image pipeline that makes secure the default. (SCS-C02 Domain 3.0: Infrastructure Security.)',
    ],
    learn: [
      {
        heading: 'Find and fix: Inspector and Systems Manager',
        body: [
          'Amazon Inspector assesses what GuardDuty does not: software vulnerabilities and network reachability across EC2 instances, ECR container images, and Lambda function code. GuardDuty finds active malicious behaviour; Inspector finds the patchable CVEs an attacker would exploit next. Operationalise it at scale by aggregating findings to Security Hub, prioritising by exploitability rather than raw severity, and driving remediation through Systems Manager Patch Manager — scheduled, automated patching with baselines and compliance reporting across the fleet. Findings without a remediation pipeline are just noise.',
          'Shift the scanning left as well: run Inspector on ECR images in the CI/CD pipeline so builds fail on critical CVEs before vulnerable images reach production. And produce the images themselves securely with EC2 Image Builder, which builds hardened, tested, versioned AMIs automatically — every instance launches from a known-good baseline instead of a snowflake server someone configured by hand three years ago.',
          'For day-to-day access, SSM Session Manager replaces SSH with key pairs entirely: no inbound ports, no long-lived keys, IAM-authenticated sessions with full logging to CloudTrail and CloudWatch. It removes the whole SSH key management problem — distribution, rotation, offboarding — in one architectural move.',
        ],
      },
      {
        heading: 'Harden the runtime: IMDSv2, EKS, and Lambda',
        body: [
          'The instance metadata service deserves its reputation. The 2019 Capital One breach taught the industry the pattern: a server-side request forgery against IMDSv1 let an attacker steal the instance role\'s credentials, and an overbroad role turned theft into a massive data breach. The fix is IMDSv2 — session-oriented, resistant to SSRF — enforced at scale with an SCP or IAM policy denying RunInstances unless IMDSv2 is required, plus a Config rule watching for drift.',
          'Make secure the default at the fleet level: Auto Scaling launch templates should enforce IMDSv2 and encrypted EBS volumes, so every instance the fleet launches inherits the baseline automatically. Per-instance fixes do not survive the next scaling event.',
          'Container and serverless workloads have their own hardening checklists. EKS cluster endpoints should be private, reachable through authorized networks, VPN, or bastion — never a public endpoint open to the world. EKS Pod Identity (and its predecessor IRSA) gives each pod fine-grained IAM permissions without sharing the node role\'s credentials. A Lambda function processing PII needs three things together: a least-privilege execution role, VPC deployment with no internet path unless required, and environment variables encrypted with KMS. Scope identity, network, and secrets as one design, not three afterthoughts.',
          'For the most sensitive processing, Nitro Enclaves provide isolated, attested compute environments on EC2 — no persistent storage, no administrator access, cryptographic attestation of the code running inside — for workloads like key handling where even the host must not be trusted.',
        ],
      },
    ],
    cheatSheet: [
      ['Inspector', 'Vulnerability and network-reachability assessment for EC2, ECR images, Lambda code.'],
      ['GuardDuty vs Inspector', 'GuardDuty finds active malicious behaviour; Inspector finds patchable CVEs.'],
      ['Patch Manager', 'Scheduled automated patching with baselines and compliance reporting.'],
      ['Session Manager', 'Keyless IAM-authenticated shell access; no inbound ports, fully logged.'],
      ['IMDSv2', 'Session-oriented metadata service resistant to SSRF; enforce via SCP plus Config rule.'],
      ['Capital One lesson', 'SSRF against IMDSv1 plus overbroad role — enforce IMDSv2 and least privilege.'],
      ['EKS hardening', 'Private cluster endpoint; Pod Identity/IRSA for per-pod IAM permissions.'],
      ['Lambda hardening', 'Least-privilege role, VPC without internet unless needed, KMS-encrypted env vars.'],
      ['Image Builder', 'Automated hardened, tested, versioned AMIs — golden images, no snowflakes.'],
      ['Nitro Enclaves', 'Isolated attested compute for highly sensitive processing; no admin access.'],
    ],
  },

  'awss-governance': {
    overview: [
      'Security at the scale of one account is a checklist. Security at the scale of a hundred accounts is a system of government: who may create accounts, what guardrails apply automatically, where the audit trail lives, and how you prove any of it to a regulator. The specialty exam treats governance as architecture, not paperwork.',
      'This lesson covers governing AWS at scale: the multi-account structure, the management account\'s austere role, Control Tower guardrails, delegated administration, continuous compliance with Config, and the audit evidence pipeline. (SCS-C02 Domain 6.0: Governance.)',
    ],
    learn: [
      {
        heading: 'The multi-account foundation',
        body: [
          'The recommended structure is a management account plus separate accounts per workload and environment, governed by SCPs with centralised logging. The account boundary is the strongest isolation AWS offers: a compromised workload can never reach billing, Organizations, or SCP controls if those live in an account that runs nothing. The most privileged account does the least — no workloads in the management account, ever.',
          'New accounts should be born compliant. Control Tower\'s Account Factory provisions standardised, pre-approved accounts with baselines applied automatically — logging destinations, guardrails, encryption defaults — so teams never start from an empty, ungoverned account. Guardrails come in two flavours: preventive guardrails (SCPs) block non-compliant actions before they happen, while detective guardrails (Config rules) flag them after the fact. Prevent what you can; detect the rest.',
          'Daily security operations run from a delegated administrator account, not the management account. GuardDuty, Security Hub, and Macie are managed centrally from the delegated account, keeping the management account\'s attack surface minimal. And the audit trail lives in a dedicated log archive account: immutable, centralised CloudTrail and Config logs from every account, protected with MFA Delete so even a compromised admin cannot erase history.',
        ],
      },
      {
        heading: 'Continuous compliance and audit evidence',
        body: [
          'Compliance at scale is continuous or it is fiction. Deploy Config conformance packs — the CIS benchmark pack, for example — across the organization through a Config aggregator, and non-compliant resources plus their history become exportable evidence. Continuous evidence beats point-in-time screenshots, and it is what auditors actually want: proof that the control held every day, not just on assessment day.',
          'AWS Audit Manager turns Config and CloudTrail data into auditor-ready reports mapped to frameworks like CIS, PCI, and HIPAA. AWS Artifact supplies the other half of due diligence: on-demand third-party audit reports — SOC 2, ISO 27001 — proving AWS\'s own controls without auditing the provider yourself.',
          'Governance needs a written baseline to automate against: the required SCPs, Config rules, logging destinations, encryption defaults, and network patterns, codified and enforced rather than documented and hoped for. A tagging strategy belongs in that baseline and enforced by policy, because SCPs, Config rules, cost allocation, and finding routing all key off consistent tags — untagged resources escape governance entirely.',
          'During an incident, the architecture pays for itself: cross-account CloudTrail is queried from the log archive account with Athena or CloudTrail Lake over the centralised bucket — one query surface for every account. Findings route automatically through Security Hub custom insights and EventBridge rules, directed by account, severity, and resource tags to the owning team\'s channel. And the minimum audit trail an SCS-C02 architect should design for is explicit: organization-wide CloudTrail with log validation to a locked archive, Config recording everywhere, and at least a year of retention. You cannot investigate what you did not record.',
        ],
      },
    ],
    cheatSheet: [
      ['Account structure', 'Management account plus per-workload/environment accounts; SCPs and centralised logging.'],
      ['Management account', 'No workloads ever; minimal attack surface for billing, Organizations, SCPs.'],
      ['Account Factory', 'Standardised compliant account provisioning with baselines applied automatically.'],
      ['Preventive vs detective', 'Preventive (SCPs) block; detective (Config rules) flag after the fact.'],
      ['Delegated admin', 'Central security tooling management without daily use of the management account.'],
      ['Log archive account', 'Immutable centralised CloudTrail/Config logs; MFA Delete against tampering.'],
      ['Conformance packs', 'Deployable CIS-benchmark compliance baselines; history exports as audit evidence.'],
      ['Audit Manager', 'Continuous evidence collection mapped to CIS, PCI, HIPAA.'],
      ['Artifact', 'On-demand third-party reports (SOC 2, ISO 27001) for assurance.'],
      ['Minimum audit trail', 'Org-wide validated CloudTrail to a locked archive, Config everywhere, 1+ year retention.'],
    ],
  },
};
