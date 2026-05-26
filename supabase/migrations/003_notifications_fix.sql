-- ============================================================
-- MS FAMILY — NOTIFICATIONS FIX (FORCE CLEANUP)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. DROP FAULTY WEBHOOK TRIGGERS
-- The error is caused by a broken webhook trigger on the notifications table 
-- that is trying to use the missing http_post function. 
-- Since native push notifications are disabled in your app, we can safely remove it.
DO $$
DECLARE
    trg RECORD;
BEGIN
    -- Loop through all triggers on the notifications table
    FOR trg IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'notifications' 
          AND trigger_schema = 'public'
    LOOP
        -- Dynamically drop each trigger
        EXECUTE 'DROP TRIGGER IF EXISTS "' || trg.trigger_name || '" ON public.notifications CASCADE';
    END LOOP;
END
$$;

-- 2. ENSURE TABLE AND SCHEMA ARE CORRECT
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. ENSURE RLS POLICIES ARE SET
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- 4. ENABLE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 5. RELOAD SCHEMA CACHE
-- This fixes the "404 Not Found" error by forcing the API to recognize the notifications table changes
NOTIFY pgrst, 'reload schema';
