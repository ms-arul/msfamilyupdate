import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type BackButtonHandlerCallback = () => boolean | void;

interface HandlerEntry {
  id: string;
  priority: number;
  callback: BackButtonHandlerCallback;
}

let handlers: HandlerEntry[] = [];
let lastBackPressTime = 0;
const DOUBLE_BACK_TIME = 2000; // 2 seconds window for exit

/**
 * Register a back button handler. Higher priority numbers are executed first.
 * If callback returns true, it indicates the event was handled and stops propagation.
 */
export function registerBackButtonHandler(
  id: string,
  priority: number,
  callback: BackButtonHandlerCallback
): () => void {
  // Remove existing handler with same ID if any
  handlers = handlers.filter(h => h.id !== id);
  handlers.push({ id, priority, callback });
  // Sort descending by priority
  handlers.sort((a, b) => b.priority - a.priority);

  return () => {
    handlers = handlers.filter(h => h.id !== id);
  };
}

/**
 * Show a quick non-intrusive floating toast notification for double-back exit confirmation.
 */
function showExitToast() {
  const existing = document.getElementById('msfamily-exit-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'msfamily-exit-toast';
  toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full bg-slate-900/90 dark:bg-slate-800/90 text-white text-xs font-semibold backdrop-blur-md shadow-lg border border-white/10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2';
  toast.innerText = 'Press back again to exit';
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

/**
 * Global Capacitor hardware back button event dispatcher.
 */
export function initBackButtonManager(
  navigate: (path: number | string, options?: any) => void,
  pathname: string
) {
  if (!Capacitor.isNativePlatform()) return () => {};

  const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    // 1. Check registered handlers (modals, drawers, open sheets)
    for (const handler of handlers) {
      try {
        const handled = handler.callback();
        if (handled === true) {
          console.log(`[BackButtonManager] Handled by priority handler: ${handler.id}`);
          return;
        }
      } catch (err) {
        console.warn(`[BackButtonManager] Handler ${handler.id} error:`, err);
      }
    }

    // 2. Sub-route navigation
    const isRootPage = pathname === '/' || pathname === '' || pathname === '/login' || pathname === '/onboarding';
    if (!isRootPage) {
      if (canGoBack || window.history.length > 1) {
        console.log('[BackButtonManager] Navigating back -1');
        navigate(-1);
      } else {
        console.log('[BackButtonManager] Navigating to root /');
        navigate('/', { replace: true });
      }
      return;
    }

    // 3. Root screen exit guard (double tap back button)
    const now = Date.now();
    if (now - lastBackPressTime < DOUBLE_BACK_TIME) {
      console.log('[BackButtonManager] Double back detected. Exiting app.');
      CapacitorApp.exitApp();
    } else {
      lastBackPressTime = now;
      showExitToast();
    }
  });

  return () => {
    listenerPromise.then(l => l.remove());
  };
}
