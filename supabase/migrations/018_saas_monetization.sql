-- ============================================================================
-- Migration: 018_saas_monetization.sql
-- Description: Implement tables, functions, seeds, and RLS for subscription SaaS monetization.
-- ============================================================================

-- ────────────────────────────────────────────────────────────
-- 1. SUBSCRIPTION PLANS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  launch_price NUMERIC,
  interval TEXT NOT NULL CHECK (interval IN ('free', 'month', 'year')),
  features JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Seed initial plans
INSERT INTO public.subscription_plans (id, name, price, launch_price, interval, features)
VALUES
  ('free', 'Free', 0, 0, 'free', '{"max_members": 5, "max_storage_bytes": 524288000, "ai_insights": false, "advanced_analytics": false, "data_export": false}'::jsonb),
  ('premium_monthly', 'Premium Monthly', 19, 19, 'month', '{"max_members": 999, "max_storage_bytes": 107374182400, "ai_insights": true, "advanced_analytics": true, "data_export": true}'::jsonb),
  ('premium_yearly', 'Premium Yearly', 149, 99, 'year', '{"max_members": 999, "max_storage_bytes": 107374182400, "ai_insights": true, "advanced_analytics": true, "data_export": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  launch_price = EXCLUDED.launch_price,
  interval = EXCLUDED.interval,
  features = EXCLUDED.features;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_plans_select_all" ON public.subscription_plans
  FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────
-- 2. COUPON CODES TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  code TEXT PRIMARY KEY,
  purpose TEXT,
  discount_percent NUMERIC NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  applies_to_plan_id TEXT REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  max_redemptions INTEGER,
  redemptions_count INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Seed secret launch coupon
INSERT INTO public.coupon_codes (code, purpose, discount_percent, applies_to_plan_id, max_redemptions, is_active)
VALUES ('OSKVIMALA7686', 'Launch Promotion', 100, 'premium_yearly', NULL, true)
ON CONFLICT (code) DO UPDATE SET
  purpose = EXCLUDED.purpose,
  discount_percent = EXCLUDED.discount_percent,
  applies_to_plan_id = EXCLUDED.applies_to_plan_id,
  is_active = EXCLUDED.is_active;

ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

-- Note: No SELECT policy for general users on coupon_codes to ensure coupon list stays private to backend.
CREATE POLICY "coupon_codes_admin" ON public.coupon_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. SUBSCRIPTIONS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES public.subscription_plans(id) DEFAULT 'free' NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'canceled')),
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false NOT NULL,
  payment_reference TEXT,
  coupon_used TEXT REFERENCES public.coupon_codes(code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_sub_family UNIQUE (family_id),
  CONSTRAINT uq_sub_user UNIQUE (user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own personal subscription, or their family's active subscription
CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    (family_id IS NOT NULL AND public.is_family_member(family_id, auth.uid()))
  );

-- ────────────────────────────────────────────────────────────
-- 4. COUPON REDEMPTIONS TABLE (History)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_code TEXT NOT NULL REFERENCES public.coupon_codes(code) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own redemptions or family's redemptions
CREATE POLICY "coupon_redemptions_select" ON public.coupon_redemptions
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    (family_id IS NOT NULL AND public.is_family_member(family_id, auth.uid()))
  );

-- ────────────────────────────────────────────────────────────
-- 5. PAYMENT HISTORY TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'refunded')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mock', 'stripe', 'razorpay', 'google_play', 'apple_appstore', 'coupon')),
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_history_select" ON public.payment_history
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    (family_id IS NOT NULL AND public.is_family_member(family_id, auth.uid()))
  );

-- ────────────────────────────────────────────────────────────
-- 6. SUBSCRIPTION LOGS TABLE (Audit trail)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.subscription_logs ENABLE ROW LEVEL SECURITY;

-- Admin users can select logs, regular users cannot select
CREATE POLICY "sub_logs_admin_select" ON public.subscription_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. ATOMIC TRANSACTION: REDEEM COUPON CODE (RPC)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.redeem_coupon_code(
  p_coupon_code TEXT,
  p_family_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  r_coupon RECORD;
  v_expires_at TIMESTAMPTZ;
  v_sub_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Fetch & lock coupon record
  SELECT * INTO r_coupon
  FROM public.coupon_codes
  WHERE code = p_coupon_code AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive coupon code.';
  END IF;

  -- Check coupon expiration
  IF r_coupon.expires_at IS NOT NULL AND r_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'This coupon code has expired.';
  END IF;

  -- Check max redemptions limit
  IF r_coupon.max_redemptions IS NOT NULL AND r_coupon.redemptions_count >= r_coupon.max_redemptions THEN
    RAISE EXCEPTION 'This coupon code is fully redeemed.';
  END IF;

  -- Check if user/family has already redeemed this coupon
  IF p_family_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.coupon_redemptions
      WHERE coupon_code = p_coupon_code AND family_id = p_family_id
    ) THEN
      RAISE EXCEPTION 'Coupon already redeemed for this family.';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.coupon_redemptions
      WHERE coupon_code = p_coupon_code AND user_id = p_user_id AND family_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Coupon already redeemed for this account.';
    END IF;
  END IF;

  -- 2. Determine expiration time (for Premium Yearly, add 1 year)
  IF r_coupon.applies_to_plan_id = 'premium_yearly' THEN
    v_expires_at := now() + INTERVAL '1 year';
  ELSE
    v_expires_at := now() + INTERVAL '1 month';
  END IF;

  -- 3. Upsert subscription record
  IF p_family_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      family_id, plan_id, status, started_at, expires_at, auto_renew, coupon_used
    )
    VALUES (
      p_family_id, r_coupon.applies_to_plan_id, 'active', now(), v_expires_at, false, p_coupon_code
    )
    ON CONFLICT (family_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      started_at = EXCLUDED.started_at,
      expires_at = EXCLUDED.expires_at,
      auto_renew = EXCLUDED.auto_renew,
      coupon_used = EXCLUDED.coupon_used,
      updated_at = now()
    RETURNING id INTO v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (
      user_id, plan_id, status, started_at, expires_at, auto_renew, coupon_used
    )
    VALUES (
      p_user_id, r_coupon.applies_to_plan_id, 'active', now(), v_expires_at, false, p_coupon_code
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      started_at = EXCLUDED.started_at,
      expires_at = EXCLUDED.expires_at,
      auto_renew = EXCLUDED.auto_renew,
      coupon_used = EXCLUDED.coupon_used,
      updated_at = now()
    RETURNING id INTO v_sub_id;
  END IF;

  -- 4. Record coupon usage history
  INSERT INTO public.coupon_redemptions (coupon_code, user_id, family_id, redeemed_at)
  VALUES (p_coupon_code, p_user_id, p_family_id, now());

  -- 5. Record payment history
  INSERT INTO public.payment_history (
    user_id, family_id, subscription_id, plan_id, amount, status, payment_method, payment_reference
  )
  VALUES (
    p_user_id, p_family_id, v_sub_id, r_coupon.applies_to_plan_id, 0, 'success', 'coupon', 'Redeemed: ' || p_coupon_code
  );

  -- 6. Log subscription event
  INSERT INTO public.subscription_logs (subscription_id, user_id, family_id, action, details)
  VALUES (
    v_sub_id, p_user_id, p_family_id, 'coupon_redeemed',
    jsonb_build_object('coupon_code', p_coupon_code, 'plan_id', r_coupon.applies_to_plan_id, 'expires_at', v_expires_at)
  );

  -- 7. Increment redemptions count
  UPDATE public.coupon_codes
  SET redemptions_count = redemptions_count + 1
  WHERE code = p_coupon_code;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Coupon redeemed successfully!',
    'plan_id', r_coupon.applies_to_plan_id,
    'expires_at', to_json(v_expires_at)
  );
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.redeem_coupon_code(TEXT, UUID, UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 8. ATOMIC TRANSACTION: SUBSCRIBE TO PLAN (MOCK OR REAL PAYMENT)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.subscribe_to_plan(
  p_plan_id TEXT,
  p_payment_method TEXT,
  p_payment_ref TEXT,
  p_family_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  r_plan RECORD;
  v_expires_at TIMESTAMPTZ;
  v_sub_id UUID;
  v_amount NUMERIC;
BEGIN
  -- 1. Fetch plan details
  SELECT * INTO r_plan
  FROM public.subscription_plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan not found.';
  END IF;

  -- Determine cost (use launch offer price if available)
  IF r_plan.launch_price IS NOT NULL THEN
    v_amount := r_plan.launch_price;
  ELSE
    v_amount := r_plan.price;
  END IF;

  -- 2. Determine expiration time
  IF r_plan.interval = 'year' THEN
    v_expires_at := now() + INTERVAL '1 year';
  ELSIF r_plan.interval = 'month' THEN
    v_expires_at := now() + INTERVAL '1 month';
  ELSE
    v_expires_at := NULL; -- Free plan
  END IF;

  -- 3. Upsert subscription record
  IF p_family_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      family_id, plan_id, status, started_at, expires_at, auto_renew, payment_reference
    )
    VALUES (
      p_family_id, p_plan_id, 'active', now(), v_expires_at, true, p_payment_ref
    )
    ON CONFLICT (family_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      started_at = EXCLUDED.started_at,
      expires_at = EXCLUDED.expires_at,
      auto_renew = EXCLUDED.auto_renew,
      payment_reference = EXCLUDED.payment_reference,
      coupon_used = NULL,
      updated_at = now()
    RETURNING id INTO v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (
      user_id, plan_id, status, started_at, expires_at, auto_renew, payment_reference
    )
    VALUES (
      p_user_id, p_plan_id, 'active', now(), v_expires_at, true, p_payment_ref
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      started_at = EXCLUDED.started_at,
      expires_at = EXCLUDED.expires_at,
      auto_renew = EXCLUDED.auto_renew,
      payment_reference = EXCLUDED.payment_reference,
      coupon_used = NULL,
      updated_at = now()
    RETURNING id INTO v_sub_id;
  END IF;

  -- 4. Record payment history
  INSERT INTO public.payment_history (
    user_id, family_id, subscription_id, plan_id, amount, status, payment_method, payment_reference
  )
  VALUES (
    p_user_id, p_family_id, v_sub_id, p_plan_id, v_amount, 'success', p_payment_method, p_payment_ref
  );

  -- 5. Log subscription event
  INSERT INTO public.subscription_logs (subscription_id, user_id, family_id, action, details)
  VALUES (
    v_sub_id, p_user_id, p_family_id, 'subscribed',
    jsonb_build_object('plan_id', p_plan_id, 'amount', v_amount, 'expires_at', v_expires_at, 'payment_method', p_payment_method)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription activated successfully!',
    'plan_id', p_plan_id,
    'expires_at', to_json(v_expires_at)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.subscribe_to_plan(TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 9. ENABLE REALTIME SUBSCRIPTION FOR MONETIZATION
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;
END $$;
