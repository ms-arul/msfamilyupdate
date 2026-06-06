import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../utils/networkService';

interface NetworkStatusBarProps {
  onReconnect?: () => void;
}

const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({ onReconnect }) => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const prevOnline = useRef(isOnline);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Detect transition from offline → online
    if (isOnline && !prevOnline.current && wasOffline) {
      setShowReconnected(true);
      onReconnect?.();
      
      hideTimer.current = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    }

    prevOnline.current = isOnline;

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isOnline, wasOffline, onReconnect]);

  const shouldShow = !isOnline || showReconnected;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] pointer-events-auto"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div
            className={`
              mx-auto max-w-lg flex items-center justify-center gap-2
              px-4 py-2.5 text-xs font-bold tracking-wide
              backdrop-blur-xl border-b
              transition-colors duration-300
              ${!isOnline
                ? 'bg-rose-500/90 dark:bg-rose-900/90 text-white border-rose-600/30'
                : 'bg-emerald-500/90 dark:bg-emerald-900/90 text-white border-emerald-600/30'
              }
            `}
          >
            {!isOnline ? (
              <>
                <WifiOff size={14} className="shrink-0 animate-pulse" />
                <span>You're offline — using cached data</span>
                <CloudOff size={12} className="shrink-0 opacity-60" />
              </>
            ) : (
              <>
                <Wifi size={14} className="shrink-0" />
                <span>Back online — syncing</span>
                <RefreshCw size={12} className="shrink-0 animate-spin" />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(NetworkStatusBar);
