import React from 'react';

/** Renders `backtick` spans in card text as inline code. */
export default function RichText({ text, className = '' }) {
  const parts = String(text || '').split(/(`[^`]+`)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <code key={i} className="rounded border border-violet-700/15 bg-violet-50 px-1.5 py-0.5 font-mono text-[0.9em] text-ink-1">
            {part.slice(1, -1)}
          </code>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}
