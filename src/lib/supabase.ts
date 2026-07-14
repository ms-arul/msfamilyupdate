import { createClient } from '@supabase/supabase-js';
import { capacitorStorage, hydrateAuthStorage } from './capacitorStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: capacitorStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for Capacitor apps
  },
});

// Re-export the hydrate helper so main.tsx can call it before rendering
export { hydrateAuthStorage };
export default supabase;
