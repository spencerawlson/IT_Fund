#!/usr/bin/env node
// Fetch CC0/CC-BY device models from Poly Pizza into public/models/<key>.glb
// for the 3D topology view (see src/components/three/deviceModels.js).
//
// The API key is read from POLY_PIZZA_KEY in the environment, or from a
// .env / .env.local line `POLY_PIZZA_KEY=...` (both are gitignored). The key is
// NEVER printed or written to a committed file.
//
// Usage:
//   POLY_PIZZA_KEY=xxx node scripts/fetch-device-models.mjs          # fill missing
//   POLY_PIZZA_KEY=xxx node scripts/fetch-device-models.mjs --force  # re-download all
//
// Each download is validated as a real binary glTF (magic "glTF") before it is
// kept. Provenance (title/author/license/url) is written to
// public/models/PROVENANCE.json so attribution is recorded.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'models');
const FORCE = process.argv.includes('--force');

// Device key -> { queries tried in order, title keywords that confirm a good
// match }. We only accept a model whose TITLE contains a keyword, so e.g. the
// switch can't silently become a router. Tune these if a pick looks wrong.
const SPECS = {
  // "switch" alone matches Nintendo Switch / light switch — require a network
  // word in the title and reject the look-alikes. If nothing matches, the
  // procedural Switch3D rack chassis (a real switch) is used as the fallback.
  switch: {
    queries: ['network switch', 'ethernet switch', 'cisco switch', 'rack switch'],
    words: ['network', 'ethernet'],
    reject: ['nintendo', 'joy', 'console', 'game', 'light', 'toggle', 'lever'],
  },
  router: {
    queries: ['wifi router', 'network router', 'router'],
    words: ['router'],
    prefer: ['wifi', 'network', 'wireless', 'internet'],
    reject: ['wood', 'woodworking', 'power tool', 'cnc'],
  },
  server: { queries: ['server', 'server rack', 'data server'], words: ['server'] },
  firewall: { queries: ['firewall', 'brick wall', 'shield', 'security shield', 'wall'], words: ['firewall', 'wall', 'shield'] },
  cloud: { queries: ['cloud', 'cloud icon'], words: ['cloud'] },
  pc: { queries: ['desktop computer', 'computer tower', 'pc'], words: ['computer', 'pc', 'desktop', 'tower'] },
};

function resolveKey() {
  if (process.env.POLY_PIZZA_KEY) return process.env.POLY_PIZZA_KEY.trim();
  for (const f of ['.env.local', '.env', 'backend/.env', 'backend/.env.local']) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^\s*POLY_PIZZA_KEY\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// Pull plausible fields out of a result regardless of exact casing.
function pick(obj, names) {
  for (const n of names) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === n.toLowerCase() && obj[k]) return obj[k];
    }
  }
  return undefined;
}

function glbUrlOf(r) {
  // Common shapes: r.Download (direct glb), or a formats map.
  const direct = pick(r, ['Download', 'download', 'glb', 'url']);
  if (typeof direct === 'string' && direct.includes('.glb')) return direct;
  if (typeof direct === 'string' && /poly\.pizza|\.glb/.test(direct)) return direct;
  return typeof direct === 'string' ? direct : undefined;
}

async function search(key, query) {
  const url = `https://api.poly.pizza/v1/search/${encodeURIComponent(query)}?Limit=20`;
  const res = await fetch(url, { headers: { 'X-Auth-Token': key } });
  if (!res.ok) throw new Error(`search "${query}" -> HTTP ${res.status}`);
  const data = await res.json();
  const results = Array.isArray(data) ? data : (data.results || data.Results || []);
  if (!results.length) throw new Error(`no results for "${query}"`);
  return results;
}

// Higher is better. A reject word disqualifies outright (e.g. "Nintendo Switch").
// A required word must appear in the title; a prefer word boosts; CC0 beats CC-BY.
function score(r, spec) {
  const title = String(pick(r, ['Title', 'title', 'name']) || '').toLowerCase();
  const lic = String(pick(r, ['Licence', 'License', 'license']) || '').toUpperCase();
  if ((spec.reject || []).some((w) => title.includes(w))) return -1000;
  const titleMatch = spec.words.some((w) => title.includes(w));
  const preferMatch = (spec.prefer || []).some((w) => title.includes(w));
  const licScore = lic.includes('CC0') ? 2 : (lic.includes('CC-BY') || lic.includes('CCBY')) ? 1 : 0;
  return (titleMatch ? 100 : -100) + (preferMatch ? 50 : 0) + licScore;
}

async function downloadGlb(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error(`not a binary glTF (magic=${JSON.stringify(buf.toString('ascii', 0, 4))})`);
  }
  return buf;
}

async function main() {
  const key = resolveKey();
  if (!key) {
    console.error('No API key. Set POLY_PIZZA_KEY=... (env) or add it to .env.local');
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const provenance = existsSync(join(OUT, 'PROVENANCE.json'))
    ? JSON.parse(readFileSync(join(OUT, 'PROVENANCE.json'), 'utf8'))
    : {};

  for (const [modelKey, spec] of Object.entries(SPECS)) {
    const dest = join(OUT, `${modelKey}.glb`);
    if (existsSync(dest) && !FORCE) { console.log(`skip ${modelKey}.glb (exists; --force to replace)`); continue; }

    // Gather candidates across all queries, keep only title-matching ones, best first.
    const candidates = [];
    for (const query of spec.queries) {
      try {
        for (const r of await search(key, query)) {
          const s = score(r, spec);
          if (s > 0 && glbUrlOf(r)) candidates.push({ r, s, query });
        }
      } catch (e) { /* try next query */ }
    }
    candidates.sort((a, b) => b.s - a.s);

    let saved = false;
    for (const { r, query } of candidates.slice(0, 8)) {
      try {
        const buf = await downloadGlb(glbUrlOf(r));
        writeFileSync(dest, buf);
        const creator = pick(r, ['Creator', 'Author', 'attribution']);
        provenance[modelKey] = {
          title: pick(r, ['Title', 'title', 'name']) || query,
          author: (creator && typeof creator === 'object')
            ? (creator.Username || creator.username || creator.name || 'unknown')
            : (creator || 'unknown'),
          licence: pick(r, ['Licence', 'License', 'license']) || 'unknown',
          source: pick(r, ['Url', 'link', 'Download']) || glbUrlOf(r),
          query,
        };
        console.log(`saved ${modelKey}.glb  (${(buf.length / 1024).toFixed(0)} KB)  [${provenance[modelKey].licence}] "${provenance[modelKey].title}"`);
        saved = true;
        break;
      } catch (e) { /* try next candidate */ }
    }
    if (!saved) console.warn(`WARN ${modelKey}: no title-matching GLB found (fallback model stays).`);
  }

  writeFileSync(join(OUT, 'PROVENANCE.json'), JSON.stringify(provenance, null, 2) + '\n');
  console.log('\nProvenance written to public/models/PROVENANCE.json. Review licences before committing.');
}

main();
