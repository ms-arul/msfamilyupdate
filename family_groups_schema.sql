-- ============================================================================
-- Family Group Management System — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- ── 1. Extend profiles table with username & bio ────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ── Drop existing tables to clean up incorrect foreign keys ──────────────────
DROP TABLE IF EXISTS public.family_invitations CASCADE;
DROP TABLE IF EXISTS public.family_requests CASCADE;
DROP TABLE IF EXISTS public.family_members CASCADE;
DROP TABLE IF EXISTS public.family_groups CASCADE;

-- ── 2. Family Groups ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invite_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- ── 3. Family Members (junction) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(family_id, user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);

-- ── 4. Family Join Requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(family_id, from_user_id)
);

ALTER TABLE public.family_requests ENABLE ROW LEVEL SECURITY;

-- ── 5. Family Invitations (admin → user) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(family_id, to_user_id)
);

ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS HELPER FUNCTIONS (SECURITY DEFINER to avoid infinite recursion)
-- ============================================================================

-- Check if a user is a member of a family group
CREATE OR REPLACE FUNCTION public.is_family_member(f_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = f_id AND user_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if a user is an admin of a family group
CREATE OR REPLACE FUNCTION public.is_family_admin(f_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = f_id AND user_id = u_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- ── Family Groups ───────────────────────────────────────────────────────────
-- Anyone authenticated can see family groups (needed for join-by-code)
CREATE POLICY "Authenticated users can view family groups"
  ON public.family_groups FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the creator can insert
CREATE POLICY "Users can create family groups"
  ON public.family_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only admins of the family can update
CREATE POLICY "Family admins can update their family"
  ON public.family_groups FOR UPDATE
  USING (public.is_family_admin(id, auth.uid()));

-- Only admins can delete
CREATE POLICY "Family admins can delete their family"
  ON public.family_groups FOR DELETE
  USING (public.is_family_admin(id, auth.uid()));

-- ── Family Members ──────────────────────────────────────────────────────────
-- Members of the same family can view each other
CREATE POLICY "Family members can view their group members"
  ON public.family_members FOR SELECT
  USING (public.is_family_member(family_id, auth.uid()));

-- Admins and the system can insert members
CREATE POLICY "Admins can add family members"
  ON public.family_members FOR INSERT
  WITH CHECK (
    -- Either the user is adding themselves (initial create)
    auth.uid() = user_id
    OR
    -- Or an admin of the family is adding them
    public.is_family_admin(family_id, auth.uid())
  );

-- Admins can remove members; members can remove themselves
CREATE POLICY "Admins can remove members or self-leave"
  ON public.family_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    public.is_family_admin(family_id, auth.uid())
  );

-- Admins can update member roles
CREATE POLICY "Admins can update member roles"
  ON public.family_members FOR UPDATE
  USING (public.is_family_admin(family_id, auth.uid()));

-- ── Family Requests ─────────────────────────────────────────────────────────
-- Sender can view their own requests; admins can view requests for their family
CREATE POLICY "Users can view their requests or admin can view family requests"
  ON public.family_requests FOR SELECT
  USING (
    auth.uid() = from_user_id
    OR
    public.is_family_admin(family_id, auth.uid())
  );

-- Any authenticated user can send a join request
CREATE POLICY "Users can send join requests"
  ON public.family_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Admins can update request status
CREATE POLICY "Admins can update request status"
  ON public.family_requests FOR UPDATE
  USING (public.is_family_admin(family_id, auth.uid()));

-- Users can delete their own pending requests
CREATE POLICY "Users can cancel their own requests"
  ON public.family_requests FOR DELETE
  USING (auth.uid() = from_user_id AND status = 'pending');

-- ── Family Invitations ──────────────────────────────────────────────────────
-- Recipients can view invitations sent to them; admins can view all for their family
CREATE POLICY "Users can view invitations sent to them"
  ON public.family_invitations FOR SELECT
  USING (
    auth.uid() = to_user_id
    OR
    public.is_family_admin(family_id, auth.uid())
  );

-- Admins can create invitations
CREATE POLICY "Admins can send invitations"
  ON public.family_invitations FOR INSERT
  WITH CHECK (public.is_family_admin(family_id, auth.uid()));

-- Recipients can update (accept/reject); admins can also update
CREATE POLICY "Recipients or admins can update invitations"
  ON public.family_invitations FOR UPDATE
  USING (
    auth.uid() = to_user_id
    OR
    public.is_family_admin(family_id, auth.uid())
  );

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON public.family_invitations FOR DELETE
  USING (public.is_family_admin(family_id, auth.uid()));

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Generate a unique family code (MSF-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'MSF-' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.family_groups WHERE family_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Search users by username (Instagram-style)
CREATE OR REPLACE FUNCTION public.search_users_by_username(query TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.username, p.avatar
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND (
      p.username ILIKE '%' || query || '%'
      OR p.name ILIKE '%' || query || '%'
    )
  ORDER BY
    CASE WHEN p.username ILIKE query || '%' THEN 0 ELSE 1 END,
    p.name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REALTIME
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_invitations;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.is_family_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_family_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_username(TEXT) TO authenticated;

-- ── Extend notifications type constraint ────────────────────────────────────
-- Drop old constraint and recreate with family types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('alert', 'success', 'info', 'warning', 'family_request', 'family_accepted', 'family_rejected', 'family_invitation'));
