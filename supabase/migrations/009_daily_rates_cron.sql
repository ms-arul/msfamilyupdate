-- 009_daily_rates_cron.sql
-- Enables pg_cron and schedules the daily-rates-push Edge Function

-- 1. Ensure required extensions are active
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the cron job
-- '30 4 * * *' corresponds to 4:30 AM UTC, which is 10:00 AM IST.
-- IMPORTANT: Before running this migration in production, 
-- replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your actual Supabase credentials.

SELECT cron.schedule(
  'invoke-daily-rates-push',
  '30 4 * * *',
  $$
  SELECT net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-rates-push',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) as request_id;
  $$
);
