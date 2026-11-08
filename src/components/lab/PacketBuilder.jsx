// PacketBuilder — the learner picks a protocol (DNS query, TCP segment, IPv4 packet),
// sets real header fields, and sees the actual bytes the lab computes from those fields
// (hex dump + field-by-field decode). The bytes are computed live by
// src/lib/packetBuilder.js — nothing is faked or hardcoded.
import { useMemo, useState } from 'react';
import { Copy, Check, ShieldCheck } from 'lucide-react';
import { buildDnsQuery, buildTcpSegment, buildIpv4Packet, bytesToHexDump, DNS_QTYPES } from '../../lib/packetBuilder';

const TABS = [
  { id: 'dns', label: 'DNS query' },
  { id: 'tcp', label: 'TCP segment' },
  { id: 'ipv4', label: 'IPv4 packet' },
];

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[rgb(var(--ink-1-rgb))]">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none';

function DnsForm({ value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Transaction ID (0–65535)" hint="Random in real life — it matches the query to its answer.">
        <input className={inputCls} type="number" min="0" max="65535" value={value.id}
          onChange={(e) => onChange({ ...value, id: Number(e.target.value) })} />
      </Field>
      <Field label="Domain name" hint="One or more labels, letters, digits, hyphens.">
        <input className={inputCls} type="text" value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </Field>
      <Field label="Record type" hint="A = IPv4, AAAA = IPv6, MX = mail, CNAME = alias.">
        <select className={inputCls} value={value.qtype}
          onChange={(e) => onChange({ ...value, qtype: Number(e.target.value) })}>
          {Object.entries(DNS_QTYPES).map(([code, name]) => (
            <option key={code} value={code}>{name} ({code})</option>
          ))}
        </select>
      </Field>
      <Field label="Recursion desired (RD)" hint="Ask the resolver to do the whole lookup for you.">
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
          <input type="checkbox" checked={value.recursionDesired}
            onChange={(e) => onChange({ ...value, recursionDesired: e.target.checked })} />
          Set the RD flag
        </label>
      </Field>
    </div>
  );
}

function TcpForm({ value, onChange }) {
  const flag = (name) => ({
    checked: value.flags[name],
    onChange: (e) => onChange({ ...value, flags: { ...value.flags, [name]: e.target.checked } }),
  });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Source port (0–65535)" hint="The client’s ephemeral port, e.g. 52344.">
        <input className={inputCls} type="number" min="0" max="65535" value={value.srcPort}
          onChange={(e) => onChange({ ...value, srcPort: Number(e.target.value) })} />
      </Field>
      <Field label="Destination port (0–65535)" hint="80 = HTTP, 443 = HTTPS, 53 = DNS.">
        <input className={inputCls} type="number" min="0" max="65535" value={value.dstPort}
          onChange={(e) => onChange({ ...value, dstPort: Number(e.target.value) })} />
      </Field>
      <Field label="Sequence number (0–4,294,967,295)" hint="The first byte this segment carries.">
        <input className={inputCls} type="number" min="0" max="4294967295" value={value.seq}
          onChange={(e) => onChange({ ...value, seq: Number(e.target.value) })} />
      </Field>
      <Field label="Acknowledgement number" hint="The next byte you expect from the other side.">
        <input className={inputCls} type="number" min="0" max="4294967295" value={value.ack}
          onChange={(e) => onChange({ ...value, ack: Number(e.target.value) })} />
      </Field>
      <Field label="Window (0–65535)" hint="How many bytes you are willing to receive.">
        <input className={inputCls} type="number" min="0" max="65535" value={value.window}
          onChange={(e) => onChange({ ...value, window: Number(e.target.value) })} />
      </Field>
      <Field label="Data (plain ASCII text)" hint="Payload bytes — try “GET /” for a request feel.">
        <input className={inputCls} type="text" value={value.data}
          onChange={(e) => onChange({ ...value, data: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <span className="text-sm font-semibold text-[rgb(var(--ink-1-rgb))]">Flags</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {['urg', 'ack', 'psh', 'rst', 'syn', 'fin'].map((f) => (
            <label key={f} className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold uppercase">
              <input type="checkbox" {...flag(f)} />
              {f}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">SYN opens, ACK confirms, FIN closes, RST aborts, PSH pushes data to the app now, URG marks urgent data.</p>
      </div>
      <Field label="Source IP" hint="Used only for the checksum’s pseudo-header.">
        <input className={inputCls} type="text" value={value.srcIp}
          onChange={(e) => onChange({ ...value, srcIp: e.target.value })} />
      </Field>
      <Field label="Destination IP" hint="Used only for the checksum’s pseudo-header.">
        <input className={inputCls} type="text" value={value.dstIp}
          onChange={(e) => onChange({ ...value, dstIp: e.target.value })} />
      </Field>
    </div>
  );
}

function Ipv4Form({ value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Source IP" hint="The sender.">
        <input className={inputCls} type="text" value={value.srcIp}
          onChange={(e) => onChange({ ...value, srcIp: e.target.value })} />
      </Field>
      <Field label="Destination IP" hint="The recipient.">
        <input className={inputCls} type="text" value={value.dstIp}
          onChange={(e) => onChange({ ...value, dstIp: e.target.value })} />
      </Field>
      <Field label="TTL (1–255)" hint="Hops left. Each router subtracts one; at zero the packet is dropped.">
        <input className={inputCls} type="number" min="1" max="255" value={value.ttl}
          onChange={(e) => onChange({ ...value, ttl: Number(e.target.value) })} />
      </Field>
      <Field label="Protocol" hint="What rides inside: 6 = TCP, 17 = UDP, 1 = ICMP.">
        <select className={inputCls} value={value.protocol}
          onChange={(e) => onChange({ ...value, protocol: Number(e.target.value) })}>
          <option value={6}>TCP (6)</option>
          <option value={17}>UDP (17)</option>
          <option value={1}>ICMP (1)</option>
        </select>
      </Field>
      <Field label="Identification (0–65535)" hint="Links fragments of one packet together.">
        <input className={inputCls} type="number" min="0" max="65535" value={value.identification}
          onChange={(e) => onChange({ ...value, identification: Number(e.target.value) })} />
      </Field>
      <Field label="Payload (plain ASCII text)" hint="The data this packet carries.">
        <input className={inputCls} type="text" value={value.payload}
          onChange={(e) => onChange({ ...value, payload: e.target.value })} />
      </Field>
      <Field label="Fragment flags" hint="DF = do not fragment; MF = more fragments follow.">
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold">
            <input type="checkbox" checked={value.dontFragment}
              onChange={(e) => onChange({ ...value, dontFragment: e.target.checked })} />
            Don’t fragment
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold">
            <input type="checkbox" checked={value.moreFragments}
              onChange={(e) => onChange({ ...value, moreFragments: e.target.checked })} />
            More fragments
          </label>
        </div>
      </Field>
      <Field label="Fragment offset (0–8191)" hint="Where this fragment sits in the original packet, in units of 8 bytes.">
        <input className={inputCls} type="number" min="0" max="8191" value={value.fragmentOffset}
          onChange={(e) => onChange({ ...value, fragmentOffset: Number(e.target.value) })} />
      </Field>
    </div>
  );
}

function ResultPanel({ result }) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  if (result.error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
        <strong>Those fields don’t make a valid packet:</strong> {result.error}
      </div>
    );
  }
  const hex = bytesToHexDump(result.bytes);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the dump is still visible on screen
    }
  };
  return (
    <div className="space-y-3">
      <div className="glass-1 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-bold text-[rgb(var(--ink-1-rgb))]">
            {result.length} bytes — {result.checksum !== undefined && (
              <>checksum 0x{result.checksum.toString(16).padStart(4, '0')}</>
            )}
          </h4>
          <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:border-violet-400">
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy hex'}
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[#002B36] p-3 font-mono text-xs leading-relaxed text-[#859900]">{hex}</pre>
        <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700" aria-hidden="true" />
          These bytes are computed live from your fields — including the real checksum.
          Change a field and watch the bytes change.
        </p>
      </div>
      <div className="glass-1 rounded-2xl p-4">
        <h4 className="font-bold text-[rgb(var(--ink-1-rgb))]">Field by field</h4>
        <div className="mt-2 space-y-2">
          {result.fields.map((f) => (
            <div key={f.name} className="rounded-xl bg-white/70 px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-semibold text-[rgb(var(--ink-1-rgb))]">{f.name}</span>
                <span className="font-mono text-sm font-bold text-violet-800">{f.value}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">{f.meaning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PacketBuilder() {
  const [tab, setTab] = useState('dns');
  const [dns, setDns] = useState({ id: 0x1234, name: 'www.example.com', qtype: 1, recursionDesired: true });
  const [tcp, setTcp] = useState({
    srcPort: 52344, dstPort: 80, seq: 0, ack: 0,
    flags: { urg: false, ack: false, psh: false, rst: false, syn: true, fin: false },
    window: 64240, data: '', srcIp: '192.168.1.10', dstIp: '203.0.113.10',
  });
  const [ipv4, setIpv4] = useState({
    srcIp: '192.168.1.10', dstIp: '203.0.113.10', ttl: 64, protocol: 6,
    identification: 0x1234, dontFragment: true, moreFragments: false, fragmentOffset: 0, payload: '',
  });

  const result = useMemo(() => {
    if (tab === 'dns') return buildDnsQuery(dns);
    if (tab === 'tcp') return buildTcpSegment(tcp);
    return buildIpv4Packet(ipv4);
  }, [tab, dns, tcp, ipv4]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Protocol to build">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t.id ? 'bg-[#C4B5FD] text-[#1E1B2E]' : 'glass-1 text-slate-700 hover:border-violet-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="glass-1 rounded-2xl p-4">
        {tab === 'dns' && <DnsForm value={dns} onChange={setDns} />}
        {tab === 'tcp' && <TcpForm value={tcp} onChange={setTcp} />}
        {tab === 'ipv4' && <Ipv4Form value={ipv4} onChange={setIpv4} />}
      </div>
      <ResultPanel result={result} />
    </div>
  );
}
