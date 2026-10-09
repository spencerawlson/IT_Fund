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
  {
    slug: 'terraform-iac',
    trackId: 'terraform',
    title: 'Terraform & Infrastructure as Code',
    difficulty: 'Intermediate',
    description:
      'Define, plan and provision cloud infrastructure as versioned code. From the core init → plan → apply workflow to variables, state, modules and production-grade security — with a real hands-on IaC lab (terraform init/validate/plan + tfsec, offline).',
    objectives: [
      'Run the core Terraform workflow confidently and safely',
      'Parameterise configs with variables, locals and outputs',
      'Manage state with remote backends and locking',
      'Build reusable modules and compose infrastructure',
      'Ship IaC through a reviewed, policy-gated, scanned pipeline',
    ],
    skills: ['terraform', 'iac', 'cloud'],
    certifications: ['terraform-associate'],
    modules: {
      beginner: { title: 'IaC Fundamentals & the Core Workflow', summary: 'HCL, providers, resources, and init → plan → apply.' },
      intermediate: { title: 'Variables, State & Expressions', summary: 'Inputs, outputs, functions, remote state and backends.' },
      advanced: { title: 'Modules, Lifecycle & Production', summary: 'Reusable modules, meta-arguments, policy-as-code and CI/CD.' },
    },
  },
  {
    slug: 'cpp-programming',
    trackId: 'cpp',
    title: 'C++ Programming',
    difficulty: 'Intermediate',
    description:
      'The systems language behind games, browsers, databases and embedded devices. From the compile model and types to pointers, OOP, the STL, and modern RAII / smart-pointer memory management — with an emphasis on writing fast, memory-safe code.',
    objectives: [
      'Build and run C++ programs and reason about the compile model',
      'Use pointers, references and the stack/heap correctly',
      'Design classes with constructors, inheritance and polymorphism',
      'Work fluently with the STL (vector, map, string, algorithms)',
      'Manage memory safely with RAII, smart pointers and move semantics',
    ],
    skills: ['cpp', 'systems'],
    certifications: ['cpa-cpp'],
    modules: {
      beginner: { title: 'C++ Fundamentals', summary: 'Compile model, types, control flow and functions.' },
      intermediate: { title: 'Pointers, Classes & the STL', summary: 'Memory, OOP and the standard containers.' },
      advanced: { title: 'Modern C++ & Safety', summary: 'RAII, smart pointers, templates, and avoiding undefined behaviour.' },
    },
  },
  {
    slug: 'go-programming',
    trackId: 'go',
    title: 'Go Programming',
    difficulty: 'Intermediate',
    description:
      'The simple, fast, statically-compiled language behind Docker, Kubernetes and Terraform. From the toolchain and types to slices, interfaces, explicit error handling and first-class concurrency with goroutines and channels.',
    objectives: [
      'Build Go programs and modules with the go toolchain',
      'Use slices, maps and structs idiomatically',
      'Model behaviour with methods and implicit interfaces',
      'Handle errors explicitly and wrap them well',
      'Write concurrent code with goroutines, channels and sync',
    ],
    skills: ['go', 'concurrency', 'cloud'],
    certifications: [],
    modules: {
      beginner: { title: 'Go Fundamentals', summary: 'Toolchain, types, control flow and functions.' },
      intermediate: { title: 'Data, Methods & Errors', summary: 'Slices and maps, structs, interfaces and error handling.' },
      advanced: { title: 'Concurrency & the Standard Library', summary: 'Goroutines, channels, net/http, JSON and testing.' },
    },
  },
  {
    slug: 'rust-programming',
    trackId: 'rust',
    title: 'Rust Programming',
    difficulty: 'Advanced',
    description:
      'Memory-safe systems programming without a garbage collector. Master the ownership and borrowing model, pattern matching with enums, Option/Result error handling, traits and generics, and fearless concurrency that catches data races at compile time.',
    objectives: [
      'Build and manage Rust projects with Cargo',
      'Reason about ownership, borrowing and lifetimes',
      'Model data with structs, enums, Option and Result',
      'Abstract with traits and generics at zero runtime cost',
      'Write concurrent code that is data-race-free by construction',
    ],
    skills: ['rust', 'systems', 'security'],
    certifications: [],
    modules: {
      beginner: { title: 'Rust Fundamentals', summary: 'Cargo, types, mutability and control flow.' },
      intermediate: { title: 'Ownership, Data & Errors', summary: 'Borrowing, structs/enums, collections and Result.' },
      advanced: { title: 'Traits, Generics & Concurrency', summary: 'Abstraction and fearless, race-free concurrency.' },
    },
  },
  {
    slug: 'sql-databases',
    trackId: 'sql',
    title: 'SQL & Databases',
    difficulty: 'Beginner',
    description:
      'Query, shape and protect relational data. From SELECT, filtering and aggregation through joins, subqueries and schema design, to transactions, indexing, and defending against SQL injection with parameterised queries and least privilege.',
    objectives: [
      'Write SELECT queries with filtering, sorting and aggregation',
      'Combine tables with inner and outer joins',
      'Design tables with keys, constraints and normalization',
      'Use subqueries, CTEs and set operators',
      'Reason about transactions, indexes, and SQL-injection defence',
    ],
    skills: ['sql', 'databases', 'security'],
    certifications: [],
    modules: {
      beginner: { title: 'Querying Fundamentals', summary: 'SELECT, filtering, sorting and aggregation.' },
      intermediate: { title: 'Joins, Schemas & Subqueries', summary: 'Combining tables, changing data, and nested queries.' },
      advanced: { title: 'Performance & Security', summary: 'Indexing, normalization, transactions and injection defence.' },
    },
  },
  {
    slug: 'docker-containers',
    trackId: 'docker',
    title: 'Docker & Containers',
    difficulty: 'Intermediate',
    description:
      'Build, ship and run applications in portable containers. From images and the Dockerfile to volumes, networking and Docker Compose, through to small, least-privilege, vulnerability-scanned images and production operations.',
    objectives: [
      'Explain containers vs VMs and the image/container model',
      'Write Dockerfiles and build efficient, cached images',
      'Run containers with ports, volumes and networks',
      'Orchestrate multi-container apps with Docker Compose',
      'Harden images: multi-stage, non-root, scanned and small',
    ],
    skills: ['docker', 'containers', 'devops'],
    certifications: [],
    modules: {
      beginner: { title: 'Containers & Images', summary: 'Containers vs VMs, the Dockerfile, and running containers.' },
      intermediate: { title: 'Data, Networking & Compose', summary: 'Volumes, networks, registries and multi-container apps.' },
      advanced: { title: 'Optimization, Security & Ops', summary: 'Small least-privilege images, scanning and operations.' },
    },
  },
  {
    slug: 'kubernetes-orchestration',
    trackId: 'kubernetes',
    title: 'Kubernetes Orchestration',
    difficulty: 'Advanced',
    description:
      'Run containers at scale with self-healing, declarative infrastructure. From pods, Deployments and manifests to Services, Ingress, storage and rolling updates, up to StatefulSets, autoscaling, and cluster security with RBAC and network policy.',
    objectives: [
      'Explain the cluster architecture and the reconciliation model',
      'Deploy and scale workloads with Deployments and manifests',
      'Expose apps with Services, DNS and Ingress',
      'Persist data and run rolling updates with health probes',
      'Secure a cluster with RBAC, network policy and pod hardening',
    ],
    skills: ['kubernetes', 'orchestration', 'devops'],
    certifications: ['cka'],
    modules: {
      beginner: { title: 'Cluster, Pods & Manifests', summary: 'Architecture, workloads, namespaces and config.' },
      intermediate: { title: 'Networking, Storage & Rollouts', summary: 'Services, Ingress, persistence, scaling and probes.' },
      advanced: { title: 'Workloads, Ops & Security', summary: 'StatefulSets, debugging, RBAC and network policy.' },
    },
  },
];
