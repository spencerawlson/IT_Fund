import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * A failed dynamic import (a code-split chunk) cannot be fixed by
 * re-rendering: the retry issues the same import of the same URL, which
 * fails again — that is exactly what happened when the /labs chunk failed
 * to load after a deploy left the page holding stale chunk URLs. Only a
 * full reload fetches fresh HTML with the current chunk hashes.
 */
export function isChunkLoadError(error) {
  const message = error?.message || String(error || '');
  return (
    /Failed to fetch dynamically imported module/i.test(message)
    || /Loading chunk [\w-]+ failed/i.test(message)
    || /ChunkLoadError/i.test(message)
    || /Importing a module script failed/i.test(message)
  );
}

/**
 * Catches render-time errors so one broken component cannot blank the app.
 *
 * React unmounts the entire tree when a render throws, which is why a single
 * missing import used to produce a completely white page. Wrapping routes and
 * individual lab visualizations keeps the failure local and visible.
 *
 * Class component by necessity: componentDidCatch has no hook equivalent.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surfaced in the console so the component stack is recoverable in prod.
    console.error(`[ErrorBoundary] ${this.props.label ?? 'component'} crashed:`, error, info);
  }

  handleRetry = () => this.setState({ error: null });

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunkFailed = isChunkLoadError(error);

    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-5 text-sm">
        <div className="flex items-center gap-2 font-semibold text-danger">
          <AlertTriangle size={16} />
          {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
        </div>

        <p className="mt-2 text-ink-2">
          {chunkFailed
            ? 'This panel did not load — the app was likely updated since this page opened, so the file it asked for no longer exists. Reload the page to get the current version.'
            : 'The rest of the page still works. This panel hit an error while rendering.'}
        </p>

        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-danger/20 bg-rose-50 px-3 py-2 text-[11px] leading-5 text-danger">
          {error?.message ?? String(error)}
        </pre>

        <button
          onClick={chunkFailed ? this.handleReload : this.handleRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink-1 transition hover:bg-black/[0.03]"
        >
          <RotateCcw size={13} /> {chunkFailed ? 'Reload the page' : 'Try again'}
        </button>
      </div>
    );
  }
}
