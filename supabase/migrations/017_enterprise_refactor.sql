-- ============================================================================
-- Migration: 017_enterprise_refactor.sql
-- Description: Enterprise architecture refactoring
--   - Adds family_id to transactions and user_locations
--   - Creates transaction_audit_log for edit history
--   - Creates notification_preferences for smart notifications
--   - Updates RLS policies for family-scoped security
--   - Backfills existing data
-- ============================================================================

-- ────────────────────────────────────────────────────────────
-- 1. ADD family_id TO TRANSACTIONS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_transactions_family_id ON public.transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON public.transactions(family_id, date DESC);

-- ────────────────────────────────────────────────────────────
-- 2. ADD family_id TO USER_LOCATIONS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_locations
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_locations_family ON public.user_locations(family_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_family_sharing ON public.user_locations(family_id, is_sharing)
  WHERE is_sharing = true;

-- ────────────────────────────────────────────────────────────
-- 3. TRANSACTION AUDIT LOG
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'receipt_replaced')),
  changes JSONB DEFAULT '{}',
  previous_values JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_transaction ON public.transaction_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.transaction_audit_log(created_at DESC);

ALTER TABLE public.transaction_audit_log ENABLE ROW LEVEL SECURITY;

-- Members of the same family can view audit logs for their family's transactions
CREATE POLICY "audit_log_select_family" ON public.transaction_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.family_members fm ON fm.family_id = t.family_id
      WHERE t.id = transaction_audit_log.transaction_id
        AND fm.user_id = auth.uid()
    )
  );

-- Only authenticated users can insert audit logs
CREATE POLICY "audit_log_insert" ON public.transaction_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
-- 4. NOTIFICATION PREFERENCES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  expenses_enabled BOOLEAN DEFAULT true,
  income_enabled BOOLEAN DEFAULT true,
  reminders_enabled BOOLEAN DEFAULT true,
  storage_alerts_enabled BOOLEAN DEFAULT true,
  ai_insights_enabled BOOLEAN DEFAULT true,
  family_activity_enabled BOOLEAN DEFAULT true,
  location_updates_enabled BOOLEAN DEFAULT true,
  system_enabled BOOLEAN DEFAULT true,
  daily_summary_enabled BOOLEAN DEFAULT true,
  daily_summary_hour INTEGER DEFAULT 19 CHECK (daily_summary_hour >= 0 AND daily_summary_hour <= 23),
  dnd_start_hour INTEGER DEFAULT 23 CHECK (dnd_start_hour >= 0 AND dnd_start_hour <= 23),
  dnd_end_hour INTEGER DEFAULT 7 CHECK (dnd_end_hour >= 0 AND dnd_end_hour <= 23),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_own" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. HELPER FUNCTION: Get user's current family ID
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_family_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  fid UUID;
BEGIN
  SELECT family_id INTO fid
  FROM public.family_members
  WHERE user_id = p_user_id
  LIMIT 1;
  RETURN fid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_family_id(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 6. AUTO-SET family_id ON TRANSACTION INSERT (trigger)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_set_transaction_family_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If family_id not provided, look it up from the member's family
  IF NEW.family_id IS NULL THEN
    SELECT family_id INTO NEW.family_id
    FROM public.family_members
    WHERE user_id = NEW.member_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_set_tx_family ON public.transactions;
CREATE TRIGGER trg_auto_set_tx_family
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_transaction_family_id();

-- ────────────────────────────────────────────────────────────
-- 7. AUTO-UPDATE updated_at ON TRANSACTION UPDATE
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tx_updated_at ON public.transactions;
CREATE TRIGGER trg_tx_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transaction_updated_at();

-- ────────────────────────────────────────────────────────────
-- 8. UPDATE RLS ON TRANSACTIONS — Family-scoped
-- ────────────────────────────────────────────────────────────
-- Drop existing permissive policies if they exist
DO $$
BEGIN
  -- Try to drop policies that may exist (silently fail if they don't)
  BEGIN DROP POLICY IF EXISTS "transactions_select" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "transactions_insert" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "transactions_update" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "transactions_delete" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Enable read access for all users" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- SELECT: Family members can view all family transactions
CREATE POLICY "tx_select_family" ON public.transactions
  FOR SELECT USING (
    family_id IS NULL AND member_id = auth.uid()
    OR
    public.is_family_member(family_id, auth.uid())
  );

-- INSERT: Authenticated users can insert (family_id auto-set by trigger)
CREATE POLICY "tx_insert_auth" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only the transaction creator or a family admin can update
CREATE POLICY "tx_update_owner_or_admin" ON public.transactions
  FOR UPDATE USING (
    member_id = auth.uid()
    OR
    (family_id IS NOT NULL AND public.is_family_admin(family_id, auth.uid()))
  );

-- DELETE: Only the transaction creator or a family admin can delete
CREATE POLICY "tx_delete_owner_or_admin" ON public.transactions
  FOR DELETE USING (
    member_id = auth.uid()
    OR
    (family_id IS NOT NULL AND public.is_family_admin(family_id, auth.uid()))
  );

-- ────────────────────────────────────────────────────────────
-- 9. UPDATE RLS ON USER_LOCATIONS — Family-scoped
-- ────────────────────────────────────────────────────────────
-- Drop the old permissive select policy
DROP POLICY IF EXISTS "user_locations_select_authenticated" ON public.user_locations;

-- New: Only family members can view each other's locations
CREATE POLICY "user_locations_select_family" ON public.user_locations
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    (family_id IS NOT NULL AND public.is_family_member(family_id, auth.uid()))
  );

-- ────────────────────────────────────────────────────────────
-- 10. BACKFILL family_id FOR EXISTING DATA
-- ────────────────────────────────────────────────────────────
-- Set family_id on existing transactions based on member's current family
UPDATE public.transactions t
SET family_id = fm.family_id
FROM public.family_members fm
WHERE t.member_id = fm.user_id
  AND t.family_id IS NULL;

-- Set family_id on existing user_locations based on user's current family
UPDATE public.user_locations ul
SET family_id = fm.family_id
FROM public.family_members fm
WHERE ul.user_id = fm.user_id
  AND ul.family_id IS NULL;

-- ────────────────────────────────────────────────────────────
-- 11. ENABLE REALTIME ON NEW TABLES
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'transaction_audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_audit_log;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 12. GRANTS
-- ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.transaction_audit_log TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;

-- ============================================================================
-- ✅ Migration complete.
-- Changes:
--   • transactions: +family_id, +updated_at, +edited_by, +edit_count
--   • user_locations: +family_id
--   • NEW table: transaction_audit_log (edit history)
--   • NEW table: notification_preferences (per-user notification settings)
--   • NEW function: get_user_family_id(user_id)
--   • NEW trigger: auto_set_transaction_family_id (auto-fills family_id)
--   • Updated RLS: transactions scoped by family
--   • Updated RLS: user_locations scoped by family
--   • Backfilled existing data with family_id
-- ============================================================================
