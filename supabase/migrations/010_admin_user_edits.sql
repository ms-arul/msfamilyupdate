-- Migration: 010_admin_user_edits.sql
-- Adds secure RPC functions for Admins to manage other users' passwords and profile pictures.

-- Enable pgcrypto if not already enabled (required for bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. RPC: admin_update_user_password
-- Bypasses RLS to safely update a user's password in auth.users
CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_uid UUID, new_password TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Check if the caller is the master admin (ArulPrakash) or has an admin role
    SELECT (name = 'ArulPrakash' OR role = 'admin') INTO is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access Denied: Only admins can perform this action.';
    END IF;

    -- Prevent an admin from updating the Super Admin's password (unless it's the Super Admin themselves)
    IF target_uid = (SELECT id FROM public.profiles WHERE name = 'ArulPrakash') AND auth.uid() != target_uid THEN
         RAISE EXCEPTION 'Action Denied: Cannot modify the Super Admin.';
    END IF;

    -- Update the password directly in auth.users using bcrypt and bf salt
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
    WHERE id = target_uid;

    -- Log the action
    INSERT INTO public.admin_activity_logs (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'UPDATE_PASSWORD', target_uid, jsonb_build_object('reason', 'Admin updated password'));

    RETURN true;
END;
$$;

-- 2. RPC: admin_update_user_avatar
-- Bypasses RLS to securely update a user's avatar in public.profiles
CREATE OR REPLACE FUNCTION public.admin_update_user_avatar(target_uid UUID, new_avatar TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Check if the caller is the master admin (ArulPrakash) or has an admin role
    SELECT (name = 'ArulPrakash' OR role = 'admin') INTO is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access Denied: Only admins can perform this action.';
    END IF;

    -- Update the avatar column
    UPDATE public.profiles
    SET avatar = new_avatar
    WHERE id = target_uid;

    -- Log the action
    INSERT INTO public.admin_activity_logs (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'UPDATE_AVATAR', target_uid, jsonb_build_object('new_avatar', new_avatar));

    RETURN true;
END;
$$;
