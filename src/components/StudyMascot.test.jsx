import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import StudyMascot from './StudyMascot';
import * as facts from '@/data/mascotFacts';

afterEach(() => {
  vi.restoreAllMocks();
});

const items = [
  { type: 'fact', text: 'Fact one' },
  { type: 'question', text: 'Question one?', answer: 'Answer one' },
];

describe('StudyMascot', () => {
  it('renders the mascot, its name, and the first fact', () => {
    vi.spyOn(facts, 'getMascotItems').mockReturnValue(items);
    const html = renderToString(<StudyMascot conceptId="c1" moduleId="m1" />);
    expect(html).toContain('aria-label="Cipher the study mascot"');
    expect(html).toContain('Cipher');
    expect(html).toContain('Fact one');
    expect(html).toContain('did you know?');
  });

  it('renders a question card with a reveal button, answer hidden', () => {
    vi.spyOn(facts, 'getMascotItems').mockReturnValue([items[1]]);
    const html = renderToString(<StudyMascot conceptId="c1" moduleId="m1" />);
    expect(html).toContain('Question one?');
    expect(html).toContain('quizzes you');
    expect(html).toContain('Reveal answer');
    expect(html).not.toContain('Answer one');
  });

  it('renders nothing when there are no items', () => {
    vi.spyOn(facts, 'getMascotItems').mockReturnValue([]);
    expect(renderToString(<StudyMascot conceptId="c1" moduleId="m1" />)).toBe('');
  });

  it('offers another fact and a dismiss control', () => {
    vi.spyOn(facts, 'getMascotItems').mockReturnValue(items);
    const html = renderToString(<StudyMascot conceptId="c1" moduleId="m1" />);
    expect(html).toContain('Another one');
    expect(html).toContain('Dismiss mascot');
  });
});
