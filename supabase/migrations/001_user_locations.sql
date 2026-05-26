-- ============================================================
-- MS FAMILY — LIVE TRACKING & CALL BACKEND
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. ENSURE PROFILES TABLE HAS REQUIRED COLUMNS
-- ────────────────────────────────────────────────────────────
-- Add 'name' column if missing (safe — does nothing if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN name text;
  END IF;
END $$;

-- Add 'phone' column for future call features
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;
END $$;

-- Add 'avatar_url' column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 1. DROP & RECREATE user_locations TABLE
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.user_locations CASCADE;

CREATE TABLE public.user_locations (
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  battery_level integer DEFAULT 100 CHECK (battery_level >= 0 AND battery_level <= 100),
  is_sharing  boolean DEFAULT true,
  accuracy    double precision,                    -- GPS accuracy in meters
  speed       double precision,                    -- Speed in m/s (from device)
  heading     double precision,                    -- Compass heading 0-360
  altitude    double precision,                    -- Altitude in meters
  updated_at  timestamptz DEFAULT now() NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Comment for documentation
COMMENT ON TABLE public.user_locations IS 'Real-time location data for family tracking';

-- ────────────────────────────────────────────────────────────
-- 2. INDEXES FOR FAST QUERIES
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_user_locations_updated ON public.user_locations (updated_at DESC);
CREATE INDEX idx_user_locations_sharing ON public.user_locations (is_sharing) WHERE is_sharing = true;

-- ────────────────────────────────────────────────────────────
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_locations_updated ON public.user_locations;
CREATE TRIGGER trg_user_locations_updated
  BEFORE UPDATE ON public.user_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Users can INSERT their own location
CREATE POLICY "user_locations_insert_own"
  ON public.user_locations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own location
CREATE POLICY "user_locations_update_own"
  ON public.user_locations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can DELETE their own location
CREATE POLICY "user_locations_delete_own"
  ON public.user_locations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Any authenticated user can VIEW all locations (family visibility)
CREATE POLICY "user_locations_select_authenticated"
  ON public.user_locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
-- 5. ENABLE REALTIME
-- ────────────────────────────────────────────────────────────
-- Safely add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 6. CALL HISTORY TABLE (for call logs)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.call_history (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status      text DEFAULT 'missed' CHECK (status IN ('missed', 'answered', 'declined', 'failed')),
  duration    integer DEFAULT 0,                   -- Duration in seconds
  started_at  timestamptz DEFAULT now() NOT NULL,
  ended_at    timestamptz
);

COMMENT ON TABLE public.call_history IS 'Logs of in-app voice calls between family members';

CREATE INDEX IF NOT EXISTS idx_call_history_caller ON public.call_history (caller_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_receiver ON public.call_history (receiver_id, started_at DESC);

-- RLS for call_history
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_history_insert" ON public.call_history;
CREATE POLICY "call_history_insert"
  ON public.call_history
  FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "call_history_update_own" ON public.call_history;
CREATE POLICY "call_history_update_own"
  ON public.call_history
  FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "call_history_select_own" ON public.call_history;
CREATE POLICY "call_history_select_own"
  ON public.call_history
  FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Realtime for call_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'call_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 7. STALE LOCATION CLEANUP FUNCTION
-- ────────────────────────────────────────────────────────────
-- Call via: SELECT cleanup_stale_locations();
-- Or set up a Supabase cron job to run daily
CREATE OR REPLACE FUNCTION public.cleanup_stale_locations()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.user_locations
  WHERE updated_at < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 8. HELPER: GET NEARBY FAMILY MEMBERS (within radius km)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_nearby_family(
  my_lat double precision,
  my_lng double precision,
  radius_km double precision DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  name text,
  latitude double precision,
  longitude double precision,
  battery_level integer,
  distance_km double precision,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.user_id,
    p.name,
    ul.latitude,
    ul.longitude,
    ul.battery_level,
    ROUND(
      (6371 * acos(
        cos(radians(my_lat)) * cos(radians(ul.latitude)) *
        cos(radians(ul.longitude) - radians(my_lng)) +
        sin(radians(my_lat)) * sin(radians(ul.latitude))
      ))::numeric, 2
    )::double precision AS distance_km,
    ul.updated_at
  FROM public.user_locations ul
  JOIN public.profiles p ON p.id = ul.user_id
  WHERE ul.user_id != auth.uid()
    AND ul.is_sharing = true
    AND ul.updated_at > now() - INTERVAL '1 hour'
  HAVING (6371 * acos(
    cos(radians(my_lat)) * cos(radians(ul.latitude)) *
    cos(radians(ul.longitude) - radians(my_lng)) +
    sin(radians(my_lat)) * sin(radians(ul.latitude))
  )) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 9. GRANT ACCESS TO AUTHENTICATED USERS
-- ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_locations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_family(double precision, double precision, double precision) TO authenticated;

-- ============================================================
-- ✅ DONE! Your backend is ready.
-- 
-- Tables created:
--   • user_locations  — real-time family location tracking
--   • call_history    — voice call logs
--
-- Functions created:
--   • cleanup_stale_locations()  — removes 7+ day old entries
--   • get_nearby_family(lat, lng, radius_km)  — find nearby members
--
-- Security:
--   • RLS enabled on all tables
--   • Users can only modify their own data
--   • All authenticated users can view family data
--   • Realtime enabled for live updates
-- ============================================================
