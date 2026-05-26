-- Migration: 008_loan_pending_tracking.sql
-- Add paid_amount column to track partial payments and pending balances

ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

-- Optional: Add a check constraint to ensure paid_amount doesn't exceed the total amount
-- ALTER TABLE public.loans ADD CONSTRAINT loans_paid_amount_check CHECK (paid_amount <= amount);

COMMENT ON COLUMN public.loans.paid_amount IS 'Amount already paid back for this loan or debt';
