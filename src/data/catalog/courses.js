// Course metadata. Each course wraps one existing Academy track (src/data/academy/<track>.js):
// the track's tiers become the course's modules and its decks become lessons, so no learning
// content is duplicated and existing progress (keyed by deck/card id) carries over.
//
// To add a course: add a track file under src/data/academy/, then an entry here. See docs/ACADEMY.md.

/** @type {import('./schema').CourseMeta[]} */
export const COURSE_META = [
  {
    slug: 'python-automation',
    trackId: 'python',
    title: 'Python & Automation',
    difficulty: 'Beginner',
    description:
      'From your first script to automation, testing and security tooling. Python is the glue language of operations and security work.',
    objectives: [
      'Write, structure and debug Python programs',
      'Automate files, APIs and repetitive admin tasks',
      'Test, package and ship reliable tools',
      'Build small security and data tools',
    ],
    skills: ['python', 'automation'],
    certifications: ['pcep'],
    modules: {
      beginner: { title: 'Python Fundamentals', summary: 'Syntax, control flow and core data structures.' },
      intermediate: { title: 'Real-World Python', summary: 'Files, errors, OOP and automating with APIs.' },
      advanced: { title: 'Production & Security Tooling', summary: 'Concurrency, testing, packaging and security tools.' },
    },
  },
  {
    slug: 'network-engineering',
    trackId: 'network',
    title: 'Network Engineering',
    difficulty: 'Beginner',
    description:
      'How packets actually move: models, addressing, switching, routing, services and structured troubleshooting, aligned to CompTIA Network+ (N10-009).',
    objectives: [
      'Explain traffic with the OSI and TCP/IP models',
      'Subnet IPv4 and read IPv6 addresses quickly',
      'Describe how switches and routers forward traffic',
      'Troubleshoot methodically with the right tools',
    ],
    skills: ['networking', 'troubleshooting'],
    certifications: ['network-plus', 'ccna'],
    modules: {
      beginner: { title: 'Networking Fundamentals', summary: 'Models, ports, protocols, devices and media.' },
      intermediate: { title: 'Addressing, Switching & Routing', summary: 'Subnetting, forwarding decisions and network services.' },
      advanced: { title: 'Operations, Troubleshooting & Security', summary: 'Methodology, resilience and defending the network.' },
    },
  },
  {
    slug: 'routing-protocols',
    trackId: 'routing',
    title: 'Routing Protocols',
    difficulty: 'Intermediate',
    description:
      'How routers learn and choose paths — from static routes and RIP through OSPF, EIGRP, IS-IS and BGP, plus redistribution, routing security and structured troubleshooting. Learn it, see it in the Visual Lab, then configure it in the Interactive Lab.',
    objectives: [
      'Explain forwarding, administrative distance, metrics and convergence',
      'Configure and verify static, OSPF, EIGRP and BGP routing',
      'Redistribute safely and troubleshoot routing methodically',
      'Detect and defend against routing attacks (hijacks, rogue routers, leaks)',
    ],
    skills: ['networking', 'troubleshooting'],
    certifications: ['ccna'],
    modules: {
      beginner: { title: 'Routing Foundations', summary: 'Forwarding decisions, static and default routing, and RIP.' },
      intermediate: { title: 'Interior Gateway Protocols', summary: 'OSPF, EIGRP and IS-IS: how routers inside an AS find paths.' },
      advanced: { title: 'Exterior Routing, Redistribution & Security', summary: 'BGP, route redistribution, routing security and troubleshooting.' },
    },
  },
  {
    slug: 'security-fundamentals',
    trackId: 'security',
    title: 'Security Fundamentals',
    difficulty: 'Intermediate',
    description:
      'The vocabulary and controls of security: threats, cryptography, identity, architecture, operations and governance, aligned to CompTIA Security+ (SY0-701).',
    objectives: [
      'Classify threats, vulnerabilities and attack indicators',
      'Choose cryptographic and identity controls',
      'Describe secure architecture and security operations',
      'Apply governance, risk and compliance concepts',
    ],
    skills: ['security', 'iam', 'cryptography'],
    certifications: ['security-plus', 'cissp'],
    modules: {
      beginner: { title: 'Threats & Core Concepts', summary: 'CIA, threat actors, social engineering and malware.' },
      intermediate: { title: 'Crypto, Identity & Architecture', summary: 'PKI, IAM and secure design.' },
      advanced: { title: 'Operations & Governance', summary: 'SecOps, GRC and application/AI security.' },
    },
  },
  {
    slug: 'cybersecurity-operations',
    trackId: 'cyber',
    title: 'Cybersecurity Operations',
    difficulty: 'Intermediate',
    description:
      'Hands-on blue and red team practice: Linux for security, SOC work, web attacks, detection engineering, incident response and threat hunting.',
    objectives: [
      'Work confidently on the Linux command line',
      'Triage alerts like a SOC analyst',
      'Explain common web and Active Directory attacks',
      'Build detections, respond to incidents and hunt threats',
    ],
    skills: ['cybersecurity', 'linux', 'incident-response'],
    certifications: ['cysa-plus', 'cissp'],
    modules: {
      beginner: { title: 'Security Operations Foundations', summary: 'Linux, frameworks and SOC fundamentals.' },
      intermediate: { title: 'Attack & Detect', summary: 'Web attacks, pentest process and detection engineering.' },
      advanced: { title: 'Respond & Hunt', summary: 'IR, forensics, AD/cloud attacks, threat intel and lab drills.' },
    },
  },
  {
    slug: 'cloud-computing',
    trackId: 'cloud',
    title: 'Cloud Computing & Security',
    difficulty: 'Intermediate',
    description:
      'Service models to Well-Architected design to cloud-native security, across AWS, Azure and GCP.',
    objectives: [
      'Compare service models and core services across providers',
      'Design cloud networks and resilient architectures',
      'Use containers, Kubernetes and infrastructure as code',
      'Engineer and govern cloud security',
    ],
    skills: ['cloud', 'cloud-security', 'iam'],
    certifications: ['aws-ccp', 'ccsp'],
    modules: {
      beginner: { title: 'Cloud Foundations', summary: 'Concepts, core services and pricing basics.' },
      intermediate: { title: 'Cloud Architecture', summary: 'Networking, Well-Architected design, containers and IaC.' },
      advanced: { title: 'Cloud Security & Reliability', summary: 'Security engineering, CCSP governance and SRE.' },
    },
  },
  {
    slug: 'ai-engineering',
    trackId: 'ai',
    title: 'AI / ML Engineering',
    difficulty: 'Advanced',
    description:
      'Machine learning fundamentals through production LLM applications, agents, evaluation and AI security.',
    objectives: [
      'Explain how ML models and neural networks learn',
      'Build retrieval-augmented and tool-using LLM apps',
      'Evaluate and fine-tune models',
      'Secure and govern AI systems (OWASP LLM Top 10, NIST AI RMF)',
    ],
    skills: ['ai', 'python'],
    certifications: ['aws-ai-practitioner'],
    modules: {
      beginner: { title: 'ML & LLM Foundations', summary: 'ML basics, deep learning and how LLMs work.' },
      intermediate: { title: 'Building LLM Applications', summary: 'RAG, APIs, tools, fine-tuning and evaluation.' },
      advanced: { title: 'Agents, AI Security & Governance', summary: 'Agent orchestration, prompt injection and AI risk.' },
    },
  },
  {
    slug: 'cissp-domains',
    trackId: 'cissp',
    title: 'CISSP Domains',
    difficulty: 'Expert',
    description:
      'All eight CISSP domains with the managerial mindset first. The destination of the Road to CISSP certification track.',
    objectives: [
      'Think like a manager: risk first, then controls',
      'Master all eight domains at CISSP depth',
      'Connect technical controls to governance and business goals',
    ],
    skills: ['architecture', 'security', 'cloud-security'],
    certifications: ['cissp'],
    modules: {
      beginner: { title: 'Mindset, Risk & Assets', summary: 'Manager mindset, Domain 1 and Domain 2.' },
      intermediate: { title: 'Architecture, Networks & Identity', summary: 'Domains 3, 4 and 5.' },
      advanced: { title: 'Testing, Operations & Software', summary: 'Domains 6, 7 and 8.' },
    },
  },
  {
    slug: 'linux-administration',
    trackId: 'linux',
    title: 'Linux Administration',
    difficulty: 'Beginner',
    description:
      'The operating system of the cloud, the SOC, and every server you will ever touch: shell fluency, permissions, users, packages, systemd, networking, bash scripting, and hardening — aligned to CompTIA Linux+.',
    objectives: [
      'Navigate, manipulate, and search the filesystem from the shell',
      'Manage permissions, users, groups, and sudo securely',
      'Install software and manage services with systemd',
      'Write bash scripts that automate real admin work',
      'Harden a Linux server: SSH, firewall, patching, least privilege',
    ],
    skills: ['linux', 'troubleshooting', 'security'],
    certifications: ['linux-plus'],
    modules: {
      beginner: { title: 'Shell Fundamentals', summary: 'Command line, permissions, users, and text pipelines.' },
      intermediate: { title: 'System Administration', summary: 'Packages, systemd services, and networking tools.' },
      advanced: { title: 'Scripting, Troubleshooting & Hardening', summary: 'Bash automation, logs, and Linux security basics.' },
    },
  },
];
