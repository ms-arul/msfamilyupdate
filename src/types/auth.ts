import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

export type User = SupabaseUser;
export type Session = SupabaseSession;

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  family_id: string | null;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
}
