import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Battery, Phone, Activity, MapPinOff, Locate, ExternalLink,
  Minimize2, Maximize2, RefreshCw, Navigation, Lock, Signal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCall } from '../context/CallContext';
import { supabase } from '../lib/supabase';
import {
  updateMyLocationOnce, getDistance,
  getCurrentLocation, requestLocationPermissions, updateSharingStatus,
  persistTrackingState, getPersistedTrackingState,
} from '../utils/trackingService';
import { sendPushToUser } from '../utils/pushService';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// ------------------------------------------------------------
// Lazy‑load Leaflet
// ------------------------------------------------------------
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any, ZoomControl: any, L: any;
const loadLeaflet = async (): Promise<boolean> => {
  if (L) return true;
  try {
    const [leafletMod, rlMod] = await Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]);
    await import('leaflet/dist/leaflet.css');
    L = leafletMod.default || leafletMod;
    MapContainer = rlMod.MapContainer;
    TileLayer = rlMod.TileLayer;
    Marker = rlMod.Marker;
    Popup = rlMod.Popup;
    useMap = rlMod.useMap;
    ZoomControl = rlMod.ZoomControl;

    // Fix Leaflet icon paths
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
    return true;
  } catch (e) {
    console.error('Leaflet load failed', e);
    return false;
  }
};

// ------------------------------------------------------------
// Custom marker creator (pulsing effect)
// ------------------------------------------------------------
const createPulsingIcon = (color: string, size = 28, isCurrentUser = false): any => {
  if (!L) return null;
  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      <div style="
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${isCurrentUser ? 'animation: pulse 1.5s infinite;' : ''}
      "></div>
      ${isCurrentUser ? `
        <div style="
          position: absolute;
          width: ${size + 8}px;
          height: ${size + 8}px;
          background: ${color}40;
          border-radius: 50%;
          top: -4px;
          left: -4px;
          animation: ripple 1.5s infinite;
        "></div>
      ` : ''}
    </div>
  `;
  return new L.DivIcon({
    className: 'custom-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Add CSS keyframes for pulse/ripple (injected once)
const injectMarkerStyles = (): void => {
  if (typeof document === 'undefined' || document.getElementById('marker-animations')) return;
  const style = document.createElement('style');
  style.id = 'marker-animations';
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      70% { transform: scale(1.2); opacity: 0.7; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2); opacity: 0; }
    }
    .dark-map-filter {
      filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
    }
  `;
  document.head.appendChild(style);
};
injectMarkerStyles();

// ------------------------------------------------------------
// FlyTo component with smooth easing
// ------------------------------------------------------------
interface FlyToProps {
  center: [number, number];
  zoom?: number;
}

const FlyTo: React.FC<FlyToProps> = ({ center, zoom = 16 }) => {
  const map = useMap();
  useEffect(() => {
    if (center && map) map.flyTo(center, zoom, { duration: 1.2, ease: 'easeOutCubic' });
  }, [center, map, zoom]);
  return null;
};

// ------------------------------------------------------------
// Permission Screen
// ------------------------------------------------------------
interface PermissionScreenProps {
  onGrant: () => void;
  t: (key: string) => string;
}

const PermissionScreen: React.FC<PermissionScreenProps> = ({ onGrant, t }) => (
  <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
    <motion.div
      initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', bounce: 0.5 }}
      className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-primary-500 to-sky-500 flex items-center justify-center mb-6 shadow-xl"
    >
      <Locate size={44} className="text-white drop-shadow-md" />
    </motion.div>
    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
      {t('Enable Location')}
    </h2>
    <p className="text-slate-600 dark:text-slate-300 text-sm max-w-xs mb-8">
      {t('We need your location to show you on the map and share it with your family.')}
    </p>
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onGrant}
      className="px-8 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all"
    >
      {t('Allow Location Access')}
    </motion.button>
  </div>
);

interface UserLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  battery_level?: number | null;
  updated_at: string;
  is_sharing: boolean;
}

interface Profile {
  id: string;
  name: string;
}

// ------------------------------------------------------------
// Main Component
// ------------------------------------------------------------
export default function LiveTracking() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { startCall } = useCall();

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [leafletReady, setLeafletReady] = useState<boolean>(false);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [selectedMember, setSelectedMember] = useState<UserLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.0827, 80.2707]);
  const [isSharing, setIsSharing] = useState<boolean>(true);
  const [mapType] = useState<'roadmap' | 'satellite' | 'terrain'>('terrain');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  const [fetchingStates, setFetchingStates] = useState<Record<string, boolean>>({});
  const mountedRef = useRef<boolean>(true);
  const [, setTicker] = useState<number>(0);

  // ── Restore persisted state on mount (survives force-stop) ──
  useEffect(() => {
    const saved = getPersistedTrackingState();
    if (saved) {
      if (saved.myLocation && Array.isArray(saved.myLocation)) {
        setMyLocation(saved.myLocation as [number, number]);
        setMapCenter(saved.myLocation as [number, number]);
      }
      if (typeof saved.isSharing === 'boolean') {
        setIsSharing(saved.isSharing);
      }
    }
  }, []);

  // ── Persist state whenever it changes ──
  useEffect(() => {
    if (myLocation) {
      persistTrackingState({ myLocation, isSharing });
    }
  }, [myLocation, isSharing]);

  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (mountedRef.current) {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const tileUrls = {
    roadmap: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}${GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : ''}`,
    terrain: `https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}${GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : ''}`,
  };

  // Lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    loadLeaflet().then(ok => { if (mountedRef.current) setLeafletReady(ok); });
  }, []);

  useEffect(() => {
    requestLocationPermissions().then(granted => {
      if (mountedRef.current) setPermissionGranted(granted);
    });
  }, []);

  // Start/stop location sharing
  useEffect(() => {
    if (!permissionGranted || !user) return;
    if (!isSharing) {
      updateSharingStatus(user.id, false);
      return;
    }
    const initTracking = async () => {
      const pos = await getCurrentLocation();
      if (pos && mountedRef.current) {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMyLocation(coords);
        setMapCenter(coords);
      }
      await updateMyLocationOnce(user.id);
      updateSharingStatus(user.id, true);
    };
    initTracking();
  }, [permissionGranted, user, isSharing]);

  // Fetch family locations + real‑time subscription
  const fetchLocations = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const { data: locData, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('is_sharing', true)
        .neq('user_id', user.id);
      if (error) {
        console.warn('Location query error:', error.message);
        return;
      }
      if (locData && mountedRef.current) {
        setLocations(locData as UserLocation[]);
        const userIds = locData.map(l => l.user_id);
        if (userIds.length) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', userIds);
          if (profileData && mountedRef.current) {
            const map = Object.fromEntries(profileData.map(p => [p.id, p]));
            setProfiles(map);
          }
        }
      }
    } catch (err) {
      console.warn('Fetch error', err);
    } finally {
      if (mountedRef.current) setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchLocations();
    const channel = supabase
      .channel(`tracking_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_locations',
      }, () => fetchLocations())
      .subscribe();
    const interval = setInterval(fetchLocations, 30000);

    // Re-fetch on app resume (handles force-stop scenario)
    let resumeListener: any = null;
    if (Capacitor.isNativePlatform()) {
      resumeListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        if (isActive && mountedRef.current) {
          // App is back in foreground — refresh everything
          try {
            const pos = await updateMyLocationOnce(user.id);
            if (pos && mountedRef.current) {
              const coords: [number, number] = [pos.latitude, pos.longitude];
              setMyLocation(coords);
              setMapCenter(coords);
            }
          } catch (e) {
            console.warn('Resume location refresh failed:', e);
          }
          fetchLocations();
        }
      });
    }

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (resumeListener) {
        resumeListener.then((l: any) => l.remove());
      }
    };
  }, [user, fetchLocations]);

  // Handlers
  const handleGrantPermission = async () => {
    const pos = await getCurrentLocation();
    if (pos) {
      setPermissionGranted(true);
      setMyLocation([pos.coords.latitude, pos.coords.longitude]);
      setMapCenter([pos.coords.latitude, pos.coords.longitude]);
    } else {
      setPermissionGranted(false);
    }
  };

  const requestMemberLocation = async (memberId: string) => {
    if (cooldowns[memberId]) return;

    // Set 15s cooldown and 10s fetching state
    setCooldowns(prev => ({ ...prev, [memberId]: true }));
    setFetchingStates(prev => ({ ...prev, [memberId]: true }));

    setTimeout(() => {
      setCooldowns(prev => ({ ...prev, [memberId]: false }));
    }, 15000);

    setTimeout(() => {
      setFetchingStates(prev => ({ ...prev, [memberId]: false }));
    }, 10000);

    try {
      // Subscribe first, then send to avoid REST fallback warning
      const channel = supabase.channel(`location_requests_${memberId}`);
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
        });
      });
      await channel.send({
        type: 'broadcast',
        event: 'fetch_now',
        payload: { target: memberId }
      });
      // Clean up the channel after sending
      supabase.removeChannel(channel);

      // Notify the target person that someone is checking their location
      const requesterName = user?.name || user?.email?.split('@')[0] || 'குழு உறுப்பினர்';
      const notifTitle = '📍 இருப்பிடப் பகிர்வு கோரிக்கை';
      const notifBody = `${requesterName} உங்கள் இருப்பிடத்தை சரிபார்த்தார்`;
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: memberId,
        type: 'info',
        title: notifTitle,
        message: notifBody,
      });
      if (notifError) console.warn('Notification insert failed:', notifError.message);

      // Send real FCM push notification with action: 'fetch_location' data payload
      await sendPushToUser(memberId, notifTitle, notifBody, 'high', { action: 'fetch_location' });
    } catch (err) {
      console.warn('Failed to send location request:', err);
    }
  };

  const openDirections = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const callMember = (userId: string, memberName: string) => {
    startCall(userId, memberName);
  };

  const handleCardClick = (loc: UserLocation) => {
    setSelectedMember(loc);
    setMapCenter([loc.latitude, loc.longitude]);
  };

  const handleRecenter = () => {
    setSelectedMember(null);
    if (myLocation) setMapCenter([myLocation[0] + 0.00001 * Math.random(), myLocation[1]]);
  };

  const handleRefreshLocation = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const pos = await updateMyLocationOnce(user.id);
      if (pos) {
        const coords: [number, number] = [pos.latitude, pos.longitude];
        setMyLocation(coords);
        setMapCenter(coords);
      }
      await fetchLocations();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleFullscreen = () => {
    const elem = document.getElementById('map-container');
    if (!elem) return;
    if (!isFullscreen) {
      (elem as any).requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Loading / permission states
  if (permissionGranted === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!permissionGranted) {
    return <PermissionScreen onGrant={handleGrantPermission} t={t} />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* ═══ MAP AREA ═══ */}
      <div
        id="map-container"
        className="relative w-full bg-slate-50 dark:bg-[#0a0a14] shrink-0"
        style={{ height: '40%' }}
      >
        {leafletReady && MapContainer ? (
          <div className="absolute inset-0 z-0">
            <MapContainer
              center={mapCenter}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer 
                key={isDarkMode ? 'dark-' + mapType : mapType} 
                url={isDarkMode && mapType !== 'satellite' ? `https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}${GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : ''}` : tileUrls[mapType]} 
                attribution={isDarkMode && mapType !== 'satellite' ? 'Map data &copy; Google' : '&copy; <a href="https://osm.org">OSM</a>'} 
                className={isDarkMode && mapType !== 'satellite' ? 'dark-map-filter' : ''}
                maxZoom={20} 
              />
              {ZoomControl && <ZoomControl position="topright" />}
              <FlyTo center={mapCenter} zoom={selectedMember ? 15 : 16} />

              {myLocation && (
                <Marker position={myLocation} icon={createPulsingIcon('#3b82f6', 32, true)}>
                  <Popup>
                    <div className="font-semibold">{user?.name || t('You')}</div>
                    <div className="text-xs text-slate-500">{t('Your live position')}</div>
                  </Popup>
                </Marker>
              )}

              {locations.map(loc => {
                const name = profiles[loc.user_id]?.name || t('Family');
                const isFetching = fetchingStates[loc.user_id];
                return (
                  <Marker 
                    key={loc.user_id} 
                    position={[loc.latitude, loc.longitude]} 
                    icon={createPulsingIcon(isFetching ? '#f59e0b' : '#10b981', 28, isFetching)}
                  >
                    <Popup>
                      <div className="font-semibold">{name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Battery size={12} /> {loc.battery_level || 100}% · {new Date(loc.updated_at).toLocaleTimeString()}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-0">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm">{t('Loading map...')}</p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3 z-[400]">
          <div className="flex flex-col gap-1.5">
            <div className="px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow border border-slate-200/50 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : (isSharing ? 'bg-green-500' : 'bg-slate-400')}`} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {isRefreshing ? t('Fetching...') : (isSharing ? t('Live Online') : t('Offline'))}
              </span>
            </div>
          </div>
        </div>

        {/* Floating Controls — single row */}
        <div className="absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-end gap-2">
          {/* Action buttons */}
          <div className="flex gap-1.5">
            <button onClick={handleRefreshLocation} disabled={isRefreshing} className="bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-md border border-slate-200/80 text-primary-600 active:scale-95 transition-transform disabled:opacity-50" title={t('Refresh Location')}>
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleRecenter} className="bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-md border border-slate-200/80 text-primary-600 active:scale-95 transition-transform" title={t('My location')}>
              <Navigation size={16} />
            </button>
            <button onClick={toggleFullscreen} className="bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-md border border-slate-200/80 text-primary-600 active:scale-95 transition-transform">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM PANEL ═══ */}
      <div className="bg-white border-t border-slate-200 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex flex-col z-[500] flex-1 overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 shrink-0">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Activity size={15} className="text-primary-500" />
            {t('Family Members')} · {locations.length}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              {isSharing ? (
                <><Signal size={11} className="text-emerald-500" /><span className="text-emerald-600">{t('Sharing')}</span></>
              ) : (
                <><Lock size={11} className="text-slate-400" /><span className="text-slate-400">{t('Private')}</span></>
              )}
            </span>
            <button
              onClick={() => setIsSharing(prev => !prev)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 ${isSharing ? 'bg-primary-500' : 'bg-slate-300'}`}
              aria-label="Toggle sharing"
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ${isSharing ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <MapPinOff size={36} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">{t('No family members sharing')}</p>
            </div>
          ) : (
            locations.map(loc => {
              const profile = profiles[loc.user_id];
              const name = profile?.name || t('Family Member');
              const initial = name.charAt(0).toUpperCase();
              const distance = myLocation ? getDistance(myLocation[0], myLocation[1], loc.latitude, loc.longitude) : '?';
              const isOnline = Date.now() - new Date(loc.updated_at).getTime() < 5 * 60 * 1000;
              const isSelected = selectedMember?.user_id === loc.user_id;
              const batteryLevel = loc.battery_level ?? 100;

              return (
                <div
                  key={loc.user_id}
                  onClick={() => handleCardClick(loc)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                    ? 'bg-primary-50 border-primary-300 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Info row */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {initial}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{name}</h3>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); requestMemberLocation(loc.user_id); }} 
                            disabled={cooldowns[loc.user_id]}
                            className={`p-1.5 bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 active:scale-95 transition-all rounded-md ${
                              cooldowns[loc.user_id] ? 'opacity-50 cursor-not-allowed' : ''
                            }`} 
                            title={t('Fetch Location')}
                          >
                            <RefreshCw size={12} className={cooldowns[loc.user_id] ? 'animate-spin' : ''} />
                          </button>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            fetchingStates[loc.user_id] 
                              ? 'bg-amber-100 text-amber-700 animate-pulse' 
                              : isOnline 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-200 text-slate-500'
                          }`}>
                            {fetchingStates[loc.user_id] ? t('Fetching...') : isOnline ? t('Online') : t('Offline')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                          <MapPin size={10} /> {distance} km
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                          <Battery size={10} className={batteryLevel < 20 ? 'text-red-500' : 'text-emerald-500'} />
                          {batteryLevel}%
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {Math.floor((Date.now() - new Date(loc.updated_at).getTime()) / 60000)}m {t('ago')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 mt-2.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); openDirections(loc.latitude, loc.longitude); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-all"
                    >
                      <ExternalLink size={12} /> {t('Directions')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); callMember(loc.user_id, name); }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all"
                    >
                      <Phone size={12} /> {t('Call')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
