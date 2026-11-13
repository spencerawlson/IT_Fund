import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaticRouter } from 'react-router-dom';
import CypherLessonPanel from './CypherLessonPanel';

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
    expect(html).toContain('Give me a mission');
    expect(html).toContain('/missions/op-broken-shield');
    expect(html).toContain('Show a practical application');
  });

  it('renders the 3D Cypher viewer in the panel', () => {
    const html = renderPanel({
      lesson: { id: 'net-security', title: 'Network Security', trackId: 'net' },
      missionId: 'op-broken-shield',
      practicalHref: null,
    });
    expect(html).toContain('Drag to rotate');
  });
});
