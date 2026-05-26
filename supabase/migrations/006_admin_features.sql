-- Migration: 006_admin_features.sql
-- Create admin activity logs and user deletion function

-- 1. Create Admin Activity Logs Table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_user_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only ArulPrakash can read logs
CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
    FOR SELECT USING (
        (SELECT name FROM public.profiles WHERE id = auth.uid()) = 'ArulPrakash'
    );

-- Policy: Only ArulPrakash can insert logs
CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_logs
    FOR INSERT WITH CHECK (
        (SELECT name FROM public.profiles WHERE id = auth.uid()) = 'ArulPrakash'
    );


-- 2. Secure RPC to delete a user from auth.users
-- Supabase blocks standard users from deleting auth.users directly.
-- This function runs with SECURITY DEFINER (bypassing RLS), but includes strict
-- manual checks to ensure ONLY "ArulPrakash" can execute it.
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_uid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Check if the caller is the admin
    SELECT (name = 'ArulPrakash') INTO is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access Denied: Only admins can perform this action.';
    END IF;

    -- Prevent admin from deleting themselves
    IF target_uid = auth.uid() THEN
        RAISE EXCEPTION 'Action Denied: You cannot delete your own account.';
    END IF;

    -- Log the action before deletion
    INSERT INTO public.admin_activity_logs (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'DELETE_USER', target_uid, jsonb_build_object('reason', 'Admin requested deletion'));

    -- Delete the user from auth.users (cascading deletes should handle the rest if set up)
    -- If cascading deletes are not set on profiles, we delete it here first:
    DELETE FROM public.profiles WHERE id = target_uid;
    DELETE FROM auth.users WHERE id = target_uid;

    RETURN true;
END;
$$;
