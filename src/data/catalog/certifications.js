// Certifications referenced by courses (and, in Phase 3, by their own certification tracks).
// Tracks will reference existing lessons/modules by id instead of duplicating content.

/** @type {Record<string, import('./schema').Certification>} */
export const CERTIFICATIONS = {
  pcep: { id: 'pcep', name: 'PCEP', vendor: 'Python Institute' },
  'network-plus': { id: 'network-plus', name: 'Network+', vendor: 'CompTIA' },
  ccna: { id: 'ccna', name: 'CCNA', vendor: 'Cisco' },
  'security-plus': { id: 'security-plus', name: 'Security+', vendor: 'CompTIA' },
  'linux-plus': { id: 'linux-plus', name: 'Linux+', vendor: 'CompTIA' },
  'cysa-plus': { id: 'cysa-plus', name: 'CySA+', vendor: 'CompTIA' },
  'aws-ccp': { id: 'aws-ccp', name: 'AWS Cloud Practitioner', vendor: 'AWS' },
  'aws-ai-practitioner': { id: 'aws-ai-practitioner', name: 'AWS AI Practitioner', vendor: 'AWS' },
  ccsp: { id: 'ccsp', name: 'CCSP', vendor: 'ISC2' },
  cissp: { id: 'cissp', name: 'CISSP', vendor: 'ISC2' },
};

/** Skills a course can teach. Phase 3 adds subskills and the scoring model. */
export const SKILLS = {
  python: 'Python',
  automation: 'Automation',
  networking: 'Networking',
  troubleshooting: 'Troubleshooting',
  security: 'Security',
  iam: 'Identity & Access',
  cryptography: 'Cryptography',
  cybersecurity: 'Cybersecurity',
  linux: 'Linux',
  'incident-response': 'Incident Response',
  cloud: 'Cloud',
  'cloud-security': 'Cloud Security',
  ai: 'AI / ML',
  architecture: 'Architecture',
};
