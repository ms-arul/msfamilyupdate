import React from 'react';

/**
 * PageLoader — Glass-morphic skeleton loading screen.
 * Used as Suspense fallback for lazy-loaded pages.
 * Matches the app's glassmorphism aesthetic with shimmer animation.
 */
const PageLoader: React.FC = () => (
  <div className="w-full h-full min-h-[60vh] p-4 space-y-4 animate-fade-in">
    {/* Hero skeleton */}
    <div className="skeleton rounded-[20px] h-36 w-full" />

    {/* Stat grid skeleton */}
    <div className="grid grid-cols-2 gap-3">
      <div className="skeleton rounded-[18px] h-24" />
      <div className="skeleton rounded-[18px] h-24" />
      <div className="skeleton rounded-[18px] h-24" />
      <div className="skeleton rounded-[18px] h-24" />
    </div>

    {/* Chart skeleton */}
    <div className="skeleton rounded-[20px] h-52 w-full" />

    {/* List skeletons */}
    <div className="space-y-2">
      <div className="skeleton rounded-[14px] h-14 w-full" />
      <div className="skeleton rounded-[14px] h-14 w-full" />
      <div className="skeleton rounded-[14px] h-14 w-3/4" />
    </div>
  </div>
);

export default PageLoader;
