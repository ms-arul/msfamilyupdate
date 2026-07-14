-- ============================================================
-- MS FAMILY — EXPAND LANGUAGE CHECK CONSTRAINT
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Drop the existing CHECK constraint on language column
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_language_check;

-- Re-create with all supported languages (including zh-CN, en-IN, etc.) or remove the constraint.
-- To be future-proof, we will allow any text and keep the validation on the application layer,
-- or add a check constraint for all currently supported languages.
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_language_check
  CHECK (language IN ('ta', 'en', 'ar', 'bn', 'zh-CN', 'fr', 'de', 'gu', 'hi', 'ja', 'kn', 'ko', 'ml', 'mr', 'pt', 'pa', 'ru', 'es', 'te'));

-- ============================================================
-- ✅ DONE! The language column now accepts all supported languages.
-- ============================================================
