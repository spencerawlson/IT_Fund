import React, { useState, useMemo } from 'react';

function ipToInt(o) {
  return (((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
}
function intToIp(n) {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}
function toBinary(n) {
  return [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, '0')).join(' ');
}
function parseOctets(str) {
  const parts = str.split('.').map((p) => parseInt(p.trim(), 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
  return parts;
}

const PRESETS = [8, 16, 20, 24, 25, 26, 27, 28, 30];

export default function SubnetCalculator() {
  const [ip, setIp] = useState('192.168.1.150');
  const [prefix, setPrefix] = useState(24);

  const result = useMemo(() => {
    const o = parseOctets(ip);
    if (!o) return null;
    const ipInt = ipToInt(o);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const wildcard = (~mask >>> 0);
    const totalHosts = Math.pow(2, 32 - prefix);
    const usableHosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : totalHosts - 2;
    const firstHost = prefix >= 31 ? network : network + 1;
    const lastHost = prefix >= 31 ? broadcast : broadcast - 1;
    return { ipInt, mask, network, broadcast, wildcard, totalHosts, usableHosts, firstHost, lastHost };
  }, [ip, prefix]);

  const Row = ({ label, value, accent }) => (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`font-mono text-sm font-semibold ${accent || 'text-white'}`}>{value}</span>
    </div>
  );

  return (
    <div>
      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">IP Address</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.150"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">CIDR Prefix — /{prefix}</label>
          <input
            type="range"
            min={0}
            max={30}
            value={prefix}
            onChange={(e) => setPrefix(parseInt(e.target.value, 10))}
            className="mt-3 w-full accent-blue-500"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPrefix(p)}
                className={`rounded px-2 py-0.5 font-mono text-xs transition ${prefix === p ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                /{p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!result ? (
        <div className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          Enter a valid IPv4 address — four octets, each 0–255.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <Row label="Network Address" value={intToIp(result.network)} accent="text-blue-300" />
            <Row label="Broadcast Address" value={intToIp(result.broadcast)} accent="text-rose-300" />
            <Row label="Subnet Mask" value={intToIp(result.mask)} />
            <Row label="Wildcard Mask" value={intToIp(result.wildcard)} />
            <Row label="First Usable Host" value={intToIp(result.firstHost)} accent="text-teal-300" />
            <Row label="Last Usable Host" value={intToIp(result.lastHost)} accent="text-teal-300" />
            <Row label="Total Addresses" value={result.totalHosts.toLocaleString()} />
            <Row label="Usable Hosts" value={result.usableHosts.toLocaleString()} accent="text-amber-300" />
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.06] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Binary Breakdown</p>
            <div className="mt-3 space-y-1.5 font-mono text-[11px] leading-relaxed">
              <p><span className="text-slate-400">IP        </span><span className="text-white">{toBinary(result.ipInt)}</span></p>
              <p><span className="text-slate-400">Mask      </span><span className="text-blue-300">{toBinary(result.mask)}</span></p>
              <p><span className="text-slate-400">Network   </span><span className="text-teal-300">{toBinary(result.network)}</span></p>
              <p><span className="text-slate-400">Broadcast </span><span className="text-rose-300">{toBinary(result.broadcast)}</span></p>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              The first <span className="text-blue-300">{prefix}</span> bits define the network portion; the remaining <span className="text-amber-300">{32 - prefix}</span> bits identify individual hosts within it.
            </p>
          </div>
        </>
      )}
    </div>
  );
}