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
  'net-security': 'net-acl-001',
  'net-troubleshoot': 'net-dns-connectivity-001',

  // Routing
  'rt-fundamentals': 'net-static-routing-001',
  'rt-static': 'net-static-routing-001',
  'rt-rip': 'net-rip-001',
  'rt-ospf': 'net-ospf-001',
  'rt-eigrp': 'net-eigrp-001',
  'rt-bgp': 'net-bgp-001',
  'rt-routing-troubleshooting': 'net-ospf-tshoot-001',
  'rt-routing-security': 'net-acl-001',

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
  'docker-optimization-security': 'sec-docker-siem-001',
  'k8s-basics': 'k8s-fundamentals-001',
  'k8s-security': 'k8s-fundamentals-001',
  'tf-iac-basics': 'terraform-fundamentals-001',
  'tf-core-workflow': 'terraform-fundamentals-001',
  'tf-resources': 'terraform-fundamentals-001',
  'tf-state-backends': 'terraform-fundamentals-001',
  'tf-prod-security': 'iac-policy-001',
  'tf-prod-security': 'cloud-terraform-001',
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
