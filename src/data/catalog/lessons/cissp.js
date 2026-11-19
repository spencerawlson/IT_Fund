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
      {
        heading: 'Thinking in risk, not in tools',
        body: [
          'When two answers both look technically right, the exam wants the one that reduces risk the most for the least cost and follows the established process. A technically elegant fix that skips the risk assessment, ignores policy, or acts without the owner’s authority is usually the distractor. Ask yourself: what would a prudent manager responsible for people, legal obligations and the business choose — not what would an engineer reach for first?',
          'The same instinct answers the “what first” questions. The first step is almost always to gather facts, verify what happened, and consult policy and stakeholders — not to reconfigure a system, notify a regulator, or discipline someone on a suspicion. Acting before understanding turns a manageable incident into a second incident, and the exam punishes it consistently.',
          'The credential itself rewards the same long view. Certification must be maintained with continuing professional education — 120 CPE credits over each three-year cycle — plus an annual maintenance fee, and every CISSP attests to the Code of Ethics as a condition of holding the credential. Treat the exam as the start of the professional obligation, not the end of it.',
        ],
      },
    ],
    examples: [
      {
        title: 'Choose the CISSP answer',
        code: 'Scenario: A fire alarm sounds while you are mid-way through\nimaging a compromised server for evidence.\n\nA. Finish the image, then leave     (protects evidence)\nB. Power the server off and leave   (protects data)\nC. Leave immediately                (protects people)   <- answer\nD. Call the CISO for a decision     (defers)',
        explanation: 'Life safety outranks evidence, data and systems every time. When several options are technically sensible, pick the one a manager responsible for people and the business would choose.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'CISSP Certification', url: 'https://www.isc2.org/certifications/cissp' },
      { title: 'ISC2 Code of Ethics', url: 'https://www.isc2.org/ethics' },
      { title: 'NIST Cybersecurity Framework', url: 'https://www.nist.gov/cyberframework' },
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
          'The NIST Risk Management Framework (SP 800-37) has seven steps. Authorization is the management decision to accept the residual risk, the risk remaining after controls are applied. Someone with the authority must explicitly accept it.',
          { stack: {
            title: 'NIST Risk Management Framework (SP 800-37)',
            items: [
              { badge: '1', name: 'Prepare', does: 'Set context, roles and risk strategy before any system work.' },
              { badge: '2', name: 'Categorize', does: 'Rate the system by the impact of losing confidentiality, integrity or availability.' },
              { badge: '3', name: 'Select', does: 'Choose a baseline of controls and tailor it.' },
              { badge: '4', name: 'Implement', does: 'Put the controls in place and document them.' },
              { badge: '5', name: 'Assess', does: 'Test that the controls work as intended.' },
              { badge: '6', name: 'Authorize', does: 'A senior official explicitly accepts the residual risk.' },
              { badge: '7', name: 'Monitor', does: 'Watch controls and risk continuously, and reassess on change.' },
            ],
          } },
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
      {
        heading: 'Risk treatments and the governance stack',
        body: [
          'Once a risk is assessed it gets one of four treatments: avoid it by removing the activity, transfer it through insurance or outsourcing, mitigate it with controls, or accept it formally with an owner and a review date. Transfer never transfers accountability: if a vendor fails, the organisation still owns the risk, which is why contracts, service levels and right-to-audit clauses matter. Risk appetite is how much risk leadership is willing to take in pursuit of objectives; risk tolerance is the acceptable variation around that appetite.',
          'Governance turns these decisions into structure. Senior management approves policy and accepts risk; a security steering committee aligns security with business priorities across departments; the CISO advises and implements but does not own the business risk. Policies state mandatory intent, standards give the specifics, procedures give the steps, and guidelines recommend. When a scenario asks who decides, the answer is almost always the business owner, not the security team.',
        ],
      },
    ],
    examples: [
      {
        title: 'Quantitative risk: is the control worth it?',
        code: 'Asset value (AV)            $500,000\nExposure factor (EF)        40%\nSLE = AV x EF               $200,000\nARO (once every 4 years)    0.25\nALE = SLE x ARO             $50,000 per year\n\nControl cost                $30,000 per year\nALE after control           $10,000 per year\nValue = 50,000 - 10,000 - 30,000 = $10,000 per year  -> justified',
        explanation: 'A control is worth buying when the reduction in ALE exceeds its annual cost. Present it to management in exactly these terms.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-37, Risk Management Framework', url: 'https://csrc.nist.gov/pubs/sp/800/37/r2/final' },
      { title: 'NIST SP 800-30, Guide for Conducting Risk Assessments', url: 'https://csrc.nist.gov/pubs/sp/800/30/r1/final' },
      { title: 'NIST SP 800-39, Managing Information Security Risk', url: 'https://csrc.nist.gov/pubs/sp/800/39/final' },
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
      {
        heading: 'Alternate sites and control assessment',
        body: [
          'Recovery sites trade cost against speed. A hot site is ready to take over immediately, with live data and systems; a warm site has hardware and connectivity but needs data restored; a cold site is empty space and power. Reciprocal agreements, where two organisations host each other’s recovery, are cheap but fragile — the partner may be hit by the same disaster. The choice follows from the BIA numbers, not from budget alone.',
          'The maximum tolerable downtime is the whole recovery budget: it equals the recovery time objective plus the work recovery time, the time needed after systems return before people can actually work again. Controls themselves must be assessed, not just installed: test whether a control is designed correctly and whether it operates effectively over time, because a control that exists on paper and fails in practice is worse than no control — it creates false confidence.',
        ],
      },
    ],
    examples: [
      {
        title: 'From BIA to recovery targets',
        code: 'Function         MTD     RTO     RPO     Strategy\n---------------  ------  ------  ------  -------------------------\nOrder taking     8 h     4 h     15 min  Warm site + log shipping\nPayroll          5 days  2 days  24 h    Restore from nightly backup\nIntranet wiki    14 days 7 days  1 week  Rebuild from weekly backup',
        explanation: 'The BIA sets MTD; RTO must fit inside it and RPO sets backup frequency. The strategy (and its cost) follows from those numbers, not the other way round.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-34, Contingency Planning Guide', url: 'https://csrc.nist.gov/pubs/sp/800/34/r1/final' },
      { title: 'NIST SP 800-53, Security and Privacy Controls', url: 'https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final' },
      { title: 'NIST Cybersecurity Framework', url: 'https://www.nist.gov/cyberframework' },
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
      {
        heading: 'Handling, labelling and the states of data',
        body: [
          'Classification is only useful when it drives handling. Labelling and marking make the class visible on documents, media and screens, and handling rules follow: restricted data is encrypted, access-controlled and never emailed outside the organisation; internal data stays inside it; public data mainly needs integrity so nobody can alter it unnoticed. The rules must be written, trained and enforced — a classification scheme nobody follows is decoration.',
          'Protection changes with the state of the data. Data at rest is protected with encryption and access control; data in transit with TLS and VPNs; data in use is the hardest, because it must be decrypted to be processed — which is why access control, memory protections and trusted execution matter there. Tokenisation replaces sensitive values with tokens held in a vault, so a stolen database yields nothing usable; masking hides part of a value, such as showing only the last four digits of a card number, for display and test use.',
        ],
      },
    ],
    examples: [
      {
        title: 'A data classification and handling table',
        code: 'Class         Example               Storage           Transmission     Disposal\n------------  --------------------  ----------------  ---------------  -----------------\nRestricted    Card data, health     Encrypted, MFA    TLS + DLP block  Purge or destroy\nConfidential  Contracts, salaries   Encrypted         TLS              Purge\nInternal      Policies, org chart   Access-controlled Any internal     Clear\nPublic        Marketing site        Any               Any              None',
        explanation: 'The data owner assigns the class; the custodian applies the handling rules. Classification without handling rules changes nothing.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-88, Media Sanitization', url: 'https://csrc.nist.gov/pubs/sp/800/88/r1/final' },
      { title: 'GDPR full text', url: 'https://gdpr-info.eu/' },
      { title: 'EU data protection law overview', url: 'https://commission.europa.eu/law/law-topic/data-protection_en' },
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
          'Protection must follow the data through every phase of its lifecycle: most breaches exploit the share and archive phases, not the database itself.',
          { stack: {
            title: 'The data lifecycle',
            items: [
              { badge: '1', name: 'Create', does: 'Data is generated or captured. Classify it here.' },
              { badge: '2', name: 'Store', does: 'Committed to storage. Encrypt it and control access.' },
              { badge: '3', name: 'Use', does: 'Viewed or processed. Enforce least privilege and log access.' },
              { badge: '4', name: 'Share', does: 'Made available to others. Apply DLP and secure transfer.' },
              { badge: '5', name: 'Archive', does: 'Moved to long-term storage. Follow retention rules.' },
              { badge: '6', name: 'Destroy', does: 'Permanently removed. Sanitise or crypto-shred.' },
            ],
          } },
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
      {
        heading: 'Minimisation and the rights of the data subject',
        body: [
          'Collect only the data you need, keep it only as long as you need it, and give access only to those who need it. Data minimisation is both a privacy principle and a security control: data you never collected cannot leak, and data you deleted on schedule cannot be stolen. Every extra field, copy and retention year is risk carried for no benefit.',
          'Privacy law gives individuals rights over their data, and the exam expects you to know the shape of them. Under GDPR, a data subject can request access to their data, correction of errors, erasure, and portability to another provider. Erasure must reach backups and archives as far as feasible — “we deleted the live record” is not a complete answer when the same data sits in last month’s backup. When a request arrives, the first step is to verify the requester’s identity before disclosing anything.',
        ],
      },
    ],
    examples: [
      {
        title: 'Sanitising media under NIST SP 800-88',
        code: 'Media                      Leaving org?  Method\n-------------------------  ------------  --------------------------------\nHDD, reused internally     No            Clear  (single overwrite)\nHDD, sold to recycler      Yes           Purge  (ATA Secure Erase) or destroy\nSSD, any reuse             Either        Purge  (crypto erase / sanitize cmd)\nSSD, end of life           Yes           Destroy (shred), with certificate',
        explanation: 'The method depends on where the media is going and the data\'s classification. Degaussing does nothing to SSDs.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Microsoft Purview data loss prevention', url: 'https://learn.microsoft.com/en-us/purview/dlp-learn-about-dlp' },
      { title: 'NIST SP 800-60, Mapping Information Types to Security Categories', url: 'https://csrc.nist.gov/pubs/sp/800/60/v1/r1/final' },
      { title: 'PCI DSS standards', url: 'https://www.pcisecuritystandards.org/standards/pci-dss/' },
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
      {
        heading: 'Key management and the hardware root of trust',
        body: [
          'Cryptography fails far more often in key management than in mathematics. A key’s lifecycle runs generation, distribution, storage, rotation, backup and destruction: generate with a proper random source and sufficient length, distribute without exposing the key, store it separately from the data it protects, rotate it on schedule and immediately on compromise, and destroy it securely when retired. Never hard-code a key in source code, and never let one person hold both the data and its key.',
          'Hardware gives keys a home that software cannot copy. A hardware security module is dedicated hardware that generates and stores keys and performs operations without the key ever leaving the device; a key management service provides the same discipline as a managed cloud service. Validated modules carry a FIPS 140-3 validation, which is the assurance the exam looks for. Secure boot and measured boot extend the same idea to the machine itself: each stage verifies the next before handing over control, and the TPM records the measurements so a changed system can be detected and refused.',
        ],
      },
    ],
    examples: [
      {
        title: 'Bell-LaPadula vs Biba',
        code: 'Subject clearance: SECRET\n\nBell-LaPadula (confidentiality)\n  read  TOP SECRET   -> denied   (no read up)\n  write CONFIDENTIAL -> denied   (no write down)\n\nBiba (integrity), subject integrity: MEDIUM\n  read  LOW          -> denied   (no read down)\n  write HIGH         -> denied   (no write up)',
        explanation: 'The two models are mirror images: BLP stops secrets leaking down; Biba stops untrusted data contaminating trusted data.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Common Criteria Portal', url: 'https://www.commoncriteriaportal.org/' },
      { title: 'Trusted Platform Module summary (TCG)', url: 'https://trustedcomputinggroup.org/resource/trusted-platform-module-tpm-summary/' },
      { title: 'FIPS 140-3, Cryptographic Module Validation', url: 'https://csrc.nist.gov/pubs/fips/140-3/final' },
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
      {
        heading: 'Wireless, VPNs and the protocols to retire',
        body: [
          'Wireless security has moved on from shared passwords. WPA3 replaces WPA2’s pre-shared key handshake with Simultaneous Authentication of Equals, giving each session forward secrecy so capturing one session does not expose the others; enterprise deployments still use WPA2 or WPA3 with 802.1X and EAP-TLS for per-user certificates. WEP and WPA are broken and open networks offer no protection at all — the exam treats any answer relying on them as wrong.',
          'Remote access is a trust decision, not just a tunnel. A VPN extends the network to the remote user, which is why split tunnelling is risky: traffic that bypasses the tunnel bypasses inspection too. Zero trust access checks identity and device posture for every application instead of trusting the network. And some protocols should simply be retired rather than protected: Telnet, FTP and SNMPv1 send credentials in clear text, so replace them with SSH, SFTP and SNMPv3 instead of monitoring a weakness you could have removed.',
        ],
      },
    ],
    examples: [
      {
        title: 'IPsec tunnel mode packet',
        code: 'Original:  [IP hdr 10.1.1.5 -> 10.2.2.9][TCP][data]\n\nESP tunnel mode:\n[New IP 203.0.113.1 -> 198.51.100.7][ESP hdr][ IP 10.1.1.5 -> 10.2.2.9 | TCP | data ][ESP trailer][ICV]\n                                             \\_____________ encrypted _____________/',
        explanation: 'Tunnel mode wraps and encrypts the whole original packet, hiding internal addresses between gateways; transport mode encrypts only the payload.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'RFC 4301, Security Architecture for the Internet Protocol', url: 'https://www.rfc-editor.org/rfc/rfc4301' },
      { title: 'RFC 8446, The Transport Layer Security Protocol', url: 'https://www.rfc-editor.org/rfc/rfc8446' },
      { title: 'NIST SP 800-77, Guide to IPsec VPNs', url: 'https://csrc.nist.gov/pubs/sp/800/77/r1/final' },
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
      {
        heading: 'Provisioning, roles and the modern authenticator',
        body: [
          'Identity is a lifecycle, and most failures happen in the middle of it. Provisioning should follow HR events automatically: a new hire gets the access their role needs, a transfer triggers a review of old permissions, and a departure triggers immediate removal. The gaps have names the exam uses: privilege creep is access accumulated across role changes, and orphaned accounts are accounts whose owner has left but whose access remains.',
          'Authorisation models answer the same question differently. Role-based access control grants permissions to roles built from job functions; attribute-based access control decides from attributes of the subject, the resource and the environment, such as department, clearance and time of day; rule-based access control applies rules set by an authority, such as mandatory access control labels. The exam contrasts them directly, so know which one fits a scenario rather than which sounds most modern.',
          'Authentication strength is about the factor, not the count. A password plus an SMS code is two factors, but SMS codes can be intercepted and SIM-swapped, so they are the weakest second factor. Phishing-resistant authentication uses FIDO2 security keys and passkeys, where the private key never leaves the device and the signed challenge cannot be replayed on a fake site. Prefer the factor that survives the attack described in the scenario.',
        ],
      },
    ],
    examples: [
      {
        title: 'Biometric error rates',
        code: 'Threshold   FRR (Type I)   FAR (Type II)\n---------   ------------   -------------\nLow         1%             8%\nMedium      3%             3%   <- crossover error rate (CER)\nHigh        9%             0.5%',
        explanation: 'Raising sensitivity trades false acceptances for false rejections. The CER compares systems; a lower CER means a more accurate device. For a data-centre door, tune toward low FAR.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-63B, Digital Identity Guidelines: Authentication', url: 'https://pages.nist.gov/800-63-3/sp800-63b.html' },
      { title: 'Passkeys (Google Identity)', url: 'https://developers.google.com/identity/passkeys' },
      { title: 'Kerberos authentication overview (Microsoft)', url: 'https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview' },
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
      {
        heading: 'Vulnerability management and the audit trail',
        body: [
          'Scanning is a programme, not an event. The vulnerability management lifecycle runs discovery, assessment, prioritisation, remediation and verification: find the weaknesses, rank them by risk rather than raw severity, fix them in that order, and re-test to confirm the fix. A critical finding on an internet-facing system outranks a critical finding on an isolated lab box, because risk is exploitability times business impact — and a scanner cannot know your business impact.',
          'How you scan changes what you see. Credentialed scans authenticate to the target and report missing patches and misconfigurations with far fewer false positives; non-credentialed scans see only what an outsider sees. A false positive wastes a fix; a false negative is worse, because it certifies a hole as safe. For assurance reports, remember the difference between Type I and Type II: Type I describes the design of controls at a point in time, while Type II tests whether they operated effectively over a period — and only Type II gives evidence the controls actually worked.',
        ],
      },
    ],
    examples: [
      {
        title: 'Read a SOC 2 Type II report',
        code: 'Scope:     Production SaaS platform (not the mobile app)\nPeriod:    1 Jan - 30 Jun\nCriteria:  Security, Availability\nOpinion:   Qualified\nException: CC6.2 - 4 of 25 sampled leavers kept access > 5 days\nCUECs:     Customer must manage its own user provisioning',
        explanation: 'A \'SOC 2\' claim tells you little. The scope, period, exceptions and complementary user entity controls (CUECs) tell you what was tested and what remains your job.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-115, Technical Guide to Information Security Testing', url: 'https://csrc.nist.gov/pubs/sp/800/115/final' },
      { title: 'NIST SP 800-53A, Assessing Security and Privacy Controls', url: 'https://csrc.nist.gov/pubs/sp/800/53/a/r5/final' },
      { title: 'AICPA SOC 2 reports', url: 'https://www.aicpa-cima.com/topic/audit-and-assurance/audit-and-assurance-greater-than-soc-2' },
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
      {
        heading: 'Order of volatility and the people side of operations',
        body: [
          'Digital evidence disappears in a known order, so collect from the most volatile first: processor registers and cache, then memory, then network state and running processes, then disk, then remote logs and archives. A live memory capture can hold encryption keys and running malware that vanish the moment the machine powers off — which is why the exam penalises powering down a suspect system before imaging its memory.',
          'Operations is also change discipline. Every change, including an emergency patch, goes through a documented change process with approval, testing proportionate to the risk, a backout plan, and verification afterwards; an emergency change is expedited, never skipped. And the human side never leaves the picture: security awareness training and phishing simulations reduce the clicks that start most incidents, duress alarms and safe rooms protect people in a physical emergency, and the first priority in any emergency is always getting people out safely.',
        ],
      },
    ],
    examples: [
      {
        title: 'Chain-of-custody record',
        code: 'Item:      Laptop SN 5CG1234XYZ, image file CASE-17-01.E01\nSHA-256:   9f2c...e41a (acquisition) = 9f2c...e41a (verification)\n2024-05-12 09:14  Collected by  J. Ortiz   from desk 4.12\n2024-05-12 09:40  Imaged by     J. Ortiz   write-blocker WB-2\n2024-05-12 10:05  Transferred   J. Ortiz -> evidence locker 3 (K. Lee)\nSealed bag no.  0047812',
        explanation: 'Every handover is recorded with who, when and why, and the hash proves the image never changed. A gap in this record can make the evidence inadmissible.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-61, Computer Security Incident Handling Guide', url: 'https://csrc.nist.gov/pubs/sp/800/61/r2/final' },
      { title: 'MITRE ATT&CK', url: 'https://attack.mitre.org/' },
      { title: 'Microsoft Sentinel overview', url: 'https://learn.microsoft.com/en-us/azure/sentinel/overview' },
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
          'OWASP SAMM (open) and BSIMM (descriptive, based on what real firms do) measure software security programme maturity. CMMI rates process maturity from 1 to 5.',
          { stack: {
            title: 'CMMI maturity levels, highest first',
            items: [
              { badge: '5', name: 'Optimising', does: 'Continuous, data-driven process improvement.' },
              { badge: '4', name: 'Quantitatively Managed', does: 'Processes are measured and controlled with metrics.' },
              { badge: '3', name: 'Defined', does: 'Standard processes documented across the organisation.' },
              { badge: '2', name: 'Managed', does: 'Processes are planned and tracked per project.' },
              { badge: '1', name: 'Initial', does: 'Ad hoc and unpredictable; success depends on heroics.' },
            ],
          } },
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
      {
        heading: 'Threat modelling and the OWASP landscape',
        body: [
          'The cheapest security decision happens in design, before a line of code exists. Threat modelling walks through what the system does, what can go wrong, and what to do about it; STRIDE gives the categories of threat, and DREAD scores each one by damage, reproducibility, exploitability, affected users and discoverability. The output is not a document — it is design changes: a control added, a trust boundary moved, a feature rethought.',
          'The OWASP Top 10 is the exam’s shorthand for what goes wrong in web applications, and broken access control sits at number one: functions that fail to check whether the caller may do what they ask. Code review catches what scanners miss, but it has its own limits: automated analysis (SAST) produces false positives that must be triaged by a person, and manual review is slow, so mature teams use both — automation for coverage, humans for judgement on the findings that matter.',
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
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'OWASP Top Ten', url: 'https://owasp.org/www-project-top-ten/' },
      { title: 'OWASP Application Security Verification Standard', url: 'https://owasp.org/www-project-application-security-verification-standard/' },
      { title: 'NIST SP 800-218, Secure Software Development Framework', url: 'https://csrc.nist.gov/pubs/sp/800/218/final' },
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
      {
        heading: 'How to approach a D1 scenario',
        body: [
          'Domain 1 questions place you in a governance role and ask what to do first, best or next. The answer is rarely a technical fix. Ask whose decision it is: senior management owns risk acceptance and policy approval, the data owner owns classification, and the security professional advises and implements. An option where the security team accepts risk on the business\'s behalf is usually wrong.',
          'Next, look for the process step the scenario skipped. If a new regulation applies, a gap assessment comes before buying tools. If a control cannot be applied, a documented exception with compensating controls and an expiry comes before simply ignoring the requirement. Due care means acting as a prudent person would; due diligence means verifying that it actually happened.',
          'Finally, remember the order of priorities that runs through the whole exam: people\'s safety first, then legal and regulatory obligations, then business objectives, then technology preferences.',
        ],
      },
      {
        heading: 'The risk register and third-party risk',
        body: [
          'Risk lives in a register, not in people’s heads. Each entry records the risk, its likelihood and impact, the treatment chosen, the residual risk after controls, the owner, and the review date. The register is what lets management see the whole risk picture at once and what makes risk acceptance a real decision instead of a shrug. When a scenario describes a risk nobody documented and nobody owns, the correct answer is usually to record it and escalate it to the owner.',
          'Third parties carry your risk without carrying your accountability. Due diligence happens before the contract: the vendor’s security practices, financial stability, and the sensitivity of the data they will hold. The contract then carries the controls: security requirements, service levels, audit rights, breach notification duties, and return or destruction of data at the end. And diligence does not end at signing — ongoing monitoring, from questionnaires to independent audit reports, is what catches a vendor whose controls decayed after the sale.',
        ],
      },
    ],
    examples: [
      {
        title: 'A formal risk acceptance',
        code: 'Risk:        Unpatched DB server ORDDB01 (CVE-2024-xxxx), no vendor patch\nCompensating: Isolated VLAN, IPS signature, access from app tier only\nResidual:    Medium\nOwner:       VP Operations (signed)\nExpiry:      90 days or vendor patch, whichever first\nReview:      Monthly by security risk committee',
        explanation: 'Acceptance is a documented business decision with an owner, compensating controls and an expiry, never a silent \'we\'ll live with it\'.',
      },
    ],
    cheatSheet: [
      ['No patch + cannot go offline', 'Compensating control + documented risk acceptance'],
      ['BIA vs plan gap', 'Report to management; strategy review'],
      ['New regulation', 'Gap analysis first, then roadmap'],
      ['Policy exception', 'Formal process: justification, risk sign-off, expiry'],
      ['Risk treatment', 'Avoid, transfer, mitigate, accept — in that thinking order'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-39, Managing Information Security Risk', url: 'https://csrc.nist.gov/pubs/sp/800/39/final' },
      { title: 'NIST SP 800-37, Risk Management Framework', url: 'https://csrc.nist.gov/pubs/sp/800/37/r2/final' },
      { title: 'CISSP Certification', url: 'https://www.isc2.org/certifications/cissp' },
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
      {
        heading: 'How to approach a D2 scenario',
        body: [
          'Asset security questions turn on who decides and what the data\'s classification requires. The data owner, a business manager, classifies data and approves access; the custodian, usually IT, implements the controls; users follow the handling rules. When an option asks the custodian to decide classification, or lets a user choose how to handle restricted data, it is usually a distractor.',
          'Follow the data through its lifecycle: creation, storage, use, sharing, archiving and destruction. Most scenarios break one link. Production personal data copied into a test environment breaks \'use\' and needs masking or synthetic data. A drive leaving the organisation breaks \'destruction\' and needs purging or physical destruction appropriate to the media. A legal hold overrides normal retention and deletion schedules until counsel releases it.',
          'When in doubt, choose the answer that reduces the amount of sensitive data held, because data you do not keep cannot leak.',
        ],
      },
      {
        heading: 'When classification meets the real world',
        body: [
          'Scenarios test classification at the awkward edges. A document that mixes restricted and public content takes the higher classification; a copy inherits the classification of the original; and declassification needs the owner’s decision, not a user’s judgement that the data “seems old”. When two rules conflict, the stricter handling wins — the exam never rewards the convenient reading.',
          'Shared services make the lifecycle harder. In multi-tenant cloud storage, isolation between tenants is the provider’s job and verifying it is yours, through audit reports and contract terms. Disposal needs the same rigour as collection: media leaving the organisation gets a sanitisation method matched to its classification, a witnessed destruction where required, and a certificate of destruction filed as evidence. An undocumented disposal is an unproven disposal, and an auditor will treat it as no disposal at all.',
        ],
      },
    ],
    examples: [
      {
        title: 'Safe test data',
        code: '-- copy production structure, not production people\nINSERT INTO test.customers (id, name, email, card_last4)\nSELECT id,\n       \'Customer \' || id,\n       \'user\' || id || \'@example.test\',\n       \'0000\'\nFROM prod.customers TABLESAMPLE SYSTEM (1);',
        explanation: 'Test environments get masked or synthetic values that keep the shape of real data. Real PII in test is a breach waiting for an auditor.',
      },
    ],
    cheatSheet: [
      ['Employee departure', 'Revoke access first, then sanitise hardware'],
      ['Quick format', 'Not sanitisation for sensitive media'],
      ['Production data in test', 'Never — use masked or synthetic data'],
      ['Litigation hold', 'Suspends retention/destruction; preserve'],
      ['Spoliation', 'Destroying held data — serious legal exposure'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-88, Media Sanitization', url: 'https://csrc.nist.gov/pubs/sp/800/88/r1/final' },
      { title: 'Microsoft Purview data loss prevention', url: 'https://learn.microsoft.com/en-us/purview/dlp-learn-about-dlp' },
      { title: 'PCI DSS standards', url: 'https://www.pcisecuritystandards.org/standards/pci-dss/' },
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
      {
        heading: 'How to approach a D3 scenario',
        body: [
          'Security architecture questions reward principles over products. Look for which design principle the scenario violates: least privilege, defence in depth, fail-safe defaults, separation of duties, economy of mechanism, complete mediation or open design. The right answer usually restores the principle rather than adding a single new tool.',
          'Cryptography scenarios in this domain are mostly about key management. Strong algorithms do not help if the key sits beside the data, never rotates, or is shared across all customers. Prefer answers that move keys into an HSM or key management service, separate duties between key administrators and data users, and plan for algorithm change (crypto agility), including the move to post-quantum algorithms such as ML-KEM.',
          'For physical design questions, life safety outranks asset protection: doors on an escape route fail safe (unlock) on power loss even when that is less secure.',
        ],
      },
      {
        heading: 'Design traps: the principles behind the distractors',
        body: [
          'The exam hides the violated principle inside a plausible design. Least privilege means a subject gets only the access its task needs; need-to-know is the same idea applied to information. Economy of mechanism says simpler designs are easier to verify and harder to break — a design with three overlapping controls doing one job is a smell, not a strength. And open design, Kerckhoffs’s principle, says security must rest in the key, not in the secrecy of the algorithm: a system that is only secure while nobody understands it is not secure.',
          'Complete mediation is the principle most scenarios violate quietly: every access, by every subject, to every object, must be checked every time. Caching an authorisation decision, trusting a check done earlier in the session, or skipping the check for “internal” callers all break it. When a scenario shows a shortcut around a check, the fix is to restore the check at the point of access — not to add logging that records the unauthorised access after the fact.',
        ],
      },
    ],
    examples: [
      {
        title: 'Fail closed in code',
        code: 'def is_authorised(user, resource):\n    try:\n        return policy_service.check(user, resource)\n    except Exception:\n        log.error(\'policy service unavailable\')\n        return False   # fail closed: deny when unsure',
        explanation: 'When a security dependency breaks, the safe default is to deny. Returning True in the except branch would turn every outage into an open door.',
      },
    ],
    cheatSheet: [
      ['Fail-secure', 'Failures deny access (fail closed)'],
      ['Defence in depth', 'Layer different control functions, not duplicates'],
      ['Keys + data together', 'One breach yields both — separate security domains'],
      ['KMS / HSM', 'Dedicated key storage with split duties'],
      ['Deny by default', 'The quiet version of fail-secure'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'FIPS 140-3, Cryptographic Module Validation', url: 'https://csrc.nist.gov/pubs/fips/140-3/final' },
      { title: 'Common Criteria Portal', url: 'https://www.commoncriteriaportal.org/' },
      { title: 'Trusted Platform Module summary (TCG)', url: 'https://trustedcomputinggroup.org/resource/trusted-platform-module-tpm-summary/' },
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
      {
        heading: 'How to approach a D4 scenario',
        body: [
          'Network security scenarios ask you to protect traffic and limit where an attacker can go. Start by identifying what crosses an untrusted network; that traffic needs encryption and authentication, such as IPsec between sites or TLS for applications. Then look at trust boundaries: guests, contractors, IoT devices and operational technology belong in their own segments with default-deny rules between them and the corporate network.',
          'Many distractors add monitoring where prevention is possible, or add a device without addressing the design. An IDS that alerts on lateral movement is useful, but segmenting the flat network removes the path. A VPN does not help if the remote laptop is already compromised, which is why zero trust checks device posture and identity for every request.',
          'Know the protocols\' weaknesses too: Telnet, FTP and SNMPv1 send credentials in clear text, so the best answer replaces them with SSH, SFTP and SNMPv3 rather than merely monitoring them.',
        ],
      },
      {
        heading: 'When encryption is not the answer',
        body: [
          'Encryption protects data in transit; it does not fix a flat network, a trusted insider, or a compromised endpoint. A scenario that offers TLS as the answer to lateral movement is a trap: the attacker is already inside, and encrypted traffic to the next host is still an attack. Segmentation, least privilege and endpoint controls are what stop movement; encryption is what stops eavesdropping, and the two problems need different answers.',
          'Inspection has the same boundary. TLS interception lets a proxy decrypt and inspect traffic, but it breaks end-to-end trust, needs the private keys or a trusted root on every client, and creates a high-value target in the proxy itself. Use it where the risk justifies it and the law allows it, with the trade-off stated openly. Network access control adds the missing piece at the edge: check device posture and identity before the device joins the network, rather than discovering an unpatched laptop after it has already connected.',
        ],
      },
    ],
    examples: [
      {
        title: 'Segment guest Wi-Fi',
        code: 'VLAN 10  Corporate   10.10.0.0/16   802.1X (EAP-TLS)\nVLAN 50  Guest       172.20.0.0/22  WPA3-Personal + captive portal\n\nFirewall policy (zone guest):\n  allow  guest -> internet : 80, 443\n  deny   guest -> corporate: any   (log)\n  deny   guest -> mgmt     : any   (log)',
        explanation: 'Guests are untrusted by definition, so the guest zone reaches the internet and nothing else; logging the denies shows anyone probing inward.',
      },
    ],
    cheatSheet: [
      ['Sites across the internet', 'Site-to-site IPsec VPN'],
      ['Fragmentation evasion', 'Reassemble at the IPS before inspection'],
      ['Guest / untrusted networks', 'Segment first (VLANs + firewall zones)'],
      ['Lateral movement', 'Contained by segmentation'],
      ['ping and ports', 'ICMP has no ports — use a port test, not ping'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-77, Guide to IPsec VPNs', url: 'https://csrc.nist.gov/pubs/sp/800/77/r1/final' },
      { title: 'RFC 4301, Security Architecture for the Internet Protocol', url: 'https://www.rfc-editor.org/rfc/rfc4301' },
      { title: 'ICANN: What is DNSSEC?', url: 'https://www.icann.org/resources/pages/dnssec-what-is-it-why-important-2019-03-05-en' },
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
      {
        heading: 'How to approach a D5 scenario',
        body: [
          'Identity questions follow the account lifecycle: provisioning, review, change and removal. Many problems come from the middle of it. People change roles and keep old permissions (privilege creep), so the fix is periodic access reviews by the data owner and role-based provisioning tied to HR events. Leavers keep access because deprovisioning is manual, so the fix is automated removal on the termination record.',
          'Prefer federation and single sign-on over shared or duplicated credentials, and phishing-resistant MFA (FIDO2/passkeys) over codes that can be relayed. Remember that authentication is only half the job: session tokens, API keys and service accounts are also credentials, so short session lifetimes, re-authentication for sensitive actions, and vaulted, rotated service credentials appear in many correct answers.',
          'Accountability needs unique IDs. A shared administrator account cannot show who made a change, so replacing it with named accounts and privileged access management is almost always better than adding logging to the shared account.',
        ],
      },
      {
        heading: 'The lifecycle traps',
        body: [
          'Most identity scenarios fail on a lifecycle transition. Joining is usually well handled; moving is where privilege creep grows, because the new role’s access is added and the old role’s access is forgotten; leaving is where orphaned accounts persist, because deprovisioning is a manual ticket nobody owns. The exam’s fix is always the same shape: tie provisioning to HR events, review access on every role change, and remove access automatically when the HR record closes.',
          'Privileged access deserves its own discipline. Privileged access management vaults administrative credentials, issues them just in time, records the session, and rotates the password after use — so a stolen administrator password is useless an hour later and every privileged action is attributable to a named person. Remember the distinction underneath it all: identity proofing establishes who someone is at enrolment, with documents and checks; authentication verifies that identity later, at each sign-in. A strong authenticator cannot fix weak proofing.',
        ],
      },
    ],
    examples: [
      {
        title: 'Step-up authentication policy',
        code: 'Session: signed in with password + push MFA at 09:00\n\nAction                       Requirement\n---------------------------  ------------------------------\nRead dashboards              existing session\nChange payee bank details    re-authenticate with FIDO2 key\nAdd an admin role            FIDO2 + approval by second admin\nIdle > 15 min                sign in again',
        explanation: 'MFA at login proves identity once; step-up and short idle timeouts bound what a stolen session can do, scaled to the risk of each action.',
      },
    ],
    cheatSheet: [
      ['SSO without sharing passwords', 'SAML / OIDC federation'],
      ['Shared accounts', 'Destroy accountability — never the answer'],
      ['Session hijack despite MFA', 'Short timeouts + step-up re-auth'],
      ['Exposed API key', 'Revoke and rotate FIRST, then investigate'],
      ['MFA scope', 'Proves identity at login; sessions need their own controls'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-63B, Digital Identity Guidelines: Authentication', url: 'https://pages.nist.gov/800-63-3/sp800-63b.html' },
      { title: 'Passkeys (Google Identity)', url: 'https://developers.google.com/identity/passkeys' },
      { title: 'Kerberos authentication overview (Microsoft)', url: 'https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview' },
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
      {
        heading: 'How to approach a D6 scenario',
        body: [
          'Assessment questions ask you to match the test to the question being asked. Vulnerability scanning finds known weaknesses broadly; penetration testing proves whether they can be exploited and chained; code review and SAST find flaws before release; a SOC 2 or ISO 27001 audit gives independent assurance about a vendor\'s controls. Choose the option that answers the scenario\'s actual question at the right depth.',
          'Testing must be authorised. Before any penetration test, written rules of engagement must define scope, timing, methods and emergency contacts, signed by someone with authority over the systems. An option that starts testing on a verbal request, or tests a third party\'s systems without their consent, is wrong however efficient it sounds.',
          'Results only matter when they reach decision-makers. Findings should be ranked by risk to the business, assigned owners and dates, reported in management terms, and re-tested after remediation.',
        ],
      },
      {
        heading: 'What good evidence looks like',
        body: [
          'An assessment is only as good as its evidence. Good evidence is sufficient, meaning enough of it to support the conclusion; appropriate, meaning relevant and reliable for the question asked; and collected independently where it matters. A vendor’s marketing page is none of these; a signed audit report with a defined scope and period is all three. When a scenario offers a claim without evidence, the correct answer is to ask for the evidence, not to accept the claim or to reject it outright.',
          'Sampling and follow-up decide whether findings mean anything. Testing every transaction is rarely possible, so auditors sample — and the sample must represent the population, or the conclusion does not hold. After remediation, the finding is not closed because a ticket says so: re-test the control and confirm the weakness is gone. A finding closed without verification is the most common way a fixed problem quietly returns.',
        ],
      },
    ],
    examples: [
      {
        title: 'Choose the right test',
        code: 'Question                                         Best test\n-----------------------------------------------  ----------------------------\nAre there flaws in our source before release?    SAST in CI\nIs the running app exploitable by an attacker?   Authorised penetration test\nDo our detections catch real techniques?         Breach & attack simulation\nDid last month\'s patch still work?               Regression + rescan',
        explanation: 'Each test answers a different question. Pick it by what you need to prove, then make sure every finding gets an owner and a date.',
      },
    ],
    cheatSheet: [
      ['Running app assurance', 'Penetration test'],
      ['Source code flaws', 'SAST (white box)'],
      ['500 scan findings', 'Prioritise by risk, not count'],
      ['Vendor "compliant"', 'Read the actual report: scope, period, qualifications'],
      ['Test layering', 'SAST + DAST + pentest + scans, each in its place'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-115, Technical Guide to Information Security Testing', url: 'https://csrc.nist.gov/pubs/sp/800/115/final' },
      { title: 'AICPA SOC 2 reports', url: 'https://www.aicpa-cima.com/topic/audit-and-assurance/audit-and-assurance-greater-than-soc-2' },
      { title: 'OWASP Fuzzing', url: 'https://owasp.org/www-community/Fuzzing' },
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
      {
        heading: 'How to approach a D7 scenario',
        body: [
          'Operations scenarios often describe an incident in progress and ask for the next step. Use the incident response sequence: detect and analyse, then contain, then eradicate, then recover, then learn. If the attack is active, containment comes before investigation is finished; if it is contained, preserving evidence comes before rebuilding systems. Recovery before eradication invites the attacker back.',
          'Evidence handling has firm rules: collect in order of volatility, work on verified copies (hash before and after), and keep a chain of custody for anything that may go to court. Notify according to the plan; legal counsel and management decide on external notification, not the analyst on shift.',
          'For continuity questions, the priority is people\'s safety, then restoring the most critical business functions in the order set by the business impact analysis, not the order in which IT happens to find them.',
        ],
      },
      {
        heading: 'Communication and the legal clock',
        body: [
          'An incident is a communications problem as much as a technical one, and the exam tests who decides what. Legal counsel and senior management decide on external notification — to regulators, customers and law enforcement — not the analyst on shift. Notification duties are set by law and contract, and they carry clocks: under GDPR, a personal data breach must be reported to the supervisory authority within 72 hours of becoming aware of it. Miss the clock and the incident becomes a compliance failure on top of a security failure.',
          'Keep the response itself off the compromised network: use out-of-band channels for coordination, because an attacker in the mail system reads the incident bridge. After the incident, the lessons-learned review is the step that prevents the next one — update the playbook, fix the control that failed, and test the fix. Tabletop exercises do the same work before an incident: walk the team through a scenario on paper so the first real test is not the first time anyone has opened the plan.',
        ],
      },
    ],
    examples: [
      {
        title: 'First hour of a ransomware incident',
        code: '00:00  Declare incident; open bridge; assign IC and scribe\n00:05  Isolate affected subnets (EDR network containment)\n00:15  Preserve: memory from 2 hosts, firewall + EDR logs\n00:20  Notify legal and leadership via out-of-band channel\n00:30  Scope: which accounts, which data, is exfiltration seen?\n00:45  Confirm backups are intact and offline',
        explanation: 'Contain first, preserve evidence, communicate out of band, then scope. Restoring before scoping usually brings the attacker back with the data.',
      },
    ],
    cheatSheet: [
      ['Active attack RIGHT NOW', 'Isolate first (contain → eradicate → recover)'],
      ['Single failed login', 'Noise — triage by fidelity and corroboration'],
      ['Before closing an incident', 'Lessons-learned review; update playbooks'],
      ['Eradication before recovery', 'Or you restore the attacker too'],
      ['MTTR gaming', 'Speed of closure < quality of learning'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-61, Computer Security Incident Handling Guide', url: 'https://csrc.nist.gov/pubs/sp/800/61/r2/final' },
      { title: 'MITRE ATT&CK', url: 'https://attack.mitre.org/' },
      { title: 'Microsoft Sentinel overview', url: 'https://learn.microsoft.com/en-us/azure/sentinel/overview' },
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
      {
        heading: 'How to approach a D8 scenario',
        body: [
          'Software security questions reward building security in early. A flaw found in requirements or design costs far less to fix than one found in production, so answers that add threat modelling, secure coding standards and automated testing in the pipeline usually beat answers that rely on a final penetration test.',
          'Third-party code is part of your software. Maintain a software bill of materials, scan dependencies for known vulnerabilities, pin and verify versions, and evaluate a new library\'s maintenance and licence before adopting it. For acquired software or SaaS, ask for evidence such as security test results or an attestation rather than a vendor\'s assurance.',
          'When something goes wrong, contain first: a leaked secret is revoked and rotated before the history is cleaned, and a vulnerable release is patched or rolled back before the root cause analysis is written.',
        ],
      },
      {
        heading: 'The dependency decision, step by step',
        body: [
          'Adopting a dependency is adopting someone else’s code, maintainers and vulnerabilities. Before it enters the build, check the licence for compatibility with your product, the maintenance health — recent commits, responsive maintainers, a path for security fixes — and the known vulnerabilities in it and everything it pulls in. Pin versions and keep a lockfile so the build you tested is the build you ship; an unpinned dependency can change under you between test and release.',
          'Integrity does not stop at the source. Sign release artefacts so consumers can verify what they received, and prefer reproducible builds, where the same source always produces the same binary. Runtime protections such as a web application firewall or runtime application self-protection can compensate for a known weakness, but they are compensating controls, not fixes: the vulnerability is still in the code, and the correct long-term answer is still to patch it.',
        ],
      },
    ],
    examples: [
      {
        title: 'Respond to a committed secret',
        code: '$ git log -p | grep -n \'AKIA\'\n  commit 3f9a... +AWS_ACCESS_KEY_ID=AKIA...\n1. Revoke the key in IAM now (assume it is compromised)\n2. Review CloudTrail for its use since the commit time\n3. Move secrets to a vault; inject at runtime\n4. Add gitleaks as a pre-commit hook and in CI',
        explanation: 'Deleting the line does not help: the key is in history and any clone. Revoke first, investigate second, then fix the process so it cannot recur.',
      },
    ],
    cheatSheet: [
      ['New dependency', 'Licence + maintenance + CVEs (SCA) first'],
      ['Secret committed', 'Revoke NOW, vault, pre-commit scanning'],
      ['Cheapest bug fix', 'Requirements/design — shift-left'],
      ['SBOM', 'Know your exposure when the next Log4Shell lands'],
      ['Popularity', 'Not a security control'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'NIST SP 800-218, Secure Software Development Framework', url: 'https://csrc.nist.gov/pubs/sp/800/218/final' },
      { title: 'CISA Software Bill of Materials', url: 'https://www.cisa.gov/sbom' },
      { title: 'OWASP API Security Top 10 (2023)', url: 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/' },
    ],
  },
};
