// Regenerate the audit inventory + structural issue list:
//   node scripts/content-audit/run.mjs
// Writes docs/audit/inventory.json and docs/audit/structural-issues.json,
// and prints a summary. Lab data comes from scripts/content-audit/labs_inventory.py
// through the backend venv when available, else from the last docs/audit/labs.json.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, loadContent, loadCatalog, buildInventory, structuralIssues, summarise } from './lib.mjs';

const OUT = join(ROOT, 'docs', 'audit');
mkdirSync(OUT, { recursive: true });

function loadLabs() {
  const py = [join(ROOT, 'backend', '.venv', 'Scripts', 'python.exe'), join(ROOT, 'backend', '.venv', 'bin', 'python')].find(existsSync);
  const cached = join(OUT, 'labs.json');
  if (py) {
    try {
      const json = execFileSync(py, [join(ROOT, 'scripts', 'content-audit', 'labs_inventory.py')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      writeFileSync(cached, json.endsWith('\n') ? json : `${json}\n`, 'utf8');
      return JSON.parse(json);
    } catch (e) {
      console.warn('labs inventory failed, using cached docs/audit/labs.json:', e.message.split('\n')[0]);
    }
  }
  return existsSync(cached) ? JSON.parse(readFileSync(cached, 'utf8')) : [];
}

const content = loadContent();
const catalog = await loadCatalog();
const labs = loadLabs();
const inventory = buildInventory(content, catalog, labs);
const issues = structuralIssues(content, catalog);
writeFileSync(join(OUT, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
writeFileSync(join(OUT, 'structural-issues.json'), `${JSON.stringify(issues, null, 2)}\n`, 'utf8');
const s = summarise(issues);
console.log('totals', inventory.totals);
console.log('structural issues', s);
