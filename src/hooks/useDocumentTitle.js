import { useEffect } from 'react';

/**
 * Sets document.title for the current route. Pass the full title, e.g.
 * useDocumentTitle('Academy · Road to CISSP'). No-op on empty input.
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
