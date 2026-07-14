-- Migration: 019_dual_subscriptions.sql
-- Description: Seed new subscription plans and update subscribe_to_plan and check_family_member_limit functions.

-- 1. Insert new plans into subscription_plans
INSERT INTO public.subscription_plans (id, name, price, launch_price, interval, features)
VALUES
  ('personal_monthly', 'Personal Premium Monthly', 9, 9, 'month', '{"max_members": 1, "max_storage_bytes": 107374182400, "ai_insights": true, "advanced_analytics": true, "data_export": true}'::jsonb),
  ('personal_yearly', 'Personal Premium Yearly', 99, 99, 'year', '{"max_members": 1, "max_storage_bytes": 107374182400, "ai_insights": true, "advanced_analytics": true, "data_export": true}'::jsonb),
  ('family_monthly', 'Family Premium Monthly', 29, 29, 'month', '{"max_members": 5, "max_storage_bytes": 107374182400, "ai_insights": true, "advanced_analytics": true, "data_export": true}'::jsonb),
  ('family_yearly', 'Family Premium Yearly', 299, 299, 'year', '{"max_members": 5, "max_storage_bytes": 107374182400, "ai_insights": true, "advanced_analytics": true, "data_export": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  launch_price = EXCLUDED.launch_price,
  interval = EXCLUDED.interval,
  features = EXCLUDED.features;

-- 2. Trigger function to enforce the 5-member limit on family_members
CREATE OR REPLACE FUNCTION public.check_family_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.family_members
  WHERE family_id = NEW.family_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Family member limit reached (maximum 5 members allowed).';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_family_member_limit ON public.family_members;
CREATE TRIGGER tr_check_family_member_limit
  BEFORE INSERT ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_family_member_limit();

-- 3. Update subscribe_to_plan function
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

  -- Determine cost
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

  -- 3. Upsert subscription record based on plan type
  IF p_plan_id IN ('family_monthly', 'family_yearly') THEN
    IF p_family_id IS NULL THEN
      RAISE EXCEPTION 'Family ID is required for a Family Premium subscription.';
    END IF;

    -- Verify that p_user_id is an admin of the family
    IF NOT EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_id = p_family_id AND user_id = p_user_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only the Family Owner/Admin can purchase or manage Family Premium.';
    END IF;

    -- Delete any personal subscription the user might have to keep it clean (seamless upgrade)
    DELETE FROM public.subscriptions WHERE user_id = p_user_id;

    INSERT INTO public.subscriptions (
      family_id, user_id, plan_id, status, started_at, expires_at, auto_renew, payment_reference
    )
    VALUES (
      p_family_id, NULL, p_plan_id, 'active', now(), v_expires_at, true, p_payment_ref
    )
    ON CONFLICT (family_id) DO UPDATE SET
      user_id = NULL,
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
    -- Personal plans or other non-family plans
    INSERT INTO public.subscriptions (
      user_id, family_id, plan_id, status, started_at, expires_at, auto_renew, payment_reference
    )
    VALUES (
      p_user_id, NULL, p_plan_id, 'active', now(), v_expires_at, true, p_payment_ref
    )
    ON CONFLICT (user_id) DO UPDATE SET
      family_id = NULL,
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

-- 4. Update redeem_coupon_code function
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
  IF r_coupon.applies_to_plan_id IN ('family_monthly', 'family_yearly') THEN
    IF p_family_id IS NULL THEN
      RAISE EXCEPTION 'Family ID is required for a Family Premium coupon.';
    END IF;
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

  -- 2. Determine expiration time
  IF r_coupon.applies_to_plan_id IN ('personal_yearly', 'family_yearly', 'premium_yearly') THEN
    v_expires_at := now() + INTERVAL '1 year';
  ELSE
    v_expires_at := now() + INTERVAL '1 month';
  END IF;

  -- 3. Upsert subscription record based on plan type
  IF r_coupon.applies_to_plan_id IN ('family_monthly', 'family_yearly') THEN
    IF p_family_id IS NULL THEN
      RAISE EXCEPTION 'Family ID is required for a Family Premium coupon.';
    END IF;

    -- Verify that p_user_id is an admin of the family
    IF NOT EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_id = p_family_id AND user_id = p_user_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only the Family Owner/Admin can redeem Family Premium coupons.';
    END IF;

    -- Delete any personal subscription the user might have to keep it clean (seamless upgrade)
    DELETE FROM public.subscriptions WHERE user_id = p_user_id;

    INSERT INTO public.subscriptions (
      family_id, user_id, plan_id, status, started_at, expires_at, auto_renew, coupon_used
    )
    VALUES (
      p_family_id, NULL, r_coupon.applies_to_plan_id, 'active', now(), v_expires_at, false, p_coupon_code
    )
    ON CONFLICT (family_id) DO UPDATE SET
      user_id = NULL,
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
      user_id, family_id, plan_id, status, started_at, expires_at, auto_renew, coupon_used
    )
    VALUES (
      p_user_id, NULL, r_coupon.applies_to_plan_id, 'active', now(), v_expires_at, false, p_coupon_code
    )
    ON CONFLICT (user_id) DO UPDATE SET
      family_id = NULL,
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
