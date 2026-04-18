-- ==============================================================================
-- 1. Ensure the `profiles` table has a column for the FCM Push Token
-- ==============================================================================
-- We are keeping the name `expo_push_token` so it works seamlessly with your edge function, 
-- but this will hold native Android FCM tokens.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='expo_push_token') THEN 
        ALTER TABLE public.profiles ADD COLUMN expo_push_token TEXT;
    END IF; 
END $$;


-- ==============================================================================
-- 2. Enable pg_net extension (Required to make HTTP calls from Database)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;


-- ==============================================================================
-- 3. Create the function to call your Edge Function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  -- Replace these with your actual Supabase Project URL and Service Role Key
  edge_function_url TEXT := 'https://[YOUR_PROJECT_ID].supabase.co/functions/v1/send-push';
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY';
BEGIN
  -- This will fire an HTTP POST request in the background
  PERFORM extensions.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'data', jsonb_build_object(
        'screen', 'Notifications',
        'notification_id', NEW.id
      )
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 4. Attach the trigger to your `notifications` table
-- ==============================================================================
-- Drop the trigger if it already exists to prevent duplicates
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

-- Create the trigger to fire whenever a new row is inserted
CREATE TRIGGER on_notification_created
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_notification();
