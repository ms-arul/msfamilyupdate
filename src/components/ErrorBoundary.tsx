import React, { ErrorInfo, ReactNode } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearTempCache = () => {
    try {
      const keysToRemove = [
        'sms_processed_hashes',
        'live_rates_cache',
        'last_rates_fetch',
        'rates_history',
        'location_offline_queue'
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error('[ErrorBoundary] Failed to clear temp cache:', e);
    }
  };

  handleFactoryReset = () => {
    if (window.confirm("Are you sure you want to perform a factory reset? This will log you out and clear all local data, settings, and SMS processing cache.")) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      } catch (e) {
        console.error('[ErrorBoundary] Failed to perform factory reset:', e);
      }
    }
  };

  toggleDetails = () => {
    this.setState(prevState => ({ showDetails: !prevState.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error ? this.state.error.toString() : 'Unknown runtime crash';
      const stack = this.state.errorInfo ? this.state.errorInfo.componentStack : 'No stack trace available';

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 text-center w-full relative overflow-hidden select-text">
          {/* Radial Gradient Ambient Background Glows */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-secondary/15 blur-[120px] pointer-events-none" />
          
          <div className="max-w-md w-full z-10 flex flex-col items-center">
            {/* Animated Warning Icon with Glow */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.95, 1.05, 0.95], opacity: 1 }}
              transition={{ 
                opacity: { duration: 0.5 },
                scale: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }}
              className="w-20 h-20 bg-accent/10 border border-accent/30 text-accent rounded-full flex items-center justify-center mb-6 shadow-glow-accent relative animate-pulse-slow"
            >
              <AlertTriangle size={38} className="relative z-10" />
            </motion.div>

            {/* Gradient text heading */}
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-3xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent"
            >
              System Detour
            </motion.h1>

            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-slate-400 text-sm mb-6 max-w-sm leading-relaxed font-sans"
            >
              An unexpected exception was intercepted. Select a recovery action below to re-initialize your workspace.
            </motion.p>
            
            {/* Recovery Cards Container */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="w-full flex flex-col gap-3.5 mb-6"
            >
              {/* Primary action: Reload */}
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary to-primary-600 text-white rounded-2xl font-bold shadow-glow-primary hover:brightness-110 active:scale-[0.98] transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <RefreshCw size={20} className="group-hover:rotate-45 transition-transform duration-300" />
                  </div>
                  <div className="text-left font-sans">
                    <div className="text-base font-bold">Quick Rehydrate</div>
                    <div className="text-xs text-primary-100 font-normal">Re-render and resume application loop</div>
                  </div>
                </div>
              </button>

              {/* Secondary actions grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Clear Temp Cache */}
                <button
                  onClick={this.handleClearTempCache}
                  className="flex flex-col items-center justify-center p-4 bg-surface-dark border border-border-dark hover:border-secondary/30 rounded-2xl active:scale-[0.96] transition-all group text-center"
                >
                  <div className="p-2.5 bg-secondary/10 text-secondary rounded-xl mb-2.5 group-hover:scale-110 transition-transform">
                    <RotateCcw size={18} />
                  </div>
                  <span className="text-xs font-bold text-white mb-0.5 font-sans">Flush Cache</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight font-sans">Clears rates & transient states</span>
                </button>

                {/* Factory Reset */}
                <button
                  onClick={this.handleFactoryReset}
                  className="flex flex-col items-center justify-center p-4 bg-surface-dark border border-border-dark hover:border-accent/30 rounded-2xl active:scale-[0.96] transition-all group text-center"
                >
                  <div className="p-2.5 bg-accent/10 text-accent rounded-xl mb-2.5 group-hover:scale-110 transition-transform">
                    <Trash2 size={18} />
                  </div>
                  <span className="text-xs font-bold text-white mb-0.5 font-sans">Factory Reset</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight font-sans">Logs out and resets all settings</span>
                </button>
              </div>
            </motion.div>

            {/* Error Details Section (Accordion style) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full border border-border-dark rounded-2xl overflow-hidden bg-card-dark/40"
            >
              <button
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition text-left"
              >
                <div className="flex items-center gap-2.5 text-slate-400 text-xs font-semibold font-sans">
                  <Terminal size={14} className="text-secondary" />
                  <span>Developer Diagnostics</span>
                </div>
                {this.state.showDetails ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {this.state.showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-border-dark overflow-hidden bg-black text-left p-4 text-[10px] font-mono leading-relaxed"
                  >
                    <div className="text-accent font-semibold border-b border-border-dark pb-2 mb-2 break-all font-mono">
                      {errorMsg}
                    </div>
                    <pre className="text-slate-500 max-h-[160px] overflow-y-auto whitespace-pre-wrap scrollbar-thin select-text font-mono">
                      {stack}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
