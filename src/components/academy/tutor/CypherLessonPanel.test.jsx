import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaticRouter } from 'react-router-dom';
import CypherLessonPanel, { presetQuestion } from './CypherLessonPanel';

// SSR: effects (attempt history, analytics, tutor status) do not run, so
// the panel renders its first paint — greeting, difficulty selector, and
// the mission invitation — without any network. The tutor hooks need a
// QueryClientProvider and the `to=` buttons need a router (same pattern as
// Seo.test.jsx).
function renderPanel(props) {
  const queryClient = new QueryClient();
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <StaticRouter location="/academy/lessons/net-security">
        <CypherLessonPanel {...props} />
      </StaticRouter>
    </QueryClientProvider>,
  );
}

describe('CypherLessonPanel', () => {
  it('renders the greeting, difficulty levels, and mission invitation', () => {
    const html = renderPanel({
      lesson: { id: 'net-security', title: 'Network Security', trackId: 'net' },
      missionId: 'op-broken-shield',
      practicalHref: '/labs/net-acl-001',
    });
    expect(html).toContain('Hi, I’m Cipher');
    // SSR renders `{label} level` as `Beginner<!-- --> level`, so assert the
    // option values (contiguous in the HTML) instead of the joined text.
    expect(html).toContain('value="beginner"');
    expect(html).toContain('value="intermediate"');
    expect(html).toContain('value="advanced"');
    expect(html).toContain('Explanation difficulty level');
    expect(html).toContain('Operation Broken Shield');
    expect(html).toContain('Start Mission');
    expect(html).toContain('/missions/op-broken-shield');
    expect(html).toContain('Show a practical application');
  });

  it('renders the 3D Cypher viewer without any manipulation hint (presenter-only)', () => {
    const html = renderPanel({
      lesson: { id: 'net-security', title: 'Network Security', trackId: 'net' },
      missionId: 'op-broken-shield',
      practicalHref: null,
    });
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });
});

describe('presetQuestion', () => {
  // The presets must fill their own question: clicking one with an empty
  // box used to submit the empty form and the backend answered 400
  // "question is required". Each preset now builds a real question about
  // this lesson, which the panel submits as a chat message.
  it('builds a real question per preset from the lesson title', () => {
    expect(presetQuestion('explain', 'Network Security', 'intermediate'))
      .toBe('Explain the key ideas of Network Security.');
    expect(presetQuestion('example', 'Network Security', 'intermediate'))
      .toBe('Give me a concrete, real-world example of Network Security.');
    expect(presetQuestion('simplify', 'Network Security', 'intermediate'))
      .toBe('Explain Network Security in simple terms, using an everyday analogy.');
  });

  it('adds the level only when it is not the default', () => {
    expect(presetQuestion('explain', 'Network Security', 'beginner'))
      .toContain('at beginner level');
    expect(presetQuestion('explain', 'Network Security', 'intermediate'))
      .not.toContain('at intermediate level');
  });

  it('never returns an empty question', () => {
    for (const mode of ['explain', 'example', 'simplify']) {
      expect(presetQuestion(mode, '', 'intermediate').trim().length).toBeGreaterThan(0);
      expect(presetQuestion(mode, undefined, 'intermediate')).toContain('this lesson');
    }
  });
});
