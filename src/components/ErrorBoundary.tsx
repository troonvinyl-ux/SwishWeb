import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SWISH ErrorBoundary${this.props.name ? ` (${this.props.name})` : ''}]`, error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const msg = this.state.error?.message || 'An unexpected error occurred';

    return (
      <div className="swish-card p-6 flex flex-col items-center justify-center gap-3 text-center min-h-32">
        <AlertTriangle className="w-8 h-8 text-warning" />
        <div>
          <p className="text-sm font-semibold text-foreground">Something went wrong</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">{msg}</p>
        </div>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="btn-secondary text-xs"
        >
          <RefreshCw className="w-3 h-3" />Try Again
        </button>
      </div>
    );
  }
}

/** Convenience wrapper for functional use */
export function SafeSection({ children, name }: { children: React.ReactNode; name?: string }) {
  return <ErrorBoundary name={name}>{children}</ErrorBoundary>;
}
