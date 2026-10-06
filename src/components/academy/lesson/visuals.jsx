import React from 'react';

// Small static diagrams that sit inside lesson reading (LessonPart.visual = id).
// Built from real text (not images) so they scale, stay sharp, and read aloud correctly.

// Colour encodes the TCP/IP layer each OSI layer belongs to, so the same hue means the same
// group in every diagram of a lesson.
const GROUP = {
  application: { name: 'Application', fill: 'rgba(124, 58, 237, 0.07)', edge: 'rgba(124, 58, 237, 0.28)', ink: '#6D28D9' },
  transport: { name: 'Transport', fill: 'rgba(37, 99, 235, 0.07)', edge: 'rgba(37, 99, 235, 0.28)', ink: '#1D4ED8' },
  internet: { name: 'Internet', fill: 'rgba(13, 148, 136, 0.08)', edge: 'rgba(13, 148, 136, 0.30)', ink: '#0F766E' },
  link: { name: 'Link', fill: 'rgba(217, 119, 6, 0.08)', edge: 'rgba(217, 119, 6, 0.30)', ink: '#B45309' },
};

const tint = (g) => ({ background: GROUP[g].fill, borderColor: GROUP[g].edge });

const OSI = [
  { n: 7, name: 'Application', group: 'application', role: 'Network services for applications', eg: 'HTTP, DNS, SMTP, SSH', pdu: 'Data' },
  { n: 6, name: 'Presentation', group: 'application', role: 'Formats, encodes, compresses, encrypts', eg: 'TLS, UTF-8, JPEG', pdu: 'Data' },
  { n: 5, name: 'Session', group: 'application', role: 'Opens, manages and closes sessions', eg: 'NetBIOS, RPC', pdu: 'Data' },
  { n: 4, name: 'Transport', group: 'transport', role: 'End-to-end delivery between ports', eg: 'TCP, UDP', pdu: 'Segment / Datagram' },
  { n: 3, name: 'Network', group: 'internet', role: 'Logical addressing and routing', eg: 'IP, ICMP · routers', pdu: 'Packet' },
  { n: 2, name: 'Data Link', group: 'link', role: 'Local delivery by MAC address', eg: 'Ethernet, Wi-Fi · switches', pdu: 'Frame' },
  { n: 1, name: 'Physical', group: 'link', role: 'Signals on the medium', eg: 'Copper, fibre, radio · hubs', pdu: 'Bits' },
];

function Frame({ label, caption, children }) {
  return (
    <figure aria-label={label} className="max-w-reading">
      <div className="rounded-control border border-ink-3/20 bg-white/60 p-3 sm:p-4">{children}</div>
      {caption && <figcaption className="mt-2 text-small text-ink-2">{caption}</figcaption>}
    </figure>
  );
}

// Mobile: badge | name + role | PDU. From sm up the name/role wrapper dissolves (sm:contents)
// so name and role become their own aligned columns under the header row.
const STACK_COLS = 'grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[3rem_7.5rem_minmax(0,1fr)_8.5rem]';

function OsiStack() {
  return (
    <Frame label="The seven OSI layers" caption="Layer 7 sits closest to the user, Layer 1 closest to the wire. Colours show which TCP/IP layer each one belongs to.">
      <div className={`${STACK_COLS} hidden px-3 pb-2 text-caption font-semibold uppercase tracking-wider text-ink-2 sm:grid`}>
        <span>Layer</span><span>Name</span><span>Role and examples</span><span className="text-right">PDU</span>
      </div>
      <ol className="space-y-1.5">
        {OSI.map((l) => (
          <li key={l.n} className={`${STACK_COLS} rounded-control border px-3 py-2.5`} style={tint(l.group)}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white font-mono text-small font-bold tabular-nums shadow-sm" style={{ color: GROUP[l.group].ink }}>
              {l.n}
            </span>
            <div className="min-w-0 sm:contents">
              <p className="font-semibold text-ink-1">{l.name}</p>
              <p className="text-small text-ink-2">
                {l.role}
                <span className="block text-caption text-ink-3">{l.eg}</span>
              </p>
            </div>
            <span className="max-w-[5.5rem] text-right text-small font-semibold sm:max-w-none" style={{ color: GROUP[l.group].ink }}>{l.pdu}</span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

// Encapsulation staircase: every header has a fixed column, so the payload lines up in
// every row and each layer visibly adds one wrapper.
const CHIPS = {
  eth: { short: 'Eth', long: 'Ethernet', group: 'link', col: 2 },
  ip: { short: 'IP', long: 'IP header', group: 'internet', col: 3 },
  tcp: { short: 'TCP', long: 'TCP header', group: 'transport', col: 4 },
  data: { short: 'Data', long: 'HTTP data', group: 'application', col: 5 },
  fcs: { short: 'FCS', long: 'FCS', group: 'link', col: 6 },
};
const ENCAP = [
  { layer: 'L7–5', pdu: 'Data', chips: ['data'] },
  { layer: 'L4', pdu: 'Segment', chips: ['tcp', 'data'] },
  { layer: 'L3', pdu: 'Packet', chips: ['ip', 'tcp', 'data'] },
  { layer: 'L2', pdu: 'Frame', chips: ['eth', 'ip', 'tcp', 'data', 'fcs'] },
];
const ENCAP_COLS = 'grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))_minmax(0,1.25fr)_minmax(0,1fr)] items-center gap-1 sm:grid-cols-[5.5rem_repeat(3,minmax(0,1fr))_minmax(0,1.5fr)_minmax(0,0.8fr)] sm:gap-1.5';

function Encapsulation() {
  return (
    <Frame label="Encapsulation as data moves down the stack" caption="Sending: each layer adds its header on the way down, and Ethernet adds an FCS trailer. Receiving: the same wrappers come off in reverse.">
      <div className="space-y-1.5">
        {ENCAP.map((row) => (
          <div key={row.layer} className={ENCAP_COLS}>
            <div className="leading-tight">
              <p className="font-mono text-caption font-semibold text-ink-2">{row.layer}</p>
              <p className="text-small font-semibold text-ink-1">{row.pdu}</p>
            </div>
            {row.chips.map((id) => {
              const c = CHIPS[id];
              return (
                <span key={id} className="truncate rounded-md border px-0.5 py-2 text-center text-caption font-semibold sm:px-2 sm:text-small"
                  style={{ ...tint(c.group), color: GROUP[c.group].ink, gridColumnStart: c.col }}>
                  <span className="sm:hidden">{c.short}</span>
                  <span className="hidden sm:inline">{c.long}</span>
                </span>
              );
            })}
          </div>
        ))}
        <div className={ENCAP_COLS}>
          <div className="leading-tight">
            <p className="font-mono text-caption font-semibold text-ink-2">L1</p>
            <p className="text-small font-semibold text-ink-1">Bits</p>
          </div>
          <span className="col-span-5 overflow-hidden whitespace-nowrap rounded-md border px-2 py-2 font-mono text-caption tracking-widest sm:text-small"
            style={{ ...tint('link'), color: GROUP.link.ink }}>
            0100 1101 1011 0010 0111 0101 1100 0011 1010 0110
          </span>
        </div>
      </div>
    </Frame>
  );
}

// OSI on the left, TCP/IP on the right. Each TCP/IP box spans exactly the OSI rows it covers.
const TCPIP = [
  { group: 'application', rows: [1, 3], protocols: 'HTTP, DNS, SMTP, SSH, TLS' },
  { group: 'transport', rows: [4, 1], protocols: 'TCP, UDP' },
  { group: 'internet', rows: [5, 1], protocols: 'IP, ICMP, routing' },
  { group: 'link', rows: [6, 2], protocols: 'Ethernet, Wi-Fi, ARP, MAC' },
];

function TcpIpMap() {
  return (
    <Frame label="How the OSI layers map onto the TCP/IP model" caption="Four TCP/IP layers cover the same ground as seven OSI layers.">
      <div className="grid grid-cols-2 gap-x-2 pb-2 text-caption font-semibold uppercase tracking-wider text-ink-2 sm:gap-x-4">
        <span className="px-1">OSI (7 layers)</span><span className="px-1">TCP/IP (4 layers)</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:gap-x-4" style={{ gridTemplateRows: 'repeat(7, minmax(2.75rem, auto))' }}>
        {OSI.map((l, i) => (
          <div key={l.n} className="flex items-center gap-2 rounded-control border px-3 text-small" style={{ ...tint(l.group), gridColumn: 1, gridRow: i + 1 }}>
            <span className="w-4 font-mono font-bold tabular-nums" style={{ color: GROUP[l.group].ink }}>{l.n}</span>
            <span className="font-semibold text-ink-1">{l.name}</span>
          </div>
        ))}
        {TCPIP.map((t) => (
          <div key={t.group} className="flex flex-col justify-center rounded-control border-2 px-3 py-2"
            style={{ ...tint(t.group), gridColumn: 2, gridRow: `${t.rows[0]} / span ${t.rows[1]}` }}>
            <p className="font-semibold" style={{ color: GROUP[t.group].ink }}>{GROUP[t.group].name}</p>
            <p className="text-caption text-ink-2">{t.protocols}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const VISUALS = {
  'osi-stack': OsiStack,
  encapsulation: Encapsulation,
  'tcpip-map': TcpIpMap,
};

export const LESSON_VISUAL_IDS = Object.keys(VISUALS);

export function LessonVisual({ id }) {
  const Visual = VISUALS[id];
  return Visual ? <Visual /> : null;
}
