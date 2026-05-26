import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { loadPreferences } from '../utils/preferencesService';
import { applyTheme } from '../utils/themeService';
import { updateMyLocationOnce } from '../utils/trackingService';
import { updateSmsConfig } from '../utils/smsService';
import { createSafeContext } from './contextHelper';

export interface FamilyUser {
  id: string;
  email?: string;
  name: string;
  role: string;
  avatar: string;
}

export interface AuthContextType {
  user: FamilyUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string) => Promise<any>;
  logout: () => Promise<void>;
}

const [useAuth, AuthContextProvider] = createSafeContext<AuthContextType>('Auth');

export { useAuth };

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
        updateSmsConfig(
          import.meta.env.VITE_SUPABASE_URL || '',
          import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          session.access_token || '',
          session.user.id
        );
      } else {
        setLoading(false);
      }
    });

    // Listen to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Always update native config — covers login AND token refresh events
        updateSmsConfig(
          import.meta.env.VITE_SUPABASE_URL || '',
          import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          session.access_token || '',
          session.user.id
        );
        // Only re-fetch profile on login/signup, not on every token refresh
        if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
          fetchProfile(session.user);
        }
      } else {
        setUser(null);
        setLoading(false);
        updateSmsConfig('', '', '', '');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUser: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
      }

      if (data) {
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: data.name,
          role: data.role,
          avatar: data.avatar,
        });

        // Load and apply user preferences from backend
        try {
          const prefs = await loadPreferences(authUser.id);
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
        // Profile not created yet (shouldn't happen with trigger, fallback)
        const namePart = authUser.email ? authUser.email.split('@')[0] : 'Guest';
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: namePart,
          role: 'Member',
          avatar: `https://ui-avatars.com/api/?name=${namePart}&background=7c3aed&color=fff`,
        });
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) {
      setLoading(false);
      throw error;
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
    <AuthContextProvider value={{ user, login, signUp, logout, loading }}>
      {loading ? (
        <div className="absolute inset-0 z-50 bg-white dark:bg-[#0a0a14] flex flex-col items-center justify-center overflow-hidden transition-colors">
          {/* Apple-style splash screen */}
          <div className="flex flex-col items-center justify-center gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-slate-100"
              >
                <img
                  src="/mslogo.png"
                  alt="MS Family"
                  className="w-full h-full object-contain scale-90 dark:hidden"
                  loading="eager"
                />
                <img
                  src="/mslogodark.png"
                  alt="MS Family"
                  className="w-full h-full object-contain scale-90 hidden dark:block"
                  loading="eager"
                />
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="w-[180px] h-[3px] bg-slate-200/80 rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-1/2 h-full bg-slate-400 rounded-full"
              />
            </motion.div>
          </div>
        </div>
      ) : null}
      <div style={{ display: loading ? 'none' : 'block', width: '100%', height: '100%' }}>
        {children}
      </div>
    </AuthContextProvider>
  );
};
