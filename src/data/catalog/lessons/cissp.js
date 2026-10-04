// Reading content for the CISSP capstone course (the eight ISC2 domains plus exam mindset),
// keyed by lesson (deck) id. Strings support `inline code` only. Aligned with
// src/data/academy/cissp.js.

const code = (...lines) => lines.join('\n');

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'cissp-mindset': {
    overview: [
      'The CISSP is not a technical exam dressed up as a management one; it genuinely asks you to think like a security leader advising the business. Many candidates with deep technical skills fail because they choose the answer an engineer would, not the one a risk advisor would.',
      'This lesson covers the priorities behind CISSP answers, accountability, due care and due diligence, the ISC2 Code of Ethics, cost-justified controls, defence in depth, and the exam format and experience requirements.',
    ],
    learn: [
      {
        heading: 'The priorities behind every answer',
        body: [
          'Human safety comes first, always. Life safety beats data, systems and money in every scenario, which is why emergency exits fail open.',
          'Senior management is ultimately accountable for security. Responsibility can be delegated to security teams; accountability cannot. CISSP answers favour the viewpoint of a risk advisor to the business, not a technician: pick the option that aligns security with business goals.',
          'Before choosing any control, understand the risk and the business requirements: assess, then treat. Technology is rarely the first answer. In most scenarios the best "first step" is to gather facts or consult policy and stakeholders, not to take a drastic unilateral action.',
        ],
      },
      {
        heading: 'Due care, ethics and cost',
        body: [
          'Due care is doing the right thing, acting as a prudent person would; due diligence is verifying that it is being done. Failing at due care is negligence.',
          'The ISC2 Code of Ethics has four canons, applied in order when they conflict: protect society, the common good, necessary public trust and confidence, and the infrastructure; act honourably, honestly, justly, responsibly and legally; provide diligent and competent service to principals; advance and protect the profession.',
          'A control should never cost more than the value of the asset it protects. More precisely, its annual cost should be less than the reduction in annualised loss expectancy it delivers. Defence in depth layers administrative, technical and physical controls so no single failure is fatal.',
        ],
      },
      {
        heading: 'The exam and the credential',
        body: [
          'The English CISSP exam uses computerised adaptive testing (CAT): 100 to 150 items in 3 hours, with a passing score of 700 out of 1000. Full certification needs 5 years of paid work in 2 or more of the 8 domains; a relevant degree or approved certification can waive 1 year. Pass without the experience and you become an Associate of ISC2 while you earn it.',
        ],
      },
    ],
    cheatSheet: [
      ['First priority', 'Human safety'],
      ['Accountability', 'Senior management; cannot be delegated'],
      ['Viewpoint', 'Risk advisor to the business'],
      ['Before any control', 'Understand risk and requirements'],
      ['Best first step', 'Gather facts, consult policy/stakeholders'],
      ['Due care / due diligence', 'Do the right thing / verify it is done'],
      ['Ethics canons (order)', 'Society; honourably; principals; profession'],
      ['Control cost', 'Less than the ALE reduction'],
      ['Defence in depth', 'Administrative, technical, physical layers'],
      ['Exam', 'CAT, 100–150 items, 3 h, 700/1000'],
      ['Experience', '5 years in 2+ domains (1-year waiver possible)'],
    ],
  },

  'cissp-d1': {
    overview: [
      'Domain 1 is the largest at 16% of the exam, and it frames everything else: how organisations govern security, analyse and accept risk, meet legal obligations, stay in business through disruption, and manage people.',
      'This lesson covers risk analysis and the NIST Risk Management Framework, residual risk, business continuity and MTD, intellectual property law, personnel controls, supply chain risk, ISO 27001 and STRIDE threat modelling.',
    ],
    learn: [
      {
        heading: 'Risk',
        body: [
          'Quantitative risk analysis uses monetary values (SLE, ARO, ALE); qualitative analysis uses ratings such as high, medium and low. Most organisations blend both.',
          'The NIST Risk Management Framework (SP 800-37) has seven steps: Prepare, Categorize, Select, Implement, Assess, Authorize and Monitor. Authorization is the management decision to accept the residual risk, the risk remaining after controls are applied. Someone with the authority must explicitly accept it.',
          'Threat modelling finds design flaws before they are built. Microsoft\'s STRIDE covers Spoofing, Tampering, Repudiation, Information disclosure, Denial of service and Elevation of privilege.',
        ],
      },
      {
        heading: 'Continuity',
        body: [
          'A business continuity plan (BCP) keeps critical business functions running during a disruption; the disaster recovery plan (DRP) is the IT-focused subset that restores systems. Maximum tolerable downtime (MTD) is the longest a function can be down before unacceptable damage, and the RTO must be less than or equal to the MTD.',
        ],
      },
      {
        heading: 'Law and intellectual property',
        body: [
          'A trade secret is protected by keeping it secret with reasonable measures (NDAs, access control); there is no registration, and protection lasts as long as it stays secret. A US utility patent generally lasts 20 years from filing. Copyright lasts the author\'s life plus 70 years. Trademarks can be renewed indefinitely while in use.',
        ],
      },
      {
        heading: 'People, suppliers and standards',
        body: [
          'Separation of duties splits critical tasks so no single person can commit fraud alone; collusion becomes necessary. Job rotation and mandatory vacations help detect fraud. When someone leaves, HR and IT act together, revoking access at or before notification and recovering assets.',
          'Supply chain risk management assesses and monitors vendors, including their own suppliers, using SBOMs, contract security requirements and right-to-audit clauses. ISO/IEC 27001 specifies the requirements for an information security management system (ISMS); ISO/IEC 27002 provides the control guidance.',
        ],
      },
    ],
    cheatSheet: [
      ['Quantitative vs qualitative', 'Money (ALE) vs high/medium/low'],
      ['NIST RMF steps', 'Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor'],
      ['Authorize', 'Management accepts residual risk'],
      ['Residual risk', 'What remains after controls'],
      ['BCP vs DRP', 'Business functions vs IT restoration'],
      ['MTD', 'Max tolerable downtime; RTO ≤ MTD'],
      ['Trade secret', 'Protected while kept secret'],
      ['Patent / copyright', '20 years from filing / life + 70'],
      ['Separation of duties', 'Fraud needs collusion'],
      ['ISO 27001 / 27002', 'ISMS requirements / control guidance'],
      ['STRIDE', 'Spoofing, Tampering, Repudiation, Info disclosure, DoS, EoP'],
    ],
  },

  'cissp-d1b': {
    overview: [
      'This deep dive takes Domain 1 further into the governance machinery the exam loves: what business continuity and disaster recovery plans actually contain, how recovery is tested, how controls are classified, how policies are layered, and how people themselves are controlled.',
      'This lesson covers BCP versus DRP plan contents, the Business Impact Analysis, RTO and RPO, DR test types from checklist to parallel, control types and categories, the policy-to-guideline hierarchy, and personnel security controls.',
    ],
    learn: [
      {
        heading: 'Continuity: plans and analysis',
        body: [
          'The Business Continuity Plan keeps critical business functions running during a disruption; the Disaster Recovery Plan restores IT systems. The DRP is the IT-focused subset of the wider BCP effort, and the BCP is owned by the business, not just IT.',
          'A BCP contains the Business Impact Analysis, recovery strategies, plan invocation procedures, roles and responsibilities, communications plans, and plan maintenance. A DRP contains system recovery procedures, RTO and RPO targets, backup and restore steps, and alternate site details.',
          'The Business Impact Analysis identifies critical functions and their dependencies, the maximum tolerable downtime, RTO and RPO targets, and the financial and operational impacts of disruption. The BIA drives the priorities of both the BCP and the DRP.',
          'RTO is how fast a function must be restored; RPO is how much data loss is tolerable. RTO must sit within the maximum tolerable downtime, and RPO sets how often you back up.',
        ],
      },
      {
        heading: 'Testing recovery',
        body: [
          'From least to most disruptive: checklist or read-through review, structured walkthrough (tabletop) where the team discusses the plan step by step, simulation where the team practices in a mock scenario, parallel test where recovery systems run alongside production, and full interruption where production actually fails over.',
          'Walkthroughs are cheap and discussion-based, good for finding plan gaps. Simulations add realism without touching production. Parallel tests validate the plan closely but need duplicate capacity. Full interruption is the most realistic and the riskiest, so it is done rarely and carefully.',
        ],
      },
      {
        heading: 'Controls: types and categories',
        body: [
          'Control types describe intent: preventive controls stop incidents (firewall rules), detective controls spot them in progress (IDS), corrective controls restore afterwards (backups), deterrent controls discourage the attacker (warning signs, policies), recovery controls restore operations (failover), and compensating controls substitute when the primary control is not feasible.',
          'Control categories describe where the control lives: administrative (policies, training, procedures), technical (firewalls, encryption, authentication enforced by systems), and physical (guards, locks, cameras). A single control has both a type and a category.',
          'Policies, standards, procedures, and guidelines form a hierarchy. The policy states mandatory high-level intent and needs senior management sign-off; standards give mandatory specifics; procedures are step-by-step instructions; guidelines are recommended, not mandatory.',
        ],
      },
      {
        heading: 'Personnel security',
        body: [
          'People are both an asset and a risk. Separation of duties splits critical tasks so fraud needs collusion. Mandatory vacations force someone else to perform a person\'s duties, which can surface fraud or irregularities. Job rotation reduces both fraud opportunity and single points of knowledge.',
          'These controls work as a set: separation of duties prevents unilateral fraud, mandatory vacations detect ongoing fraud, and job rotation limits how long any one person holds a sensitive position unobserved.',
        ],
      },
    ],
    cheatSheet: [
      ['BCP vs DRP', 'Business functions keep running / IT systems restored'],
      ['BCP contains', 'BIA, strategies, invocation, roles, comms, maintenance'],
      ['DRP contains', 'Recovery procedures, RTO/RPO, backups, alternate site'],
      ['BIA identifies', 'Critical functions, dependencies, MTD, RTO/RPO, impacts'],
      ['RTO / RPO', 'How fast to restore / how much data loss is OK'],
      ['Test order', 'Checklist, walkthrough, simulation, parallel, full interruption'],
      ['Control types', 'Preventive, detective, corrective, deterrent, recovery, compensating'],
      ['Control categories', 'Administrative, technical, physical'],
      ['Hierarchy', 'Policy (intent) > standard (specifics) > procedure (steps) > guideline (recommended)'],
      ['Mandatory vacations', 'Detective control against fraud'],
      ['Job rotation', 'Less fraud opportunity, no single points of knowledge'],
    ],
  },

  'cissp-d2': {
    overview: [
      'Domain 2 (10%) is about knowing what information you hold, who is responsible for it, how it is classified, how long you keep it and how you destroy it. It sounds administrative, but data that was never inventoried or never destroyed is behind many breaches.',
      'This lesson covers asset inventory, classification and roles, data remanence and sanitisation, retention, GDPR roles and pseudonymisation, scoping and tailoring baselines, and DRM.',
    ],
    learn: [
      {
        heading: 'Know it, own it, classify it',
        body: [
          'The first step in asset security is to identify and inventory assets: you cannot protect what you do not know you have.',
          'The data owner classifies data and is accountable for it; custodians implement the protections the owner specifies. US government classification, from highest: Top Secret, Secret, Confidential, plus Unclassified. Commercial schemes use levels such as confidential or proprietary, private, sensitive and public.',
          'A data retention policy keeps data only as long as legally and operationally needed. Over-retention increases the impact of a breach and the cost of e-discovery.',
        ],
      },
      {
        heading: 'Sanitisation',
        body: [
          'Data remanence is residual data left on media after deletion, which is why sanitisation matters. NIST SP 800-88 defines three levels: Clear (overwriting, suitable for reuse inside the organisation), Purge (stronger techniques that defeat laboratory recovery, suitable for reuse outside), and Destroy (physical destruction).',
          'Degaussing does not work on SSDs, because they are not magnetic. Use cryptographic erase, the vendor\'s secure erase command, or physical destruction.',
        ],
      },
      {
        heading: 'Privacy roles and techniques',
        body: [
          'Under GDPR, the controller decides the purpose and means of processing personal data; the processor acts on the controller\'s behalf. A cloud provider is typically a processor.',
          'Pseudonymisation replaces identifiers so data cannot be linked to a person without additional information held separately. Pseudonymised data is still personal data under GDPR; truly anonymised data is not.',
        ],
      },
      {
        heading: 'Baselines and DRM',
        body: [
          'Scoping selects the controls from a standard baseline (such as NIST SP 800-53) that are relevant to a system; tailoring then adjusts them to the environment. Digital rights management (DRM) protects how content is used after distribution, controlling copying, printing and forwarding.',
        ],
      },
    ],
    cheatSheet: [
      ['First step', 'Identify and inventory assets'],
      ['Owner vs custodian', 'Classifies, accountable / implements'],
      ['US classification', 'Top Secret > Secret > Confidential > Unclassified'],
      ['Data remanence', 'Residual data after deletion'],
      ['NIST 800-88', 'Clear, Purge, Destroy'],
      ['SSDs', 'No degaussing: crypto erase, secure erase, destroy'],
      ['Retention', 'Only as long as needed'],
      ['Controller vs processor', 'Decides purpose / acts on behalf'],
      ['Pseudonymised', 'Still personal data (anonymised is not)'],
      ['Scoping / tailoring', 'Select relevant controls / adjust them'],
      ['DRM', 'Controls use after distribution'],
    ],
  },

  'cissp-d2b': {
    overview: [
      'This deep dive extends Domain 2 beyond classification and sanitisation into the full life of data: the lifecycle phases protection must follow, the roles that govern data, how long data is kept and when destruction must stop, how data loss prevention works across network, endpoint and cloud, and the controls that protect data in cloud environments.',
      'This lesson covers the six data lifecycle phases, owner versus steward versus custodian, retention periods and legal holds, network, endpoint and cloud DLP, data sovereignty and residency, and cloud data controls.',
    ],
    learn: [
      {
        heading: 'The data lifecycle and its roles',
        body: [
          'The data lifecycle runs create, store, use, share, archive, destroy. Protection must follow the data through every phase: most breaches exploit the share and archive phases, not the database itself.',
          'The data owner is accountable for the data and classifies it. The data steward manages day-to-day quality and handling according to the owner\'s policy. The custodian maintains the systems that store and process the data. The owner decides, the steward oversees handling, the custodian operates.',
          'Handling requirements scale with classification: higher classifications need marking, encryption, and strict access control, while public data mainly needs integrity. The rules must be written down, trained, and enforced, or they do not exist.',
        ],
      },
      {
        heading: 'Retention and legal holds',
        body: [
          'A retention period is set by legal and regulatory requirements plus business need, whichever is longer, and the justification should be documented. Over-retention inflates breach impact and e-discovery costs; under-retention risks non-compliance.',
          'A legal hold, or litigation hold, suspends normal destruction so relevant data is preserved for litigation. Destroying data under a hold can be ruled spoliation of evidence. Holds and retention schedules extend to backups and archives, not just live data.',
        ],
      },
      {
        heading: 'Data loss prevention',
        body: [
          'Network DLP inspects data in motion at egress points such as email, web uploads, and file transfers. Endpoint DLP controls USB drives, printing, clipboard, and local storage on devices, closing the "sneakernet" exfiltration path. Cloud DLP, often delivered through a CASB, scans uploads, sharing links, and collaboration apps in SaaS.',
          'On a policy violation, DLP can block, quarantine, encrypt, or alert. New deployments should start in monitor and alert mode before enforcing blocks, so legitimate workflows are not broken on day one.',
        ],
      },
      {
        heading: 'Data in the cloud',
        body: [
          'The customer, not the provider, owns data in a SaaS application; contracts should state ownership, return, and deletion terms explicitly. In IaaS, the customer owns the data and OS layers while the provider owns the hypervisor down, so customer-managed keys (BYOK), storage encryption, and private endpoints are the customer\'s controls to apply.',
          'Data sovereignty means data is subject to the laws of the country where it is stored or processed, which drives cloud region selection for regulated data. Data residency is only about where data is stored; you can meet residency and still fail sovereignty.',
          'Data discovery and classification tools automatically scan data stores to find and label sensitive data such as PII or card numbers. You cannot apply handling rules to data you have not found, which is why discovery precedes enforcement.',
        ],
      },
    ],
    cheatSheet: [
      ['Lifecycle', 'Create, store, use, share, archive, destroy'],
      ['Owner / steward / custodian', 'Accountable, classifies / manages handling / maintains systems'],
      ['Handling', 'Scales with classification; must be written and enforced'],
      ['Retention period', 'Legal + business need, whichever longer'],
      ['Legal hold', 'Suspend destruction for litigation; covers backups'],
      ['Network DLP', 'Data in motion at egress'],
      ['Endpoint DLP', 'USB, print, clipboard, local storage'],
      ['Cloud DLP', 'CASB scanning uploads and sharing'],
      ['DLP actions', 'Block, quarantine, encrypt, alert'],
      ['SaaS ownership', 'The customer owns the data'],
      ['Sovereignty / residency', 'Whose laws apply / where stored'],
      ['IaaS data controls', 'BYOK, storage encryption, private endpoints'],
      ['Discovery first', 'Find and label before enforcing rules'],
    ],
  },

  'cissp-d3': {
    overview: [
      'Domain 3 (13%) covers how secure systems are designed and built, from formal security models to hardware roots of trust, cryptography choices and the physical protection of facilities.',
      'This lesson covers the classic security models, the trusted computing base and reference monitor, TPMs, Common Criteria, secure design principles, side-channel attacks, ECC versus RSA, and physical security including fire suppression and CPTED.',
    ],
    learn: [
      {
        heading: 'Security models',
        body: [
          'Bell-LaPadula enforces confidentiality: no read up (you cannot read above your clearance) and no write down (you cannot leak by writing to a lower level). It models military classification.',
          'Biba enforces integrity and is the inverse: no read down (do not trust less reliable data) and no write up (do not contaminate more trusted data). Clark-Wilson enforces integrity through well-formed transactions and separation of duties: users reach data only through programs, the access triple of subject, program and object.',
          'Brewer-Nash, the Chinese Wall model, prevents conflicts of interest: access changes dynamically based on what you have already accessed, so a consultant who viewed Bank A\'s data cannot then view competitor Bank B\'s.',
        ],
      },
      {
        heading: 'Trusted systems',
        body: [
          'The trusted computing base (TCB) is all the hardware, firmware and software that enforces the security policy. The reference monitor is the concept that mediates every access; it must be tamper-proof, always invoked, and small enough to verify.',
          'A TPM (Trusted Platform Module) provides a hardware root of trust for keys, measured boot and attestation; BitLocker uses it to seal disk encryption keys. Common Criteria is the international framework for evaluating security products, with assurance levels EAL1 to EAL7 and protection profiles defining requirements.',
        ],
      },
      {
        heading: 'Design principles and attacks',
        body: [
          'Secure design principles include fail securely (default to a secure state on failure), secure defaults, least privilege, zero trust and privacy by design.',
          'A side-channel attack extracts secrets from timing, power consumption or emissions rather than breaking the algorithm. Spectre and Meltdown exploited CPU speculative execution.',
          'Elliptic curve cryptography gives equal strength with much shorter keys than RSA: a 256-bit ECC key is roughly as strong as a 3072-bit RSA key.',
        ],
      },
      {
        heading: 'Physical security',
        body: [
          'For data centres, clean-agent fire suppression (such as FM-200) or pre-action sprinklers are preferred. A pre-action system fills its pipes only after detection, reducing accidental water damage.',
          'CPTED (Crime Prevention Through Environmental Design) uses lighting, sightlines and landscaping to deter crime before any lock or guard is needed.',
        ],
      },
    ],
    cheatSheet: [
      ['Bell-LaPadula', 'Confidentiality: no read up, no write down'],
      ['Biba', 'Integrity: no read down, no write up'],
      ['Clark-Wilson', 'Well-formed transactions; access triple'],
      ['Brewer-Nash', 'Chinese Wall: conflicts of interest'],
      ['TCB / reference monitor', 'All enforcing components / mediates every access'],
      ['TPM', 'Hardware root of trust, measured boot'],
      ['Common Criteria', 'EAL1–7, protection profiles'],
      ['Fail securely', 'Default to a secure state'],
      ['Side channel', 'Timing, power, emissions (Spectre, Meltdown)'],
      ['ECC vs RSA', '256-bit ECC ≈ 3072-bit RSA'],
      ['Data centre fire', 'Clean agent (FM-200) or pre-action'],
      ['CPTED', 'Environmental design deters crime'],
    ],
  },

  'cissp-d4': {
    overview: [
      'Domain 4 (13%) is secure network architecture: protecting data as it moves, isolating what should not talk, and giving users access to exactly what they need without trusting the network itself.',
      'This lesson covers IPsec modes and protocols, TLS and DNSSEC, 802.1X with EAP-TLS, segmentation and micro-segmentation, ZTNA, bastion hosts, converged networks, CDNs and IoT risk.',
    ],
    learn: [
      {
        heading: 'Protecting data in transit',
        body: [
          'IPsec operates at Layer 3. AH (Authentication Header) provides integrity and authentication only; ESP (Encapsulating Security Payload) adds confidentiality, and it is what most VPNs use. Transport mode protects the payload between two hosts; tunnel mode encapsulates the entire original packet, which is what site-to-site VPNs use. TLS is usually placed between Layers 4 and 6, depending on the model.',
          'DNSSEC signs DNS responses, providing integrity and authenticity but not confidentiality; DNS over HTTPS (DoH) and DNS over TLS (DoT) add encryption.',
        ],
      },
      {
        heading: 'Controlling access to the network',
        body: [
          'EAP-TLS, the strongest common 802.1X method, requires certificates on both the client and the server. PEAP needs only a server certificate and protects a password exchange inside a TLS tunnel.',
          'Zero Trust Network Access (ZTNA) replaces broad VPN access with per-application, identity-aware access: users reach specific applications and never land "on the network". A bastion or jump host is a single hardened, monitored entry point to a secure zone, increasingly replaced by ZTNA brokers.',
        ],
      },
      {
        heading: 'Limiting the blast radius',
        body: [
          'Network segmentation mainly limits blast radius and lateral movement, and it is also a PCI DSS scope-reduction technique. Micro-segmentation applies fine-grained policies to individual workloads, a zero trust building block.',
          'IoT devices are often weak and rarely patched, making them ideal pivot points. Put them on isolated segments with strict egress rules.',
        ],
      },
      {
        heading: 'Converged networks and CDNs',
        body: [
          'Converged networking carries storage (FCoE, iSCSI), voice (VoIP) and other traffic over standard IP and Ethernet. It is convenient, but it widens the attack surface of those services, which once ran on separate media.',
          'A CDN absorbs DDoS attacks and shields origin servers, and is often combined with a WAF at the edge.',
        ],
      },
    ],
    cheatSheet: [
      ['IPsec layer', 'Layer 3'],
      ['AH vs ESP', 'Integrity/auth only vs adds confidentiality'],
      ['Transport vs tunnel', 'Payload only vs whole packet (site-to-site)'],
      ['DNSSEC', 'Integrity + authenticity, not confidentiality'],
      ['DoH / DoT', 'Encrypted DNS'],
      ['EAP-TLS', 'Client and server certificates'],
      ['PEAP', 'Server certificate only'],
      ['ZTNA', 'Per-app, identity-aware access instead of VPN'],
      ['Segmentation', 'Limits blast radius; PCI scope'],
      ['Micro-segmentation', 'Per-workload policy'],
      ['IoT', 'Isolate, strict egress'],
      ['CDN', 'Absorbs DDoS, shields origin'],
    ],
  },

  'cissp-d5': {
    overview: [
      'Domain 5 (13%) is identity and access management: making sure the right people, and only they, reach the right resources, and that everything they do is attributable to them.',
      'This lesson covers the access control sequence, biometric error rates, Kerberos, federation, just-in-time access, access reviews, modern password guidance, session management and conditional access.',
    ],
    learn: [
      {
        heading: 'The access control sequence',
        body: [
          'Identification (claim an identity), authentication (prove it), authorisation (receive permissions) and accountability (actions are logged and attributable). Accountability depends on unique identities; shared accounts break it.',
        ],
      },
      {
        heading: 'Biometrics',
        body: [
          'A Type I error is a false rejection: a valid user is denied. A Type II error is a false acceptance: an impostor gets in, the more serious security failure. Tightening a system trades one for the other. The crossover error rate (CER) is where the two rates are equal, and a lower CER means a more accurate system.',
        ],
      },
      {
        heading: 'Kerberos and federation',
        body: [
          'Kerberos relies on a trusted third party, the Key Distribution Center (KDC), which contains the Authentication Service and the Ticket-Granting Service. Its main weaknesses are that the KDC is a single point of failure and that it needs synchronised time: clock skew beyond five minutes (the default) breaks authentication.',
          'Federated identity means trusting identities issued by another organisation\'s identity provider, implemented with SAML, OIDC or WS-Federation.',
        ],
      },
      {
        heading: 'Keeping access right-sized',
        body: [
          'Just-in-time access grants elevated rights only when needed, for a limited time, eliminating standing privilege. Periodic access reviews, where managers recertify their team\'s access, remove privilege creep and orphaned accounts.',
          'NIST SP 800-63B favours password length, screening new passwords against lists of breached passwords, and no forced periodic rotation: change a password only on evidence of compromise.',
          'Session management needs timeouts, secure unpredictable tokens, re-authentication for sensitive actions, and invalidation on logout and password change. Risk-based (conditional) access adjusts requirements by context such as device, location and risk score, for example requiring MFA from unknown devices and blocking impossible travel.',
        ],
      },
    ],
    cheatSheet: [
      ['Sequence', 'Identify, authenticate, authorise, account'],
      ['Type I error', 'False rejection'],
      ['Type II error', 'False acceptance (worse)'],
      ['CER', 'FRR = FAR; lower is better'],
      ['Kerberos KDC', 'AS + TGS; single point of failure'],
      ['Clock skew', '> 5 minutes breaks Kerberos'],
      ['Federation', 'Trust another IdP: SAML, OIDC, WS-Fed'],
      ['JIT access', 'Temporary elevation, no standing privilege'],
      ['Access reviews', 'Remove creep and orphans'],
      ['NIST 800-63B', 'Length, breach screening, no forced rotation'],
      ['Conditional access', 'Device, location, risk decide requirements'],
    ],
  },

  'cissp-d6': {
    overview: [
      'Domain 6 (12%) asks how you know your controls actually work. Assessment and testing range from automated scans to independent audits, and their results must reach leadership in terms the business understands.',
      'This lesson covers vulnerability assessments versus penetration tests, audit types and SOC reports, monitoring and testing techniques, breach and attack simulation, security metrics and protecting audit logs.',
    ],
    learn: [
      {
        heading: 'Assessments and audits',
        body: [
          'A vulnerability assessment finds and ranks weaknesses; a penetration test actively exploits them to prove impact. Both need authorisation.',
          'Internal audits are performed by the organisation\'s own staff; external audits are performed for external parties such as regulators or customers; third-party audits are performed by an independent firm and carry the most independence.',
          'SOC 1 reports cover controls relevant to financial reporting. SOC 2 reports cover security and the other Trust Services Criteria in detail, for restricted distribution. SOC 3 is a public summary.',
        ],
      },
      {
        heading: 'Testing techniques',
        body: [
          'Synthetic transaction monitoring runs scripted, simulated user activity to test availability and performance; real user monitoring (RUM) observes actual users. Fuzz testing feeds malformed or random input to find crashes: mutation fuzzing alters valid input, generation fuzzing builds input from a specification. Misuse case testing examines how an attacker might abuse legitimate functionality.',
          'Code coverage measures how much code the tests exercised; interface testing checks interactions between components, including APIs, user interfaces and physical interfaces. A regression test confirms a change did not break existing functionality; automate it in CI.',
          'Breach and attack simulation (BAS) continuously and safely emulates attacks to validate that controls work, complementing periodic penetration tests.',
        ],
      },
      {
        heading: 'Metrics and evidence',
        body: [
          'KPIs (key performance indicators) report past results; KRIs (key risk indicators) give early warning of rising risk. Report both to leadership in business terms.',
          'Protect audit logs, because attackers alter or delete them to hide activity. Centralise them, restrict access, and use write-once storage or integrity checks.',
        ],
      },
    ],
    cheatSheet: [
      ['Vuln assessment vs pentest', 'Find and rank vs exploit to prove impact'],
      ['Internal / external / third-party audit', 'Own staff / for outside parties / independent firm'],
      ['SOC 1 / 2 / 3', 'Financial / Trust Services detail / public summary'],
      ['Synthetic vs RUM', 'Scripted users vs real users'],
      ['Fuzzing', 'Mutation (alter) vs generation (from spec)'],
      ['Misuse case', 'How an attacker abuses features'],
      ['Code coverage vs interface testing', 'Code exercised vs component interactions'],
      ['BAS', 'Continuous safe attack emulation'],
      ['KPI vs KRI', 'Past performance vs early risk warning'],
      ['Audit logs', 'Centralise, restrict, write-once'],
      ['Regression test', 'Change broke nothing; automate in CI'],
    ],
  },

  'cissp-d7': {
    overview: [
      'Domain 7 (13%) is security operations: running investigations, handling incidents, patching, backing up and recovering, and keeping people safe. It is where policy meets the 3 a.m. phone call.',
      'This lesson covers the incident management process, evidence rules and investigation types, entrapment versus enticement, backup strategies, DR test types, patch management, SIEM correlation, egress monitoring and personnel safety.',
    ],
    learn: [
      {
        heading: 'Incident management',
        body: [
          'The ISC2 incident management process runs detection, response (containment), mitigation, reporting, recovery, remediation, and lessons learned. SIEM correlation rules drive detection by linking related events across sources into one meaningful alert, such as repeated failed logons followed by a success from a new country. Egress monitoring (DLP, proxy logs, NetFlow) detects data leaving the organisation.',
        ],
      },
      {
        heading: 'Evidence and investigations',
        body: [
          'The best evidence rule means courts prefer original evidence over copies; forensic images with verified hashes are accepted as duplicates. Hearsay is second-hand information not from direct knowledge, although business records made in the normal course of business can be an exception.',
          'Investigations are administrative, criminal, civil or regulatory. Criminal cases require proof beyond reasonable doubt; civil cases need a preponderance of evidence.',
          'Entrapment induces someone to commit a crime they would not otherwise have committed, which is illegal. Enticement lures someone already intent on the crime, which is legal. A properly used honeypot is enticement.',
        ],
      },
      {
        heading: 'Backups, DR tests and patching',
        body: [
          'An incremental backup captures changes since the last backup of any kind: fast to back up, slow to restore (the full backup plus every incremental since). A differential backup captures changes since the last full backup: slower to back up, faster to restore (the full backup plus the latest differential).',
          'DR tests from least to most disruptive: read-through (checklist), walk-through (tabletop), simulation, parallel, and full interruption, where production actually fails over. Do full interruption tests rarely and carefully.',
          'Patch management follows evaluate, test, approve, deploy, verify. Emergency patches still go through an expedited change process.',
        ],
      },
      {
        heading: 'People first',
        body: [
          'In an emergency, evacuate people first; systems and data are secondary. Doors on escape routes fail safe (unlocked) for life safety.',
        ],
      },
    ],
    cheatSheet: [
      ['ISC2 incident steps', 'Detect, respond, mitigate, report, recover, remediate, lessons'],
      ['Best evidence rule', 'Originals preferred; hashed images accepted'],
      ['Hearsay', 'Second-hand; business records exception'],
      ['Criminal vs civil', 'Beyond reasonable doubt vs preponderance'],
      ['Entrapment vs enticement', 'Induce (illegal) vs lure the intent (legal)'],
      ['Incremental', 'Fast backup, slow restore'],
      ['Differential', 'Slower backup, fast restore'],
      ['DR tests', 'Read-through → walk-through → simulation → parallel → full interruption'],
      ['Patch process', 'Evaluate, test, approve, deploy, verify'],
      ['SIEM correlation', 'Related events → one alert'],
      ['Emergency', 'People first; doors fail safe'],
    ],
  },

  'cissp-d8': {
    overview: [
      'Domain 8 (10%) is software development security. Most vulnerabilities are written, not installed, so the cheapest place to fix them is in requirements and design, long before code reaches production.',
      'This lesson covers security across the SDLC, maturity models, DevSecOps and software composition analysis, API security, database integrity concepts, sandboxing, AI coding assistants, and assessing acquired software.',
    ],
    learn: [
      {
        heading: 'Security in the SDLC',
        body: [
          'Integrate security from the very start, in requirements and design; flaws fixed later cost far more ("shift left"). DevSecOps builds automated security into DevOps pipelines: SAST, software composition analysis (SCA), DAST, infrastructure-as-code scanning and secrets scanning run in CI/CD.',
          'SCA identifies third-party components and their known vulnerabilities, producing or consuming SBOMs. AI coding assistants add the risk of insecure or licence-problematic code being accepted without review, so keep human review, SAST and SCA on generated code too.',
        ],
      },
      {
        heading: 'Measuring maturity',
        body: [
          'OWASP SAMM (open) and BSIMM (descriptive, based on what real firms do) measure software security programme maturity. CMMI rates process maturity from 1 to 5: Initial, Managed, Defined, Quantitatively Managed, Optimising.',
        ],
      },
      {
        heading: 'Concepts the exam loves',
        body: [
          'Polymorphism is the same interface with different behaviour (an object-oriented concept). Polyinstantiation stores multiple versions of the same data at different classification levels, preventing inference attacks in mandatory access control databases.',
          'An ACID database transaction guarantees Atomicity, Consistency, Isolation and Durability, preserving transaction integrity. A sandbox is a restricted environment that limits what code can do; browsers sandbox tabs, and mobile apps are sandboxed from each other.',
          'Broken object-level authorisation (BOLA) is number one in the OWASP API Security Top 10: check that the caller owns every object it requests.',
        ],
      },
      {
        heading: 'Acquired software',
        body: [
          'Assess third-party software against your security requirements, the vendor\'s development practices and contractual obligations. For SaaS, review SOC 2 reports and data-handling terms. Code escrow has a third party hold the source code in case the vendor fails, protecting buyers of critical commercial software.',
        ],
      },
    ],
    examples: [
      {
        title: 'A DevSecOps pipeline, stage by stage',
        code: code(
          'commit      -> secrets scanning (block pushed keys)',
          'build       -> SAST on source, SCA on dependencies (SBOM)',
          'package     -> container image scan, IaC misconfiguration scan',
          'staging     -> DAST against the running app',
          'release     -> signed artefact, change record',
          'production  -> runtime monitoring, feedback into requirements',
        ),
        explanation: 'Each stage catches a different class of flaw; failing a gate stops the release, just like a failing unit test.',
      },
    ],
    cheatSheet: [
      ['Shift left', 'Security from requirements and design'],
      ['DevSecOps', 'SAST, SCA, DAST, IaC and secrets scanning in CI/CD'],
      ['SCA', 'Third-party components + CVEs (SBOM)'],
      ['SAMM / BSIMM', 'Open maturity model / descriptive real-world'],
      ['CMMI 1–5', 'Initial, Managed, Defined, Quantitatively Managed, Optimising'],
      ['Polyinstantiation', 'Versions per clearance; stops inference'],
      ['ACID', 'Atomicity, Consistency, Isolation, Durability'],
      ['BOLA', 'OWASP API #1: check object ownership'],
      ['Code escrow', 'Third party holds source if vendor fails'],
      ['AI coding assistants', 'Review, SAST, SCA on generated code'],
      ['Acquired software', 'Requirements, vendor practices, SOC 2'],
    ],
  },
  'cissp-cap-d1': {
    overview: [
      'Domain 1 scenarios test whether you think like a risk advisor, not a technician. The exam rewards the answer that follows the risk process: assess, choose a treatment, document, and get the right owner to accept what remains.',
      'This capstone drills the patterns: compensating controls when remediation is impossible, closing BIA-to-plan gaps through management, assessing before acting on new regulations, and routing policy exceptions through the formal process.',
    ],
    learn: [
      {
        heading: 'When you cannot fix it, compensate',
        body: [
          'Remediation is not always available: no patch exists, or the business cannot tolerate downtime. The CISSP answer is never "do nothing" and rarely "pull the plug unilaterally" — it is a compensating control that reduces likelihood or impact while the risk is formally tracked.',
          'Compensating controls must be documented, time-bound where possible, and tied to risk acceptance by the appropriate owner. "Temporary" controls without an owner and a review date become permanent shadow controls.',
        ],
      },
      {
        heading: 'Assess first, exceptions through process',
        body: [
          'New regulation, new threat, new business demand — the first step is almost always to assess the gap between what is required and what exists. Action without assessment is guessing, and the exam punishes guessing.',
          'Policy exceptions are legitimate but only through the exception process: documented business justification, risk analysis, compensating controls, expiry date, and sign-off by the risk owner. Seniority is not a control.',
        ],
      },
    ],
    cheatSheet: [
      ['No patch + cannot go offline', 'Compensating control + documented risk acceptance'],
      ['BIA vs plan gap', 'Report to management; strategy review'],
      ['New regulation', 'Gap analysis first, then roadmap'],
      ['Policy exception', 'Formal process: justification, risk sign-off, expiry'],
      ['Risk treatment', 'Avoid, transfer, mitigate, accept — in that thinking order'],
    ],
  },
  'cissp-cap-d2': {
    overview: [
      'Domain 2 scenarios revolve around one truth: data outlives every other asset in the story. The exam tests whether you protect the data through its whole lifecycle — including the awkward moments of departure, testing, and litigation.',
      'This capstone drills data remanence on departure, why production data never belongs in test, and how a legal hold freezes the retention schedule.',
    ],
    learn: [
      {
        heading: 'Departures and remanence',
        body: [
          'When someone with sensitive access leaves, containment comes before cleanup: revoke access immediately so nothing more can leave, then handle the hardware per the media-handling policy — sanitise, destroy, or reassign based on classification.',
          'A quick format is not sanitisation. Match the method to the classification: cryptographic erase or destruction for the highest tiers, documented and witnessed.',
        ],
      },
      {
        heading: 'Test data and legal holds',
        body: [
          'Production PII in a test environment is a breach waiting to happen: test systems rarely carry production-grade access controls, logging, or monitoring. The answer is always masked, anonymised, or synthetic data.',
          'A litigation hold suspends the normal retention and destruction schedule for the affected data. Destroying held data is spoliation. When in doubt, preserve and ask legal.',
        ],
      },
    ],
    cheatSheet: [
      ['Employee departure', 'Revoke access first, then sanitise hardware'],
      ['Quick format', 'Not sanitisation for sensitive media'],
      ['Production data in test', 'Never — use masked or synthetic data'],
      ['Litigation hold', 'Suspends retention/destruction; preserve'],
      ['Spoliation', 'Destroying held data — serious legal exposure'],
    ],
  },
  'cissp-cap-d3': {
    overview: [
      'Domain 3 scenarios test architectural principles under pressure: what the system does when it fails, how controls layer, and where the keys live. The exam loves designs that look reasonable until one principle is violated.',
      'This capstone drills fail-secure defaults, defence in depth as layering of different functions, and the separation of keys from the data they protect.',
    ],
    learn: [
      {
        heading: 'Fail secure, layer defences',
        body: [
          'Fail-secure (fail closed) means a failure denies access rather than granting it. Any design where a bug becomes a vulnerability has this backwards. Deny by default is the quiet version of the same principle.',
          'Defence in depth is not two firewalls — it is different control functions layered so one miss is another\'s catch: a firewall for access control plus an IPS for threat prevention, for example.',
        ],
      },
      {
        heading: 'Keys live apart from data',
        body: [
          'Whoever holds both the ciphertext and the key holds the plaintext. Keys belong in a dedicated security domain — a KMS or HSM with split administrative duties — never next to the data, in source code, or in the same admin\'s pocket.',
          'Key management questions on the exam almost always reduce to separation and lifecycle: generate securely, store separately, rotate on schedule and on compromise, destroy when retired.',
        ],
      },
    ],
    cheatSheet: [
      ['Fail-secure', 'Failures deny access (fail closed)'],
      ['Defence in depth', 'Layer different control functions, not duplicates'],
      ['Keys + data together', 'One breach yields both — separate security domains'],
      ['KMS / HSM', 'Dedicated key storage with split duties'],
      ['Deny by default', 'The quiet version of fail-secure'],
    ],
  },
  'cissp-cap-d4': {
    overview: [
      'Domain 4 scenarios are about moving bits safely across untrusted space and keeping hostile traffic away from trusted assets. The exam tests whether you reach for the right tool: encryption in transit, inspection that cannot be evaded, and segmentation before anything else.',
      'This capstone drills site-to-site VPNs, defeating fragmentation evasion, and segmenting untrusted networks first.',
    ],
    learn: [
      {
        heading: 'Encrypt the path, inspect honestly',
        body: [
          'Traffic crossing the internet between sites gets a site-to-site IPsec VPN: confidentiality and integrity over untrusted networks. This is the standard answer; exotic alternatives are distractors.',
          'Attackers fragment packets to slip past signature matching. The defence is normalisation: reassemble at the IPS before inspection, so the analyser sees what the endpoint will see.',
        ],
      },
      {
        heading: 'Segment the untrusted first',
        body: [
          'Guest, IoT, and partner networks are untrusted by definition. The first design step is always segmentation — separate VLANs and firewall zones — before tuning any monitoring or access rules.',
          'Segmentation contains lateral movement. Everything else (monitoring, NAC, passwords) is secondary to not letting the hostile network touch the trusted one.',
        ],
      },
    ],
    cheatSheet: [
      ['Sites across the internet', 'Site-to-site IPsec VPN'],
      ['Fragmentation evasion', 'Reassemble at the IPS before inspection'],
      ['Guest / untrusted networks', 'Segment first (VLANs + firewall zones)'],
      ['Lateral movement', 'Contained by segmentation'],
      ['ping and ports', 'ICMP has no ports — use a port test, not ping'],
    ],
  },
  'cissp-cap-d5': {
    overview: [
      'Domain 5 scenarios test the identity lifecycle under stress: proving who someone is without sharing secrets, bounding the damage when a session is stolen, and treating an exposed credential as compromised the instant it leaks.',
      'This capstone drills federation for SSO, session controls as the complement to MFA, and immediate rotation of exposed secrets.',
    ],
    learn: [
      {
        heading: 'Federate, do not share',
        body: [
          'When users need access to a third-party service, federate: SAML for enterprise SSO, OIDC for modern web apps. The identity provider authenticates; the service trusts the assertion. Passwords never cross the boundary.',
          'Shared accounts destroy accountability. Every exam answer that proposes sharing credentials — service or human — is wrong.',
        ],
      },
      {
        heading: 'Sessions are the second half of authentication',
        body: [
          'MFA proves identity at login; it says nothing about the session afterwards. Short timeouts, idle disconnects, and step-up re-authentication for privileged actions bound the blast radius of a stolen session.',
          'An exposed secret is a compromised secret. Revoke and rotate first, investigate second — the order matters because every minute of delay is attacker opportunity.',
        ],
      },
    ],
    cheatSheet: [
      ['SSO without sharing passwords', 'SAML / OIDC federation'],
      ['Shared accounts', 'Destroy accountability — never the answer'],
      ['Session hijack despite MFA', 'Short timeouts + step-up re-auth'],
      ['Exposed API key', 'Revoke and rotate FIRST, then investigate'],
      ['MFA scope', 'Proves identity at login; sessions need their own controls'],
    ],
  },
  'cissp-cap-d6': {
    overview: [
      'Domain 6 scenarios test whether you choose the right assessment for the question asked — and whether you can tell a finding from a risk. The exam punishes both testing the wrong thing and treating scanner output as a to-do list.',
      'This capstone drills matching test types to targets, prioritising by risk rather than count, and demanding evidence for vendor claims.',
    ],
    learn: [
      {
        heading: 'Right test, right target',
        body: [
          'Penetration tests simulate attackers against running systems; SAST examines source code; DAST automates black-box checks of running apps; vulnerability scans enumerate known issues. "Best assurance against the running application" points at pentesting.',
          'No single test covers everything. Mature programmes layer them: SAST in the pipeline, DAST in staging, pentests for high-risk releases, scans for continuous hygiene.',
        ],
      },
      {
        heading: 'Findings are not risks',
        body: [
          'Five hundred scanner findings are a starting point, not a plan. Prioritise by risk: exploitability times business impact. An internet-facing critical system outranks an isolated lab box regardless of raw severity.',
          'Vendor claims are marketing until verified. SOC 2, ISO 27001, pentest letters — read the actual report: scope, period, methodology, and qualifications. Third-party risk management runs on evidence.',
        ],
      },
    ],
    cheatSheet: [
      ['Running app assurance', 'Penetration test'],
      ['Source code flaws', 'SAST (white box)'],
      ['500 scan findings', 'Prioritise by risk, not count'],
      ['Vendor "compliant"', 'Read the actual report: scope, period, qualifications'],
      ['Test layering', 'SAST + DAST + pentest + scans, each in its place'],
    ],
  },
  'cissp-cap-d7': {
    overview: [
      'Domain 7 scenarios happen at the worst possible time — and the exam checks whether your instincts follow the incident-response order instead of panic. Contain first, think second, learn always.',
      'This capstone drills the contain → eradicate → recover sequence, alert triage by fidelity, and the lessons-learned review that prevents recurrence.',
    ],
    learn: [
      {
        heading: 'Contain before you cure',
        body: [
          'Active encryption, active exfiltration, active lateral movement: isolate the affected systems from the network first. Every minute of spread multiplies the recovery bill. Forensics, backups, and blame all wait for containment.',
          'Eradication before recovery, or you restore the attacker along with the data. Verify the root cause is gone before bringing systems back.',
        ],
      },
      {
        heading: 'Triage by fidelity, close with learning',
        body: [
          'Not every alert is an incident. Triage by fidelity and corroboration: a single failed login is noise; the same IP failing five hundred times is a case. Tune the noise, chase the signal.',
          'The most important step is the last one: the lessons-learned review. Update playbooks, controls, and monitoring from what the incident taught, or it will recur on schedule.',
        ],
      },
    ],
    cheatSheet: [
      ['Active attack RIGHT NOW', 'Isolate first (contain → eradicate → recover)'],
      ['Single failed login', 'Noise — triage by fidelity and corroboration'],
      ['Before closing an incident', 'Lessons-learned review; update playbooks'],
      ['Eradication before recovery', 'Or you restore the attacker too'],
      ['MTTR gaming', 'Speed of closure < quality of learning'],
    ],
  },
  'cissp-cap-d8': {
    overview: [
      'Domain 8 scenarios test whether security is built in or bolted on: what happens before a dependency is adopted, what happens the instant a secret leaks, and where in the lifecycle a bug is cheapest to kill.',
      'This capstone drills supply-chain due diligence, secret-spill response, and the economics of shift-left.',
    ],
    learn: [
      {
        heading: 'Trust, but verify the supply chain',
        body: [
          'Every dependency is code you did not write running with your privileges. Before adopting: licence compatibility, maintenance health (commits, maintainers, issue response), and known vulnerabilities via SCA. Popularity is not diligence.',
          'Generate and keep an SBOM so that when the next Log4Shell lands, you know in minutes whether you are exposed instead of discovering it in weeks.',
        ],
      },
      {
        heading: 'Secrets spill: revoke first, shift left always',
        body: [
          'A secret in version control is compromised the moment it is pushed — repositories are copied, backed up, and mirrored. Revoke and rotate immediately, move to a vault, and add pre-commit scanning so it cannot recur.',
          'Bugs are cheapest where they are born: threat modelling in design beats a pentest finding, which beats an emergency production patch. Shift-left is economics, not ideology.',
        ],
      },
    ],
    cheatSheet: [
      ['New dependency', 'Licence + maintenance + CVEs (SCA) first'],
      ['Secret committed', 'Revoke NOW, vault, pre-commit scanning'],
      ['Cheapest bug fix', 'Requirements/design — shift-left'],
      ['SBOM', 'Know your exposure when the next Log4Shell lands'],
      ['Popularity', 'Not a security control'],
    ],
  },
};
