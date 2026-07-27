import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
  AdMobError
} from '@capacitor-community/admob';
import { motion } from 'framer-motion';
import { Megaphone, ExternalLink, ShieldCheck } from 'lucide-react';
import { staggerItem as item } from '../utils/animations';
import { useSubscription } from '../context/SubscriptionContext';

const ADMOB_UNIT_ID = 'ca-app-pub-6753181691071923/2058183084';

export const AdMobBanner: React.FC = () => {
  const sub = useSubscription();
  const isPremium = sub?.isPremium || (sub?.planId && sub.planId !== 'free');

  const [adLoaded, setAdLoaded] = useState<boolean>(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    // Premium users do not get ads initialized or displayed
    if (isPremium) return;

    let isMounted = true;

    async function initAndShowAdMob() {
      // On Web platform, enable ad preview so admins/users can inspect the AdMob banner
      if (!Capacitor.isNativePlatform()) {
        console.log('[AdMobBanner] Web platform detected - enabling Web AdMob preview card');
        if (isMounted) {
          setAdLoaded(true);
          setAdError(null);
        }
        return;
      }

      try {
        console.log('[AdMobBanner] Initializing AdMob SDK on native platform...');
        await AdMob.initialize({
          initializeForTesting: false,
        });

        // Add Listeners
        const loadedListener = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          console.log('[AdMobBanner] Native Banner ad successfully loaded');
          if (isMounted) {
            setAdLoaded(true);
            setAdError(null);
          }
        });

        const failedListener = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err: AdMobError) => {
          console.warn('[AdMobBanner] Banner ad failed to load on native:', err);
          if (isMounted) {
            // Keep fallback banner visible so ad space is not empty
            setAdLoaded(true);
            setAdError(err.message || 'AdMob No-Fill');
          }
        });

        // Show banner
        await AdMob.showBanner({
          adId: ADMOB_UNIT_ID,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        });

        return () => {
          loadedListener.remove();
          failedListener.remove();
        };
      } catch (err: any) {
        console.error('[AdMobBanner] Error displaying AdMob banner:', err);
        if (isMounted) {
          // Fallback to preview card on native error so UI stays consistent
          setAdLoaded(true);
          setAdError(err?.message || 'Error initializing AdMob');
        }
      }
    }

    const cleanupPromise = initAndShowAdMob();

    return () => {
      isMounted = false;
      cleanupPromise.then(cleanup => cleanup && cleanup());
      if (Capacitor.isNativePlatform()) {
        AdMob.removeBanner().catch(err => {
          console.warn('[AdMobBanner] Error removing banner on unmount:', err);
        });
      }
    };
  }, [isPremium]);

  // Premium users get NO ads
  if (isPremium) {
    return null;
  }

  // If ad is not loaded yet and no error state, skip
  if (!adLoaded) {
    return null;
  }

  return (
    <motion.div variants={item} className="g-panel overflow-hidden p-3.5 sm:p-4 my-3 relative group">
      {/* Background visual accents */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-primary-500/5 to-purple-500/5 pointer-events-none" />
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2">
        {/* Ad Badge Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border border-amber-500/20 tracking-wider">
              Sponsored
            </span>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <ShieldCheck size={11} className="text-emerald-500" />
              Google AdMob Network
            </span>
          </div>
          {adError && (
            <span className="text-[9px] font-mono text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Web Preview
            </span>
          )}
        </div>

        {/* Ad Container Box */}
        <div className="w-full min-h-[60px] sm:min-h-[70px] rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 flex items-center justify-between p-3 overflow-hidden shadow-inner">
          <div className="flex items-center gap-3">
            <div className="g-icon-bubble w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-primary-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Megaphone size={16} />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-tight">
                Google AdMob Network
              </h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                Unit ID: ...{ADMOB_UNIT_ID.slice(-8)}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1 text-[10px] font-extrabold text-primary-500 bg-primary-500/10 dark:bg-primary-400/15 px-2.5 py-1.5 rounded-lg border border-primary-500/20">
            <span>Official Ad</span>
            <ExternalLink size={10} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdMobBanner;
