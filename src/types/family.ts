// ============================================================================
// Family Group Management System — TypeScript Types
// ============================================================================

export interface FamilyGroup {
  id: string;
  family_code: string;
  name: string;
  description: string;
  avatar_url: string | null;
  created_by: string;
  invite_token: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  // Joined profile data (from Supabase join)
  profile?: {
    name: string;
    username: string | null;
    avatar: string;
  };
}

export interface FamilyRequest {
  id: string;
  family_id: string;
  from_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profile?: {
    name: string;
    username: string | null;
    avatar: string;
  };
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  to_user_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  // Joined data
  family?: {
    name: string;
    family_code: string;
    avatar_url: string | null;
  };
  inviter?: {
    name: string;
    username: string | null;
    avatar: string;
  };
}

export interface UserSearchResult {
  id: string;
  name: string;
  username: string | null;
  avatar: string;
}
