import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface-card rounded-2xl border border-rose-200 dark:border-rose-900/50 p-8 sm:p-12 text-center max-w-xl mx-auto my-12 space-y-4 shadow-card animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto text-2xl border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface">
            {this.props.fallbackTitle || 'Something Went Wrong in this View'}
          </h3>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed max-w-md mx-auto">
            {this.props.fallbackMessage || 'A temporary display error occurred while rendering this section. Your document data is safe.'}
          </p>
          {this.state.error?.message && (
            <div className="p-3 bg-surface rounded-lg border border-surface-border text-left font-mono text-xs text-rose-700 dark:text-rose-300 max-h-32 overflow-auto">
              {this.state.error.message}
            </div>
          )}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-container transition-all shadow-card"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry View</span>
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-surface-border text-on-surface rounded-xl text-xs font-semibold hover:bg-surface-hover transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
