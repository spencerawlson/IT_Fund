/**
 * Maps academy decks (flashcard lessons) to the interactive backend labs that let
 * students practice the same skills hands-on. Used by AcademyPlay's results screen
 * ("Keep practicing in the lab").
 *
 * Shape: deckId -> [{ labId, blurb }]. Track-level fallbacks apply when a deck has
 * no specific entry. Lab titles come from the backend registry at runtime; the
 * static TITLE map here is a fallback for pre-hydration rendering.
 */

export const LAB_TITLES = {
  'cyber-nmap-001': 'Service Enumeration with Nmap',
  'cyber-portblast-001': 'PortBlast: Full Assessment Workflow',
  'vuln-scanning-001': 'Vulnerability Assessment Workflow',
  'pentest-methodology-001': 'Full Pentest Methodology: Recon to Report',
  'k8s-fundamentals-001': 'Kubernetes Fundamentals',
  'terraform-fundamentals-001': 'Terraform Fundamentals: The IaC Workflow',
  'terraform-k8s-docker-001': 'Terraform for Kubernetes & Docker',
  'terraform-aws-001': 'Terraform for AWS',
  'terraform-azure-001': 'Terraform for Azure',
  'terraform-gcp-001': 'Terraform for GCP',
  'terraform-proxmox-001': 'Terraform for Proxmox VE',
  'sec-logtriage-001': 'Log Triage: Brute-Force Investigation',
  'siem-hunting-001': 'SIEM Threat Hunting',
  'net-vlan-001': 'VLANs and Inter-VLAN Routing',
  'net-static-routing-001': 'Static Routing Between Two Sites',
  'net-subnetting-001': 'Subnetting Mastery',
  'net-acl-001': 'Filtering Traffic with ACLs',
  'net-ospf-001': 'OSPF Single-Area Configuration',
  'net-ospf-tshoot-001': 'OSPF Troubleshooting',
  'net-eigrp-001': 'EIGRP Configuration',
  'net-eigrp-tshoot-001': 'EIGRP Troubleshooting',
  'net-rip-001': 'RIP Configuration',
  'net-rip-tshoot-001': 'RIP Troubleshooting',
  'net-bgp-001': 'eBGP Configuration',
  'net-dns-connectivity-001': 'DNS & Connectivity Troubleshooting',
  'cloud-aws-audit-001': 'Cloud Security Audit with the AWS CLI',
  'cloud-terraform-001': 'Terraform: Provision & Secure Infrastructure',
  'aws-cli-001': 'AWS CLI Fundamentals',
  'aws-iam-001': 'IAM Policies & Least Privilege',
  'sec-docker-siem-001': 'Docker + SIEM: Container Security Monitoring',
  'docker-fundamentals-001': 'Docker Fundamentals: Containers by Doing',
  'sec-c2beacon-001': 'C2 Beacon Hunt',
  'sec-dns-typo-001': 'DNS Tunneling & Typosquatting',
  'sec-ransomware-001': 'Ransomware over SMB',
  'py-basics-001': 'Python Scripting Basics',
  'py-netauto-001': 'Python for Network Automation',
  'py-automation-001': 'Automate with Python',
  'linux-terminal-001': 'Linux Terminal Essentials',
};

/** Deck-specific lab recommendations. */
const DECK_LABS = {
  // ---- Security+ (SY0-701) ----
  'sec-threats': [
    { labId: 'cyber-nmap-001', blurb: 'Enumerate services the way attackers do.' },
    { labId: 'sec-c2beacon-001', blurb: 'Hunt a command-and-control beacon.' },
  ],
  'sec-malware': [
    { labId: 'sec-ransomware-001', blurb: 'Contain ransomware spreading over SMB.' },
    { labId: 'sec-dns-typo-001', blurb: 'Spot DNS tunneling and typosquatting.' },
  ],
  'sec-iam': [
    { labId: 'aws-iam-001', blurb: 'Write least-privilege IAM policies and prove them with the simulator.' },
  ],
  'sec-architecture': [
    { labId: 'aws-cli-001', blurb: 'Build VPCs, EC2, and ALBs from the AWS CLI.' },
    { labId: 'net-vlan-001', blurb: 'Segment a network with VLANs.' },
  ],
  'sec-ops': [
    { labId: 'sec-logtriage-001', blurb: 'Investigate a brute-force attack in the logs.' },
    { labId: 'siem-hunting-001', blurb: 'Hunt three live attack chains in a SIEM.' },
  ],
  'sec-governance': [
    { labId: 'vuln-scanning-001', blurb: 'Prioritize vulnerabilities by real risk, not just CVSS.' },
  ],

  // ---- AWS Solutions Architect – Associate ----
  'saa-iam': [
    { labId: 'aws-iam-001', blurb: 'IAM policies, trust relationships, and permissions boundaries.' },
  ],
  'saa-network-security': [
    { labId: 'aws-cli-001', blurb: 'Build the VPC, subnets, and ALB yourself.' },
    { labId: 'net-vlan-001', blurb: 'Practice network segmentation hands-on.' },
  ],
  'saa-data-protection': [{ labId: 'aws-cli-001', blurb: 'Create S3 buckets and work with encryption settings.' }],
  'saa-ha-compute': [{ labId: 'aws-cli-001', blurb: 'Launch EC2 and inspect ALB target health.' }],
  'saa-decoupling': [{ labId: 'aws-cli-001', blurb: 'See decoupled compute behind a load balancer.' }],
  'saa-backup-dr': [{ labId: 'aws-cli-001', blurb: 'Snapshot-style thinking: build, then clean up properly.' }],
  'saa-storage': [
    { labId: 'aws-cli-001', blurb: 'S3 buckets, uploads, and lifecycle from the CLI.' },
    { labId: 'terraform-aws-001', blurb: 'Define the same storage in Terraform HCL.' },
  ],
  'saa-databases': [{ labId: 'aws-cli-001', blurb: 'Work the CLI patterns RDS questions assume.' }],
  'saa-caching-cdn': [{ labId: 'aws-cli-001', blurb: 'CLI fluency for architecture scenarios.' }],
  'saa-compute-cost': [{ labId: 'terraform-aws-001', blurb: 'Right-size infrastructure as code.' }],
  'saa-storage-cost': [{ labId: 'terraform-aws-001', blurb: 'Model storage tiers in HCL.' }],

  // ---- Network+ (N10-009) ----
  'net-ports': [
    { labId: 'cyber-nmap-001', blurb: 'Scan ports and identify services.' },
    { labId: 'cyber-portblast-001', blurb: 'Full port-scan assessment workflow.' },
  ],
  'net-devices-media': [{ labId: 'net-vlan-001', blurb: 'Configure VLANs and inter-VLAN routing.' }],
  'net-ip-subnet': [{ labId: 'net-subnetting-001', blurb: 'Master CIDR, VLSM, and route summarization.' }],
  'net-switch-route': [
    { labId: 'net-static-routing-001', blurb: 'Route between two sites statically.' },
    { labId: 'net-ospf-001', blurb: 'Bring up single-area OSPF.' },
    { labId: 'net-vlan-001', blurb: 'Switching fundamentals with VLANs.' },
  ],
  'net-services-wireless': [{ labId: 'net-dns-connectivity-001', blurb: 'Troubleshoot DNS and connectivity.' }],
  'net-troubleshoot': [
    { labId: 'net-dns-connectivity-001', blurb: 'Systematic connectivity troubleshooting.' },
    { labId: 'net-ospf-tshoot-001', blurb: 'Diagnose broken OSPF adjacencies.' },
  ],
  'net-ops': [{ labId: 'linux-terminal-001', blurb: 'The CLI skills every net admin needs.' }],
  'net-security': [{ labId: 'net-acl-001', blurb: 'Write ACLs that actually filter traffic.' }],

  // ---- Linux+ ----
  'lx-cli': [{ labId: 'linux-terminal-001', blurb: 'Navigate, manage files, and pipe like a pro.' }],
  'lx-perms': [{ labId: 'linux-terminal-001', blurb: 'chmod, chown, and permission troubleshooting.' }],
  'lx-users': [{ labId: 'linux-terminal-001', blurb: 'Create users and manage access.' }],
  'lx-text': [{ labId: 'linux-terminal-001', blurb: 'grep, find, and text processing drills.' }],
  'lx-packages': [{ labId: 'linux-terminal-001', blurb: 'Package and process management.' }],
  'lx-systemd': [{ labId: 'linux-terminal-001', blurb: 'systemctl and journalctl in a broken-nginx rescue.' }],
  'lx-network': [{ labId: 'linux-terminal-001', blurb: 'ip, ss, and network diagnostics.' }],
  'lx-bash': [
    { labId: 'linux-terminal-001', blurb: 'Scripting foundations in a real shell.' },
    { labId: 'py-basics-001', blurb: 'Level up to Python automation next.' },
  ],
  'lx-logs': [{ labId: 'linux-terminal-001', blurb: 'Mine logs with grep and journalctl.' }],
  'lx-secure': [{ labId: 'linux-terminal-001', blurb: 'Harden users, permissions, and services.' }],

  // ---- CySA+ (CS0-003) ----
  'cysa-soc-foundations': [{ labId: 'sec-logtriage-001', blurb: 'SOC analyst workflow: triage a brute-force attack.' }],
  'cysa-vuln-basics': [{ labId: 'vuln-scanning-001', blurb: 'Read CVSS vectors and scan results.' }],
  'cysa-siem-soar': [{ labId: 'siem-hunting-001', blurb: 'Query a SIEM across three attack chains.' }],
  'cysa-threat-hunting': [
    { labId: 'siem-hunting-001', blurb: 'Proactive hunting, not just alert triage.' },
    { labId: 'sec-c2beacon-001', blurb: 'Beacon-hunting drill.' },
    { labId: 'sec-dns-typo-001', blurb: 'DNS-based exfiltration hunt.' },
  ],
  'cysa-vuln-management': [{ labId: 'vuln-scanning-001', blurb: 'Prioritize with EPSS, KEV, and asset context.' }],
  'cysa-incident-response': [
    { labId: 'sec-ransomware-001', blurb: 'Full IR loop on a ransomware outbreak.' },
    { labId: 'siem-hunting-001', blurb: 'Scope and contain with SIEM timelines.' },
  ],
  'cysa-attack-frameworks': [
    { labId: 'cyber-portblast-001', blurb: 'Attacker methodology, mapped to MITRE thinking.' },
    { labId: 'pentest-methodology-001', blurb: 'Recon through reporting, end to end.' },
  ],
  'cysa-reporting': [{ labId: 'vuln-scanning-001', blurb: 'Write the executive summary from real findings.' }],

  // ---- AWS Security Specialty (SCS-C02) ----
  'awss-threat-detect': [
    { labId: 'siem-hunting-001', blurb: 'Detection logic against real attack chains.' },
    { labId: 'sec-c2beacon-001', blurb: 'C2 detection drill.' },
  ],
  'awss-logging': [{ labId: 'sec-logtriage-001', blurb: 'Log analysis fundamentals.' }],
  'awss-iam-foundations': [{ labId: 'aws-iam-001', blurb: 'Core IAM policy evaluation.' }],
  'awss-incident-response': [{ labId: 'siem-hunting-001', blurb: 'Isolate hosts and scope incidents.' }],
  'awss-monitor-analyze': [
    { labId: 'cloud-aws-audit-001', blurb: 'Audit an AWS account with the CLI.' },
    { labId: 'aws-cli-001', blurb: 'CloudWatch and CLI monitoring patterns.' },
  ],
  'awss-network-security': [
    { labId: 'net-acl-001', blurb: 'Packet filtering that maps to security groups.' },
    { labId: 'net-vlan-001', blurb: 'Segmentation thinking for VPC design.' },
  ],
  'awss-iam-advanced': [{ labId: 'aws-iam-001', blurb: 'Cross-account roles, trust policies, boundaries.' }],
  'awss-data-protection': [{ labId: 'aws-cli-001', blurb: 'S3 encryption and key handling from the CLI.' }],
  'awss-secure-compute': [{ labId: 'aws-cli-001', blurb: 'Harden compute from the command line.' }],
  'awss-governance': [{ labId: 'cloud-aws-audit-001', blurb: 'Audit for compliance drift.' }],

  // ---- CISSP ----
  'cissp-d4': [
    { labId: 'net-vlan-001', blurb: 'Network segmentation in practice.' },
    { labId: 'net-acl-001', blurb: 'Defense in depth at the packet filter.' },
  ],
  'cissp-d5': [{ labId: 'aws-iam-001', blurb: 'Identity and access management, hands-on.' }],
  'cissp-d7': [
    { labId: 'siem-hunting-001', blurb: 'Security operations under fire.' },
    { labId: 'vuln-scanning-001', blurb: 'Vulnerability management workflow.' },
  ],

  // ---- Routing track ----
  'rt-ospf': [
    { labId: 'net-ospf-001', blurb: 'Configure single-area OSPF.' },
    { labId: 'net-ospf-tshoot-001', blurb: 'Then break it and fix it.' },
  ],
  'rt-bgp': [{ labId: 'net-bgp-001', blurb: 'eBGP peering, hands-on.' }],
  'rt-eigrp': [
    { labId: 'net-eigrp-001', blurb: 'Configure EIGRP.' },
    { labId: 'net-eigrp-tshoot-001', blurb: 'Troubleshoot EIGRP.' },
  ],
  'rt-rip': [
    { labId: 'net-rip-001', blurb: 'Configure RIP.' },
    { labId: 'net-rip-tshoot-001', blurb: 'Troubleshoot RIP.' },
  ],
  'rt-fundamentals': [{ labId: 'net-static-routing-001', blurb: 'Static routing between two sites.' }],
  'rt-acls': [{ labId: 'net-acl-001', blurb: 'Filter traffic with ACLs.' }],
  'rt-routing-troubleshooting': [{ labId: 'net-dns-connectivity-001', blurb: 'Connectivity troubleshooting drill.' }],

  // ---- Cyber track ----
  'cy-concepts': [{ labId: 'cyber-nmap-001', blurb: 'See enumeration from the attacker side.' }],
  'cy-threats': [{ labId: 'sec-c2beacon-001', blurb: 'Hunt active threats.' }],
  'cy-pentest': [
    { labId: 'pentest-methodology-001', blurb: 'Full methodology: recon to report.' },
    { labId: 'cyber-portblast-001', blurb: 'Assessment workflow with PortBlast.' },
  ],
  'cy-soc': [
    { labId: 'sec-logtriage-001', blurb: 'Triage like a SOC analyst.' },
    { labId: 'siem-hunting-001', blurb: 'Hunt in a full SIEM.' },
  ],
  'cy-ir': [{ labId: 'sec-ransomware-001', blurb: 'Incident response under pressure.' }],

  // ---- Cloud track ----
  'cl-core-services': [{ labId: 'aws-cli-001', blurb: 'Drive AWS from the CLI.' }],
  'cl-security': [
    { labId: 'aws-iam-001', blurb: 'Lock down IAM.' },
    { labId: 'cloud-aws-audit-001', blurb: 'Audit the account you built.' },
  ],
  'cl-networking': [{ labId: 'aws-cli-001', blurb: 'Build VPCs and subnets from the CLI.' }],
  'cl-containers-iac': [
    { labId: 'terraform-aws-001', blurb: 'Write the infrastructure as HCL.' },
    { labId: 'docker-fundamentals-001', blurb: 'Containers by doing.' },
  ],
  'cl-architecture': [{ labId: 'terraform-aws-001', blurb: 'Three-tier architecture as code.' }],

  // ---- Terraform track ----
  'tf-basics': [{ labId: 'terraform-fundamentals-001', blurb: 'The init → plan → apply workflow.' }],
  'tf-aws': [{ labId: 'terraform-aws-001', blurb: 'Real HCL for VPC, EC2, S3, and RDS.' }],
  'tf-azure': [{ labId: 'terraform-azure-001', blurb: 'Real HCL for resource groups, VNets, and VMs.' }],
  'tf-gcp': [{ labId: 'terraform-gcp-001', blurb: 'Real HCL for VPCs, Compute Engine, and GCS.' }],
  'tf-proxmox': [{ labId: 'terraform-proxmox-001', blurb: 'Homelab IaC: VMs and LXC as code.' }],
  'tf-k8s': [{ labId: 'terraform-k8s-docker-001', blurb: 'Deployments and services as HCL.' }],
  'tf-state': [{ labId: 'terraform-aws-001', blurb: 'Remote state with S3 and locking.' }],
  'tf-modules': [{ labId: 'terraform-aws-001', blurb: 'Modules in a three-tier capstone.' }],

  // ---- Docker / Kubernetes ----
  'docker-basics': [{ labId: 'docker-fundamentals-001', blurb: 'Images, containers, volumes, networks.' }],
  'docker-compose': [{ labId: 'docker-fundamentals-001', blurb: 'Multi-container apps by doing.' }],
  'docker-security': [{ labId: 'sec-docker-siem-001', blurb: 'Monitor containers in a SIEM.' }],
  'k8s-basics': [{ labId: 'k8s-fundamentals-001', blurb: 'Deploy, expose, and scale.' }],
  'k8s-workloads': [{ labId: 'k8s-fundamentals-001', blurb: 'Troubleshoot a CrashLoopBackOff.' }],
  'k8s-iac': [{ labId: 'terraform-k8s-docker-001', blurb: 'The same workloads, as Terraform HCL.' }],

  // ---- Python ----
  'py-basics': [{ labId: 'py-basics-001', blurb: 'Scripting basics, hands-on.' }],
  'py-netauto': [{ labId: 'py-netauto-001', blurb: 'Automate network devices with Python.' }],
  'py-automation': [{ labId: 'py-automation-001', blurb: 'Automate real workflows.' }],
};

/** Track-level fallbacks for decks without a specific entry. */
const TRACK_LABS = {
  security: [
    { labId: 'sec-logtriage-001', blurb: 'SOC-style log investigation.' },
    { labId: 'vuln-scanning-001', blurb: 'Risk-based vulnerability prioritization.' },
  ],
  'aws-saa': [
    { labId: 'aws-cli-001', blurb: 'Build the architectures from the CLI.' },
    { labId: 'terraform-aws-001', blurb: 'Define them as Terraform HCL.' },
  ],
  network: [
    { labId: 'net-subnetting-001', blurb: 'Subnetting drills with worked solutions.' },
    { labId: 'net-vlan-001', blurb: 'Switching and VLANs hands-on.' },
  ],
  linux: [{ labId: 'linux-terminal-001', blurb: 'Every objective in a real-feeling shell.' }],
  cysa: [
    { labId: 'siem-hunting-001', blurb: 'Hunt three attack chains in a SIEM.' },
    { labId: 'vuln-scanning-001', blurb: 'Vulnerability management workflow.' },
  ],
  'aws-security': [
    { labId: 'aws-iam-001', blurb: 'IAM policy simulator and least privilege.' },
    { labId: 'cloud-aws-audit-001', blurb: 'Audit an AWS account with the CLI.' },
  ],
  cissp: [
    { labId: 'siem-hunting-001', blurb: 'Security operations, hands-on.' },
    { labId: 'aws-iam-001', blurb: 'Identity and access in practice.' },
  ],
  routing: [
    { labId: 'net-ospf-001', blurb: 'OSPF configuration lab.' },
    { labId: 'net-static-routing-001', blurb: 'Static routing fundamentals.' },
  ],
  cyber: [
    { labId: 'pentest-methodology-001', blurb: 'Full pentest methodology.' },
    { labId: 'cyber-portblast-001', blurb: 'Assessment workflow.' },
  ],
  cloud: [
    { labId: 'aws-cli-001', blurb: 'AWS CLI fundamentals.' },
    { labId: 'cloud-terraform-001', blurb: 'Provision and secure infrastructure.' },
  ],
  terraform: [
    { labId: 'terraform-fundamentals-001', blurb: 'The IaC workflow.' },
    { labId: 'terraform-aws-001', blurb: 'Real HCL for AWS.' },
  ],
  docker: [{ labId: 'docker-fundamentals-001', blurb: 'Containers by doing.' }],
  kubernetes: [{ labId: 'k8s-fundamentals-001', blurb: 'Deploy, expose, scale, troubleshoot.' }],
  python: [{ labId: 'py-basics-001', blurb: 'Scripting basics.' }],
  ai: [],
  cpp: [],
  go: [],
  rust: [],
  sql: [],
  git: [],
};

/**
 * Labs recommended for a deck. Falls back to the track-level list.
 * @returns {Array<{labId: string, blurb: string}>}
 */
export function getLabsForDeck(deckId, trackId) {
  if (deckId && DECK_LABS[deckId]?.length) return DECK_LABS[deckId];
  if (trackId && TRACK_LABS[trackId]?.length) return TRACK_LABS[trackId];
  return [];
}

export function labTitle(labId) {
  return LAB_TITLES[labId] || labId;
}
