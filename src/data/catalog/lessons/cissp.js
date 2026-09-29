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
};
