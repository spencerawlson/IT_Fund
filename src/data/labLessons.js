/**
 * Lesson → interactive lab associations ("Learn → Do").
 *
 * Maps lesson IDs (src/data/catalog/lessons/*) to the most relevant hands-on
 * lab ID (backend/labs/definitions/*). LessonView renders a "Launch Lab" card
 * when the current lesson has an entry here. One primary lab per lesson keeps
 * the choice obvious; the labs page lists the full catalogue.
 *
 * Lab IDs are the canonical identifiers (not slugs) — the same IDs the
 * /labs/:labId route and the backend entitlement check use.
 *
 * Labs that only run inside a mission (MISSION_ONLY_LABS in ./missions)
 * have no entry here, so no lesson shows a Launch Lab card for them.
 */
export const LAB_FOR_LESSON = {
  // Python
  'py-basics': 'py-basics-001',
  'py-automation': 'py-automation-001',
  'py-security-tools': 'py-automation-001',
  'py-files-errors': 'py-netauto-001',
  'py-collections': 'py-netauto-001',

  // Networking
  'net-osi': 'net-vlan-001',
  'net-switch-route': 'net-vlan-001',
  'net-ip-subnet': 'net-subnetting-001',
  'net-troubleshoot': 'net-dns-connectivity-001',

  // Routing
  'rt-fundamentals': 'net-static-routing-001',
  'rt-static': 'net-static-routing-001',
  'rt-rip': 'net-rip-001',
  'rt-ospf': 'net-ospf-001',
  'rt-eigrp': 'net-eigrp-001',
  'rt-bgp': 'net-bgp-001',
  'rt-routing-troubleshooting': 'net-ospf-tshoot-001',

  // Linux
  'lx-cli': 'linux-terminal-001',
  'lx-perms': 'linux-permissions-001',
  'lx-users': 'linux-users-001',
  'lx-bash': 'linux-cron-001',
  'lx-logs': 'linux-audit-001',
  'lx-text': 'linux-terminal-001',
  'lx-network': 'linux-ssh-001',
  'lx-systemd': 'linux-services-001',
  'lx-secure': 'linux-hardening-001',

  // Security+
  'sec-threats': 'cyber-nmap-001',
  'sec-malware': 'sec-ransomware-001',
  'sec-ops': 'sec-logtriage-001',
  'sec-architecture': 'vuln-scanning-001',
  'sec-crypto': 'vuln-scanning-001',

  // Cybersecurity (blue team)
  'cy-soc': 'siem-hunting-001',
  'cy-detection': 'sec-c2beacon-001',
  'cy-detection-labs': 'sec-logtriage-001',
  'cy-pentest': 'pentest-methodology-001',
  'cy-threat-intel': 'sec-dns-typo-001',
  'cy-ir-forensics': 'sec-ransomware-001',
  'cy-vulns': 'vuln-scanning-001',
  'cy-threat-actors': 'cyber-portblast-001',
  'cy-malware': 'sec-ransomware-001',
  'cy-linux': 'linux-terminal-001',
  'cy-web': 'sec-webapp-001',

  // Cloud
  'cl-security': 'cloud-aws-audit-001',
  'cl-networking': 'cloud-aws-audit-001',
  'cl-containers-iac': 'cloud-terraform-001',
  'cl-architecture': 'cloud-terraform-001',

  // AWS
  'saa-iam': 'aws-iam-001',
  'awss-iam-foundations': 'aws-iam-001',
  'awss-iam-advanced': 'aws-iam-001',
  'saa-ha-compute': 'aws-cli-001',
  'saa-storage': 'aws-cli-001',
  'awss-logging': 'cloud-aws-audit-001',
  'awss-threat-detect': 'cloud-aws-audit-001',
  'awss-network-security': 'cloud-aws-audit-001',
  'awss-data-protection': 'cloud-aws-audit-001',

  // Docker / Kubernetes / Terraform
  'docker-basics': 'docker-fundamentals-001',
  'docker-run': 'docker-fundamentals-001',
  'docker-compose': 'docker-fundamentals-001',
  'docker-images': 'docker-fundamentals-001',
  'docker-data-net': 'docker-fundamentals-001',
  'docker-registry': 'docker-fundamentals-001',
  'docker-ops': 'docker-fundamentals-001',
  'docker-optimization-security': 'sec-docker-siem-001',
  'k8s-basics': 'k8s-fundamentals-001',
  'k8s-security': 'k8s-fundamentals-001',
  'k8s-workloads': 'k8s-fundamentals-001',
  'k8s-config': 'k8s-fundamentals-001',
  'k8s-networking': 'k8s-fundamentals-001',
  'k8s-deployments': 'k8s-fundamentals-001',
  'k8s-operations': 'k8s-fundamentals-001',
  'tf-iac-basics': 'terraform-fundamentals-001',
  'tf-core-workflow': 'terraform-fundamentals-001',
  'tf-resources': 'terraform-fundamentals-001',
  'tf-state-backends': 'terraform-fundamentals-001',
  'tf-variables': 'terraform-fundamentals-001',
  'tf-expressions': 'terraform-fundamentals-001',
  'tf-modules': 'terraform-fundamentals-001',
  'tf-meta-lifecycle': 'terraform-fundamentals-001',
  'tf-prod-security': 'cloud-terraform-001', // was duplicated with iac-policy-001: the
  // lesson's arc is the safe CI pipeline (fmt -> plan -> scan -> review -> gated apply),
  // which is what this lab runs; iac-policy-001 is the deeper policy-as-code dive.

  // IT Foundations
  'it-files-cli': 'linux-terminal-001',
  'lx-packages': 'linux-terminal-001',

  // Python — control flow is what py-basics-001 drills (loops, scripts);
  // OOP, concurrency and testing have no matching backend lab yet.
  'py-flow': 'py-basics-001',

  // Networking — PortBlast starts from port enumeration; the topology
  // builder labs are the hands-on half of devices/topologies (001),
  // DMZ segmentation (003) and fault-tolerant cores (004).
  'net-ports': 'cyber-portblast-001',
  'net-devices-media': 'net-topology-001',
  'net-ops': 'net-topology-004',

  // Security+ — IAM policy writing is the aws-iam-001 lab, already the
  // results-screen recommendation for this deck (deckLabs.js).
  'sec-iam': 'aws-iam-001',

  // Cybersecurity (blue team) — architecture lessons map to the lab that
  // builds the thing: DMZ segmentation and cloud security audit.
  'cy-net-arch': 'net-topology-003',
  'cy-cloud-arch': 'cloud-aws-audit-001',

  // CySA+ — every lesson maps to the analyst lab that runs the same skill:
  // SIEM hunting for SOC/triage/hunting, vuln scanning for vuln work,
  // ransomware containment for IR, pentest methodology for frameworks.
  'cysa-soc-foundations': 'siem-hunting-001',
  'cysa-vuln-basics': 'vuln-scanning-001',
  'cysa-siem-soar': 'siem-hunting-001',
  'cysa-threat-hunting': 'siem-hunting-001',
  'cysa-vuln-management': 'vuln-scanning-001',
  'cysa-incident-response': 'sec-ransomware-001',
  'cysa-attack-frameworks': 'pentest-methodology-001',

  // Security+ scenario lessons — same mapping, scenario by scenario:
  // the lab runs the scenario the lesson examines. Theory-only scenario
  // sets (data protection, resilience, concepts, crypto, risk,
  // governance, third-party) have no matching backend lab and stay
  // unmapped rather than pointing at a forced fit.
  'secplus-soc-scenarios': 'siem-hunting-001',
  'secplus-hardening-vuln': 'vuln-scanning-001',
  'secplus-ir-scenarios': 'sec-ransomware-001',
  'secplus-threat-scenarios': 'sec-c2beacon-001',
  'secplus-malware-scenarios': 'sec-ransomware-001',
  'secplus-social-web-scenarios': 'sec-webapp-001',
  'secplus-vuln-scenarios': 'vuln-scanning-001',
  'secplus-cloud-scenarios': 'cloud-aws-audit-001',
  'secplus-netarch-scenarios': 'net-topology-001',

  // AWS — the audit lab is the hands-on half of monitoring/analysis and
  // of network security (it inspects security groups and posture).
  'awss-monitor-analyze': 'cloud-aws-audit-001',
  'saa-network-security': 'cloud-aws-audit-001',
};

/** Reverse index: lab ID → lesson IDs that point at it. Built once. */
export const LESSONS_FOR_LAB = Object.entries(LAB_FOR_LESSON).reduce((acc, [lessonId, labId]) => {
  (acc[labId] = acc[labId] || []).push(lessonId);
  return acc;
}, {});

/** The lab to launch from a lesson page, or undefined. */
export function labForLesson(lessonId) {
  return LAB_FOR_LESSON[lessonId];
}

/**
 * Extra labs for a lesson, beyond the primary above. A lesson with more than
 * one hands-on angle keeps one primary (the "Launch Lab" button's first
 * target) and lists the rest beside it — the primary's link never moves.
 * net-troubleshoot: DNS connectivity is the primary; the Wireshark lab is
 * the packet-capture angle for the same troubleshooting method.
 */
export const EXTRA_LABS_FOR_LESSON = {
  'net-troubleshoot': ['tools-wireshark-001'],
  // Same skill, second angle — the primary's link never moves.
  // tf-prod-security: policy-as-code is the deeper dive the primary's
  // safe-CI-pipeline arc points at (see the primary's comment above).
  'tf-prod-security': ['iac-policy-001'],
  // cl-containers-iac: the same workloads as Terraform HCL.
  'cl-containers-iac': ['terraform-k8s-docker-001'],
  // docker-optimization-security: image scanning beside SIEM monitoring.
  'docker-optimization-security': ['sec-trivy-001'],
  // cy-web: fixing SQL injection beside testing for it.
  'cy-web': ['py-sqli-001'],
  // rt-routing-troubleshooting: the same troubleshooting skill on the
  // other two protocols.
  'rt-routing-troubleshooting': ['net-rip-tshoot-001', 'net-eigrp-tshoot-001'],
};

/** Every lab launchable from a lesson page: the primary first, then extras. */
export function labsForLesson(lessonId) {
  const primary = LAB_FOR_LESSON[lessonId];
  if (!primary) return [];
  return [primary, ...(EXTRA_LABS_FOR_LESSON[lessonId] || [])];
}
