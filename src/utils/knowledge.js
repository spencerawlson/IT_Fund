export function searchKnowledge(query, maxResults = 3) {
  if (!query || !Array.isArray(COURSE_KNOWLEDGE)) return [];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = [];
  for (const doc of COURSE_KNOWLEDGE) {
    for (const chunk of doc.chunks || []) {
      const text = chunk.toLowerCase();
      const count = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
      if (count > 0) scored.push({ source: doc.source, slug: doc.slug, chunk, count });
    }
  }
  scored.sort((a, b) => b.count - a.count);
  return scored.slice(0, maxResults);
}

export function knowledgeSnippet(source, fallback = 'Source-backed content loaded from course documents.') {
  if (!Array.isArray(COURSE_KNOWLEDGE)) return fallback;
  const doc = COURSE_KNOWLEDGE.find((d) => d.source === source);
  if (!doc || !doc.chunks.length) return fallback;
  const first = doc.chunks[0];
  return first.length > 220 ? first.slice(0, 220) + '...' : first;
}
