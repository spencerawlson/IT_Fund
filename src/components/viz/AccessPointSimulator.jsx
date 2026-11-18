import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Wifi } from 'lucide-react';
import {
  AP_POWER_W,
  STANDARDS,
  standardById,
  standardsForBand,
  channelsForBand,
  DEFAULT_NEIGHBOURS,
  interferencePercent,
  planSelfInterference,
  planInterference,
  planThroughputMbps,
  formatRate,
  signalDbm,
  signalQuality,
  effectiveThroughputMbps,
  associateClient,
  SECURITY,
  securityById,
  evilTwinRisk,
  evilTwinResult,
  authenticate8021X,
  EAP_METHODS,
  POE,
  poeById,
  poeSufficient,
  apConfigText,
} from '@/lib/accessPoint';

const AP_DEFS = [
  { id: 'AP-1', label: 'AP-1 · Lobby', pos: 0 },
  { id: 'AP-2', label: 'AP-2 · Conference', pos: 25 },
  { id: 'AP-3', label: 'AP-3 · Far wing', pos: 45 },
];

const CLIENT_DEFS = [
  { id: 'Laptop-A', pos: 4 },
  { id: 'Phone-B', pos: 12 },
  { id: 'Tablet-C', pos: 20 },
  { id: 'Laptop-D', pos: 28 },
  { id: 'Phone-E', pos: 38 },
];

const DEFAULT_CHANNELS = {
  '2.4 GHz': { 'AP-1': 1, 'AP-2': 6, 'AP-3': 11 },
  '5 GHz': { 'AP-1': 36, 'AP-2': 44, 'AP-3': 149 },
  '6 GHz': { 'AP-1': 1, 'AP-2': 37, 'AP-3': 101 },
};

const MAX_EVENTS = 6;
const SSID = 'R2C-WiFi';

function freshState() {
  return {
    band: '2.4 GHz',
    standardId: 'g',
    channels: { ...DEFAULT_CHANNELS['2.4 GHz'] },
    securityId: 'wpa3',
    ssidBroadcast: true,
    legacyB: false,
    poeId: 'at',
    clientPos: Object.fromEntries(CLIENT_DEFS.map((c) => [c.id, c.pos])),
    twin: null,
    authResult: null,
    events: [],
    roams: 0,
    elapsed: 0,
    nextId: 1,
  };
}

const QUALITY_COLOR = {
  Excellent: '#16A34A',
  Good: '#65A30D',
  Fair: '#D97706',
  Poor: '#DC2626',
  'No signal': '#9CA3AF',
};

export default function AccessPointSimulator() {
  const [sim, setSim] = useState(freshState);
  const [paused, setPaused] = useState(false);
  const [eapMethod, setEapMethod] = useState('EAP-TLS');
  const [username, setUsername] = useState('spencer');
  const [revealed, setRevealed] = useState({});
  const [, setVersion] = useState(0);
  const prevAssocRef = useRef(null);

  const bump = () => setVersion((v) => v + 1);

  const patch = (p) => setSim((prev) => ({ ...prev, ...p }));

  const logEvent = (text) => {
    setSim((prev) => ({
      ...prev,
      events: [{ id: prev.nextId, time: new Date().toLocaleTimeString(), text }, ...prev.events].slice(0, MAX_EVENTS),
      nextId: prev.nextId + 1,
    }));
  };

  const { band, standardId, channels, securityId, ssidBroadcast, legacyB, poeId, clientPos, twin, authResult } = sim;
  const poeOk = poeSufficient(poeId);
  const standard = standardById(standardId);
  const security = securityById(securityId);
  const channelList = [channels['AP-1'], channels['AP-2'], channels['AP-3']];
  const planInterf = planInterference(channelList, band);
  const planRate = planThroughputMbps({ standardId, band, channels: channelList, legacyB, poeOk });
  const risk = evilTwinRisk(securityId);

  // Per-client association: strongest AP at or above -75 dBm; the client decides.
  const clients = CLIENT_DEFS.map((client) => {
    const pos = clientPos[client.id];
    const rssiByAp = {};
    for (const ap of AP_DEFS) rssiByAp[ap.id] = signalDbm(Math.abs(pos - ap.pos), band);
    const apId = associateClient(rssiByAp);
    const ap = AP_DEFS.find((a) => a.id === apId);
    const dist = ap ? Math.abs(pos - ap.pos) : null;
    const rate = ap
      ? effectiveThroughputMbps({
        standardId, band, channel: channels[ap.id], distanceM: dist, legacyB, poeOk, planChannels: channelList,
      })
      : 0;
    return { ...client, pos, rssiByAp, apId, dbm: ap ? rssiByAp[ap.id] : null, dist, rate };
  });
  const associated = clients.filter((c) => c.apId);
  const stolenIds = twin && twin.stolen > 0 ? associated.slice(0, twin.stolen).map((c) => c.id) : [];
  const connected = associated.filter((c) => !stolenIds.includes(c.id));
  const avgRate = connected.length === 0 ? 0 : Math.round(connected.reduce((s, c) => s + c.rate, 0) / connected.length);
  const avgDbm = connected.length === 0 ? null : Math.round(connected.reduce((s, c) => s + c.dbm, 0) / connected.length);
  const worstInterference = Math.max(...AP_DEFS.map((ap, i) => Math.min(
    100,
    interferencePercent(channels[ap.id], band) + planSelfInterference(i, channelList, band),
  )));
  const assocSig = clients.map((c) => `${c.id}:${c.apId || '-'}`).join(',');

  // Roaming: log it when a client's association changes (not on first paint).
  useEffect(() => {
    if (prevAssocRef.current === null) {
      prevAssocRef.current = assocSig;
      return;
    }
    if (prevAssocRef.current === assocSig) return;
    const prevMap = Object.fromEntries(prevAssocRef.current.split(',').map((p) => p.split(':')));
    prevAssocRef.current = assocSig;
    for (const c of clients) {
      const before = prevMap[c.id];
      const after = c.apId || '-';
      if (before && before !== '-' && after !== '-' && before !== after) {
        setSim((prev) => ({
          ...prev,
          roams: prev.roams + 1,
          events: [{ id: prev.nextId, time: new Date().toLocaleTimeString(), text: `${c.id} roamed ${before} → ${after} (signal ${c.dbm} dBm) — the client decided.` }, ...prev.events].slice(0, MAX_EVENTS),
          nextId: prev.nextId + 1,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assocSig]);

  // Uptime clock; paused stops it. Metrics stay pure functions of the settings.
  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setSim((prev) => ({ ...prev, elapsed: prev.elapsed + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, [paused]);

  const changeBand = (nextBand) => {
    const nextChannels = { ...DEFAULT_CHANNELS[nextBand] };
    const available = standardsForBand(nextBand);
    const nextStandard = available.some((s) => s.id === standardId) ? standardId : available[0].id;
    patch({ band: nextBand, channels: nextChannels, standardId: nextStandard });
  };

  const changeChannel = (apId, value) => {
    const channel = Number(value);
    setSim((prev) => ({ ...prev, channels: { ...prev.channels, [apId]: channel } }));
  };

  const runEvilTwin = () => {
    const result = evilTwinResult(securityId, associated.length);
    patch({ twin: { ...result, securityId } });
    logEvent(result.blocked
      ? `Evil-twin attack BLOCKED — ${result.note}`
      : `Evil twin stole ${result.stolen} client${result.stolen === 1 ? '' : 's'} (${security.label}). ${result.note}`);
    bump();
  };

  const endTwin = () => {
    patch({ twin: null });
    logEvent('Rogue AP shut down — stolen clients reassociated.');
    bump();
  };

  const runAuth = () => {
    const result = authenticate8021X({ securityId, eapMethod, username });
    patch({ authResult: result });
    logEvent(`802.1X ${eapMethod} for ${username || '(no identity)'}: ${result.result} — ${result.reason}`);
    bump();
  };

  const reset = () => {
    setSim(freshState());
    setPaused(false);
    prevAssocRef.current = null;
    bump();
  };

  const metric = (label, value, tone) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${tone || 'text-ink-1'}`}>{value}</p>
    </div>
  );

  const toggleReveal = (key) => setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));

  const checkYourself = [
    {
      q: 'On 2.4 GHz, why are only channels 1, 6 and 11 non-overlapping?',
      a: 'Each 2.4 GHz channel is about 22 MHz wide and channels sit 5 MHz apart, so two channels need a gap of 5 to clear each other. 1, 6 and 11 are the only three with that gap — any other pair overlaps and shares airtime.',
    },
    {
      q: 'You hide the SSID. Is the network now secure?',
      a: 'No. The name still appears in probe requests and association frames, so anyone listening sees it in seconds. Hidden is not security — use WPA3 (and 802.1X on enterprise networks).',
    },
    {
      q: 'WEP, WPA2 and WPA3 — what actually broke, and what replaced it?',
      a: 'WEP’s RC4 key scheduling leaks the key through weak IVs, so it falls in seconds. WPA patched it with TKIP but stayed weak. WPA2 uses AES-CCMP and WPA3 uses SAE — those are the standards, and WPA3-Enterprise adds 802.1X certificate validation.',
    },
    {
      q: 'Two APs share one SSID. Who decides when a client roams, and what triggers it?',
      a: 'The client decides, on signal strength: when its AP’s RSSI drops and a neighbouring AP is stronger, it reassociates. The APs only advertise the SSID — they cannot force the move. A controller can coordinate the handoff; autonomous APs cannot.',
    },
  ];

  const apStatusColor = !poeOk ? '#DC2626' : ['open', 'wep'].includes(securityId) ? '#D97706' : '#16A34A';
  const apStatusLabel = !poeOk ? 'under-powered' : ['open', 'wep'].includes(securityId) ? 'insecure' : 'healthy';

  // Floor-plan geometry: corridor 0–50 m maps to x 40–600; APs on the ceiling (y=52), clients below (y=180).
  const xFor = (pos) => 40 + (pos / 50) * 560;

  // One screen on desktop: wireless controls on the left, counters + floor
  // plan + clients in the middle, the AP visual on the right. Interference,
  // evil-twin risk and roams sit directly under the primary counters.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px]">
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
          {/* Left rail: band, standard, channel plan, security, PoE, drills */}
          <div className="rounded-xl glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Band &amp; standard</p>
            <div className="mt-2 flex overflow-hidden rounded-lg border border-black/10" role="group" aria-label="Band">
              {['2.4 GHz', '5 GHz', '6 GHz'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => changeBand(b)}
                  aria-pressed={band === b}
                  className={`flex-1 px-1 py-1.5 text-[13px] font-semibold ${band === b ? 'glass-btn rounded-none' : 'glass-1 text-ink-2'}`}
                >
                  {b}
                </button>
              ))}
            </div>
            <label className="mt-2 block">
              <span className="text-[13px] font-semibold text-ink-1">Standard</span>
              <select
                value={standardId}
                onChange={(e) => patch({ standardId: e.target.value })}
                aria-label="Wi-Fi standard"
                className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
              >
                {standardsForBand(band).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}{s.wifi ? ` (${s.wifi})` : ''} — {formatRate(s.maxMbps)}</option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-xs leading-snug text-ink-2">{standard?.blurb}</p>

            <div className="mt-3 border-t border-black/10 pt-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Channel plan — 3 floor APs</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {AP_DEFS.map((ap) => (
                  <label key={ap.id} className="block">
                    <span className="block text-center text-[12px] font-semibold text-ink-1">{ap.id}</span>
                    <select
                      value={channels[ap.id]}
                      onChange={(e) => changeChannel(ap.id, e.target.value)}
                      aria-label={`${ap.id} channel`}
                      title={`${ap.label} channel`}
                      className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-1 py-1 text-center text-[13px] font-semibold text-ink-1"
                    >
                      {channelsForBand(band).map((ch) => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[13px] font-semibold text-ink-1">
                {`Plan ${channelList.join(' · ')} — ${planInterf}% interference · ${formatRate(planRate)}`}
              </p>
              <p className="text-xs leading-snug text-ink-2">
                {planInterf === 0
                  ? 'Clean plan — no AP shares airtime with another.'
                  : 'Overlapping channels share airtime — move the APs apart.'}
              </p>
            </div>

            <div className="mt-3 border-t border-black/10 pt-3">
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">Security</span>
                <select
                  value={securityId}
                  onChange={(e) => patch({ securityId: e.target.value, twin: null, authResult: null })}
                  aria-label="Security mode"
                  className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
                >
                  {SECURITY.map((s) => (
                    <option key={s.id} value={s.id}>{s.label} — {s.verdict}</option>
                  ))}
                </select>
              </label>
              <p className="mt-1 text-xs leading-snug text-ink-2">{security?.crackNote}</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => patch({ ssidBroadcast: !ssidBroadcast })}
                  aria-pressed={ssidBroadcast}
                  className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight ${ssidBroadcast ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'}`}
                >
                  SSID broadcast {ssidBroadcast ? 'on' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => patch({ legacyB: !legacyB })}
                  aria-pressed={legacyB}
                  title="A legacy 802.11b client forces protection mode and caps the whole cell at 11 Mbps."
                  className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight ${legacyB ? 'bg-amber-500/15 text-amber-700' : 'border border-black/10 glass-1 text-ink-2'}`}
                >
                  Legacy 802.11b {legacyB ? 'ON — 11 Mbps cap' : 'off'}
                </button>
              </div>
              {!ssidBroadcast && (
                <p className="mt-1.5 text-xs leading-snug text-amber-700">Hidden SSID is NOT security — the name still shows in probe frames.</p>
              )}
              {legacyB && (
                <p className="mt-1.5 text-xs leading-snug text-amber-700">One 802.11b client drags the whole cell to 11 Mbps.</p>
              )}
            </div>

            <div className="mt-3 border-t border-black/10 pt-3">
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">PoE power — AP draws {AP_POWER_W} W</span>
                <select
                  value={poeId}
                  onChange={(e) => patch({ poeId: e.target.value })}
                  aria-label="PoE power"
                  className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
                >
                  {POE.map((p) => (
                    <option key={p.id} value={p.id}>{p.label} — {p.watts} W</option>
                  ))}
                </select>
              </label>
              {!poeOk && (
                <p className="mt-1.5 text-xs leading-snug text-red-700">
                  {poeById(poeId)?.label} ({poeById(poeId)?.watts} W) cannot feed a {AP_POWER_W} W AP — radio degraded, throughput halved.
                </p>
              )}
            </div>

            <div className="mt-3 border-t border-black/10 pt-3">
              <div className="grid grid-cols-2 gap-1.5">
                {twin ? (
                  <button type="button" onClick={endTwin} className="glass-btn col-span-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold">
                    End evil-twin attack
                  </button>
                ) : (
                  <button type="button" onClick={runEvilTwin} className="col-span-2 rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1">
                    Run evil-twin attack
                  </button>
                )}
                <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button type="button" onClick={reset} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                  Reset
                </button>
              </div>
              {securityId === 'wpa3-enterprise' && (
                <div className="mt-2 space-y-2 rounded-lg border border-black/10 p-2">
                  <p className="text-[13px] font-semibold text-ink-1">802.1X authentication</p>
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-2">Username</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      aria-label="802.1X username"
                      className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-[13px] font-semibold text-ink-1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-2">EAP method</span>
                    <select
                      value={eapMethod}
                      onChange={(e) => setEapMethod(e.target.value)}
                      aria-label="EAP method"
                      className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-[13px] font-semibold text-ink-1"
                    >
                      {EAP_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={runAuth} className="glass-btn w-full rounded-lg px-2 py-1.5 text-[13px] font-semibold">
                    Authenticate client
                  </button>
                  {authResult && (
                    <p className={`text-xs leading-snug ${authResult.result === 'Access-Accept' ? 'text-emerald-700' : 'text-red-700'}`}>
                      <strong>{authResult.result}</strong> — {authResult.reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Event log */}
          <div className=" flex flex-col lg:flex-1">
            <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
              <Activity size={13} /> Event log
            </p>
            <div className="rounded-xl border border-black/10 glass-1 p-3 lg:flex-1">
              {sim.events.length === 0 ? (
                <p className="text-[13px] text-ink-3">No events yet. Drag a client across the corridor, or run the evil-twin attack.</p>
              ) : (
                <ul className="space-y-1.5">
                  {sim.events.map((event) => (
                    <li key={event.id} className="text-[13px] text-ink-2">
                      <span className="font-mono text-[11px] text-ink-3">{event.time}</span> — {event.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2">

          {/* Middle: counters, floor plan, clients */}
          <div className="min-w-0">
            {twin && !twin.blocked && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 p-3" role="alert">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-700" />
                <p className="text-[13px] leading-snug text-red-700">
                  <strong>Evil twin active.</strong> {twin.stolen} client{twin.stolen === 1 ? '' : 's'} joined the rogue AP. {twin.note}
                </p>
              </div>
            )}
            {twin && twin.blocked && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3" role="status">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                <p className="text-[13px] leading-snug text-emerald-700">
                  <strong>Evil twin blocked.</strong> {twin.note}
                </p>
              </div>
            )}
            {!poeOk && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 p-3" role="alert">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-700" />
                <p className="text-[13px] leading-snug text-red-700">
                  <strong>Under-powered AP.</strong> {poeById(poeId)?.label} delivers {poeById(poeId)?.watts} W; this 4x4 AP needs {AP_POWER_W} W — the radio is degraded and throughput is halved.
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {metric('Connected', `${connected.length} / ${CLIENT_DEFS.length}`)}
              {metric('Avg throughput', formatRate(avgRate))}
              {metric('Avg signal', avgDbm === null ? '—' : `${avgDbm} dBm`)}
            </div>
            {/* Derived metrics, directly */}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {metric('Interference', `${worstInterference}%`, worstInterference >= 60 ? 'text-red-700' : worstInterference >= 30 ? 'text-amber-700' : 'text-ink-1')}
              {metric('Evil-twin risk', risk, risk === 'Blocked' ? 'text-emerald-700' : risk === 'Critical' ? 'text-red-700' : 'text-amber-700')}
              {metric('Roams', sim.roams)}
            </div>

            <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Floor plan — 50 m corridor</p>
                <p className="shrink-0 text-[11px] text-ink-3">uptime {sim.elapsed}s · drag to roam</p>
              </div>
              <svg viewBox="0 0 640 205" className="w-full" role="img" aria-label="Floor plan: three access points along a 50 metre corridor with five clients">
                {/* Corridor */}
                <rect x="30" y="24" width="580" height="160" rx="12" fill="#FFFFFF" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
                <line x1="30" y1="104" x2="610" y2="104" stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeDasharray="6 5" />
                <text x="40" y="40" fontSize="10" fill="#5B6472">ceiling — APs</text>
                <text x="40" y="178" fontSize="10" fill="#5B6472">floor — clients (drag the sliders below to move them)</text>
                {/* Client → AP links */}
                {clients.filter((c) => c.apId && !stolenIds.includes(c.id)).map((c) => {
                  const ap = AP_DEFS.find((a) => a.id === c.apId);
                  return (
                    <line key={`link-${c.id}`} x1={xFor(c.pos)} y1="136" x2={xFor(ap.pos)} y2="64" stroke={QUALITY_COLOR[signalQuality(c.dbm)]} strokeWidth="1.5" strokeDasharray="4 3" />
                  );
                })}
                {/* APs */}
                {AP_DEFS.map((ap) => {
                  const x = xFor(ap.pos);
                  const clientsHere = connected.filter((c) => c.apId === ap.id).length;
                  return (
                    <g key={ap.id}>
                      <circle cx={x} cy="58" r="24" fill="none" stroke={apStatusColor} strokeWidth="1.5" opacity="0.35" />
                      <circle cx={x} cy="58" r="15" fill="none" stroke={apStatusColor} strokeWidth="1.5" opacity="0.6" />
                      <circle cx={x} cy="58" r="8" fill="#FFFFFF" stroke={apStatusColor} strokeWidth="2" />
                      <circle cx={x} cy="58" r="3" fill={apStatusColor} />
                      <text x={x} y="86" textAnchor="middle" fontSize="11" fontWeight="800" fill="#111827">{ap.id}</text>
                      <text x={x} y="99" textAnchor="middle" fontSize="9" fill="#5B6472">ch {channels[ap.id]} · {clientsHere} client{clientsHere === 1 ? '' : 's'}</text>
                    </g>
                  );
                })}
                {/* Clients */}
                {clients.map((c) => {
                  const x = xFor(c.pos);
                  const stolen = stolenIds.includes(c.id);
                  const color = stolen ? '#DC2626' : c.apId ? QUALITY_COLOR[signalQuality(c.dbm)] : '#9CA3AF';
                  return (
                    <g key={c.id}>
                      <rect x={x - 34} y="136" width="68" height="28" rx="7" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
                      <text x={x} y="149" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">{c.id}</text>
                      <text x={x} y="160" textAnchor="middle" fontSize="9" fill={color}>
                        {stolen ? 'stolen by twin' : c.apId ? `${c.apId} · ${c.dbm} dBm` : 'no signal'}
                      </text>
                      <circle cx={x} cy="136" r="4" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
              <p className="mb-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">Clients — position along the corridor</p>
              <div className="space-y-2">
                {clients.map((c) => {
                  const stolen = stolenIds.includes(c.id);
                  return (
                    <div key={c.id} className="rounded-lg border border-black/10 px-2 py-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] font-bold text-ink-1">{c.id} <span className="font-normal text-ink-3">— {c.pos} m</span></p>
                        <p className="text-[11px] font-semibold" style={{ color: stolen ? '#DC2626' : c.apId ? QUALITY_COLOR[signalQuality(c.dbm)] : '#9CA3AF' }}>
                          {stolen ? 'Stolen by twin' : c.apId ? `${c.apId} · ${c.dbm} dBm · ${signalQuality(c.dbm)} · ${formatRate(c.rate)}` : 'No AP in range'}
                        </p>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={c.pos}
                        onChange={(e) => {
                          const pos = Number(e.target.value);
                          setSim((prev) => ({ ...prev, clientPos: { ...prev.clientPos, [c.id]: pos } }));
                        }}
                        className="mt-0.5 w-full accent-[#7C3AED]"
                        aria-label={`${c.id} position`}
                      />
                      <p className="text-[10px] leading-tight text-ink-3">AP-1 {c.rssiByAp['AP-1']} dBm · AP-2 {c.rssiByAp['AP-2']} dBm · AP-3 {c.rssiByAp['AP-3']} dBm</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-3">

          {/* Right rail: the AP visual, per-AP cards, site survey */}
          <div className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-black/10 glass-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Ceiling AP — 4x4 MIMO</p>
                <Wifi size={14} className="text-ink-3" />
              </div>
              <svg viewBox="0 0 240 150" className="mt-1 w-full" role="img" aria-label="Ceiling-mounted wireless access point with status ring and PoE uplink">
                {/* PoE uplink cable to the ceiling */}
                <line x1="120" y1="0" x2="120" y2="34" stroke="#5B6472" strokeWidth="3" />
                <rect x="104" y="30" width="32" height="12" rx="3" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                <text x="146" y="40" fontSize="9" fill="#5B6472">PoE uplink · {poeById(poeId)?.label}</text>
                {/* Radiating signal arcs */}
                {[52, 68, 84].map((r, i) => (
                  <path key={r} d={`M ${120 - r} 118 A ${r} ${r} 0 0 1 ${120 + r} 118`} fill="none" stroke={apStatusColor} strokeWidth="2" opacity={0.9 - i * 0.25} strokeDasharray={i === 2 ? '3 4' : undefined} />
                ))}
                {/* AP disc */}
                <ellipse cx="120" cy="96" rx="62" ry="22" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                <ellipse cx="120" cy="96" rx="46" ry="15" fill="none" stroke={apStatusColor} strokeWidth="3" />
                <circle cx="120" cy="96" r="5" fill={apStatusColor} />
                {/* 4x4 MIMO antenna ticks */}
                {[86, 108, 132, 154].map((x) => (
                  <line key={x} x1={x} y1="80" x2={x} y2="74" stroke="#5B6472" strokeWidth="2" />
                ))}
                <text x="120" y="140" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">
                  {SSID} · {standard?.label} · {band} · {apStatusLabel}
                </text>
              </svg>
              <p className="mt-1 text-[11px] leading-snug text-ink-3">
                Status ring {apStatusLabel}; 4x4 MIMO; powered over the Ethernet uplink — no power brick.
              </p>
            </div>

            <div className="rounded-xl border border-black/10 glass-1 p-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Floor APs</p>
              <div className="mt-2 space-y-1.5">
                {AP_DEFS.map((ap, i) => {
                  const interf = Math.min(100, interferencePercent(channels[ap.id], band) + planSelfInterference(i, channelList, band));
                  const clientsHere = connected.filter((c) => c.apId === ap.id).length;
                  return (
                    <div key={ap.id} className="flex items-center gap-2 text-[12px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: interf >= 60 ? '#DC2626' : interf >= 30 ? '#D97706' : '#16A34A' }} />
                      <span className="font-bold text-ink-1">{ap.id}</span>
                      <span className="text-ink-2">ch {channels[ap.id]} · {band}</span>
                      <span className="ml-auto font-semibold text-ink-1">{interf}% · {clientsHere} client{clientsHere === 1 ? '' : 's'}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-3">
                {STANDARDS.find((s) => s.id === standardId)?.label} tops out at {formatRate(standard?.maxMbps || 0)}
                {legacyB ? ' — but the legacy 802.11b client caps the cell at 11 Mbps' : ''}.
              </p>
            </div>

            <div className="rounded-xl border border-black/10 glass-1 p-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Site survey — neighbours</p>
              <div className="mt-2 space-y-1.5">
                {DEFAULT_NEIGHBOURS.map((n) => (
                  <div key={n.ssid} className="text-[12px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink-1">{n.ssid}</span>
                      <span className="text-ink-2">ch {n.channel} · {n.band}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${n.strength}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-3">
                Pick a channel away from the strong neighbours — on 2.4 GHz that means 1, 6 or 11.
              </p>
            </div>
          </div>

          {/* AP config */}
          <div className=" flex flex-col lg:flex-1">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">AP config — updates live</p>
            <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[11px] leading-relaxed text-[#859900] lg:min-h-24 lg:max-h-none lg:flex-1 lg:basis-0">{apConfigText({ ssid: SSID, band, channel: channels['AP-1'], standardId, securityId, ssidBroadcast, poeId })}</pre>
          </div>
        </div>
      </div>

      {/* Below the fold: the lab itself — brief, exercises, debrief. */}
      <div className="mt-8 space-y-6">
        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Lab brief — the wireless access point</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Three APs share one SSID down a 50 m corridor, with neighbours already on the air.
            Pick clean channels, watch five clients associate and roam on signal strength, then
            attack your own network — first with an evil twin, then with 802.1X.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li>Read a site survey and pick a clean channel (1, 6 or 11 on 2.4 GHz).</li>
                <li>Plan three APs on 1 · 6 · 11 and watch plan interference fall to 0%.</li>
                <li>Watch clients associate to the strongest AP and roam as they move.</li>
                <li>Compare WEP, WPA, WPA2 and WPA3 against an evil-twin attack.</li>
                <li>Authenticate a client with 802.1X and size PoE for the AP.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li><strong className="text-ink-1">802.11b/g/n/ac/ax</strong> — Wi-Fi 4 (n), Wi-Fi 5 (ac, 5 GHz), Wi-Fi 6 (ax).</li>
                <li><strong className="text-ink-1">1, 6, 11</strong> — the only non-overlapping 2.4 GHz channels; 5/6 GHz offer more room.</li>
                <li><strong className="text-ink-1">Hidden SSID is NOT security</strong> — the name still shows in probe frames.</li>
                <li><strong className="text-ink-1">WEP broken, WPA weak</strong> — WPA2 (AES-CCMP) and WPA3 (SAE) are the standards.</li>
                <li><strong className="text-ink-1">802.1X / EAP + RADIUS</strong> — enterprise auth; cert validation defeats the evil twin.</li>
                <li><strong className="text-ink-1">Roaming</strong> — same SSID, the client decides on signal strength.</li>
                <li><strong className="text-ink-1">PoE 802.3af/at/bt</strong> — 15.4 / 30 / 60 W; this AP draws 25 W.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink-1">Find a clean channel.</strong> AP-1 starts on channel 1 with 45%
              interference — the café on channel 3 sits two channels away. Move AP-1 to channel 11 (24%),
              or switch the whole band to 5 GHz, channel 40 (0% — the 5 GHz neighbours are elsewhere).
            </li>
            <li>
              <strong className="text-ink-1">Plan 1 · 6 · 11.</strong> The three floor APs start on 1, 6 and 11:
              plan interference 0%, 54 Mbps on 802.11g. Set all three to channel 6 and watch the plan hit
              100% interference and 5 Mbps — then put them back.
            </li>
            <li>
              <strong className="text-ink-1">Make a client roam.</strong> Drag Phone-B from 12 m toward AP-2
              (25 m). It holds AP-1 until AP-2 is clearly stronger, then roams — the log records the move,
              and the roam counter climbs. The APs never force it; the client decides.
            </li>
            <li>
              <strong className="text-ink-1">Break WEP, then stop the twin.</strong> Set security to WEP and run
              the evil-twin attack: 3 clients join the rogue AP, keys “cracked”. Switch to WPA3-Enterprise
              and run it again — blocked, because the twin has no trusted certificate.
            </li>
            <li>
              <strong className="text-ink-1">Starve the AP.</strong> Set PoE to 802.3af (15.4 W): the 25 W AP’s
              radio degrades and throughput halves. Set 802.3at (30 W) and it recovers. Bonus: hide the SSID
              and confirm nothing about security changes — hidden is not security.
            </li>
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-2">
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> On 2.4 GHz the clean channels are 1, 6 and 11 — anything else overlaps a neighbour and pays for it in throughput.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> A 1 · 6 · 11 plan runs at 0% interference and the full 54 Mbps on 802.11g; three APs on one channel share airtime down to 5 Mbps.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Clients associate to the strongest AP above −75 dBm and roam when another AP wins — the decision is theirs, not the AP’s.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> The evil twin steals 3 clients on Open or WEP, 1 on WPA2-Personal — and none on WPA3-Enterprise, where certificate validation stops it cold.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> 802.1X answers Access-Accept from RADIUS, never from the AP itself — and 802.3af cannot feed a 25 W AP.</li>
          </ul>
          <h4 className="mt-4 text-sm font-bold text-ink-1">Check yourself</h4>
          <div className="mt-2 space-y-2">
            {checkYourself.map((item, i) => (
              <div key={item.q} className="rounded-lg border border-black/10 p-3">
                <p className="text-sm font-semibold text-ink-1">{item.q}</p>
                {revealed[i] ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{item.a}</p>
                ) : (
                  <button type="button" onClick={() => toggleReveal(i)} className="mt-1.5 rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold text-ink-1">
                    Reveal answer
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
