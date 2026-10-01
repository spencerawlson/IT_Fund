// Visual Lab routing scenarios, rendered by components/viz/RoutingScenario.jsx.
// Each: nodes [{id,label,sub?,x,y,kind}] (x/y are % of the 640x320 stage), links [{a,b}], and steps
// [{title,text, active?:[ids], up?:[ids], flow?:{from,to}, down?:{a,b}}]. Keep steps teaching-focused.

export const ROUTING_SCENARIOS = {
  'rt-ospf-neighbor': {
    title: 'OSPF Neighbor Formation',
    nodes: [
      { id: 'R1', label: 'R1', sub: '10.0.12.1', x: 28, y: 50, kind: 'router' },
      { id: 'R2', label: 'R2', sub: '10.0.12.2', x: 72, y: 50, kind: 'router' },
    ],
    links: [{ a: 'R1', b: 'R2' }],
    steps: [
      { title: 'Down', text: 'R1 and R2 are connected but know nothing about each other yet. OSPF starts in the Down state.', active: [] },
      { title: 'Hello', text: 'R1 multicasts OSPF Hello packets (224.0.0.5). They carry the area, timers, subnet mask and authentication that must match to peer.', active: ['R1'], flow: { from: 'R1', to: 'R2' } },
      { title: '2-Way', text: 'R2 sees its own router ID in R1\'s Hello: bidirectional communication is confirmed. The routers become neighbors (2-Way).', active: ['R1', 'R2'] },
      { title: 'ExStart / Exchange', text: 'They elect a master and exchange Database Description (DBD) packets, summarising their link-state databases. A stuck ExStart here usually means an MTU mismatch.', active: ['R2'], flow: { from: 'R2', to: 'R1' } },
      { title: 'Loading', text: 'Each router requests the LSAs it is missing (LSR) and receives them (LSU), filling in its link-state database.', active: ['R1', 'R2'], flow: { from: 'R1', to: 'R2' } },
      { title: 'Full', text: 'The databases are synchronised. The adjacency is Full — now each router runs SPF (Dijkstra) over the shared database to compute its routes.', up: ['R1', 'R2'] },
    ],
  },

  'rt-bgp-path': {
    title: 'BGP Path Selection',
    nodes: [
      { id: 'YOU', label: 'AS 65001', sub: 'you', x: 12, y: 50, kind: 'router' },
      { id: 'P1', label: 'AS 65002', sub: 'path A', x: 50, y: 20, kind: 'router' },
      { id: 'P2', label: 'AS 65003', sub: 'path B', x: 50, y: 80, kind: 'router' },
      { id: 'DST', label: '203.0.113.0/24', x: 88, y: 50, kind: 'prefix' },
    ],
    links: [{ a: 'YOU', b: 'P1' }, { a: 'YOU', b: 'P2' }, { a: 'P1', b: 'DST' }, { a: 'P2', b: 'DST' }],
    steps: [
      { title: 'The prefix is originated', text: 'AS 65010 owns 203.0.113.0/24 and advertises it to the internet. Your AS (65001) will hear about it from two neighbors.', active: ['DST'] },
      { title: 'Path A arrives', text: 'Neighbor AS 65002 advertises the prefix with AS_PATH "65002 65010" — two ASes to cross.', active: ['P1'], flow: { from: 'P1', to: 'YOU' } },
      { title: 'Path B arrives', text: 'Neighbor AS 65003 advertises the same prefix, but with AS_PATH "65003 65009 65010" — three ASes to cross.', active: ['P2'], flow: { from: 'P2', to: 'YOU' } },
      { title: 'Best-path selection', text: 'With Weight and Local Preference equal, BGP prefers the shortest AS_PATH. Path A (length 2) beats path B (length 3).', active: ['YOU', 'P1'] },
      { title: 'Path A installed', text: 'Traffic to 203.0.113.0/24 now leaves via AS 65002. Path B stays as a backup if path A withdraws.', up: ['YOU', 'P1', 'DST'], flow: { from: 'YOU', to: 'P1' } },
    ],
  },

  'rt-link-failure': {
    title: 'Link Failure & Reconvergence',
    nodes: [
      { id: 'R1', label: 'R1', x: 14, y: 50, kind: 'router' },
      { id: 'R2', label: 'R2', sub: 'primary', x: 50, y: 18, kind: 'router' },
      { id: 'R3', label: 'R3', x: 86, y: 50, kind: 'router' },
    ],
    links: [{ a: 'R1', b: 'R2' }, { a: 'R2', b: 'R3' }, { a: 'R1', b: 'R3' }],
    steps: [
      { title: 'Steady state', text: 'The best path from R1 to R3 is via R2 (two low-cost hops). The direct R1–R3 link has a higher cost, so it is the backup.', active: ['R1', 'R2', 'R3'], flow: { from: 'R1', to: 'R2' } },
      { title: 'Traffic flows via R2', text: 'Packets take R1 → R2 → R3, the lowest-cost path the routing protocol computed.', active: ['R2'], flow: { from: 'R2', to: 'R3' } },
      { title: 'The link fails', text: 'The R2–R3 link goes down. R2 and R3 lose their adjacency and flood the topology change to their neighbors.', down: { a: 'R2', b: 'R3' }, active: ['R2', 'R3'] },
      { title: 'Reconvergence', text: 'Every router reruns SPF against the updated database. The only remaining path from R1 to R3 is the direct link.', down: { a: 'R2', b: 'R3' }, active: ['R1', 'R3'] },
      { title: 'New best path', text: 'Traffic now flows R1 → R3 directly. Fast convergence is what keeps the outage to a brief blip.', up: ['R1', 'R3'], flow: { from: 'R1', to: 'R3' } },
    ],
  },
};
