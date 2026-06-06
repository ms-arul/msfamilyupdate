-- Supabase Migration: Add Passkey PIN Login Support
-- Adds a column to user_preferences table and a SECURITY DEFINER function to verify PIN hashes safely

-- 1. Add column to public.user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS passkey_pin_hash text DEFAULT NULL;

COMMENT ON COLUMN public.user_preferences.passkey_pin_hash IS 'SHA-256 hash of the user''s quick login 4-digit PIN';

-- 2. Create the PIN verification function (SECURITY DEFINER to access auth.users safely)
CREATE OR REPLACE FUNCTION public.verify_user_pin(p_email text, p_pin_hash text)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
  v_stored_hash text;
BEGIN
  -- Retrieve user ID by email from auth.users table
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Retrieve stored PIN hash from public.user_preferences table
  SELECT passkey_pin_hash INTO v_stored_hash
  FROM public.user_preferences
  WHERE user_id = v_user_id;
  
  -- Return check comparison
  RETURN (v_stored_hash IS NOT NULL AND v_stored_hash = p_pin_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute rights to public roles
GRANT EXECUTE ON FUNCTION public.verify_user_pin(text, text) TO anon, authenticated;
