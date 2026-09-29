import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, SearchX, X } from 'lucide-react';
import { modules, levelOrder } from '@/data/modules';
import { getOverallProgress } from '@/lib/progress';
import ModuleCard from '@/components/ModuleCard';
import { Button, Card, EmptyState, ListLink, PageContainer, PageHeader, SectionHeader } from '@/components/ui-glass';

const LEVELS = ['All', ...levelOrder];
const MAX_RESULTS = 40;

function searchConcepts(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  modules.forEach((m) => {
    m.concepts.forEach((c) => {
      if ([c.term, c.summary, c.detail, m.title].some((t) => t?.toLowerCase().includes(q))) {
        results.push({ ...c, moduleTitle: m.title, moduleId: m.id });
      }
    });
  });
  return results;
}

/** The concept library (the original module material), with search. Lives under Practice. */
export default function Home() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [level, setLevel] = useState('All');

  const filteredModules = useMemo(() => {
    if (level === 'All') return modules;
    return modules.filter((m) => m.level === level);
  }, [level]);

  const searchResults = useMemo(() => searchConcepts(query), [query]);

  return (
    <PageContainer wide>
      <PageHeader
        breadcrumbs={[{ label: 'Practice', to: '/practice' }, { label: 'Library' }]}
        title="Concept library"
        description="Every concept from the original modules, with study notes, flashcards and quizzes. Use it for reference alongside your lessons."
      />

      {query && (
        <section aria-labelledby="search-heading" className="mb-12">
          <SectionHeader
            id="search-heading"
            title={`Results for “${query}”`}
            description={
              searchResults.length > MAX_RESULTS
                ? `Showing the first ${MAX_RESULTS} of ${searchResults.length} concepts`
                : `${searchResults.length} ${searchResults.length === 1 ? 'concept' : 'concepts'}`
            }
            action={<Button variant="ghost" size="sm" icon={X} onClick={() => setParams({})}>Clear search</Button>}
          />
          {searchResults.length === 0 ? (
            <EmptyState icon={SearchX} title="No concepts found" text="Try a shorter or different term, like “subnet” or “IAM”." />
          ) : (
            <Card level={2} padding="sm">
              <ul className="divide-y divide-white/[0.06]">
                {searchResults.slice(0, MAX_RESULTS).map((r) => (
                  <li key={`${r.moduleId}-${r.id}`}>
                    <ListLink to={`/module/${r.moduleId}?concept=${encodeURIComponent(r.id)}`} title={r.term} text={r.summary} meta={r.moduleTitle} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-ink-2" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2">All Modules</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`rounded-full px-3 py-1 text-caption font-semibold transition ${
                  level === lvl ? 'bg-white/15 text-ink-1' : 'bg-white/[0.06] text-ink-2 hover:text-ink-1'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((m) => (
            <ModuleCard key={m.id} module={m} percent={getOverallProgress(m.id)} />
          ))}
        </div>

        <footer className="mt-12 border-t border-white/5 pt-6 text-center text-caption text-ink-2">
          Course 420-ZX6-UM · {modules.length} modules available · More coming soon
        </footer>
    </PageContainer>
  );
}
