-- 1. Create the notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('alert', 'success', 'info', 'warning')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Turn on Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies so users can only access their own notifications

-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own notifications (useful for frontend test triggers or triggers)
CREATE POLICY "Users can insert their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own notifications (to mark as read)
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own notifications (Clearing notifications)
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Enable real-time for this table (optional, but good for instant updates)
alter publication supabase_realtime add table public.notifications;

-- 5. Insert some sample data (optional, just for testing. Change the user_id to your actual auth uid if you test from the dashboard)
-- INSERT INTO public.notifications (user_id, type, title, message)
-- VALUES 
--  ('YOUR_AUTH_UID_HERE', 'alert', 'High Expenditure Alert', 'Your family spending on Food & Dining exceeded 80% of the usual budget this week.'),
--  ('YOUR_AUTH_UID_HERE', 'success', 'Salary Credited', '+₹85,000 has been credited to your primary account.'),
--  ('YOUR_AUTH_UID_HERE', 'info', 'Weekly Summary Ready', 'Your family saved 15% more than last week. Tap to view detailed analytics.');
