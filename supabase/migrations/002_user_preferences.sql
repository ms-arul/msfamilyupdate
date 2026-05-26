-- ============================================================
-- MS FAMILY — USER PREFERENCES BACKEND
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CREATE user_preferences TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  theme           text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language        text DEFAULT 'en' CHECK (language IN ('en', 'ta')),
  notif_enabled   boolean DEFAULT true,
  notif_sound     boolean DEFAULT true,
  reminder_freq   text DEFAULT 'daily' CHECK (reminder_freq IN ('daily', 'weekly', 'monthly', 'off')),
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE public.user_preferences IS 'User preferences for theme, language, and notification settings';

-- ────────────────────────────────────────────────────────────
-- 2. AUTO-UPDATE updated_at TRIGGER
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_user_preferences_updated ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
CREATE POLICY "user_preferences_select_own"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
DROP POLICY IF EXISTS "user_preferences_insert_own" ON public.user_preferences;
CREATE POLICY "user_preferences_insert_own"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
DROP POLICY IF EXISTS "user_preferences_update_own" ON public.user_preferences;
CREATE POLICY "user_preferences_update_own"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
DROP POLICY IF EXISTS "user_preferences_delete_own" ON public.user_preferences;
CREATE POLICY "user_preferences_delete_own"
  ON public.user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. GRANT ACCESS TO AUTHENTICATED USERS
-- ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. AUTO-CREATE PREFERENCES ON PROFILE CREATION
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_default_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_default_preferences ON public.profiles;
CREATE TRIGGER trg_create_default_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_preferences();

-- ============================================================
-- ✅ DONE! User preferences backend is ready.
--
-- Table created:
--   • user_preferences — stores theme, language, notification prefs
--
-- Security:
--   • RLS enabled — users can only access their own preferences
--   • Auto-created on profile creation via trigger
-- ============================================================
