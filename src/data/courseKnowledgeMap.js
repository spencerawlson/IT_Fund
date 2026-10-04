import { COURSE_KNOWLEDGE } from './courseKnowledge';

// Keyword map keyed by real module ids (see src/data/modules.js). Each module's
// keywords are drawn from its title, subtitle, and concept terms, and matched
// against the course documents' full text to attribute sources in ModuleSources.
const MAP = [
  { id: "module-2", keywords: ["computer", "storage", "cpu", "units", "memory", "hierarchy", "processors", "system", "architecture", "hardware", "software", "types", "computers", "input", "process", "output", "i/o", "ports", "buses", "cache", "ram", "components", "architectures", "cores"] },
  { id: "module-3", keywords: ["boot", "file", "systems", "partition", "tables", "process", "storage", "management", "operating", "system", "bios", "uefi", "bootloaders", "table", "mbr", "gpt", "primary", "extended", "logical", "partitions", "formatting", "ntfs", "ext4", "fat32"] },
  { id: "module-6", keywords: ["dhcp", "addressing", "assignment", "nat", "subnetting", "address", "classes", "network", "host", "subnet", "mask", "cidr", "private", "public", "bogon", "reserved", "addresses", "default", "gateway", "static", "dynamic", "apipa", "pat", "table"] },
  { id: "module-31", keywords: ["computer", "networking", "network", "types", "topologies", "addressing", "communication", "modes", "pan", "lan", "can", "man", "wan", "ethernet", "wi-fi", "nic", "mac", "address", "ipv4", "ipv6", "frames", "packets", "segments", "datagrams"] },
  { id: "cloud-foundations", keywords: ["cloud", "computing", "foundations", "service", "models", "deployment", "concepts", "iaas", "paas", "saas", "public", "private", "hybrid", "opex", "capex", "elasticity", "regions", "availability", "zones"] },
  { id: "virtualization", keywords: ["virtualization", "containers", "hypervisors", "virtual", "machines", "docker", "kubernetes", "hypervisor", "type", "machine", "container", "pod", "image"] },
  { id: "cloud-networking", keywords: ["cloud", "networking", "vpcs", "subnets", "load", "balancers", "cdn", "connectivity", "vpc", "security", "groups", "balancer", "dns", "peering", "nat", "gateway", "direct", "connect", "transit"] },
  { id: "cloud-storage", keywords: ["cloud", "storage", "data", "object", "block", "file", "managed", "databases", "lakes", "nas", "san", "raid", "database", "nosql", "lake", "snapshots", "tiers", "replication", "ephemeral"] },
  { id: "cloud-security", keywords: ["cloud", "security", "identity", "iam", "zero", "trust", "encryption", "shared", "responsibility", "model", "least", "privilege", "rest", "transit", "kms", "mfa", "sso", "compliance"] },
  { id: "cloud-architecture", keywords: ["cloud", "architecture", "scalability", "microservices", "serverless", "auto-scaling", "ha/dr", "finops", "high", "availability", "rto", "rpo", "multi-region", "infrastructure", "code", "ci/cd", "event-driven"] },
  { id: "it-fundamentals-internals", keywords: ["binary", "internals", "bits", "bytes", "bios/uefi", "processes", "kernel", "space", "cli", "number", "systems", "converting", "bases", "hexadecimal", "practice", "encoding", "input", "process", "output", "storage", "bios", "uefi", "thread", "user"] },
  { id: "osi-protocols", keywords: ["osi", "model", "protocols", "layers", "dns", "nat", "arp", "key", "layer", "physical", "data", "link", "network", "transport", "session", "presentation", "application", "caching", "ttl", "icmp", "http", "https", "ssh", "snmp"] },
  { id: "network-devices-tools", keywords: ["network", "devices", "tools", "routers", "switches", "firewalls", "ping", "traceroute", "wireshark", "router", "switch", "vlan", "native", "inter-vlan", "routing", "concepts", "protocols", "firewall", "load", "balancer", "ipconfig", "ifconfig", "nslookup", "tracert"] },
  { id: "windows-active-directory", keywords: ["windows", "enterprise", "active", "directory", "group", "policy", "ntfs", "permissions", "server", "domain", "controller", "gpo", "organizational", "units", "ous", "ad-integrated", "dns", "event", "logs"] },
  { id: "linux-administration", keywords: ["linux", "administration", "permissions", "systemd", "package", "managers", "scripting", "users", "file", "rwx", "chmod", "chown", "services", "shell", "bash", "user", "management", "processes", "logs", "ssh", "remote", "admin"] },
  { id: "cybersecurity-fundamentals", keywords: ["cybersecurity", "cia", "triad", "threats", "network", "security", "identity", "hardening", "malware", "phishing", "ddos", "attack", "man-in-the-middle", "mitm", "firewalls", "ids/ips", "vpn", "owasp", "top", "mfa", "least", "privilege"] },
  { id: "cryptography-essentials", keywords: ["cryptography", "symmetric/asymmetric", "encryption", "hashing", "tls", "pki", "symmetric", "asymmetric", "ssl/tls", "certificates", "digital", "signatures", "key", "exchange", "diffie-hellman", "salt", "password", "storage"] },
  { id: "devops-automation", keywords: ["devops", "automation", "git", "ci/cd", "pipelines", "infrastructure", "code", "monitoring", "version", "control", "continuous", "integration", "delivery/deployment", "pipeline", "automated", "testing", "observability", "gitops"] },
  { id: "advanced-cybersecurity-soc", keywords: ["cybersecurity", "soc", "pentesting", "ethical", "hacking", "incident", "response", "red/blue", "teams", "penetration", "testing", "metasploit", "burp", "suite", "security", "operations", "center", "threat", "hunting", "red", "team", "blue", "zero", "trust"] },
  { id: "system-design-reliability", keywords: ["system", "design", "reliability", "distributed", "systems", "observability", "slas", "chaos", "engineering", "microservices", "architecture", "event-driven", "api", "sla", "slo", "sli", "scalability", "patterns"] },
  { id: "cloud-data-analytics", keywords: ["cloud", "data", "analytics", "warehouses", "lakes", "streaming", "etl/elt", "platforms", "warehouse", "lake", "lakehouse", "etl", "elt", "batch", "visualization", "mesh", "partitioning", "pruning", "observability"] },
  { id: "cloud-monitoring-observability", keywords: ["cloud", "monitoring", "observability", "metrics", "logs", "traces", "alerts", "production", "incident", "response", "distributed", "tracing", "alerting", "paging", "sli", "slo", "sla", "error", "budgets", "synthetic", "probes", "canaries", "runbooks", "cloudwatch"] },
  { id: "cloud-governance-compliance", keywords: ["cloud", "governance", "compliance", "policy-as-code", "audit", "frameworks", "posture", "management", "cspm", "soc", "iso", "27001", "pci", "dss", "hipaa", "cost", "budgets", "logging", "forensics", "data", "residency", "sovereignty", "iam", "permission"] },
  { id: "cloud-dns-cdn", keywords: ["cloud", "dns", "cdn", "domain", "resolution", "routing", "policies", "edge", "caching", "global", "delivery", "hierarchy", "record", "types", "computing", "cache", "layers", "ddos", "protection", "waf", "dnssec", "service", "discovery"] },
  { id: "edge-networking-wan", keywords: ["edge", "networking", "wan", "sd-wan", "sase", "vpn", "branch", "connectivity", "optimization", "mpls", "zero", "trust", "network", "access", "private", "lte", "architecture", "observability"] },
  { id: "it-project-data-analytics", keywords: ["project", "data", "analytics", "delivery", "requirement", "analysis", "data-driven", "decisions", "reporting", "lifecycle", "requirements", "gathering", "agile", "waterfall", "stakeholder", "management", "risk", "issue", "quality", "maturity", "kpi", "dashboard", "design", "a/b"] },
  { id: "linux-unix-fundamentals", keywords: ["linux", "unix", "command", "line", "filesystem", "permissions", "processes", "shell", "scripting", "hierarchy", "ownership", "users", "groups", "sudo", "signals", "pipes", "redirection", "text", "tools", "package", "management", "systemd", "services", "ssh"] },
  { id: "python-automation-programming", keywords: ["python", "automation", "programming", "scripting", "libraries", "apis", "data", "handling", "practical", "programs", "file", "i/o", "paths", "requests", "parsing", "scraping", "testing", "debugging", "virtual", "envs", "packaging", "security", "safety"] },
  { id: "kubernetes-container-orchestration", keywords: ["kubernetes", "container", "orchestration", "clusters", "pods", "services", "deployments", "ingress", "helm", "pod", "deployment", "service", "dns", "configmaps", "secrets", "health", "probes", "volumes", "storageclasses", "packaging", "observability"] },
  { id: "database-fundamentals", keywords: ["database", "sql", "nosql", "data", "modeling", "indexing", "transactions", "relational", "model", "indexes", "query", "plans", "acid", "cap", "theorem", "sharding", "replication", "caching", "strategies", "change", "capture"] },
  { id: "cicd-gitops", keywords: ["ci/cd", "gitops", "pipelines", "automation", "release", "strategies", "declarative", "operations", "continuous", "integration", "delivery/deployment", "pipeline", "stages", "infrastructure", "code", "secrets", "management", "artifact", "testing", "observability", "releases"] },
  { id: "cybersecurity-basics", keywords: ["cybersecurity", "threats", "defenses", "identity", "encryption", "incident", "response", "cia", "triad", "attacks", "authentication", "authorization", "zero", "trust", "vulnerability", "management", "network", "secure", "coding", "compliance", "policy"] },
  { id: "troubleshooting-methodology", keywords: ["troubleshooting", "root", "cause", "analysis", "structured", "problem", "solving", "diagnostics", "reliable", "fixes", "mindset", "layered", "whys", "error", "budget", "blameless", "culture", "logs", "metrics", "traces", "common", "failure", "modes", "rollbacks"] },
  { id: "kubernetes-gitops", keywords: ["kubernetes", "gitops", "declarative", "control", "planes", "controllers", "progressive", "delivery", "policy", "plane", "custom", "resource", "definitions", "operators", "architecture", "enforcement", "multi-tenancy", "etcd", "cluster", "state", "service", "meshes", "api", "statefulsets"] },
  { id: "advanced-cloud-networking", keywords: ["cloud", "networking", "service", "mesh", "distributed", "dns", "transit", "peering", "hybrid", "routing", "gateway", "hub-spoke", "vpc", "limitations", "privatelink", "endpoint", "services", "bgp", "egress", "nat", "complexities", "network", "segmentation", "observability"] },
  { id: "monitoring-observability-advanced", keywords: ["monitoring", "observability", "opentelemetry", "sli", "engineering", "incident", "response", "production", "debugging", "service", "maps", "topology", "golden", "signals", "apm", "profiling", "log", "aggregation", "analysis", "slo", "burn", "rate", "alerting", "runbook"] },
  { id: "site-reliability-engineering", keywords: ["site", "reliability", "engineering", "sre", "culture", "error", "budgets", "incident", "management", "toil", "reduction", "principles", "blameless", "postmortems", "capacity", "planning", "change", "alerting", "hygiene", "user-facing", "career", "sli", "slo", "sla"] },
  { id: "infrastructure-as-code-deep-dive", keywords: ["infrastructure", "code", "terraform", "drift", "detection", "state", "management", "environments", "testing", "declarative", "desired", "plan", "apply", "modules", "composition", "iac", "secrets", "cloudformation", "policy", "governance", "immutable"] },
];
export function getSourcesForModule(moduleId) {
  const match = MAP.find((m) => m.id === moduleId);
  if (!match) return [];
  const sources = [];
  for (const doc of COURSE_KNOWLEDGE) {
    const text = (doc.fullText || '').toLowerCase();
    if (match.keywords.some((k) => text.includes(k))) sources.push({ source: doc.source, slug: doc.slug, pages: doc.pages });
  }
  return sources;
}

export function getSourcesForKeyword(keyword) {
  const q = keyword.toLowerCase();
  const out = [];
  for (const doc of COURSE_KNOWLEDGE) {
    const text = (doc.fullText || '').toLowerCase();
    if (text.includes(q)) out.push({ source: doc.source, slug: doc.slug, pages: doc.pages });
  }
  return out;
}
