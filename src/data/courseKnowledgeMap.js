import { COURSE_KNOWLEDGE } from './courseKnowledge';

const MAP = [
  { id: 'module-1', keywords: ['computer', 'operating system', 'os', 'file', 'binary'] },
  { id: 'module-2', keywords: ['memory', 'storage', 'cpu', 'cache', 'hard disk', 'ssd', 'hdd', '32-bit', '64-bit', 'multiprocess', 'multitask'] },
  { id: 'module-3', keywords: ['partition', 'file system', 'boot', 'bios', 'uefi', 'bootloader', 'defrag', 'bad sector'] },
  { id: 'module-4', keywords: ['network', 'lan', 'wan', 'topology', 'nic', 'ip', 'mac', 'dns', 'dhcp'] },
  { id: 'module-5', keywords: ['ethernet', 'wifi', 'frame', 'packet', 'segment', 'router', 'switch', 'vlan', 'subnet', 'gateway', 'virtualization'] },
  { id: 'module-6', keywords: ['dhcp', 'apipa', 'public ip', 'private ip', 'floating ip', 'nat', 'pat', 'port', 'protocol'] },
  { id: 'module-7', keywords: ['cloud', 'aws', 'azure', 'gcp', 'iaas', 'paas', 'saas', 'lambda', 'ec2'] },
  { id: 'module-8', keywords: ['devops', 'ci/cd', 'docker', 'kubernetes', 'iac', 'terraform', 'monitor', 'logging'] },
  { id: 'module-9', keywords: ['security', 'encryption', 'firewall', 'iam', 'compliance', 'vulnerability', 'incident'] },
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
