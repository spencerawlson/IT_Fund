import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import baseline from './legacy-glass-baseline.json';

// Hand-rolled translucent panels (bg-white/[0.0x]) are how the UI drifted apart. New UI uses
// .glass-1/2/3 and @/components/ui-glass instead. This ratchet lets existing files keep their
// current count while they are migrated, and fails if any file adds more.
// After migrating a file, lower (or delete) its entry in legacy-glass-baseline.json.

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const PATTERN = /bg-white\/\[0\.\d+\]/g;
// The design system itself (kit, app shell, preview page) is where these tints are allowed to live.
const EXEMPT = (rel) =>
  rel.startsWith('src/components/ui-glass/') || rel.startsWith('src/components/shell/') || rel === 'src/pages/DesignSystem.jsx';

function jsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsxFiles(path);
    return name.endsWith('.jsx') ? [relative(ROOT, path).split('\\').join('/')] : [];
  });
}

describe('legacy glass ratchet', () => {
  it('no file adds hand-rolled glass panels', () => {
    const grew = [];
    for (const rel of jsxFiles(join(ROOT, 'src')).filter((f) => !EXEMPT(f))) {
      const count = (readFileSync(join(ROOT, rel), 'utf8').match(PATTERN) || []).length;
      const allowed = baseline[rel] || 0;
      if (count > allowed) grew.push(`${rel}: ${count} (allowed ${allowed})`);
    }
    expect(grew, 'Use .glass-1/2/3 or @/components/ui-glass instead of bg-white/[0.0x]').toEqual([]);
  });
});
