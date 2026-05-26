import { useState, useEffect, useRef } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Hook to track element dimensions using ResizeObserver.
 * Debounces fast resize updates and runs inside requestAnimationFrame to prevent ResizeObserver loop limit errors.
 */
export function useElementSize<T extends HTMLElement = HTMLDivElement>(debounceMs: number = 100) {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let animationFrameId: number | null = null;

    const updateSize = (w: number, h: number) => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(() => {
        setSize({ width: w, height: h });
      });
    };

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      
      const entry = entries[0];
      // Use borderBoxSize if available, fallback to contentRect
      const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

      if (debounceMs > 0) {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          updateSize(width, height);
        }, debounceMs);
      } else {
        updateSize(width, height);
      }
    });

    observer.observe(element);

    // Initial measurement
    const rect = element.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    const handleResize = () => {
      if (element) {
        const rect = element.getBoundingClientRect();
        updateSize(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [debounceMs]);

  return [ref, size] as const;
}
