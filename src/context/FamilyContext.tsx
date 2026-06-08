import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { createSafeContext } from './contextHelper';
import type {
  FamilyGroup,
  FamilyMember,
  FamilyRequest,
  FamilyInvitation,
  UserSearchResult,
} from '../types/family';

// ============================================================================
// Context Type
// ============================================================================
export interface FamilyContextType {
  // State
  family: FamilyGroup | null;
  members: FamilyMember[];
  pendingRequests: FamilyRequest[];
  myInvitations: FamilyInvitation[];
  isAdmin: boolean;
  loading: boolean;

  // Family CRUD
  createFamily: (name: string, description?: string, avatarUrl?: string) => Promise<FamilyGroup>;
  leaveFamily: () => Promise<void>;

  // Join methods
  joinFamilyByCode: (code: string, message?: string) => Promise<void>;
  joinFamilyByInviteToken: (token: string) => Promise<void>;

  // Member management (admin)
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  promoteMember: (memberId: string) => Promise<void>;

  // Invitations (admin)
  inviteUser: (userId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<UserSearchResult[]>;

  // Invitation responses
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;

  // Refresh
  refetchFamily: () => Promise<void>;
}

const [useFamily, FamilyContextProvider] = createSafeContext<FamilyContextType>('Family');
export { useFamily };

// ============================================================================
// Helper: generate invite token
// ============================================================================
function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================================================
// Provider
// ============================================================================
interface FamilyProviderProps {
  children: React.ReactNode;
}

export const FamilyProvider: React.FC<FamilyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FamilyRequest[]>([]);
  const [myInvitations, setMyInvitations] = useState<FamilyInvitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const isAdmin = members.some(m => m.user_id === user?.id && m.role === 'admin');

  // ── Fetch family data ─────────────────────────────────────────────────────
  const fetchFamilyData = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) {
      setFamily(null);
      setMembers([]);
      setPendingRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Find user's family membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('user_id', currentUser.id)
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        // Table may not exist yet, silently ignore
        if (membershipError.code === '42P01') {
          setLoading(false);
          return;
        }
        console.error('Error fetching family membership:', membershipError);
        setLoading(false);
        return;
      }

      if (!membershipData) {
        // User has no family
        setFamily(null);
        setMembers([]);
        setPendingRequests([]);
        setLoading(false);
        return;
      }

      const familyId = membershipData.family_id;

      // 2. Fetch family group details
      const { data: familyData, error: familyError } = await supabase
        .from('family_groups')
        .select('*')
        .eq('id', familyId)
        .single();

      if (familyError || !familyData) {
        console.error('Error fetching family group:', familyError);
        setFamily(null);
        setLoading(false);
        return;
      }

      setFamily(familyData as FamilyGroup);

      // 3. Fetch all members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select(`
          *,
          profile:profiles!family_members_user_id_fkey (
            name, username, avatar
          )
        `)
        .eq('family_id', familyId)
        .order('joined_at', { ascending: true });

      if (!membersError && membersData) {
        setMembers(membersData.map((m: any) => ({
          ...m,
          profile: m.profile || undefined,
        })) as FamilyMember[]);
      }

      // 4. If admin, fetch pending requests
      if (membershipData.role === 'admin') {
        const { data: requestsData } = await supabase
          .from('family_requests')
          .select(`
            *,
            profile:profiles!family_requests_from_user_id_fkey (
              name, username, avatar
            )
          `)
          .eq('family_id', familyId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (requestsData) {
          setPendingRequests(requestsData.map((r: any) => ({
            ...r,
            profile: r.profile || undefined,
          })) as FamilyRequest[]);
        }
      }
    } catch (err) {
      console.error('Error in fetchFamilyData:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's pending invitations
  const fetchMyInvitations = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) {
      setMyInvitations([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('family_invitations')
        .select(`
          *,
          family:family_groups!family_invitations_family_id_fkey (
            name, family_code, avatar_url
          ),
          inviter:profiles!family_invitations_invited_by_fkey (
            name, username, avatar
          )
        `)
        .eq('to_user_id', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyInvitations(data.map((inv: any) => ({
          ...inv,
          family: inv.family || undefined,
          inviter: inv.inviter || undefined,
        })) as FamilyInvitation[]);
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFamilyData();
    fetchMyInvitations();
  }, [fetchFamilyData, fetchMyInvitations, user]);

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const channels: any[] = [];

    // Listen for family_members changes
    if (family) {
      const membersChannel = supabase
        .channel(`family_members_${family.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `family_id=eq.${family.id}`,
        }, () => {
          fetchFamilyData();
        })
        .subscribe();
      channels.push(membersChannel);

      // Listen for requests changes (admin)
      const requestsChannel = supabase
        .channel(`family_requests_${family.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'family_requests',
          filter: `family_id=eq.${family.id}`,
        }, () => {
          fetchFamilyData();
        })
        .subscribe();
      channels.push(requestsChannel);
    }

    // Listen for invitations to this user
    const invitationsChannel = supabase
      .channel(`family_invitations_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'family_invitations',
        filter: `to_user_id=eq.${user.id}`,
      }, () => {
        fetchMyInvitations();
      })
      .subscribe();
    channels.push(invitationsChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user, family?.id, fetchFamilyData, fetchMyInvitations]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const createFamily = useCallback(async (
    name: string,
    description?: string,
    avatarUrl?: string
  ): Promise<FamilyGroup> => {
    if (!user) throw new Error('Not authenticated');

    // Generate unique family code
    const { data: codeData, error: codeError } = await supabase.rpc('generate_family_code');
    if (codeError) throw codeError;

    const familyCode = codeData as string;
    const inviteToken = generateInviteToken();

    // Insert family group
    const { data: familyData, error: familyError } = await supabase
      .from('family_groups')
      .insert({
        family_code: familyCode,
        name,
        description: description || '',
        avatar_url: avatarUrl || null,
        created_by: user.id,
        invite_token: inviteToken,
      })
      .select()
      .single();

    if (familyError || !familyData) throw familyError || new Error('Failed to create family');

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: familyData.id,
        user_id: user.id,
        role: 'admin',
      });

    if (memberError) throw memberError;

    const newFamily = familyData as FamilyGroup;
    setFamily(newFamily);
    await fetchFamilyData();
    return newFamily;
  }, [user, fetchFamilyData]);

  const joinFamilyByCode = useCallback(async (code: string, message?: string) => {
    if (!user) throw new Error('Not authenticated');

    // Find family by code
    const { data: familyData, error: familyError } = await supabase
      .from('family_groups')
      .select('id')
      .eq('family_code', code.toUpperCase().trim())
      .single();

    if (familyError || !familyData) throw new Error('Family not found with this code');

    // Send a join request
    const { error: requestError } = await supabase
      .from('family_requests')
      .insert({
        family_id: familyData.id,
        from_user_id: user.id,
        message: message || '',
      });

    if (requestError) {
      if (requestError.code === '23505') {
        throw new Error('You have already sent a request to this family');
      }
      throw requestError;
    }

    // Create notification for family admins
    const { data: admins } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyData.id)
      .eq('role', 'admin');

    if (admins) {
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: 'family_request',
        title: 'New Family Join Request',
        message: `${user.name}${user.username ? ` (@${user.username})` : ''} wants to join your family`,
      }));
      await supabase.from('notifications').insert(notifications);
    }
  }, [user]);

  const joinFamilyByInviteToken = useCallback(async (token: string) => {
    if (!user) throw new Error('Not authenticated');

    // Find family by invite token
    const { data: familyData, error: familyError } = await supabase
      .from('family_groups')
      .select('id')
      .eq('invite_token', token.trim())
      .single();

    if (familyError || !familyData) throw new Error('Invalid invite link');

    // Directly add as member (invite links grant instant access)
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: familyData.id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) {
      if (memberError.code === '23505') {
        throw new Error('You are already a member of this family');
      }
      throw memberError;
    }

    await fetchFamilyData();
  }, [user, fetchFamilyData]);

  const acceptRequest = useCallback(async (requestId: string) => {
    if (!user || !family) throw new Error('Not authorized');

    // Get request details
    const { data: requestData, error: fetchError } = await supabase
      .from('family_requests')
      .select('*, profile:profiles!family_requests_from_user_id_fkey(name)')
      .eq('id', requestId)
      .single();

    if (fetchError || !requestData) throw new Error('Request not found');

    // Update status
    const { error: updateError } = await supabase
      .from('family_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Add as member
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: family.id,
        user_id: requestData.from_user_id,
        role: 'member',
      });

    if (memberError && memberError.code !== '23505') throw memberError;

    // Notify the requester
    await supabase.from('notifications').insert({
      user_id: requestData.from_user_id,
      type: 'family_accepted',
      title: 'Request Accepted!',
      message: `Your request to join "${family.name}" has been accepted. Welcome to the family!`,
    });

    await fetchFamilyData();
  }, [user, family, fetchFamilyData]);

  const rejectRequest = useCallback(async (requestId: string) => {
    if (!user || !family) throw new Error('Not authorized');

    const { data: requestData } = await supabase
      .from('family_requests')
      .select('from_user_id')
      .eq('id', requestId)
      .single();

    const { error } = await supabase
      .from('family_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;

    // Notify the requester
    if (requestData) {
      await supabase.from('notifications').insert({
        user_id: requestData.from_user_id,
        type: 'family_rejected',
        title: 'Request Declined',
        message: `Your request to join "${family.name}" was not approved.`,
      });
    }

    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, [user, family]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!family) throw new Error('No family');

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
    await fetchFamilyData();
  }, [family, fetchFamilyData]);

  const promoteMember = useCallback(async (memberId: string) => {
    if (!family) throw new Error('No family');

    const { error } = await supabase
      .from('family_members')
      .update({ role: 'admin' })
      .eq('id', memberId);

    if (error) throw error;
    await fetchFamilyData();
  }, [family, fetchFamilyData]);

  const inviteUser = useCallback(async (userId: string) => {
    if (!user || !family) throw new Error('Not authorized');

    const { error } = await supabase
      .from('family_invitations')
      .insert({
        family_id: family.id,
        to_user_id: userId,
        invited_by: user.id,
      });

    if (error) {
      if (error.code === '23505') {
        throw new Error('This user has already been invited');
      }
      throw error;
    }

    // Notify the invited user
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'family_invitation',
      title: 'Family Invitation',
      message: `${user.name} invited you to join "${family.name}"`,
    });
  }, [user, family]);

  const searchUsers = useCallback(async (query: string): Promise<UserSearchResult[]> => {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase.rpc('search_users_by_username', {
      query: query.trim(),
    });

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    return (data || []) as UserSearchResult[];
  }, []);

  const acceptInvitation = useCallback(async (invitationId: string) => {
    if (!user) throw new Error('Not authenticated');

    // Get invitation details
    const { data: invData, error: fetchError } = await supabase
      .from('family_invitations')
      .select('family_id, invited_by')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invData) throw new Error('Invitation not found');

    // Update invitation status
    const { error: updateError } = await supabase
      .from('family_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (updateError) throw updateError;

    // Add as member
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: invData.family_id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError && memberError.code !== '23505') throw memberError;

    // Notify the inviter
    if (invData.invited_by) {
      await supabase.from('notifications').insert({
        user_id: invData.invited_by,
        type: 'family_accepted',
        title: 'Invitation Accepted',
        message: `${user.name} accepted your family invitation!`,
      });
    }

    setMyInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    await fetchFamilyData();
  }, [user, fetchFamilyData]);

  const rejectInvitation = useCallback(async (invitationId: string) => {
    const { error } = await supabase
      .from('family_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId);

    if (error) throw error;
    setMyInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  }, []);

  const leaveFamily = useCallback(async () => {
    if (!user || !family) throw new Error('Not in a family');

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', family.id)
      .eq('user_id', user.id);

    if (error) throw error;

    setFamily(null);
    setMembers([]);
    setPendingRequests([]);
  }, [user, family]);

  return (
    <FamilyContextProvider value={{
      family,
      members,
      pendingRequests,
      myInvitations,
      isAdmin,
      loading,
      createFamily,
      leaveFamily,
      joinFamilyByCode,
      joinFamilyByInviteToken,
      acceptRequest,
      rejectRequest,
      removeMember,
      promoteMember,
      inviteUser,
      searchUsers,
      acceptInvitation,
      rejectInvitation,
      refetchFamily: fetchFamilyData,
    }}>
      {children}
    </FamilyContextProvider>
  );
};
