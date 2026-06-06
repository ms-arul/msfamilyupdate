-- ============================================================
-- MS FAMILY — ADD 'schedule' TO THEME CHECK CONSTRAINT
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Drop the existing CHECK constraint on theme column
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_theme_check;

-- Re-create with 'schedule' included
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_theme_check
  CHECK (theme IN ('light', 'dark', 'auto', 'schedule'));

-- ============================================================
-- ✅ DONE! The theme column now accepts 'schedule' values.
-- ============================================================
