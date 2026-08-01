import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="halo-inset flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="halo-chip-lg mb-3" style={{ background: 'var(--h-warn-soft)', color: 'var(--h-amber)' }}>
            <AlertTriangle className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <h3 className="halo-heading mb-1.5">
            Chart error
          </h3>
          <p className="halo-subtitle mb-4 max-w-sm">
            There was an issue rendering this chart. This can happen during scroll or data updates.
          </p>
          <button
            onClick={this.handleRetry}
            className="btn-halo-outline btn-halo-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
            Retry
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-xs text-[var(--h-ink-3)]">
              <summary className="cursor-pointer">Error details</summary>
              <pre className="mt-2 text-left overflow-auto max-w-md">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
