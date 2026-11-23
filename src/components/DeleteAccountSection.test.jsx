import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer from 'react-test-renderer';
import { DeleteAccountSection } from './DeleteAccountSection';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const accountMocks = vi.hoisted(() => ({ deleteOwnAccount: vi.fn() }));

vi.mock('@/api/account', () => ({
  deleteOwnAccount: (...args) => accountMocks.deleteOwnAccount(...args),
}));

function textOf(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'children' in node) return textOf(node.children);
  return '';
}

async function renderSection(onDeleted = vi.fn()) {
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(<DeleteAccountSection onDeleted={onDeleted} />);
  });
  return { renderer, onDeleted };
}

function buttonByText(renderer, text) {
  const buttons = renderer.root.findAllByType('button');
  const found = buttons.find((b) => textOf(b.children).includes(text));
  if (!found) throw new Error(`no button with text: ${text}`);
  return found;
}

async function click(node) {
  await TestRenderer.act(async () => {
    node.props.onClick();
    await new Promise((r) => setTimeout(r, 0));
  });
  await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

describe('DeleteAccountSection (self-service delete, Guideline 5.1.1(v))', () => {
  beforeEach(() => {
    accountMocks.deleteOwnAccount.mockReset();
    accountMocks.deleteOwnAccount.mockResolvedValue({ ok: true, deleted_user_id: 'u1' });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('renders the delete section with the honest consequences, no API call yet', async () => {
    const { renderer } = await renderSection();
    try {
      const text = textOf(renderer.toJSON());
      expect(text).toContain('Delete account');
      expect(text).toContain('permanently removes your progress');
      expect(text).toContain('cancels your Stripe subscription');
      expect(text).toContain('cannot be undone');
      expect(accountMocks.deleteOwnAccount).not.toHaveBeenCalled();
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('is two-step: the first click only opens the confirm step, the second deletes', async () => {
    const { renderer, onDeleted } = await renderSection();
    try {
      await click(buttonByText(renderer, 'Delete account'));
      expect(accountMocks.deleteOwnAccount).not.toHaveBeenCalled();
      expect(textOf(renderer.toJSON())).toContain('Delete your account?');
      expect(textOf(renderer.toJSON())).toContain('Yes, delete my account');
      await click(buttonByText(renderer, 'Yes, delete my account'));
      expect(accountMocks.deleteOwnAccount).toHaveBeenCalledTimes(1);
      expect(accountMocks.deleteOwnAccount).toHaveBeenCalledWith();
      expect(onDeleted).toHaveBeenCalledTimes(1);
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('Cancel returns to the idle step without calling the API', async () => {
    const { renderer, onDeleted } = await renderSection();
    try {
      await click(buttonByText(renderer, 'Delete account'));
      expect(textOf(renderer.toJSON())).toContain('Delete your account?');
      await click(buttonByText(renderer, 'Cancel'));
      expect(textOf(renderer.toJSON())).not.toContain('Delete your account?');
      expect(textOf(renderer.toJSON())).toContain('Delete account');
      expect(accountMocks.deleteOwnAccount).not.toHaveBeenCalled();
      expect(onDeleted).not.toHaveBeenCalled();
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('tells iOS users to cancel an Apple subscription in Settings first', async () => {
    const { renderer } = await renderSection();
    try {
      await click(buttonByText(renderer, 'Delete account'));
      const text = textOf(renderer.toJSON());
      expect(text).toContain('App Store');
      expect(text).toContain('iOS Settings');
      expect(text).toContain('does not cancel an Apple subscription');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('shows the server error on the confirm step and lets the user retry or cancel', async () => {
    accountMocks.deleteOwnAccount.mockRejectedValueOnce(
      Object.assign(new Error('Billing is unavailable right now'), {
        status: 503,
        detail: 'Billing is unavailable right now; your subscription could not be canceled. Please try again later.',
      }),
    );
    const { renderer, onDeleted } = await renderSection();
    try {
      await click(buttonByText(renderer, 'Delete account'));
      await click(buttonByText(renderer, 'Yes, delete my account'));
      expect(accountMocks.deleteOwnAccount).toHaveBeenCalledTimes(1);
      expect(onDeleted).not.toHaveBeenCalled();
      const text = textOf(renderer.toJSON());
      expect(text).toContain('Billing is unavailable right now');
      expect(text).toContain('Yes, delete my account');
      // Retry succeeds after the transient billing failure.
      await click(buttonByText(renderer, 'Yes, delete my account'));
      expect(accountMocks.deleteOwnAccount).toHaveBeenCalledTimes(2);
      expect(onDeleted).toHaveBeenCalledTimes(1);
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });
});
