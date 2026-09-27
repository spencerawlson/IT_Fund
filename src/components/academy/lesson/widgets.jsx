import React, { useState, useEffect } from 'react';

const PLACES = [128, 64, 32, 16, 8, 4, 2, 1];

/** Eight toggleable bits with live decimal, hex and binary readouts. */
export function BitsWidget({ color, onValue }) {
  const [bits, setBits] = useState(Array(8).fill(0));
  const value = bits.reduce((sum, b, i) => sum + b * PLACES[i], 0);

  useEffect(() => onValue(value), [value, onValue]);

  return (
    <div className="glass rounded-3xl p-4 sm:p-6">
      <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
        {PLACES.map((place, i) => (
          <div key={place} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-400 sm:text-xs">{place}</span>
            <button
              type="button"
              aria-label={`Bit worth ${place}: ${bits[i] ? 'on' : 'off'}`}
              aria-pressed={!!bits[i]}
              onClick={() => setBits((b) => b.map((v, j) => (j === i ? 1 - v : v)))}
              className="aspect-[3/4] w-full rounded-xl border text-lg font-bold transition active:scale-95 sm:text-2xl"
              style={
                bits[i]
                  ? { background: color, borderColor: 'rgba(255,255,255,0.35)', boxShadow: `0 6px 20px -6px ${color}, inset 0 1px 0 rgba(255,255,255,0.45)` }
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgb(148 163 184)' }
              }
            >
              {bits[i]}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <Readout label="Decimal" value={value} big />
        <Readout label="Hex" value={`0x${value.toString(16).toUpperCase().padStart(2, '0')}`} />
        <Readout label="Binary" value={bits.join('')} mono />
      </div>
    </div>
  );
}

/** Prefix slider showing network vs host bits, the mask, and address counts. */
export function CidrWidget({ color, onValue }) {
  const [prefix, setPrefix] = useState(24);
  const hostBits = 32 - prefix;
  const total = 2 ** hostBits;
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : total - 2;
  const maskInt = prefix === 0 ? 0 : (0xffffffff << hostBits) >>> 0;
  const mask = [24, 16, 8, 0].map((s) => (maskInt >>> s) & 255).join('.');

  useEffect(() => onValue(prefix), [prefix, onValue]);

  return (
    <div className="glass rounded-3xl p-4 sm:p-6">
      <div className="flex items-baseline justify-between">
        <span className="text-4xl font-bold text-white sm:text-5xl">/{prefix}</span>
        <span className="font-mono text-sm text-slate-300 sm:text-base">{mask}</span>
      </div>
      <div className="mt-4 flex gap-[2px]" aria-hidden>
        {Array.from({ length: 32 }, (_, i) => (
          <div
            key={i}
            className={`h-6 flex-1 rounded-[3px] ${i % 8 === 7 && i < 31 ? 'mr-1' : ''}`}
            style={{ background: i < prefix ? color : 'rgba(255,255,255,0.12)' }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
        <span style={{ color }}>{prefix} network bits</span>
        <span>{hostBits} host bits</span>
      </div>
      <input
        type="range"
        min={8}
        max={30}
        value={prefix}
        onChange={(e) => setPrefix(Number(e.target.value))}
        aria-label="Prefix length"
        className="mt-5 h-8 w-full cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <Readout label="Addresses" value={total.toLocaleString()} big />
        <Readout label="Usable hosts" value={usable.toLocaleString()} big />
      </div>
    </div>
  );
}

const HASH_SEED = 'Transfer $100 to Alice';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Live SHA-256 of editable text, highlighting hex digits that changed from the original. */
export function HashWidget({ color, onValue }) {
  const [text, setText] = useState(HASH_SEED);
  const [original, setOriginal] = useState('');
  const [hash, setHash] = useState('');

  useEffect(() => {
    sha256(HASH_SEED).then(setOriginal);
  }, []);
  useEffect(() => {
    let live = true;
    sha256(text).then((h) => live && setHash(h));
    return () => {
      live = false;
    };
  }, [text]);
  useEffect(() => onValue(text !== HASH_SEED), [text, onValue]);

  const changed = hash && original ? [...hash].filter((c, i) => c !== original[i]).length : 0;

  return (
    <div className="glass rounded-3xl p-4 sm:p-6">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400" htmlFor="hash-input">Message</label>
      <input
        id="hash-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 font-mono text-base text-white outline-none focus:border-white/40"
      />
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">SHA-256</p>
      <p className="mt-1.5 break-all rounded-xl bg-black/30 p-3 font-mono text-[13px] leading-relaxed sm:text-sm">
        {[...hash].map((c, i) => (
          <span key={i} style={{ color: original && c !== original[i] ? color : 'rgb(148 163 184)' }}>{c}</span>
        ))}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        {text === HASH_SEED ? 'Original message.' : `${changed} of 64 hex digits changed.`}
      </p>
    </div>
  );
}

function Readout({ label, value, big = false, mono = false }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-2 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate font-bold text-white ${big ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base'} ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

export const WIDGETS = { bits: BitsWidget, cidr: CidrWidget, hash: HashWidget };

export function goalMet(widget, goal, value) {
  if (widget === 'bits') return value === goal.value;
  if (widget === 'cidr') return value === goal.prefix;
  if (widget === 'hash') return value === true;
  return false;
}
