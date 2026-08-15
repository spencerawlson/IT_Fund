import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-5 text-sm">
        <div className="flex items-center gap-2 font-semibold text-rose-300">
          <AlertTriangle size={16} />
          {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
        </div>

        <p className="mt-2 text-slate-400">
          The rest of the page still works. This panel hit an error while rendering.
        </p>

        <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 px-3 py-2 text-[11px] leading-5 text-rose-200/80">
          {error?.message ?? String(error)}
        </pre>

        <button
          onClick={this.handleRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
        >
          <RotateCcw size={13} /> Try again
        </button>
      </div>
    );
  }
}
