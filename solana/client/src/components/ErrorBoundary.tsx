import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Without this, any runtime throw during render
 * (bad metadata, an unexpected null, a flaky dependency) blanks the entire
 * page to white. Here we catch it and show a recoverable error screen instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging; in production this is where telemetry would go.
    console.error('Uncaught UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-5xl" aria-hidden="true">
            💥
          </div>
          <h1 className="text-xl font-bold">Something broke on this screen</h1>
          <p className="max-w-md text-sm text-zinc-500">
            An unexpected error occurred. Your wallet and funds are unaffected — this is a UI
            issue only.
          </p>
          <pre className="max-w-lg overflow-auto rounded-lg bg-zinc-100 p-3 text-left text-xs text-red-600 dark:bg-zinc-900">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <button type="button" className="btn-primary" onClick={() => window.location.assign('/')}>
              Back to marketplace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
