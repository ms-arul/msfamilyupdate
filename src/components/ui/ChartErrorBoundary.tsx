import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component specifically designed to wrap Recharts.
 * Displays a clean placeholder in case of sizing or calculations crash instead of breaking the parent page.
 */
export class ChartErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ChartErrorBoundary] Error caught rendering chart:', error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 min-h-[180px] w-full h-full bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl">
          <span className="text-xs text-rose-500 font-bold mb-1">Chart Render Failed</span>
          <span className="text-[10px] text-rose-400 dark:text-rose-500 text-center max-w-xs font-medium">
            {this.state.error?.message || 'An unexpected rendering error occurred'}
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ChartErrorBoundary;
