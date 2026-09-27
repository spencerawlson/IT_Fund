// Shared metadata for the Academy: tiers, CISSP domains, roadmap phases, and free resources.

export const TIERS = [
  { id: 'beginner', label: 'Beginner', color: '#22C55E' },
  { id: 'intermediate', label: 'Intermediate', color: '#3B82F6' },
  { id: 'advanced', label: 'Advanced', color: '#F59E0B' },
];

// ISC2 CISSP exam outline, effective 15 April 2024 (current as of 2026).
export const CISSP_DOMAINS = [
  { id: 1, title: 'Security and Risk Management', weight: 16, color: '#F43F5E' },
  { id: 2, title: 'Asset Security', weight: 10, color: '#F59E0B' },
  { id: 3, title: 'Security Architecture and Engineering', weight: 13, color: '#A855F7' },
  { id: 4, title: 'Communication and Network Security', weight: 13, color: '#3B82F6' },
  { id: 5, title: 'Identity and Access Management', weight: 13, color: '#14B8A6' },
  { id: 6, title: 'Security Assessment and Testing', weight: 12, color: '#6366F1' },
  { id: 7, title: 'Security Operations', weight: 13, color: '#EF4444' },
  { id: 8, title: 'Software Development Security', weight: 10, color: '#22C55E' },
];

// The "best of" community path to CISSP: fundamentals -> CompTIA core -> hands-on
// defence -> cloud -> AI -> the managerial CISSP mindset. Each step names the track
// tiers that prepare you for it and the free-to-sit or common certification milestone.
export const ROADMAP = [
  {
    step: 1,
    title: 'Foundations',
    desc: 'Learn to script and learn how packets move. Everything later assumes both.',
    milestone: 'ISC2 Certified in Cybersecurity (CC): free training and exam voucher',
    tiers: [['python', 'beginner'], ['network', 'beginner']],
    months: '1-2',
  },
  {
    step: 2,
    title: 'Network+',
    desc: 'Subnetting, routing, switching, wireless, and structured troubleshooting.',
    milestone: 'CompTIA Network+ (N10-009)',
    tiers: [['network', 'intermediate'], ['network', 'advanced'], ['python', 'intermediate']],
    months: '2-3',
  },
  {
    step: 3,
    title: 'Security+',
    desc: 'The vocabulary of security: threats, controls, crypto, IAM, and governance.',
    milestone: 'CompTIA Security+ (SY0-701; SY0-801 from Nov 2026)',
    tiers: [['security', 'beginner'], ['security', 'intermediate'], ['security', 'advanced']],
    months: '2-3',
  },
  {
    step: 4,
    title: 'Hands-on Cybersecurity',
    desc: 'Blue team and red team practice: SOC work, detection, web attacks, and IR.',
    milestone: 'CompTIA CySA+ or PenTest+, plus TryHackMe / PortSwigger labs',
    tiers: [['cyber', 'beginner'], ['cyber', 'intermediate'], ['cyber', 'advanced'], ['python', 'advanced']],
    months: '3-4',
  },
  {
    step: 5,
    title: 'Cloud Security',
    desc: 'Shared responsibility, IAM, VPC design, containers, and cloud-native defence.',
    milestone: 'AWS Cloud Practitioner -> Solutions Architect Associate; ISC2 CCSP later',
    tiers: [['cloud', 'beginner'], ['cloud', 'intermediate'], ['cloud', 'advanced']],
    months: '3-4',
  },
  {
    step: 6,
    title: 'AI Engineering & AI Security',
    desc: 'Build with ML and LLMs, then secure them: prompt injection, RAG, and AI governance.',
    milestone: 'AWS Certified AI Practitioner; NIST AI RMF and OWASP LLM Top 10 fluency',
    tiers: [['ai', 'beginner'], ['ai', 'intermediate'], ['ai', 'advanced']],
    months: '2-3',
  },
  {
    step: 7,
    title: 'CISSP',
    desc: 'Think like a manager: risk, governance, and design across all 8 domains.',
    milestone: 'ISC2 CISSP (5 years paid experience in 2+ domains, or Associate of ISC2)',
    tiers: [['cissp', 'beginner'], ['cissp', 'intermediate'], ['cissp', 'advanced']],
    months: '3-6',
  },
];

// Free resources used to build and extend the decks. Every deck cites some of these.
export const RESOURCES = {
  // Python
  'py-tutorial': { title: 'The Python Tutorial (official docs)', url: 'https://docs.python.org/3/tutorial/' },
  'cs50p': { title: "Harvard CS50's Introduction to Programming with Python", url: 'https://cs50.harvard.edu/python/' },
  'py4e': { title: 'Python for Everybody (Dr. Chuck)', url: 'https://www.py4e.com/' },
  'automate': { title: 'Automate the Boring Stuff with Python', url: 'https://automatetheboringstuff.com/' },
  'exercism-py': { title: 'Exercism Python track', url: 'https://exercism.org/tracks/python' },
  'realpython': { title: 'Real Python tutorials', url: 'https://realpython.com/' },
  'pep8': { title: 'PEP 8: Style Guide for Python Code', url: 'https://peps.python.org/pep-0008/' },
  // Networking
  'messer-net': { title: 'Professor Messer N10-009 Network+ course', url: 'https://www.professormesser.com/network-plus/n10-009/n10-009-video/n10-009-training-course/' },
  'comptia-net': { title: 'CompTIA Network+ exam objectives', url: 'https://www.comptia.org/certifications/network' },
  'netacad': { title: 'Cisco Networking Academy free courses', url: 'https://www.netacad.com/' },
  'jitl': { title: "Jeremy's IT Lab free CCNA course", url: 'https://www.youtube.com/@JeremysITLab' },
  'practical-net': { title: 'Practical Networking', url: 'https://www.practicalnetworking.net/' },
  'wireshark': { title: 'Wireshark User’s Guide', url: 'https://www.wireshark.org/docs/wsug_html_chunked/' },
  // Security+
  'messer-sec': { title: 'Professor Messer SY0-701 Security+ course', url: 'https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/' },
  'comptia-sec': { title: 'CompTIA Security+ exam objectives', url: 'https://www.comptia.org/certifications/security' },
  'isc2-cc': { title: 'ISC2 Certified in Cybersecurity (free course + exam)', url: 'https://www.isc2.org/certifications/cc' },
  'nist-glossary': { title: 'NIST CSRC Glossary', url: 'https://csrc.nist.gov/glossary' },
  'nist-csf': { title: 'NIST Cybersecurity Framework 2.0', url: 'https://www.nist.gov/cyberframework' },
  // Cybersecurity
  'tryhackme': { title: 'TryHackMe (free rooms and paths)', url: 'https://tryhackme.com/' },
  'portswigger': { title: 'PortSwigger Web Security Academy', url: 'https://portswigger.net/web-security' },
  'owasp-top10': { title: 'OWASP Top 10', url: 'https://owasp.org/Top10/' },
  'mitre-attack': { title: 'MITRE ATT&CK', url: 'https://attack.mitre.org/' },
  'overthewire': { title: 'OverTheWire: Bandit wargame', url: 'https://overthewire.org/wargames/bandit/' },
  'cisa-kev': { title: 'CISA Known Exploited Vulnerabilities catalog', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
  'nist-ir': { title: 'NIST SP 800-61 Incident Response', url: 'https://csrc.nist.gov/pubs/sp/800/61/r3/final' },
  // Cloud
  'aws-ccp': { title: 'AWS Skill Builder: Cloud Practitioner Essentials', url: 'https://skillbuilder.aws/' },
  'az-900': { title: 'Microsoft Learn: Azure Fundamentals (AZ-900)', url: 'https://learn.microsoft.com/en-us/training/courses/az-900t00' },
  'gcp-skills': { title: 'Google Cloud Skills Boost', url: 'https://www.cloudskillsboost.google/' },
  'aws-wa': { title: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected/' },
  'nist-800-145': { title: 'NIST SP 800-145: Definition of Cloud Computing', url: 'https://csrc.nist.gov/pubs/sp/800/145/final' },
  'csa': { title: 'Cloud Security Alliance research', url: 'https://cloudsecurityalliance.org/research' },
  'k8s-docs': { title: 'Kubernetes documentation & tutorials', url: 'https://kubernetes.io/docs/tutorials/' },
  // AI engineering
  'google-mlcc': { title: 'Google Machine Learning Crash Course', url: 'https://developers.google.com/machine-learning/crash-course' },
  'fastai': { title: 'fast.ai Practical Deep Learning', url: 'https://course.fast.ai/' },
  'hf-learn': { title: 'Hugging Face Learn (LLM, agents courses)', url: 'https://huggingface.co/learn' },
  'karpathy': { title: 'Andrej Karpathy: Neural Networks Zero to Hero', url: 'https://karpathy.ai/zero-to-hero.html' },
  'dlai': { title: 'DeepLearning.AI short courses', url: 'https://www.deeplearning.ai/short-courses/' },
  'claude-docs': { title: 'Claude developer documentation', url: 'https://docs.claude.com/' },
  'owasp-llm': { title: 'OWASP Top 10 for LLM Applications', url: 'https://genai.owasp.org/' },
  'nist-ai-rmf': { title: 'NIST AI Risk Management Framework', url: 'https://www.nist.gov/itl/ai-risk-management-framework' },
  // CISSP
  'cissp-outline': { title: 'ISC2 CISSP exam outline', url: 'https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline' },
  'isc2-ethics': { title: 'ISC2 Code of Ethics', url: 'https://www.isc2.org/ethics' },
  'nist-800-53': { title: 'NIST SP 800-53 security controls', url: 'https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final' },
  'nist-rmf': { title: 'NIST Risk Management Framework (SP 800-37)', url: 'https://csrc.nist.gov/projects/risk-management' },
  'destcert': { title: 'Destination Certification CISSP MindMaps (free videos + PDF)', url: 'https://destcert.com/cissp-mindmaps/' },
  'zerger': { title: 'Inside Cloud and Security: CISSP Exam Cram (free videos)', url: 'https://www.youtube.com/results?search_query=Inside+Cloud+and+Security+CISSP+Exam+Cram' },
};
