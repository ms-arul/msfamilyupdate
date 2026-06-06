/**
 * MS Family — Centralized Animation System
 * ==========================================
 * All Framer Motion variants, easing curves, and duration tokens.
 * Import from here instead of defining inline in each page.
 *
 * GPU-optimized: uses opacity + scale (composite-only) instead of
 * translateY where possible, so mobile devices stay at 60fps.
 */

import type { Variants, Transition } from 'framer-motion';

// ─── Easing Curves ────────────────────────────────────────────────────────────
export const EASINGS = {
  /** Apple-style deceleration */
  appleEase: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** Smooth exit */
  easeOut: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
  /** Smooth enter */
  easeIn: [0.4, 0.0, 1, 1] as [number, number, number, number],
  /** Material-style standard */
  standard: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
  /** Bouncy spring feel */
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  /** Snappy spring */
  snappy: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
} as const;

// ─── Duration Tokens ──────────────────────────────────────────────────────────
export const DURATIONS = {
  instant: 0,
  fast: 0.12,
  normal: 0.2,
  medium: 0.3,
  slow: 0.5,
  verySlow: 0.8,
} as const;

// ─── Spring Presets ───────────────────────────────────────────────────────────
export const SPRINGS = {
  /** Snappy UI spring — buttons, pills, toggles */
  snappy: { type: 'spring' as const, stiffness: 450, damping: 34 },
  /** Standard spring — cards, panels */
  default: { type: 'spring' as const, stiffness: 350, damping: 34 },
  /** Bouncy spring — modals, popovers */
  bouncy: { type: 'spring' as const, stiffness: 360, damping: 32 },
  /** Gentle spring — page transitions */
  gentle: { type: 'spring' as const, stiffness: 280, damping: 36 },
  /** Nav indicator */
  nav: { type: 'spring' as const, stiffness: 320, damping: 34 },
} as const;

// ─── Reduced Motion Helper ───────────────────────────────────────────────────
let _prefersReduced: boolean | null = null;
export function prefersReducedMotion(): boolean {
  if (_prefersReduced === null) {
    _prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return _prefersReduced;
}

// ─── Page Transition Variants ─────────────────────────────────────────────────
/** Lightweight page enter — GPU-friendly opacity + subtle scale */
export const pageVariants: Variants = {
  initial: { opacity: 0, scale: 0.985 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.99 },
};

export const pageTransition: Transition = {
  duration: DURATIONS.normal,
  ease: EASINGS.appleEase,
};

/** Mobile-optimized: opacity only, no scale to save GPU layers */
export const pageMobileVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const pageMobileTransition: Transition = {
  duration: 0.15,
  ease: EASINGS.easeOut,
};

// ─── Stagger Container / Item ─────────────────────────────────────────────────
export const staggerContainer = (
  staggerDelay = 0.05,
  delayChildren = 0.04
): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: EASINGS.appleEase,
    },
  },
};

/** Lighter stagger item — no translateY, just fade */
export const staggerItemFade: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: DURATIONS.medium },
  },
};

// ─── Card Variants ────────────────────────────────────────────────────────────
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: EASINGS.appleEase,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// ─── Modal Variants ───────────────────────────────────────────────────────────
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 20,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    filter: 'blur(3px)',
  },
};

export const modalTransition: Transition = {
  opacity: { ...SPRINGS.bouncy },
  scale: { ...SPRINGS.bouncy },
  y: { ...SPRINGS.bouncy },
  filter: { type: 'tween', ease: 'easeOut', duration: 0.2 }
};

// ─── Sidebar / Slide Panel ────────────────────────────────────────────────────
export const slideFromLeft: Variants = {
  hidden: { x: '-100%', opacity: 0.5 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 360,
      damping: 32,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.easeIn,
    },
  },
};

export const slideFromRight: Variants = {
  hidden: { x: '100%', opacity: 0.5 },
  visible: {
    x: 0,
    opacity: 1,
    transition: SPRINGS.gentle,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.easeIn,
    },
  },
};

// ─── Notification / Toast ─────────────────────────────────────────────────────
export const toastVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: 10,
    transition: { duration: 0.15 },
  },
};

// ─── List Item ────────────────────────────────────────────────────────────────
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: EASINGS.appleEase,
    },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: { duration: 0.15, ease: EASINGS.easeIn },
  },
};

// ─── Tab / Filter Indicator ───────────────────────────────────────────────────
export const tabIndicatorTransition: Transition = SPRINGS.nav;

// ─── Hover / Tap Presets ──────────────────────────────────────────────────────
/** Use with whileTap on buttons */
export const tapScale = { scale: 0.95 };
export const tapScaleSmall = { scale: 0.97 };

/** Use with whileHover on cards */
export const hoverLift = { y: -2, scale: 1.01 };
export const hoverGlow = { y: -1, boxShadow: '0 8px 30px rgba(139, 92, 246, 0.15)' };

// ─── Skeleton Shimmer (CSS class-based) ───────────────────────────────────────
/** Apply `.skeleton` CSS class — animation defined in index.css */
export const SKELETON_DURATION = '1.5s';

// ─── Dropdown / Accordion ─────────────────────────────────────────────────────
export const accordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: {
      height: { duration: DURATIONS.medium, ease: EASINGS.appleEase },
      opacity: { duration: DURATIONS.normal, delay: 0.05 },
    },
  },
};

// ─── Image Reveal ─────────────────────────────────────────────────────────────
export const imageRevealVariants: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATIONS.medium,
      ease: EASINGS.easeOut,
    },
  },
};

// ─── Utility: motion-safe variants ────────────────────────────────────────────
/** Returns static (no-op) variants if user prefers reduced motion */
export function motionSafe<T extends Variants>(variants: T): T | Variants {
  if (prefersReducedMotion()) {
    return {
      hidden: {},
      visible: {},
      show: {},
      exit: {},
      initial: {},
      animate: {},
    } as Variants;
  }
  return variants;
}
