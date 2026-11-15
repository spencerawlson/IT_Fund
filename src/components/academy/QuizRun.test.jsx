import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import QuizRun from './QuizRun';

// SSR smoke: the run renders question 1 with Cypher resting at Happy next
// to the Next button. (The Sad path on a wrong pick is the same
// answeredRight derivation covered by FeedbackBar's tests.)
const QUESTIONS = [
  {
    card: { id: 'net-0', q: 'What does a firewall do?', a: 'Filters traffic', x: 'It enforces policy at the boundary.' },
    options: ['Filters traffic', 'Routes packets', 'Encrypts disk', 'Caches DNS'],
    correct: 0,
  },
  {
    card: { id: 'net-1', q: 'What does a switch do?', a: 'Forwards frames', x: 'It forwards by MAC address.' },
    options: ['Forwards frames', 'Routes packets', 'Encrypts disk', 'Caches DNS'],
    correct: 0,
  },
];

describe('QuizRun Cypher face', () => {
  it('rests at Happy before answering, on the dark chip', () => {
    const html = renderToString(
      <QuizRun questions={QUESTIONS} onFinish={() => {}} meta={{ track: 'net', topic: 'Network Security' }} />,
    );
    expect(html).toContain('/images/cypher-face-happy.png');
    expect(html).not.toContain('/images/cypher-face-sad.png');
    expect(html).toContain('bg-[#0D1B2A]');
    // SSR splits JSX expressions with comment nodes, so match the pieces.
    expect(html).toContain('Question ');
    expect(html).toContain('What does a firewall do?');
    expect(html).toContain('Next');
  });
});
