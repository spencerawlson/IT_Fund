import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isChunkLoadError } from './ErrorBoundary';

describe('isChunkLoadError', () => {
  it('recognises the dynamic-import failure Vite throws for a stale chunk', () => {
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: http://x/assets/LabLauncher-LQ9lvN9V.js')),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('ChunkLoadError: Loading chunk 7 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
  });

  it('does not treat ordinary render errors as chunk failures', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(true);
  });

  it('the boundary offers a full reload (not a retry) for chunk failures', () => {
    // A retry re-issues the same import of the same stale URL and fails
    // again; only a reload fetches fresh HTML with current chunk hashes.
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ErrorBoundary.jsx'), 'utf8');
    expect(src).toContain('Reload the page');
    expect(src).toContain('window.location.reload()');
    expect(src).toContain('isChunkLoadError(error)');
  });
});
