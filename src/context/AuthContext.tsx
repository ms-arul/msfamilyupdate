import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { loadPreferences } from '../utils/preferencesService';
import { applyTheme } from '../utils/themeService';
import { updateMyLocationOnce } from '../utils/trackingService';
import { updateSmsConfig } from '../utils/smsService';
import { createSafeContext } from './contextHelper';
import SplashScreen from '../components/SplashScreen';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';

export interface FamilyUser {
  id: string;
  email?: string;
  name: string;
  username?: string;
  bio?: string;
  role: string;
  avatar: string;
}

export interface AuthContextType {
  user: FamilyUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string, username?: string) => Promise<any>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
}

const [useAuth, AuthContextProvider] = createSafeContext<AuthContextType>('Auth');

export { useAuth };

interface AuthProviderProps {
  children: React.ReactNode;
}

// Helpers for explicit logout state persistence across storage tiers
const setExplicitLogoutFlag = () => {
  try {
    localStorage.setItem('msfamily_explicit_logout', 'true');
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'msfamily_explicit_logout', value: 'true' }).catch(() => {});
    }
  } catch {}
};

const clearExplicitLogoutFlag = () => {
  try {
    localStorage.removeItem('msfamily_explicit_logout');
    if (Capacitor.isNativePlatform()) {
      Preferences.remove({ key: 'msfamily_explicit_logout' }).catch(() => {});
    }
  } catch {}
};

const isExplicitLogout = (): boolean => {
  try {
    return localStorage.getItem('msfamily_explicit_logout') === 'true';
  } catch {
    return false;
  }
};

// Helper for saving backup session snapshot
const saveSessionBackup = (session: any) => {
  if (!session?.access_token || !session?.refresh_token) return;
  try {
    const backupData = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: session.user,
      saved_at: Date.now(),
    });
    localStorage.setItem('msfamily_auth_session_backup', backupData);
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'msfamily_auth_session_backup', value: backupData }).catch(() => {});
    }
  } catch {}
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [animationDone, setAnimationDone] = useState<boolean>(false);

  const isMounted = useRef<boolean>(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Splash animation minimum display timer (2.8 seconds)
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        if (isMounted.current) setAnimationDone(true);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Turn off splash ONLY after BOTH loading finishes AND animation timer has completed
  useEffect(() => {
    if (showSplash && animationDone && !loading) {
      setShowSplash(false);
    }
  }, [showSplash, animationDone, loading]);

  const shouldRenderSplash = showSplash && (!animationDone || loading);

  const fetchProfile = useCallback(async (authUser: any) => {
    console.log('[AuthContext] fetchProfile started for authUser:', authUser.id, authUser.email);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[AuthContext] Profile fetch error:', error);
      }

      if (data) {
        console.log('[AuthContext] Profile found in DB, setting user state');
        const userObj: FamilyUser = {
          id: authUser.id,
          email: authUser.email,
          name: data.name,
          username: data.username || undefined,
          bio: data.bio || undefined,
          role: data.role || 'Member',
          avatar: data.avatar,
        };
        if (isMounted.current) setUser(userObj);
        try { localStorage.setItem('msfamily_cached_user', JSON.stringify(userObj)); } catch {}

        // Load and apply user preferences from backend
        try {
          const prefs = await loadPreferences(authUser.id);
          if (prefs) {
            applyTheme(prefs.theme || 'light');
            if (prefs.language) {
              localStorage.setItem('msfamily_language', prefs.language);
            }
          }
        } catch (prefErr) {
          console.warn('[AuthContext] Failed to load preferences:', prefErr);
        }
      } else {
        console.log('[AuthContext] Profile NOT found in DB. Creating fallback profile');
        const namePart = authUser.email ? authUser.email.split('@')[0] : 'Guest';
        const newProfile = {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || namePart,
          avatar: authUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${namePart}&background=7c3aed&color=fff`,
          role: 'Member'
        };

        try {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile]);

          if (insertError) {
            console.error('[AuthContext] Failed to create profile on demand:', insertError);
          }
        } catch (dbErr) {
          console.error('[AuthContext] Unexpected error creating profile row:', dbErr);
        }

        const userObj: FamilyUser = {
          id: authUser.id,
          email: authUser.email,
          name: newProfile.name,
          role: newProfile.role,
          avatar: newProfile.avatar,
        };
        if (isMounted.current) setUser(userObj);
        try { localStorage.setItem('msfamily_cached_user', JSON.stringify(userObj)); } catch {}
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected error fetching profile:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // Restore cached user state immediately on app start to prevent brief flash or accidental logout
  const restoreCachedUserState = useCallback(() => {
    try {
      const cached = localStorage.getItem('msfamily_cached_user');
      if (cached) {
        const cachedUser = JSON.parse(cached);
        if (cachedUser && cachedUser.id) {
          console.log('[AuthContext] Restored user state from local cache');
          if (isMounted.current) setUser(cachedUser);
          return true;
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Error reading cached user:', e);
    }
    return false;
  }, []);

  // Main session initialization and event subscriptions
  useEffect(() => {
    let unmounted = false;

    // Helper to broadcast auth refresh to all data providers
    const notifyAuthRefreshed = (sess: any) => {
      try {
        window.dispatchEvent(new CustomEvent('msfamily_auth_refreshed', { detail: sess }));
      } catch {}
    };

    // Check active session on mount sequentially
    const initAuthSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (unmounted) return;

        if (session?.user) {
          console.log('[AuthContext] Active session verified on mount:', session.user.id);
          clearExplicitLogoutFlag();
          saveSessionBackup(session);
          await fetchProfile(session.user);
          updateSmsConfig(
            import.meta.env.VITE_SUPABASE_URL || '',
            import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            session.access_token || '',
            session.user.id,
            session.refresh_token || ''
          );
          notifyAuthRefreshed(session);
        } else {
          // If no active session found, check if user explicitly logged out
          if (isExplicitLogout()) {
            console.log('[AuthContext] Explicit logout confirmed on mount.');
            if (isMounted.current) {
              setUser(null);
              setLoading(false);
            }
            return;
          }

          // User DID NOT explicitly log out -> Restore cached user & attempt silent session recovery
          restoreCachedUserState();

          // Attempt recovery using session backup snapshot BEFORE resolving loading state
          try {
            const backupStr = localStorage.getItem('msfamily_auth_session_backup');
            if (backupStr) {
              const backup = JSON.parse(backupStr);
              if (backup?.refresh_token) {
                console.log('[AuthContext] Attempting silent background session recovery from backup');
                const { data: recovered, error: recErr } = await supabase.auth.setSession({
                  access_token: backup.access_token,
                  refresh_token: backup.refresh_token,
                });

                if (recovered?.session?.user) {
                  console.log('[AuthContext] ✅ Silent session recovery succeeded');
                  clearExplicitLogoutFlag();
                  saveSessionBackup(recovered.session);
                  await fetchProfile(recovered.session.user);
                  notifyAuthRefreshed(recovered.session);
                } else if (recErr) {
                  console.warn('[AuthContext] Refresh with backup token failed:', recErr);
                }
              }
            }
          } catch (recException) {
            console.warn('[AuthContext] Session recovery exception:', recException);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error initializing auth session:', err);
      } finally {
        if (isMounted.current && !unmounted) {
          setLoading(false);
        }
      }
    };

    initAuthSession();

    // Listen to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthFlow] Auth State Changed. Event:', _event, 'User:', session?.user?.email);

      if (session?.user) {
        clearExplicitLogoutFlag();
        saveSessionBackup(session);
        updateSmsConfig(
          import.meta.env.VITE_SUPABASE_URL || '',
          import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          session.access_token || '',
          session.user.id,
          session.refresh_token || ''
        );
        notifyAuthRefreshed(session);

        if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED' || _event === 'TOKEN_REFRESHED') {
          fetchProfile(session.user);
        }
      } else {
        // ONLY clear user state if EXPLICIT LOGOUT occurred!
        if (isExplicitLogout()) {
          console.log('[AuthContext] Explicit logout confirmed. Clearing user state.');
          try { localStorage.removeItem('msfamily_cached_user'); } catch {}
          try { localStorage.removeItem('msfamily_auth_session_backup'); } catch {}
          if (isMounted.current) {
            setUser(null);
            setLoading(false);
          }
          updateSmsConfig('', '', '', '', '');
        } else {
          console.log('[AuthContext] Transient null session received (offline/refresh). Maintaining user state.');
          restoreCachedUserState();
          if (isMounted.current) setLoading(false);
        }
      }
    });

    // Native & Web Deep Link handling for Google OAuth redirects
    let appUrlListener: Promise<any> | null = null;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        const handleDeepLinkUrl = async (url: string) => {
          if (url.startsWith('msfamily://callback') || url.includes('access_token=')) {
            try {
              const parsedUrl = new URL(url.replace('msfamily://', 'http://'));
              const hash = parsedUrl.hash.substring(1);
              const hashParams = new URLSearchParams(hash);

              let accessToken = hashParams.get('access_token');
              let refreshToken = hashParams.get('refresh_token');

              if (!accessToken || !refreshToken) {
                const queryParams = parsedUrl.searchParams;
                accessToken = accessToken || queryParams.get('access_token');
                refreshToken = refreshToken || queryParams.get('refresh_token');
              }

              if (accessToken && refreshToken) {
                if (isMounted.current) setLoading(true);
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                if (error) {
                  console.error('[AuthFlow] ❌ Failed to set session from deep link:', error);
                  if (isMounted.current) setLoading(false);
                } else if (data.session) {
                  clearExplicitLogoutFlag();
                  saveSessionBackup(data.session);
                  try {
                    await Browser.close();
                  } catch {}
                  fetchProfile(data.session.user);
                }
              }
            } catch (err) {
              console.error('[AuthFlow] ❌ Error parsing deep link URL:', err);
            }
          }
        };

        (App as any).getLastUrl?.()?.then((lastUrl: any) => {
          if (lastUrl && lastUrl.url) {
            handleDeepLinkUrl(lastUrl.url);
          }
        });

        appUrlListener = Promise.resolve(
          App.addListener('appUrlOpen', (event) => {
            handleDeepLinkUrl(event.url);
          })
        );
      }).catch(err => {
        console.error('[AuthFlow] Failed to load Capacitor App plugin:', err);
      });
    } else {
      // Web OAuth callback handling for Google login redirects on web
      const handleWebOAuthUrl = async () => {
        const fullUrl = window.location.href;
        if (fullUrl.includes('access_token=') || fullUrl.includes('refresh_token=')) {
          console.log('[AuthFlow] Web OAuth redirect detected in URL');
          try {
            const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
            const search = window.location.search;
            const hashParams = new URLSearchParams(hash);
            const searchParams = new URLSearchParams(search);

            let accessToken = hashParams.get('access_token') || searchParams.get('access_token');
            let refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

            if (accessToken && refreshToken) {
              if (isMounted.current) setLoading(true);
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (!error && data?.session) {
                console.log('[AuthFlow] ✅ Web OAuth session successfully established');
                clearExplicitLogoutFlag();
                saveSessionBackup(data.session);
                await fetchProfile(data.session.user);
                window.history.replaceState(null, '', window.location.pathname);
              } else if (error) {
                console.error('[AuthFlow] Failed to set web session:', error);
              }
            }
          } catch (webOAuthErr) {
            console.error('[AuthFlow] Error handling Web OAuth URL:', webOAuthErr);
          } finally {
            if (isMounted.current) setLoading(false);
          }
        }
      };

      handleWebOAuthUrl();
    }

    return () => {
      unmounted = true;
      subscription.unsubscribe();
      if (appUrlListener) {
        appUrlListener.then((l: any) => l.remove());
      }
    };
  }, [fetchProfile, restoreCachedUserState]);

  // Production-grade Realtime Profile Sync: updates name, avatar, bio, username, role live across sessions/devices
  useEffect(() => {
    if (!user?.id) return;

    console.log('[AuthContext] Subscribing to realtime profile updates for user:', user.id);
    const profileChannel = supabase
      .channel(`public_profiles_sync_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[AuthContext] Realtime profile update received:', payload.new);
          if (payload.new && isMounted.current) {
            setUser(prev => {
              if (!prev) return null;
              const updated: FamilyUser = {
                ...prev,
                name: payload.new.name || prev.name,
                username: payload.new.username || prev.username,
                bio: payload.new.bio || prev.bio,
                role: payload.new.role || prev.role,
                avatar: payload.new.avatar || prev.avatar,
              };
              try { localStorage.setItem('msfamily_cached_user', JSON.stringify(updated)); } catch {}
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  // Handle app resume & online event silent re-sync
  useEffect(() => {
    if (!user?.id) return;

    const revalidateSessionAndProfile = async () => {
      if (isExplicitLogout()) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          saveSessionBackup(session);
          fetchProfile(session.user);
        }
      } catch (err) {
        console.warn('[AuthContext] Silent resume revalidation skipped:', err);
      }
    };

    window.addEventListener('online', revalidateSessionAndProfile);

    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        appStateListener = App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log('[AuthContext] App resumed, re-validating user state');
            revalidateSessionAndProfile();
          }
        });
      });
    }

    return () => {
      window.removeEventListener('online', revalidateSessionAndProfile);
      if (appStateListener) {
        appStateListener.then((l: any) => l.remove());
      }
    };
  }, [user?.id, fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string, username?: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username || undefined,
        },
      },
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    clearExplicitLogoutFlag();
    if (data.session) saveSessionBackup(data.session);

    if (username && data.user) {
      await supabase.from('profiles').update({ username }).eq('id', data.user.id);
    }
    return data;
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    clearExplicitLogoutFlag();
    if (data.session) saveSessionBackup(data.session);
    return data;
  };

  const logout = async () => {
    console.log('[AuthContext] Explicit logout initiated by user');
    setExplicitLogoutFlag();

    try { localStorage.removeItem('msfamily_cached_user'); } catch {}
    try { localStorage.removeItem('msfamily_auth_session_backup'); } catch {}

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sb-') || k.startsWith('msfamily_auth'))) {
        try { localStorage.removeItem(k); } catch {}
        if (Capacitor.isNativePlatform()) {
          Preferences.remove({ key: k }).catch(() => {});
        }
      }
    }

    setUser(null);
    updateSmsConfig('', '', '', '', '');

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthContext] Supabase signOut error:', err);
    }
  };

  const updateUsername = async (username: string) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);
    if (error) throw error;
    setUser(prev => prev ? { ...prev, username } : null);
  };

  useEffect(() => {
    if (!user) return;

    const locationChannel = supabase.channel(`location_requests_${user.id}`)
      .on('broadcast', { event: 'fetch_now' }, async () => {
        try {
          const { data } = await supabase.from('user_locations').select('is_sharing').eq('user_id', user.id).single();
          if (data?.is_sharing) {
             await updateMyLocationOnce(user.id);
          }
        } catch (err) {
          console.warn('Silent location update failed:', err);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [user]);

  return (
    <AuthContextProvider value={{ user, login, signUp, logout, loading, updateUsername }}>
      <AnimatePresence mode="wait">
        {shouldRenderSplash && <SplashScreen />}
      </AnimatePresence>
      <div style={{ display: shouldRenderSplash ? 'none' : 'block', width: '100%', height: '100%' }}>
        {children}
      </div>
    </AuthContextProvider>
  );
};
