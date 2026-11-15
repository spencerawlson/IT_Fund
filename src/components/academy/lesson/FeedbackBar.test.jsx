import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FeedbackBar from './FeedbackBar';

// The TutorAssist inside the bar needs a QueryClient; its tutor-status
// query is unresolved in SSR, so it renders nothing — the face assertions
// below don't depend on it.
const tutorMocks = vi.hoisted(() => ({
  fetchTutorStatus: vi.fn(async () => ({ enabled: true })),
  streamTutor: vi.fn(),
}));
vi.mock('@/api/tutor', () => ({
  fetchTutorStatus: (...args) => tutorMocks.fetchTutorStatus(...args),
  streamTutor: (...args) => tutorMocks.streamTutor(...args),
}));

const noop = () => {};
const base = {
  canCheck: true,
  onCheck: noop,
  onRetry: noop,
  onReveal: noop,
  onContinue: noop,
  answer: 'The right answer',
  explanation: 'Because it is.',
  tutor: { track: 'net', topic: 'Network Security', question: 'What?' },
};

function renderBar(props) {
  const queryClient = new QueryClient();
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <FeedbackBar {...base} {...props} />
    </QueryClientProvider>,
  );
}

describe('FeedbackBar Cypher face', () => {
  it('rests at Happy before answering (idle), next to the Check button', () => {
    const html = renderBar({ status: 'idle' });
    expect(html).toContain('/images/cypher-face-happy.png');
    expect(html).not.toContain('/images/cypher-face-sad.png');
    expect(html).toContain('Check');
  });

  it('stays Happy on a right answer', () => {
    const html = renderBar({ status: 'correct' });
    expect(html).toContain('/images/cypher-face-happy.png');
    expect(html).not.toContain('/images/cypher-face-sad.png');
  });

  it('morphs to Sad on a wrong answer', () => {
    const html = renderBar({ status: 'wrong' });
    expect(html).toContain('/images/cypher-face-sad.png');
    expect(html).not.toContain('/images/cypher-face-happy.png');
    expect(html).toContain('Not quite.');
    expect(html).toContain('Try again');
  });

  it('stays Sad when the answer is revealed after the misses', () => {
    const html = renderBar({ status: 'revealed' });
    expect(html).toContain('/images/cypher-face-sad.png');
    expect(html).not.toContain('/images/cypher-face-happy.png');
    expect(html).toContain('Here’s the answer');
  });

  it('shows the face on the dark chip', () => {
    const html = renderBar({ status: 'idle' });
    expect(html).toContain('bg-[#0D1B2A]');
  });
});
