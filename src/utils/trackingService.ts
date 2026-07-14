import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { BackgroundGeolocation, LocationService } from '../plugins';
import { LiveLocation, GPSState } from '../types/location';

const OFFLINE_QUEUE_KEY = 'ms_family_offline_locations';

export const queueOfflineLocation = (locationPayload: Partial<LiveLocation>): void => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(locationPayload));
};

export const syncOfflineQueue = async (): Promise<void> => {
  const status = await Network.getStatus();
  if (!status.connected) return;

  const payloadStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!payloadStr) return;

  try {
    const payload = JSON.parse(payloadStr);
    const { error } = await supabase.from('user_locations').upsert(payload, { onConflict: 'user_id' });
    if (!error) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
  } catch (err) {
    console.error('Failed to sync offline location', err);
  }
};

const getBatteryLevel = async (): Promise<number> => {
  try {
    const nav = navigator as any;
    if (nav.getBattery) {
      const battery = await nav.getBattery();
      return Math.round(battery.level * 100);
    }
  } catch {}
  return 100;
};

export const upsertLocation = async (userId: string, coords: GeolocationCoordinates, familyId?: string | null): Promise<void> => {
  try {
    const batteryLevel = await getBatteryLevel();
    const payload: Record<string, any> = {
      user_id: userId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || null,
      speed: coords.speed || null,
      heading: coords.heading || null,
      altitude: coords.altitude || null,
      battery_level: batteryLevel,
      is_sharing: true,
      updated_at: new Date().toISOString(),
    };

    // Include family_id for cross-family isolation
    if (familyId) {
      payload.family_id = familyId;
    }

    const status = await Network.getStatus();
    if (!status.connected) {
      queueOfflineLocation(payload);
      return;
    }

    const { error } = await supabase.from('user_locations').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;

    syncOfflineQueue();
  } catch (err: any) {
    console.warn('Location upsert error, queuing offline:', err.message);
    queueOfflineLocation({
      user_id: userId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || null,
      speed: coords.speed || null,
      heading: coords.heading || null,
      altitude: coords.altitude || null,
      battery_level: 100,
      is_sharing: true,
      updated_at: new Date().toISOString(),
      ...(familyId ? { family_id: familyId } : {}),
    });
  }
};

export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const status = await Geolocation.checkPermissions();
    if (status.location !== 'granted') {
      const req = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (req.location !== 'granted') return false;
    }
    try {
      if (Capacitor.isNativePlatform()) {
        const bgStatus = await Geolocation.checkPermissions();
        if (bgStatus.coarseLocation === 'granted' || bgStatus.location === 'granted') {
          await Geolocation.requestPermissions({ permissions: ['location'] });
        }
      }
    } catch {}
    return true;
  } catch {
    return 'geolocation' in navigator;
  }
};

export const getCurrentLocation = async (): Promise<GeolocationPosition | null> => {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    return pos as any;
  } catch { /* empty */ }

  if ('geolocation' in navigator) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  return null;
};

export const startBackgroundTracking = async (userId: string): Promise<void> => {
  if (!Capacitor.isNativePlatform() || !LocationService) return;

  try {
    await LocationService.startTracking({ userId });
    console.log('[Tracking] Native foreground service started successfully.');
  } catch (err) {
    console.error('Failed to start background tracking via native service', err);
  }
};

export const stopBackgroundTracking = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || !LocationService) return;

  try {
    await LocationService.stopTracking();
    console.log('[Tracking] Native foreground service stopped successfully.');
  } catch (err) {
    console.error('Failed to stop background tracking via native service', err);
  }
};

export const updateSharingStatus = async (userId: string, isSharing: boolean): Promise<void> => {
  try {
    await supabase.from('user_locations').update({ is_sharing: isSharing }).eq('user_id', userId);
    if (isSharing) {
      await startBackgroundTracking(userId);
    } else {
      await stopBackgroundTracking();
    }
  } catch {}
};

export const updateMyLocationOnce = async (userId: string, familyId?: string | null): Promise<GeolocationCoordinates | null> => {
  const pos = await getCurrentLocation();
  if (pos) {
    await upsertLocation(userId, pos.coords, familyId);
    return pos.coords;
  }
  return null;
};

export const getDistance = (
  lat1: number | undefined | null,
  lon1: number | undefined | null,
  lat2: number | undefined | null,
  lon2: number | undefined | null
): string => {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null || 
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return '?';
  }
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

export const syncBackgroundState = async (userId: string | undefined): Promise<void> => {
  if (!userId) return;
  try {
    await syncOfflineQueue();
    const pos = await getCurrentLocation();
    if (pos) {
      persistTrackingState({
        myLocation: [pos.coords.latitude, pos.coords.longitude],
        isSharing: true,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Background state sync error:', err);
  }
};

const TRACKING_STATE_KEY = 'ms_family_tracking_state';

export const persistTrackingState = (state: Partial<GPSState>): void => {
  try {
    const existing = getPersistedTrackingState() || {};
    const merged = {
      ...existing,
      ...state,
      timestamp: Date.now(),
    };
    localStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to persist tracking state:', err);
  }
};

export const getPersistedTrackingState = (): GPSState | null => {
  try {
    const str = localStorage.getItem(TRACKING_STATE_KEY);
    if (!str) return null;
    const state = JSON.parse(str);
    
    if (state.timestamp && Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(TRACKING_STATE_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
};
