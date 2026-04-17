import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUser) => {
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
      } else {
        // Profile not created yet (shouldn't happen with trigger, fallback)
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: authUser.email.split('@')[0],
          role: 'Member',
          avatar: `https://ui-avatars.com/api/?name=${authUser.email.split('@')[0]}&background=7c3aed&color=fff`,
        });
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060e] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-animated-gradient opacity-50" />
        <div className="z-10 text-center">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
              filter: ["blur(0px)", "blur(4px)", "blur(0px)"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-glow-primary mx-auto mb-6"
          >
            <Sparkles size={32} className="text-slate-900" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black text-gradient tracking-tighter"
          >
            MS FAMILY
          </motion.h2>
          <p className="text-slate-600 text-xs mt-2 uppercase tracking-[0.3em] font-bold">Synchronizing Assets</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, signUp, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
