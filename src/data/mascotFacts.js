// Fun facts and pop-quiz prompts for Cipher, the study mascot.
// Keyed by concept id (see src/data/modules.js) with module-level and generic
// fallbacks, so every lesson gets something grounded. Keep each item short —
// one or two sentences — and accurate: these sit next to real study notes.

const f = (text) => ({ type: 'fact', text });
const q = (text, answer) => ({ type: 'question', text, answer });

const BY_CONCEPT = {
  'm6-1': [
    f('192.168.1.0 and 192.168.1.255 can never belong to a device — they are the network and broadcast addresses of that /24.'),
    q('In 192.168.1.10/24, what is the network ID?', '192.168.1.0 — the first 24 bits are network, the last 8 are host.'),
  ],
  'm6-2': [
    f('Subnet masks are always a solid block of 1s followed by 0s — 255.0.255.0 looks plausible but is not a valid mask.'),
    q('What does the mask 255.255.255.0 mean in CIDR notation?', '/24 — twenty-four 1-bits, then eight 0-bits.'),
  ],
  'm6-3': [
    f('Under classful addressing, a company needing 500 addresses had to take a whole Class B with 65,534 of them. CIDR ended that waste in the 1990s.'),
    q('The range 224.0.0.0–239.255.255.255 is reserved for what?', 'Class D — multicast traffic.'),
  ],
  'term:NAT': [
    f('Your entire home shares one public IP thanks to NAT — it was invented to stretch the limited IPv4 address space.'),
    q('True or false: NAT is a firewall.', 'False — it hides internal addresses, but it is not a security control by itself.'),
  ],
  'term:CDN': [
    f('A CDN can turn a 150 ms transatlantic fetch into a 15 ms local one by serving your cat pictures from the nearest edge server.'),
    q('Besides speed, what attack does a CDN help absorb?', 'DDoS — the edge soaks up the flood before it reaches your origin.'),
  ],
  'term:Load Balancer': [
    q('Which understands HTTP: a Layer 4 or a Layer 7 load balancer?', 'Layer 7 — it can route by URL path, terminate TLS, and keep sticky sessions.'),
    f('A good load balancer health-checks its servers and silently drops any that fail — users never notice the casualty.'),
  ],
  'term:WAN': [
    f('A 1 Gbps WAN link with 150 ms of latency still feels slow — chatty apps feel latency far more than bandwidth.'),
  ],
  'term:Cloud DNS': [
    f('DNS sits on the path of every connection you make — hijacked DNS lets attackers redirect all traffic and even obtain valid TLS certificates.'),
  ],
};

const BY_MODULE = {
  'module-6': [
    f('IPv4 holds about 4.3 billion addresses. Sounds like a lot — until every phone, laptop, TV, and toaster wants one.'),
    q('How many usable host addresses in a /24 subnet?', '254 — 2^8 is 256, minus the network and broadcast addresses.'),
  ],
  'module-31': [
    f('The first message ever sent on ARPANET — the internet\u2019s ancestor — was just \u201CLO\u201D. The system crashed trying to type \u201CLOGIN\u201D.'),
    q('What does the ping command actually send?', 'ICMP echo requests — and it times the echo replies.'),
  ],
};

const GENERIC = [
  f('The word \u201Cbug\u201D for an engineering flaw predates computers — Thomas Edison used it in the 1870s. Grace Hopper\u2019s famous moth just made it legend.'),
  f('127.0.0.1 always means \u201Cthis machine\u201D — the loopback range was set aside from the very beginning and never routed.'),
  q('What\u2019s the difference between a hub and a switch?', 'A hub repeats every frame to every port; a switch learns MAC addresses and forwards only where needed.'),
  f('The OSI model has 7 layers, but the internet mostly runs on 4 (TCP/IP). Exams love asking about both — learn to map between them.'),
];

/**
 * Items for the mascot, most specific first: concept → module → generic.
 * `conceptId` may be a concept id or a "term:Name" key (see moduleNotes).
 */
export function getMascotItems({ conceptId, moduleId } = {}) {
  if (conceptId && BY_CONCEPT[conceptId]?.length) return BY_CONCEPT[conceptId];
  if (moduleId && BY_MODULE[moduleId]?.length) return BY_MODULE[moduleId];
  return GENERIC;
}

export const MASCOT_NAME = 'Cipher';
