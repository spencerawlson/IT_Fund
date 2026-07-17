import React, { useState, useMemo } from 'react';

const BITS = [7, 6, 5, 4, 3, 2, 1, 0];

function asciiChar(n) {
  if (n === 32) return 'SPACE';
  if (n < 32 || n > 126) return 'non-printable';
  return String.fromCharCode(n);
}

export default function NumberSystemConverter() {
  const [byte, setByte] = useState(72);
  const [text, setText] = useState('Hi');

  const binary = byte.toString(2).padStart(8, '0');
  const hex = '0x' + byte.toString(16).toUpperCase().padStart(2, '0');
  const char = asciiChar(byte);

  const toggleBit = (bit) => setByte((b) => b ^ (1 << bit));

  const textRows = useMemo(() => {
    return Array.from(text).slice(0, 16).map((ch) => {
      const code = ch.charCodeAt(0);
      return { ch, code, hex: code.toString(16).toUpperCase(), bin: code.toString(2).padStart(8, '0') };
    });
  }, [text]);

  return (
    <div>
      {/* Byte explorer */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Byte Explorer</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BITS.map((bit) => {
            const on = (byte >> bit) & 1;
            return (
              <button
                key={bit}
                onClick={() => toggleBit(bit)}
                className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg border font-mono transition ${
                  on ? 'border-blue-500/60 bg-blue-500/15 text-blue-300' : 'border-white/10 bg-white/[0.02] text-slate-600'
                }`}
              >
                <span className="text-[9px] text-slate-500">b{bit}</span>
                <span className="text-lg font-bold">{on ? 1 : 0}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Decimal</label>
            <input
              type="number"
              min={0}
              max={255}
              value={byte}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setByte(Math.max(0, Math.min(255, v)));
              }}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Binary</label>
              <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-sm text-blue-300">{binary}</div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Hex</label>
              <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-sm text-amber-300">{hex}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-slate-500">ASCII:</span>
          <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-teal-300">{char}</span>
        </div>
      </div>

      {/* Text encoder */}
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Text → Binary / Hex</p>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={16}
          placeholder="Type text…"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
        />
        <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-white/[0.04] text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Char</th>
                <th className="px-3 py-1.5 font-semibold">Dec</th>
                <th className="px-3 py-1.5 font-semibold">Hex</th>
                <th className="px-3 py-1.5 font-semibold">Binary</th>
              </tr>
            </thead>
            <tbody>
              {textRows.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-3 text-center text-slate-600">Type text above to see its encoding</td></tr>
              ) : textRows.map((r, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-3 py-1.5 font-bold text-white">{r.ch === ' ' ? '␣' : r.ch}</td>
                  <td className="px-3 py-1.5 text-slate-300">{r.code}</td>
                  <td className="px-3 py-1.5 text-amber-300">{r.hex}</td>
                  <td className="px-3 py-1.5 text-blue-300">{r.bin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}