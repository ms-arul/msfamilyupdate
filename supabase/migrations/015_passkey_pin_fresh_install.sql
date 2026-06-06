-- Supabase Migration: Add Passkey PIN Fresh Install Support
-- Adds encrypted_password column to user_preferences and helper functions for fresh installs

-- 1. Add encrypted_password column to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS encrypted_password text DEFAULT NULL;

COMMENT ON COLUMN public.user_preferences.encrypted_password IS 'Password encrypted client-side using user PIN and local salt, used for fresh install PIN login';

-- 2. Create RPC function to fetch family profiles anonymously (for user selection screen)
CREATE OR REPLACE FUNCTION public.get_family_profiles()
RETURNS TABLE (
  id uuid,
  name text,
  avatar text,
  email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar, u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RPC function to securely verify PIN and return encrypted password for authentication
CREATE OR REPLACE FUNCTION public.get_encrypted_password(p_email text, p_pin_hash text)
RETURNS text AS $$
DECLARE
  v_user_id uuid;
  v_stored_hash text;
  v_encrypted_password text;
BEGIN
  -- Retrieve user ID by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retrieve stored PIN hash and encrypted password from user_preferences
  SELECT passkey_pin_hash, encrypted_password INTO v_stored_hash, v_encrypted_password
  FROM public.user_preferences
  WHERE user_id = v_user_id;
  
  -- If stored PIN matches the entered hash, return the encrypted password
  IF v_stored_hash IS NOT NULL AND v_stored_hash = p_pin_hash THEN
    RETURN v_encrypted_password;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execution rights to public/anonymous roles
GRANT EXECUTE ON FUNCTION public.get_family_profiles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_encrypted_password(text, text) TO anon, authenticated;
