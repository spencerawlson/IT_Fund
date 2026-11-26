import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({ enabled: true, auth: { authChecked: true, isAuthenticated: true }, ask: null, text: '' }));
vi.mock('./TutorAssist', () => ({
  useTutorEnabled: () => state.enabled,
  useTutor: () => ({ text: state.text, loading: false, error: '', ask: state.ask, stop: () => {}, reset: () => {} }),
  TutorText: ({ text }) => <p>{text}</p>,
}));
vi.mock('@/lib/AuthContext', () => ({ useOptionalAuth: () => state.auth }));

const { default: CypherSlideExplain, slideExplainRequest } = await import('./CypherSlideExplain');

const SLIDE = { title: 'Kerberos and federation', caption: 'The KDC issues tickets; federation trusts another IdP.' };

function render() {
  let root;
  act(() => {
    root = TestRenderer.create(
      <MemoryRouter>
        <CypherSlideExplain slide={SLIDE} lessonTitle="CISSP Domain 5" />
      </MemoryRouter>,
    );
  });
  return root;
}
const out = (root) => JSON.stringify(root.toJSON());

describe('CypherSlideExplain — the slide deck integration point for the real tutor', () => {
  beforeEach(() => {
    state.enabled = true;
    state.auth = { authChecked: true, isAuthenticated: true };
    state.ask = vi.fn();
    state.text = '';
  });

  it('asks the real tutor in explain mode, grounded on this slide own lesson text', () => {
    const root = render();
    const btn = root.root.findAll((n) => n.type === 'button')[0];
    act(() => { btn.props.onClick(); });
    const req = slideExplainRequest(SLIDE, 'CISSP Domain 5');
    expect(state.ask).toHaveBeenCalledWith(req);
    expect(req.mode).toBe('explain');
    expect(req.lesson_text).toBe(`${SLIDE.title}\n\n${SLIDE.caption}`);
    expect(req.question).toContain(SLIDE.title);
    expect(req.question.length).toBeLessThanOrEqual(600);
  });

  it('shows only what the tutor returned, never a canned answer of its own', () => {
    expect(out(render())).not.toContain('KDC issues tickets');
    state.text = 'Streamed answer from the tutor.';
    expect(out(render())).toContain('Streamed answer from the tutor.');
  });

  it('renders nothing when the tutor is switched off', () => {
    state.enabled = false;
    expect(render().toJSON()).toBeNull();
  });

  it('a signed-out learner gets a sign-in link, not a button that spends tutor money', () => {
    state.auth = { authChecked: true, isAuthenticated: false };
    const root = render();
    expect(out(root)).toContain('to ask Cypher to explain this slide');
    expect(root.root.findAll((n) => n.type === 'button')).toHaveLength(0);
  });

  it('standalone renders its own card under the slide, with no divider at the top', () => {
    let root;
    act(() => {
      root = TestRenderer.create(
        <MemoryRouter>
          <CypherSlideExplain slide={SLIDE} lessonTitle="CISSP Domain 5" standalone />
        </MemoryRouter>,
      );
    });
    expect(out(root)).toContain('Explain this slide');
    const cards = root.root.findAll(
      (n) => typeof n.props?.className === 'string' && n.props.className.includes('rounded-2xl'),
    );
    expect(cards).toHaveLength(1);
    expect(out(root)).not.toContain('border-t');
  });

  it('standalone still renders nothing when the tutor is switched off', () => {
    state.enabled = false;
    let root;
    act(() => {
      root = TestRenderer.create(
        <MemoryRouter>
          <CypherSlideExplain slide={SLIDE} lessonTitle="CISSP Domain 5" standalone />
        </MemoryRouter>,
      );
    });
    expect(root.toJSON()).toBeNull();
  });
});
