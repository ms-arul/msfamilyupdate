import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h1>
          <p className="text-slate-500 text-sm mb-8 max-w-md">
            We encountered an unexpected error while trying to display this screen. 
            Please tap the button below to refresh the app.
          </p>
          
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-primary-700 transition"
          >
            <RefreshCw size={20} />
            <span>Reload App</span>
          </button>
          
          {/* Detailed Error for Debugging in development/preview */}
          {this.state.error && (
            <div className="mt-12 text-left bg-slate-100 p-4 rounded-xl max-w-full overflow-auto text-xs text-slate-700">
              <p className="font-bold text-red-600 border-b border-slate-300 pb-2 mb-2">{this.state.error.toString()}</p>
              <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
