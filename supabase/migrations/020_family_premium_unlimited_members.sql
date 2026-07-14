-- Migration: 020_family_premium_unlimited_members.sql
-- Description: Update check_family_member_limit function to allow unlimited members under Family Premium plans.

CREATE OR REPLACE FUNCTION public.check_family_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
BEGIN
  -- Check if family has active Family Premium subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE family_id = NEW.family_id
      AND plan_id IN ('family_monthly', 'family_yearly')
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_is_premium;

  IF NOT v_is_premium THEN
    -- Limit family members to 5 for Free families
    SELECT COUNT(*) INTO v_count
    FROM public.family_members
    WHERE family_id = NEW.family_id;

    IF v_count >= 5 THEN
      RAISE EXCEPTION 'Family member limit reached (maximum 5 members allowed on Free plan). Please upgrade to Family Premium for unlimited members.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
