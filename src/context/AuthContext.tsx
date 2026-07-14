import React, { useState, useEffect } from 'react';
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [animationDone, setAnimationDone] = useState<boolean>(false);

  // Splash animation minimum display timer (2.8 seconds)
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setAnimationDone(true);
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
  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
        updateSmsConfig(
          import.meta.env.VITE_SUPABASE_URL || '',
          import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          session.access_token || '',
          session.user.id,
          session.refresh_token || ''
        );
      } else {
        setLoading(false);
      }
    });

    // Listen to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthFlow] Auth State Changed. Event:', _event, 'User:', session?.user?.email);
      if (session?.user) {
        // Always update native config — covers login AND token refresh events
        updateSmsConfig(
          import.meta.env.VITE_SUPABASE_URL || '',
          import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          session.access_token || '',
          session.user.id,
          session.refresh_token || ''
        );
        // Only re-fetch profile on login/signup, not on every token refresh
        if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
          fetchProfile(session.user);
        }
      } else {
        // Only clear user state on explicit sign-out, not on transient null
        // sessions (e.g. during token refresh or WebView restart).
        if (_event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          updateSmsConfig('', '', '', '', '');
        }
      }
    });

    // Native Deep Link handling for Google OAuth redirects
    let appUrlListener: Promise<any> | null = null;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        const handleDeepLinkUrl = async (url: string) => {
          console.log('[AuthFlow] ═══════════════════════════════════════');
          console.log('[AuthFlow] Deep Link Received');
          console.log('[AuthFlow]   Full URL:', url);
          console.log('[AuthFlow] ═══════════════════════════════════════');

          if (url.startsWith('msfamily://callback') || url.includes('access_token=')) {
            try {
              // Normalize scheme for proper URL parsing
              const parsedUrl = new URL(url.replace('msfamily://', 'http://'));
              const hash = parsedUrl.hash.substring(1); // remove '#'
              const hashParams = new URLSearchParams(hash);
              
              let accessToken = hashParams.get('access_token');
              let refreshToken = hashParams.get('refresh_token');
              
              if (!accessToken || !refreshToken) {
                const queryParams = parsedUrl.searchParams;
                accessToken = accessToken || queryParams.get('access_token');
                refreshToken = refreshToken || queryParams.get('refresh_token');
              }

              console.log('[AuthFlow]   access_token found:', !!accessToken);
              console.log('[AuthFlow]   refresh_token found:', !!refreshToken);
              
              if (accessToken && refreshToken) {
                console.log('[AuthFlow] Setting Supabase session...');
                setLoading(true);
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                
                if (error) {
                  console.error('[AuthFlow] ❌ Failed to set session from deep link:', error);
                  setLoading(false);
                } else if (data.session) {
                  console.log('[AuthFlow] ✅ Session Created. User:', data.session.user.email);
                  // Now that session is established, close the browser
                  try {
                    await Browser.close();
                    console.log('[AuthFlow] ✅ Browser Closed');
                  } catch (closeErr) {
                    console.warn('[AuthFlow] Browser.close() error (non-fatal):', closeErr);
                  }
                  // fetchProfile is handled by onAuthStateChange SIGNED_IN event
                }
              } else {
                console.warn('[AuthFlow] ⚠️ Deep link did not contain required tokens');
                console.warn('[AuthFlow]   URL hash:', parsedUrl.hash);
                console.warn('[AuthFlow]   URL search:', parsedUrl.search);
              }
            } catch (err) {
              console.error('[AuthFlow] ❌ Error parsing deep link URL:', err);
            }
          } else {
            console.log('[AuthFlow]   URL does not match OAuth callback pattern, ignoring');
          }
        };

        // Handle case where app was launched via deep link (cold start)
        App.getLastUrl().then((lastUrl) => {
          if (lastUrl && lastUrl.url) {
            console.log('[AuthFlow] Cold start deep link detected:', lastUrl.url);
            handleDeepLinkUrl(lastUrl.url);
          }
        });

        // Listen for deep links when app is already running (warm start)
        appUrlListener = Promise.resolve(
          App.addListener('appUrlOpen', (event) => {
            console.log('[AuthFlow] Warm start appUrlOpen fired:', event.url);
            handleDeepLinkUrl(event.url);
          })
        );
      }).catch(err => {
        console.error('[AuthFlow] Failed to load Capacitor App plugin:', err);
      });
    }

    return () => {
      subscription.unsubscribe();
      if (appUrlListener) {
        appUrlListener.then((l: any) => l.remove());
      }
    };
  }, []);

  const fetchProfile = async (authUser: any) => {
    console.log('[AuthContext] fetchProfile started for authUser:', authUser.id, authUser.email);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('[AuthContext] fetchProfile query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
      }

      if (data) {
        console.log('[AuthContext] Profile found in DB, setting user state');
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: data.name,
          username: data.username || undefined,
          bio: data.bio || undefined,
          role: data.role,
          avatar: data.avatar,
        });

        // Load and apply user preferences from backend
        try {
          const prefs = await loadPreferences(authUser.id);
          console.log('[AuthContext] Loaded preferences:', prefs);
          if (prefs) {
            // Apply theme
            applyTheme(prefs.theme || 'light');
            // Language is applied via localStorage which LanguageProvider reads
            if (prefs.language) {
              localStorage.setItem('msfamily_language', prefs.language);
            }
          }
        } catch (prefErr) {
          console.warn('Failed to load preferences:', prefErr);
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
          } else {
            console.log('[AuthContext] Successfully created profile on demand in DB');
          }
        } catch (dbErr) {
          console.error('[AuthContext] Unexpected error creating profile row:', dbErr);
        }

        console.log('[AuthContext] Setting user state with fallback profile');
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: newProfile.name,
          role: newProfile.role,
          avatar: newProfile.avatar,
        });
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected error fetching profile:', err);
    } finally {
      setLoading(false);
      console.log('[AuthContext] fetchProfile finished, loading set to false');
    }
  };

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
    // If username provided, update the profile record
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
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
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
    
    // Listen for on-demand location requests from other family members
    const locationChannel = supabase.channel(`location_requests_${user.id}`)
      .on('broadcast', { event: 'fetch_now' }, async () => {
        try {
          // Verify sharing status before responding to requests
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
