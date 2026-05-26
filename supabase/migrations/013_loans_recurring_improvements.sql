-- Migration: 013_loans_recurring_improvements.sql
-- Add recurring management and tracking columns to loans table

ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS recurring_cycle_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_due_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_notification_sent DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;

-- Create indexes for faster querying by next_due_date and cycle
CREATE INDEX IF NOT EXISTS idx_loans_recurring_cycle ON public.loans (recurring_cycle_id);
CREATE INDEX IF NOT EXISTS idx_loans_next_due ON public.loans (next_due_date);

COMMENT ON COLUMN public.loans.recurring_cycle_id IS 'Unique identifier to link cycles of a recurring EMI series';
COMMENT ON COLUMN public.loans.next_due_date IS 'Computed next payment due date, adjusted timezone-safely';
COMMENT ON COLUMN public.loans.last_notification_sent IS 'Last date a notification reminder was triggered to prevent duplicates';
COMMENT ON COLUMN public.loans.installment_count IS 'Total count of processed installment cycles';
COMMENT ON COLUMN public.loans.payment_history IS 'JSON log of past installment cycles: cycle name, amount, paid amount, dates, and status';
