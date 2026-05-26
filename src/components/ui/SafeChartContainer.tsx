import React, { useState, useEffect } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useElementSize } from '../../hooks/useElementSize';
import { ChartErrorBoundary } from './ChartErrorBoundary';

interface SafeChartContainerProps {
  children: React.ReactElement;
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  minHeight?: string | number;
  isLoading?: boolean;
  data?: any[];
  delayMs?: number; // Delay to wait for page transitions/animations to finish (default 400ms)
}

/**
 * A highly resilient container wrapper for Recharts that:
 * 1. Checks that parent layout has calculated non-zero dimensions.
 * 2. Delays mounting of the Recharts component until entrance animations complete (preventing width(0)/height(0) warnings).
 * 3. Handles loading, data-empty, and error states gracefully.
 */
export function SafeChartContainer({
  children,
  width = '100%',
  height = '100%',
  minWidth = 0,
  minHeight = 180,
  isLoading = false,
  data,
  delayMs = 400,
}: SafeChartContainerProps) {
  const [containerRef, size] = useElementSize<HTMLDivElement>(100);
  const [animationCompleted, setAnimationCompleted] = useState(false);

  useEffect(() => {
    // Delay rendering to prevent sizing calculations during framer-motion scaling/slide animations
    const timer = setTimeout(() => {
      setAnimationCompleted(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const hasNoData = data !== undefined && (!Array.isArray(data) || data.length === 0);
  const shouldRenderChart =
    !isLoading &&
    !hasNoData &&
    animationCompleted &&
    size.width > 0 &&
    size.height > 0;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth,
    minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <ChartErrorBoundary>
      <div
        ref={containerRef}
        style={containerStyle}
        className="safe-chart-container w-full h-full min-w-0 flex-shrink-0"
      >
        {shouldRenderChart ? (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/20 dark:bg-slate-900/10 rounded-2xl p-4 transition-all duration-300">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-[3px] border-primary-500 border-t-transparent animate-spin" />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  Loading Analytics...
                </span>
              </div>
            ) : hasNoData ? (
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No transaction data available
                </span>
              </div>
            ) : (
              // Premium Pulsing Chart Skeleton Loader matching UI design guidelines
              <div className="w-full h-full flex flex-col justify-between p-2 animate-pulse">
                <div className="w-full flex-1 flex items-end gap-3 border-b border-l border-slate-200/60 dark:border-slate-800/40 pb-2 pl-2">
                  <div className="w-full bg-gradient-to-t from-slate-100/50 to-slate-200/50 dark:from-slate-800/30 dark:to-slate-700/30 rounded-t h-[30%]" />
                  <div className="w-full bg-gradient-to-t from-slate-100/50 to-slate-200/50 dark:from-slate-800/30 dark:to-slate-700/30 rounded-t h-[55%]" />
                  <div className="w-full bg-gradient-to-t from-slate-100/50 to-slate-200/50 dark:from-slate-800/30 dark:to-slate-700/30 rounded-t h-[40%]" />
                  <div className="w-full bg-gradient-to-t from-slate-100/50 to-slate-200/50 dark:from-slate-800/30 dark:to-slate-700/30 rounded-t h-[75%]" />
                  <div className="w-full bg-gradient-to-t from-slate-100/50 to-slate-200/50 dark:from-slate-800/30 dark:to-slate-700/30 rounded-t h-[50%]" />
                </div>
                <div className="h-3 flex justify-between mt-2 pl-4 pr-2">
                  <div className="w-6 h-1.5 bg-slate-200/50 dark:bg-slate-800/30 rounded" />
                  <div className="w-6 h-1.5 bg-slate-200/50 dark:bg-slate-800/30 rounded" />
                  <div className="w-6 h-1.5 bg-slate-200/50 dark:bg-slate-800/30 rounded" />
                  <div className="w-6 h-1.5 bg-slate-200/50 dark:bg-slate-800/30 rounded" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ChartErrorBoundary>
  );
}
export default SafeChartContainer;
