// Reading content for the Security Fundamentals course (CompTIA Security+ SY0-701), keyed by
// lesson (deck) id. Strings support `inline code` only. Aligned with src/data/academy/security.js.

const code = (...lines) => lines.join('\n');

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'sec-concepts': {
    overview: [
      'Every security decision, from buying a firewall to writing a password policy, traces back to a handful of core ideas. Learn them precisely and the rest of Security+ becomes a matter of applying them.',
      'This lesson covers the CIA triad and non-repudiation, AAA, how controls are categorised and typed, zero trust, gap analysis, deception technology and why change management is a security control.',
    ],
    learn: [
      {
        heading: 'CIA, non-repudiation and AAA',
        body: [
          'Confidentiality keeps data from unauthorised eyes; encryption is its main tool. Integrity ensures data has not been altered; hashing detects change, because a modified file produces a different hash. Availability keeps systems and data usable when needed, through redundancy, backups and resilience.',
          'Non-repudiation means a sender cannot credibly deny having sent something. Digital signatures provide it, because only the holder of the private key could have produced the signature.',
          'AAA is Authentication (prove who you are), Authorization (decide what you may do) and Accounting (record what you did). Accounting logs are what make investigations and audits possible.',
        ],
      },
      {
        heading: 'Control categories and types',
        body: [
          'SY0-701 groups controls into four categories by how they are implemented: technical (firewalls, encryption), managerial (policies, risk assessments), operational (guard rotations, awareness training, carried out by people) and physical (locks, fences).',
          'Separately, each control has a type describing what it does: preventive (stops an event), deterrent (discourages it), detective (identifies it; a security camera is primarily detective), corrective (fixes things afterwards), compensating (an alternative when the primary control is not feasible) and directive (tells people what to do, such as a policy).',
          'A classic compensating control: a legacy system that cannot be patched is isolated on its own segment with tight rules, reducing the risk the missing patch would have addressed.',
        ],
      },
      {
        heading: 'Zero trust',
        body: [
          'Zero trust drops the idea of a trusted internal network: never trust, always verify, for every request, based on identity, device posture and context. Being on the corporate LAN grants nothing by itself.',
          'The model has a control plane, where the policy engine decides and the policy administrator issues the decision, and a data plane, where the policy enforcement point allows or blocks the actual connection between the subject and the resource.',
        ],
      },
      {
        heading: 'Gap analysis, deception and change management',
        body: [
          'A gap analysis compares your current security posture with a desired standard, often a framework such as NIST CSF or ISO 27001, and turns the differences into a roadmap.',
          'A honeypot is a decoy system that lures attackers so you can observe and detect them; honeynets, honeyfiles and honeytokens apply the same idea to networks, documents and credentials. Legitimate users should never touch them, so any interaction is a high-confidence alert.',
          'Change management is a security control because unreviewed changes cause outages and open vulnerabilities. A good change record includes approval, impact analysis, test results and a backout plan.',
        ],
      },
    ],
    cheatSheet: [
      ['Confidentiality / Integrity / Availability', 'Encryption / hashing / redundancy'],
      ['Non-repudiation', 'Cannot deny sending: digital signatures'],
      ['AAA', 'Authentication, Authorization, Accounting'],
      ['Categories', 'Technical, managerial, operational, physical'],
      ['Types', 'Preventive, deterrent, detective, corrective, compensating, directive'],
      ['Camera', 'Detective (also deterrent)'],
      ['Compensating control', 'Alternative when the primary is not feasible'],
      ['Zero trust', 'Never trust, always verify; policy engine + enforcement point'],
      ['Gap analysis', 'Current posture vs a target standard'],
      ['Honeypot', 'Decoy: any interaction is suspicious'],
    ],
  },

  'sec-threats': {
    overview: [
      'Defences only make sense against a real adversary. Knowing who attacks, why, and how they usually get in (overwhelmingly through people) tells you where to spend effort.',
      'This lesson covers threat actors and their motives, shadow IT, the family of phishing and social engineering attacks, physical tricks like tailgating, and the idea of an attack surface.',
    ],
    learn: [
      {
        heading: 'Threat actors',
        body: [
          'Nation-state actors have the most resources and persistence and are often behind advanced persistent threats (APTs): long, quiet campaigns for espionage or disruption. Organised crime is motivated by money (ransomware, fraud). Hacktivists are motivated by ideology or a cause, favouring defacements, leaks and DDoS. Insiders already have access, which makes them dangerous whether malicious or careless. Unskilled attackers use tools others wrote.',
          'Shadow IT (systems and apps used without IT approval) is not an attacker, but it creates unmanaged risk: data in unapproved cloud services, unpatched software, no logging.',
        ],
      },
      {
        heading: 'Phishing and its variants',
        body: [
          'Phishing is a fraudulent message that tricks the recipient into acting: clicking a link, opening an attachment, entering credentials. Spear phishing targets specific individuals with researched details; whaling targets executives. Vishing is voice phishing over the phone, and smishing uses SMS.',
          'Business email compromise (BEC) uses a hijacked or spoofed business email account to request payments or changes to bank details. The defence is procedural: verify any payment change out of band, by calling a known number.',
          'Typosquatting (URL hijacking) registers look-alike domains such as `examp1e.com` for phishing and malware. A watering hole attack compromises a website a target group frequently visits, reaching a whole community rather than one person.',
        ],
      },
      {
        heading: 'Pretexting and physical social engineering',
        body: [
          'Pretexting invents a believable scenario to extract information or access, such as a caller posing as IT support who needs your password to "fix your account".',
          'Tailgating (piggybacking) follows an authorised person through a secure door. Access control vestibules (mantraps), badge policies and training reduce it.',
          'The most effective defence against social engineering is security awareness training combined with verification procedures. Technical filters help, but people are the target.',
        ],
      },
      {
        heading: 'Attack surface',
        body: [
          'The attack surface is every point where an attacker could try to get in: exposed services, open ports, user accounts, APIs, third-party integrations, and the people themselves. Reduce it by removing unused services, ports and accounts, and by knowing what you actually run.',
        ],
      },
    ],
    cheatSheet: [
      ['Nation-state', 'Most resources; APTs'],
      ['Hacktivist', 'Ideology-driven'],
      ['Shadow IT', 'Unapproved systems: unmanaged risk'],
      ['Spear phishing / whaling', 'Targeted individuals / executives'],
      ['Vishing / smishing', 'Voice / SMS phishing'],
      ['Pretexting', 'Invented scenario to extract info'],
      ['Watering hole', 'Compromise a site the group visits'],
      ['Typosquatting', 'Look-alike domains'],
      ['BEC', 'Fake payment requests; verify out of band'],
      ['Tailgating', 'Following through a secure door'],
      ['Attack surface', 'All entry points; shrink it'],
    ],
  },

  'sec-malware': {
    overview: [
      'Malware is how most attacks turn access into damage. Recognising the families and the signs they leave, and knowing how credentials get abused at scale, is the daily work of a security analyst.',
      'This lesson covers worms, viruses, Trojans, ransomware, rootkits, logic bombs, fileless malware and botnets; credential stuffing and password spraying; indicators of compromise; and supply chain attacks.',
    ],
    learn: [
      {
        heading: 'Malware families',
        body: [
          'A worm self-replicates across networks without user action, which is why worms spread explosively. A virus needs a host file and a user action to spread. A Trojan disguises itself as legitimate software; remote access Trojans (RATs) give the attacker control of the machine.',
          'Ransomware encrypts files and demands payment. Offline or immutable, tested backups are the key recovery control. A rootkit hides deep in the operating system to conceal itself and other malware; kernel rootkits can evade normal tools, so reimaging is often the safest fix. A logic bomb is code that triggers on a condition or date, often planted by an insider.',
          'Fileless malware runs in memory using legitimate tools such as PowerShell, leaving few files on disk for antivirus to find. EDR behaviour monitoring catches what file scanning misses.',
          'A botnet is a network of compromised machines under an attacker\'s command via command-and-control (C2) servers, used for DDoS, spam and credential stuffing.',
        ],
      },
      {
        heading: 'Attacks on credentials',
        body: [
          'Credential stuffing tries username and password pairs leaked from one site against other sites. It works because people reuse passwords; MFA stops most of it.',
          'Password spraying tries a few common passwords against many accounts, staying under lockout thresholds. You detect it by failures spread across many accounts from the same source, rather than many failures on one account.',
        ],
      },
      {
        heading: 'Indicators of compromise',
        body: [
          'An indicator of compromise (IoC) is evidence that a system may have been breached: known-bad file hashes, connections to known C2 IP addresses or domains, unusual account lockouts, unexpected new admin accounts, or impossible travel.',
          'Impossible travel means logins for one account from places too far apart to travel between in the time elapsed, say London and then Singapore twenty minutes later. It is a key identity threat detection signal of a stolen credential or session.',
        ],
      },
      {
        heading: 'Supply chain attacks',
        body: [
          'A supply chain attack compromises a vendor or component to reach its customers. SolarWinds (2020) shipped a backdoored update to thousands of organisations; the xz Utils backdoor (2024) was slipped into a widely used open-source library by a patient contributor. Defences include vendor risk management, software bills of materials and verifying what you install.',
        ],
      },
    ],
    cheatSheet: [
      ['Worm', 'Self-replicates, no user action'],
      ['Virus', 'Needs a host file and user action'],
      ['Trojan / RAT', 'Disguised software / remote control'],
      ['Ransomware', 'Encrypts for payment; offline backups'],
      ['Rootkit', 'Hides in the OS; reimage'],
      ['Logic bomb', 'Triggered by condition or date'],
      ['Fileless', 'In-memory, uses PowerShell; EDR'],
      ['Botnet', 'Compromised machines via C2'],
      ['Credential stuffing', 'Leaked pairs reused; MFA stops it'],
      ['Password spraying', 'Few passwords, many accounts'],
      ['Impossible travel', 'Logins too far apart too fast'],
      ['Supply chain', 'SolarWinds 2020, xz Utils 2024'],
    ],
  },

  'sec-crypto': {
    overview: [
      'Cryptography underpins nearly every other control: HTTPS, VPNs, disk encryption, password storage, code signing. You do not need the maths, but you must know which tool does which job and which keys go where.',
      'This lesson covers symmetric and asymmetric encryption, digital signatures, hashing, salts and key stretching, certificates and PKI, perfect forward secrecy and post-quantum cryptography.',
    ],
    learn: [
      {
        heading: 'Symmetric and asymmetric encryption',
        body: [
          'Symmetric encryption uses one shared key to encrypt and decrypt. It is fast, and AES (AES-256 in particular) is the standard; DES and 3DES are deprecated. The hard part is distributing the key safely.',
          'Asymmetric encryption uses a key pair: a public key you can share with anyone and a private key you never share. RSA and elliptic curve cryptography (ECC) are the common families. Asymmetric crypto is slower, so it is used for key exchange and signatures, while bulk data is encrypted symmetrically. TLS does exactly this.',
        ],
      },
      {
        heading: 'Which key for which job',
        body: [
          'To send someone a confidential message, encrypt with the recipient\'s public key: only their private key can decrypt it.',
          'To sign, you use your own private key. Anyone can verify the signature with your public key, which proves integrity (it was not changed), authentication (it came from you) and non-repudiation (you cannot deny it).',
        ],
      },
      {
        heading: 'Hashing and password storage',
        body: [
          'A hash is a one-way fingerprint of data. MD5 is unsuitable for security because practical collisions exist (two different inputs with the same hash); use SHA-256 or SHA-3.',
          'For passwords, add a salt, random data stored with each hash so identical passwords hash differently, which defeats precomputed rainbow tables. Add key stretching too, making each hash deliberately slow with PBKDF2, bcrypt or Argon2, so brute-forcing a stolen database becomes impractical.',
        ],
      },
      {
        heading: 'Certificates and PKI',
        body: [
          'A digital certificate binds a public key to an identity, signed by a Certificate Authority (CA). Trust flows along a chain from a root CA, through intermediate CAs, to the leaf certificate a server presents.',
          'To get a certificate you generate a key pair and send the CA a certificate signing request (CSR) containing your public key and subject details; the private key never leaves you. Revocation is checked quickly with OCSP, often via OCSP stapling where the server attaches a fresh response; CRLs are the older list-based method.',
        ],
      },
      {
        heading: 'Forward secrecy and the quantum future',
        body: [
          'Perfect forward secrecy uses ephemeral session keys (DHE or ECDHE key exchange), so a server\'s long-term private key stolen later cannot decrypt past recorded sessions. TLS 1.3 makes it mandatory.',
          'Post-quantum cryptography means algorithms designed to resist attacks by future quantum computers. NIST standardised ML-KEM (FIPS 203) for key establishment and ML-DSA (FIPS 204) for signatures in 2024.',
        ],
      },
    ],
    examples: [
      {
        title: 'Hash a file and generate a key and CSR (OpenSSL)',
        code: code(
          'sha256sum installer.iso                          # compare with the vendor\'s published hash',
          '',
          'openssl req -new -newkey rsa:3072 -nodes \\',
          '  -keyout server.key -out server.csr \\',
          '  -subj "/CN=www.example.com"',
          '# send server.csr to the CA; server.key never leaves this machine',
        ),
        explanation: 'The CSR carries only the public key and subject; the CA returns a signed certificate for it.',
      },
      {
        title: 'Inspect a live certificate chain',
        code: code('openssl s_client -connect example.com:443 -servername example.com -showcerts </dev/null'),
        explanation: 'Shows the leaf and intermediate certificates the server sends and whether the chain verifies.',
      },
    ],
    cheatSheet: [
      ['Symmetric', 'One shared key; fast; AES-256'],
      ['Asymmetric', 'Public/private pair; RSA, ECC'],
      ['Confidential message', 'Encrypt with recipient\'s public key'],
      ['Digital signature', 'Sign with your private key'],
      ['MD5', 'Collisions: not for security'],
      ['Salt', 'Unique per password; beats rainbow tables'],
      ['Key stretching', 'PBKDF2, bcrypt, Argon2'],
      ['CA / CSR', 'Issues certificates / request with your public key'],
      ['OCSP (stapling)', 'Fast revocation check (CRL is older)'],
      ['PFS', 'Ephemeral DHE/ECDHE; mandatory in TLS 1.3'],
      ['PQC', 'ML-KEM (FIPS 203), ML-DSA (FIPS 204)'],
    ],
  },

  'sec-iam': {
    overview: [
      'Identity is the new perimeter. Most breaches involve stolen or misused credentials, so strong authentication, sensible authorisation models and disciplined account lifecycles are among the highest-value controls you can implement.',
      'This lesson covers MFA factors and phishing-resistant authenticators, SSO and federation (SAML, OAuth, OpenID Connect), the four access control models, privileged access management and the account lifecycle.',
    ],
    learn: [
      {
        heading: 'Multi-factor authentication',
        body: [
          'Factors are categories: something you know (password, PIN), something you have (phone, hardware key), something you are (fingerprint, face), plus somewhere you are (location) as an attribute. MFA needs factors from different categories, so two passwords are still one factor.',
          'Not all MFA is equal. SMS codes can be intercepted through SIM swapping, and push prompts can be fatigue-bombed. FIDO2 and passkeys, using hardware or platform authenticators, resist phishing best because the credential is bound to the real site\'s domain and never typed.',
        ],
      },
      {
        heading: 'SSO and federation',
        body: [
          'Single sign-on lets one authentication grant access to many applications, reducing password fatigue. It also concentrates risk, so the identity provider (IdP) needs the strongest protection you have.',
          'SAML is an XML-based standard for federated web SSO: the IdP issues signed assertions that a service provider trusts. OAuth 2.0 is for delegated authorisation, letting an app act on your behalf with limited scope, without your password. OpenID Connect adds authentication on top of OAuth with an ID token, which is what "Sign in with Google" uses.',
        ],
      },
      {
        heading: 'Access control models',
        body: [
          'Mandatory Access Control (MAC) uses labels and clearances set by the system, and users cannot change permissions; it is used in military and government systems. Discretionary Access Control (DAC) lets the data owner set permissions, as on NTFS file shares.',
          'Role-Based Access Control (RBAC) grants permissions by job function: assign permissions to roles and users to roles. Attribute-Based Access Control (ABAC) evaluates attributes such as department, time of day, device and data sensitivity, and is the most granular; cloud IAM policies are largely ABAC.',
        ],
      },
      {
        heading: 'Privilege and the account lifecycle',
        body: [
          'Least privilege means giving only the access needed to do the job. Pair it with regular access reviews to catch privilege creep, the slow accumulation of rights as people change roles.',
          'Privileged access management (PAM) vaults admin credentials, provides just-in-time elevation instead of standing privilege, and records privileged sessions.',
          'Provisioning creates accounts at hire; deprovisioning removes access at exit. Orphaned accounts left behind by leavers are one of the most common audit findings.',
        ],
      },
    ],
    cheatSheet: [
      ['Factors', 'Know, have, are (+ somewhere you are)'],
      ['Two passwords', 'Still one factor'],
      ['Phishing-resistant MFA', 'FIDO2 / passkeys'],
      ['SMS codes', 'Vulnerable to SIM swapping'],
      ['SAML', 'XML federated web SSO (IdP → SP assertions)'],
      ['OAuth 2.0', 'Delegated authorisation'],
      ['OpenID Connect', 'Authentication (ID token) on OAuth'],
      ['MAC / DAC', 'Labels and clearances / owner decides'],
      ['RBAC / ABAC', 'Job role / attributes (most granular)'],
      ['PAM', 'Vaulting, just-in-time, session recording'],
      ['Deprovisioning', 'Remove access at exit; no orphans'],
    ],
  },

  'sec-architecture': {
    overview: [
      'Good architecture makes the secure path the default. Instead of bolting on controls later, you decide up front how data is protected in each state, where systems are separated, and how the whole thing keeps running when parts fail.',
      'This lesson covers data states and protection techniques, DLP, ICS/SCADA, infrastructure as code, WAFs, IDS and IPS, fail-open versus fail-closed, high availability, the 3-2-1 backup rule and SASE.',
    ],
    learn: [
      {
        heading: 'Protecting data',
        body: [
          'Data has three states: at rest (on disk; use full-disk or database encryption), in transit (on the network; use TLS or a VPN) and in use (in memory while processed; protected by secure enclaves and confidential computing).',
          'Tokenization replaces sensitive data with a non-sensitive token and keeps the real value in a secure vault; it is common for card numbers. Data masking hides part of the data, such as `****-1234`, for display and non-production environments. Data loss prevention (DLP) detects and blocks sensitive data leaving the organisation, on endpoints, on the network and in cloud services.',
        ],
      },
      {
        heading: 'Special environments and infrastructure as code',
        body: [
          'Industrial control systems (ICS/SCADA) run power, water and manufacturing. They are often old and hard to patch, and availability is critical, so segment operational technology (OT) networks from IT networks and tightly control what crosses between them.',
          'Infrastructure as code gives consistent, reviewable, repeatable configuration. Scan templates for misconfigurations (open storage, permissive security groups) before deployment, so errors are caught in review rather than in production.',
        ],
      },
      {
        heading: 'Inspection devices and failure modes',
        body: [
          'A web application firewall (WAF) protects web applications at Layer 7, blocking SQL injection, XSS and similar attacks. An IDS watches traffic and alerts; an IPS sits inline and can block. Both detect with signatures, anomaly baselines or behavioural analysis.',
          'When a device fails, it can fail open (let traffic through) or fail closed (block it). Security devices usually fail closed to protect confidentiality; life-safety systems, such as emergency exit doors, fail open to protect people.',
        ],
      },
      {
        heading: 'Resilience and modern access',
        body: [
          'High availability designs systems to keep running despite failures, using redundancy, clustering, load balancing and failover. Backups follow the 3-2-1 rule: three copies, on two media types, with one offsite, and keep one copy offline or immutable so ransomware cannot encrypt it.',
          'SASE (Secure Access Service Edge) delivers networking and security from the cloud together: secure web gateway (SWG), CASB, zero trust network access (ZTNA) and SD-WAN. SSE (Security Service Edge) is the security-only subset.',
        ],
      },
    ],
    cheatSheet: [
      ['At rest / in transit / in use', 'Disk encryption / TLS / secure enclaves'],
      ['Tokenization', 'Swap for a token; real value in a vault'],
      ['Masking', 'Partial hide: ****-1234'],
      ['DLP', 'Stop sensitive data leaving'],
      ['ICS/SCADA', 'Legacy, availability-critical: segment OT'],
      ['WAF', 'Layer 7 web protection'],
      ['IDS vs IPS', 'Alerts vs inline blocking'],
      ['Fail closed / open', 'Security devices / life safety'],
      ['3-2-1 backups', '3 copies, 2 media, 1 offsite (+ offline copy)'],
      ['SASE / SSE', 'Cloud-delivered network + security / security only'],
    ],
  },

  'sec-ops': {
    overview: [
      'Security operations is where controls meet reality: finding and prioritising vulnerabilities, watching for attacks, and responding when one succeeds. It is the largest Security+ domain, at 28% of the exam.',
      'This lesson covers CVEs and CVSS, vulnerability scanning, SIEM, SOAR and EDR, the NIST incident response lifecycle, handling evidence, threat hunting and tabletop exercises.',
    ],
    learn: [
      {
        heading: 'Vulnerability management',
        body: [
          'A CVE is a unique public identifier for a known vulnerability, in the form CVE-YYYY-NNNNN. CVSS scores severity from 0 to 10. Prioritise with context, not just the score: is it being exploited in the wild (for example, is it in CISA\'s Known Exploited Vulnerabilities catalogue), and how valuable and exposed is the affected asset?',
          'A credentialed scan logs in to hosts and sees far more (missing patches, local configuration); a non-credentialed scan shows the outside view an attacker would get. A false positive reports a vulnerability that does not exist and wastes time; a false negative misses a real one, which is worse.',
        ],
      },
      {
        heading: 'Monitoring tools',
        body: [
          'A SIEM aggregates and correlates logs from across the environment to detect incidents. SOAR adds automated response playbooks, for example enriching an alert and isolating a host automatically. EDR monitors endpoint behaviour and lets responders investigate and contain; XDR extends detection across network, cloud and identity.',
        ],
      },
      {
        heading: 'Incident response',
        body: [
          'NIST SP 800-61r2 defines four phases: Preparation; Detection and Analysis; Containment, Eradication and Recovery; and Post-Incident Activity (lessons learned). The 2025 revision, SP 800-61r3, maps incident response onto the NIST CSF 2.0 functions.',
          'After detecting ransomware on one host, the first priority is containment: isolate the host from the network to stop the spread. Preserve evidence, and do not simply power it off if memory forensics matters, because RAM is lost.',
        ],
      },
      {
        heading: 'Evidence handling',
        body: [
          'Follow the order of volatility: collect the most volatile evidence first. CPU cache and RAM come before temporary files, then disk, then remote logs, with archives last.',
          'Chain of custody documents who handled evidence, when and how. Without it, evidence may be inadmissible.',
        ],
      },
      {
        heading: 'Proactive work',
        body: [
          'Threat hunting proactively searches for threats that evaded detection. It is hypothesis-driven ("if an attacker used stolen VPN credentials, we would see...") and often mapped to MITRE ATT&CK techniques. A tabletop exercise is a discussion-based walk-through of an incident scenario: a cheap, effective way to test plans, roles and communication.',
        ],
      },
    ],
    cheatSheet: [
      ['CVE', 'Public ID for a known vulnerability'],
      ['CVSS', '0–10 severity; add exploitability + asset context'],
      ['CISA KEV', 'Known exploited: patch first'],
      ['Credentialed scan', 'Inside view, far more detail'],
      ['False positive / negative', 'Non-existent finding / missed real one'],
      ['SIEM / SOAR', 'Correlate logs / automate response'],
      ['EDR / XDR', 'Endpoint / across domains'],
      ['NIST IR phases', 'Prep; Detect & Analyse; Contain, Eradicate, Recover; Post-incident'],
      ['Ransomware first step', 'Contain: isolate the host'],
      ['Order of volatility', 'RAM before disk; archives last'],
      ['Chain of custody', 'Who, when, how: admissibility'],
    ],
  },

  'sec-governance': {
    overview: [
      'Governance, risk and compliance turn security from a technical hobby into a business function: deciding which risks matter, writing down the rules, meeting legal obligations and proving it to auditors.',
      'This lesson covers quantitative risk (SLE, ARO, ALE), risk responses and appetite, the policy hierarchy, contracts with third parties, key regulations and standards, data roles, audit reports and business impact analysis.',
    ],
    learn: [
      {
        heading: 'Quantitative risk',
        body: [
          'Single Loss Expectancy is the cost of one occurrence: SLE = Asset Value × Exposure Factor, where the exposure factor is the fraction of the asset lost. An asset worth $100,000 with a 25% exposure factor has an SLE of $25,000.',
          'Annualized Loss Expectancy is the expected yearly cost: ALE = SLE × ARO, where ARO is the annualised rate of occurrence. If that event happens once every two years (ARO 0.5), the ALE is $12,500, which tells you a control costing more than that per year is not worth it for this risk alone.',
        ],
      },
      {
        heading: 'Managing risk',
        body: [
          'There are four responses: accept (live with it), avoid (stop the risky activity), transfer (shift the financial impact, for example with cyber insurance) and mitigate (reduce likelihood or impact with controls).',
          'Risk appetite is the amount of risk an organisation is willing to accept in pursuit of its goals; tolerance is the acceptable variation around it. A risk register records identified risks with owners, ratings and chosen responses, and is reviewed regularly.',
        ],
      },
      {
        heading: 'Policies and third parties',
        body: [
          'A policy states what and why at a high level. A standard sets mandatory specifics (for example, AES-256 for data at rest). A procedure is the step-by-step how. Guidelines are recommendations, not mandatory.',
          'Contracts: an MSA sets the master terms of a relationship, and a SOW defines the specific work under it. An SLA sets service levels, an NDA protects confidentiality, and an MOU is a less formal statement of intent.',
        ],
      },
      {
        heading: 'Regulations, roles and assurance',
        body: [
          'GDPR regulates the personal data of people in the EU: breaches must be reported to the regulator within 72 hours, and fines reach up to 4% of global annual turnover. PCI DSS protects payment card data; it is an industry standard enforced by contracts with card brands, not a law.',
          'The data owner is accountable for data and classifies it; the data custodian implements the protections. Under privacy law, the controller decides why and how personal data is processed, and the processor handles it on the controller\'s behalf.',
          'A SOC 2 Type I report checks that controls are designed properly at a single point in time; Type II shows they operated effectively over a period, usually 6 to 12 months. A business impact analysis (BIA) identifies critical functions and the impact of losing them, setting RTO and RPO; it is the foundation of business continuity planning.',
        ],
      },
    ],
    examples: [
      {
        title: 'Worked example: is the control worth it?',
        code: code(
          'Asset value (AV)            $100,000',
          'Exposure factor (EF)        25%',
          'SLE = AV x EF               $25,000',
          'ARO                         0.5   (once every two years)',
          'ALE = SLE x ARO             $12,500 per year',
          '',
          'Control costs $4,000/yr and cuts ARO to 0.1:',
          'New ALE = 25,000 x 0.1      $2,500',
          'Value = 12,500 - 2,500 - 4,000 = $6,000 per year saved',
        ),
        explanation: 'A control is justified when the reduction in ALE exceeds its annual cost.',
      },
    ],
    cheatSheet: [
      ['SLE', 'AV × EF'],
      ['ALE', 'SLE × ARO'],
      ['Risk responses', 'Accept, avoid, transfer, mitigate'],
      ['Cyber insurance', 'Transfer'],
      ['Risk appetite / tolerance', 'How much risk / acceptable variation'],
      ['Policy / standard / procedure', 'What and why / mandatory specifics / how'],
      ['MSA / SOW / SLA', 'Master terms / specific work / service levels'],
      ['GDPR', 'EU personal data; 72 h breach notice; up to 4% turnover'],
      ['PCI DSS', 'Card data; industry standard, not law'],
      ['Owner vs custodian', 'Accountable, classifies / implements controls'],
      ['SOC 2 Type I / II', 'Design at a point / operation over time'],
      ['BIA', 'Critical functions, impact, RTO/RPO'],
    ],
  },

  'sec-ai-apps': {
    overview: [
      'Applications are where attackers meet your data directly, and AI features add a new class of input that can talk back. Secure coding basics still stop most attacks, while AI systems need a few new habits of their own.',
      'This lesson covers injection and other classic web flaws, memory safety, input validation, code signing, SAST and DAST, SBOMs, and AI threats: prompt injection, data poisoning, excessive agency and deepfakes.',
    ],
    learn: [
      {
        heading: 'Classic application attacks',
        body: [
          'SQL injection inserts SQL through user input so the database runs it. Fix it with parameterised queries, which send values separately from the SQL, plus least-privilege database accounts to limit the damage if something slips through.',
          'Cross-site scripting (XSS) injects script that runs in other users\' browsers. Fix it by encoding output for the context it appears in, and add a Content Security Policy. Cross-site request forgery (CSRF) tricks a logged-in user\'s browser into sending an unwanted request; anti-CSRF tokens and SameSite cookies stop it.',
          'A buffer overflow writes past the bounds of a memory buffer, possibly letting an attacker run code. Memory-safe languages prevent it, and ASLR and DEP make exploitation much harder.',
        ],
      },
      {
        heading: 'Building securely',
        body: [
          'Input validation checks input against the expected type, length and format, and it must happen on the server; client-side checks are for user experience and are trivially bypassed.',
          'Code signing proves software came from the publisher and was not altered in transit, protecting users and the supply chain. SAST analyses source code statically; DAST tests the running application from outside. Use both in CI/CD, since each finds things the other cannot.',
          'An SBOM (software bill of materials) is an inventory of every component in your software. When a library vulnerability is announced, it lets you find affected systems in minutes instead of weeks.',
        ],
      },
      {
        heading: 'AI threats',
        body: [
          'Prompt injection is input that overrides a language model\'s instructions (OWASP LLM01). Direct injection comes from the user; indirect injection hides instructions in documents, emails or web pages the model reads. Treat model output as untrusted and keep sensitive actions outside the model\'s control.',
          'Data poisoning corrupts training data to manipulate a model\'s behaviour, so control the provenance and integrity of training data. Excessive agency is the risk that an agent with broad tools takes harmful actions when manipulated: limit its tools and permissions, and require human approval for high-impact actions.',
          'Attackers also use AI: deepfake voices and video, and convincing phishing at scale. Verify unusual requests out of band, and train staff to expect synthetic media.',
        ],
      },
    ],
    examples: [
      {
        title: 'SQL injection and the fix',
        code: code(
          '# Vulnerable: input becomes part of the SQL',
          'query = f"SELECT * FROM users WHERE name = \'{name}\'"',
          '#   name = "x\' OR \'1\'=\'1"  ->  returns every user',
          '',
          '# Fixed: parameterised query, value sent separately',
          'cursor.execute("SELECT * FROM users WHERE name = %s", (name,))',
        ),
        explanation: 'With parameters, the database treats the whole input as a value, never as SQL.',
      },
    ],
    cheatSheet: [
      ['SQL injection', 'Parameterised queries + least-privilege DB'],
      ['XSS', 'Output encoding + CSP'],
      ['CSRF', 'Anti-CSRF tokens + SameSite cookies'],
      ['Buffer overflow', 'Memory-safe languages, ASLR, DEP'],
      ['Input validation', 'Server-side: type, length, format'],
      ['Code signing', 'Publisher identity + integrity'],
      ['SAST vs DAST', 'Source code vs running app'],
      ['SBOM', 'Component inventory for fast CVE response'],
      ['Prompt injection', 'OWASP LLM01; indirect via documents'],
      ['Data poisoning', 'Corrupted training data'],
      ['Excessive agency', 'Limit tools; human approval'],
      ['Deepfakes', 'Verify out of band'],
    ],
  },
};
