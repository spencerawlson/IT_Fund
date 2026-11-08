// PacketJourney — renders one protocol journey: endpoint diagram, animated node flow,
// Wireshark-style packet table (collapses to stacked cards on phones), click-a-packet
// decode, protocol cards, and inline check questions with immediate feedback.
import { useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle, FlaskConical, Info, Layers, Clock, Database } from 'lucide-react';
import FlowDiagram from './FlowDiagram';

function EndpointStrip({ endpoints }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {endpoints.map((ep, i) => (
        <div key={ep.label} className="flex flex-wrap items-center gap-2">
          <div className="glass-1 rounded-xl px-3 py-2 text-center">
            <div className="text-sm font-bold text-[rgb(var(--ink-1-rgb))]">{ep.label}</div>
            <div className="font-mono text-xs text-slate-600">{ep.ip}</div>
            <div className="text-xs text-slate-500">{ep.role}</div>
          </div>
          {i < endpoints.length - 1 && (
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

function ProtocolCards({ protocols }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {protocols.map((p) => (
        <article key={p.name} className="glass-1 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[rgb(var(--action-rgb))]" aria-hidden="true" />
            <h4 className="text-base font-bold text-[rgb(var(--ink-1-rgb))]">{p.name}</h4>
          </div>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Layer</dt><dd className="text-right font-medium">{p.layer}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Port</dt><dd className="text-right font-medium">{p.port}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Transport</dt><dd className="text-right font-medium">{p.transport}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Format</dt><dd className="text-right font-medium">{p.format}</dd></div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Spec</dt>
              <dd className="text-right font-medium">
                <a className="text-violet-700 underline underline-offset-2" href={p.href} target="_blank" rel="noreferrer">{p.rfc}</a>
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-slate-600">{p.blurb}</p>
        </article>
      ))}
    </div>
  );
}

function PacketTable({ packets, selected, onSelect }) {
  return (
    <div>
      {/* Desktop: real table */}
      <div className="hidden overflow-x-auto rounded-2xl glass-1 md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">No.</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Destination</th>
              <th className="px-3 py-2">Protocol</th>
              <th className="px-3 py-2">Info</th>
              <th className="px-3 py-2 text-right">Size</th>
            </tr>
          </thead>
          <tbody>
            {packets.map((pkt) => (
              <tr
                key={pkt.no}
                onClick={() => onSelect(pkt.no)}
                className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-violet-50 ${selected === pkt.no ? 'bg-violet-100/70' : ''}`}
              >
                <td className="px-3 py-2 font-mono font-semibold">{pkt.no}</td>
                <td className="px-3 py-2 font-mono text-xs">{pkt.time}</td>
                <td className="px-3 py-2 font-mono text-xs">{pkt.source}</td>
                <td className="px-3 py-2 font-mono text-xs">{pkt.dest}</td>
                <td className="px-3 py-2"><span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">{pkt.protocol}</span></td>
                <td className="px-3 py-2">{pkt.info}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{pkt.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Phones: stacked cards, no page-level scroll */}
      <div className="space-y-2 md:hidden">
        {packets.map((pkt) => (
          <button
            key={pkt.no}
            type="button"
            onClick={() => onSelect(pkt.no)}
            className={`w-full rounded-2xl glass-1 p-3 text-left ${selected === pkt.no ? 'ring-2 ring-violet-400' : ''}`}
            aria-pressed={selected === pkt.no}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 font-mono text-xs font-bold text-violet-800">{pkt.no}</span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">{pkt.protocol}</span>
                <span className="font-mono text-xs text-slate-500">{pkt.time}</span>
              </span>
              <span className="font-mono text-xs text-slate-500">{pkt.size}</span>
            </div>
            <div className="mt-2 font-mono text-xs text-slate-600">{pkt.source} → {pkt.dest}</div>
            <div className="mt-1 text-sm font-medium text-[rgb(var(--ink-1-rgb))]">{pkt.info}</div>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Tap a packet to decode it, byte by byte, below.</p>
    </div>
  );
}

function DecodePanel({ packet }) {
  if (!packet) return null;
  const { decode } = packet;
  return (
    <section className="glass-1 rounded-2xl p-4" aria-live="polite">
      <h4 className="text-base font-bold text-[rgb(var(--ink-1-rgb))]">Packet {packet.no} — {decode.title}</h4>
      <div className="mt-3 space-y-3">
        {decode.fields.map((f) => (
          <div key={f.name} className="rounded-xl bg-white/70 px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-semibold text-[rgb(var(--ink-1-rgb))]">{f.name}</span>
              <span className="font-mono text-sm font-bold text-violet-800">{f.value}</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-600">{f.meaning}</p>
          </div>
        ))}
      </div>
      {decode.note && (
        <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
          {decode.note}
        </p>
      )}
    </section>
  );
}

function RecordTypes({ records }) {
  return (
    <section className="glass-1 rounded-2xl p-4">
      <h4 className="flex items-center gap-2 text-base font-bold text-[rgb(var(--ink-1-rgb))]">
        <Database className="h-4 w-4 text-[rgb(var(--action-rgb))]" aria-hidden="true" />
        Record types you will meet
      </h4>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {records.map((r) => (
          <div key={r.type} className="rounded-xl bg-white/70 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold text-violet-800">{r.type}</span>
              <span className="text-sm font-semibold">{r.name}</span>
            </div>
            <p className="text-sm text-slate-600">{r.meaning}</p>
            <p className="font-mono text-xs text-slate-500">{r.example}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CheckQuestions({ questions }) {
  const [picked, setPicked] = useState({});
  return (
    <section aria-label="Check your understanding">
      <h3 className="text-lg font-bold text-[rgb(var(--ink-1-rgb))]">Check your understanding</h3>
      <div className="mt-3 space-y-3">
        {questions.map((q, qi) => {
          const chosen = picked[qi];
          const answered = typeof chosen === 'number';
          return (
            <div key={qi} className="glass-1 rounded-2xl p-4">
              <p className="font-semibold text-[rgb(var(--ink-1-rgb))]">{qi + 1}. {q.q}</p>
              <div className="mt-2 grid gap-2">
                {q.options.map((opt, oi) => {
                  const isAnswer = oi === q.answer;
                  const isChosen = chosen === oi;
                  let cls = 'border-slate-200 bg-white/70 hover:border-violet-300';
                  if (answered && isAnswer) cls = 'border-green-500 bg-green-50';
                  else if (answered && isChosen && !isAnswer) cls = 'border-red-400 bg-red-50';
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={answered}
                      onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                      className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm ${cls}`}
                    >
                      {answered && isAnswer && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />}
                      {answered && isChosen && !isAnswer && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-sm ${chosen === q.answer ? 'text-green-700' : 'text-slate-700'}`}>
                  {chosen === q.answer ? 'Correct. ' : 'Not quite — the correct answer is highlighted. '}{q.explain}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function PacketJourney({ journey }) {
  const [selectedNo, setSelectedNo] = useState(journey.packets[0]?.no ?? null);
  const selected = journey.packets.find((p) => p.no === selectedNo) ?? null;
  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span><strong>Simulated walkthrough.</strong> {journey.simulatedNote}</span>
      </p>

      <section aria-label="Who is talking">
        <h3 className="mb-2 text-lg font-bold text-[rgb(var(--ink-1-rgb))]">Who is talking</h3>
        <EndpointStrip endpoints={journey.endpoints} />
      </section>

      <section aria-label="The journey">
        <h3 className="mb-2 text-lg font-bold text-[rgb(var(--ink-1-rgb))]">The journey</h3>
        <FlowDiagram nodes={journey.nodes} />
      </section>

      <section aria-label="Protocols involved">
        <h3 className="mb-2 text-lg font-bold text-[rgb(var(--ink-1-rgb))]">Protocols involved</h3>
        <ProtocolCards protocols={journey.protocols} />
      </section>

      {journey.records && <RecordTypes records={journey.records} />}

      <section aria-label="Packet capture">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-[rgb(var(--ink-1-rgb))]">
          <Clock className="h-4 w-4 text-[rgb(var(--action-rgb))]" aria-hidden="true" />
          Packet capture
        </h3>
        <PacketTable packets={journey.packets} selected={selectedNo} onSelect={setSelectedNo} />
      </section>

      <DecodePanel packet={selected} />

      {journey.callouts && (
        <section aria-label="Worth knowing" className="space-y-2">
          {journey.callouts.map((c) => (
            <div key={c.title} className="glass-1 rounded-2xl p-4">
              <h4 className="font-bold text-[rgb(var(--ink-1-rgb))]">{c.title}</h4>
              <p className="mt-1 text-sm text-slate-600">{c.body}</p>
            </div>
          ))}
        </section>
      )}

      <CheckQuestions questions={journey.questions} />
    </div>
  );
}
