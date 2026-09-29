import { beforeAll, describe, expect, it } from 'vitest';

let cn;
beforeAll(async () => {
  // utils.js reads window at import time; tests run in Node.
  globalThis.window ??= { self: 1, top: 1 };
  ({ cn } = await import('@/lib/utils'));
});

describe('cn() with the design-system type scale', () => {
  it('keeps a custom font size next to a text colour', () => {
    expect(cn('text-heading text-ink-1')).toBe('text-heading text-ink-1');
    expect(cn('text-action-ink', 'text-body')).toBe('text-action-ink text-body');
  });

  it('still lets a later size or colour override an earlier one', () => {
    expect(cn('text-body', 'text-small')).toBe('text-small');
    expect(cn('text-ink-1', 'text-ink-2')).toBe('text-ink-2');
  });
});
