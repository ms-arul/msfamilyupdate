-- Migration: 021_storage_limits_update.sql
-- Description: Update subscription plans to set max_storage_bytes to 1GB for Free plan and 5GB for Premium plans.

-- Update Free plan (1GB = 1073741824 bytes)
UPDATE public.subscription_plans
SET features = jsonb_set(features, '{max_storage_bytes}', '1073741824'::jsonb)
WHERE id = 'free';

-- Update Personal Premium Monthly (5GB = 5368709120 bytes)
UPDATE public.subscription_plans
SET features = jsonb_set(features, '{max_storage_bytes}', '5368709120'::jsonb)
WHERE id = 'personal_monthly';

-- Update Personal Premium Yearly (5GB = 5368709120 bytes)
UPDATE public.subscription_plans
SET features = jsonb_set(features, '{max_storage_bytes}', '5368709120'::jsonb)
WHERE id = 'personal_yearly';

-- Update Family Premium Monthly (5GB = 5368709120 bytes)
UPDATE public.subscription_plans
SET features = jsonb_set(features, '{max_storage_bytes}', '5368709120'::jsonb)
WHERE id = 'family_monthly';

-- Update Family Premium Yearly (5GB = 5368709120 bytes)
UPDATE public.subscription_plans
SET features = jsonb_set(features, '{max_storage_bytes}', '5368709120'::jsonb)
WHERE id = 'family_yearly';

-- Update older premium configurations just in case
UPDATE public.subscription_plans
SET features = jsonb_set(features, '{max_storage_bytes}', '5368709120'::jsonb)
WHERE id IN ('premium_monthly', 'premium_yearly');
