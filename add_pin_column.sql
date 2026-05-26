-- Add is_pinned column to my_proofs table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

ALTER TABLE my_proofs
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create an index for faster pinned-first sorting
CREATE INDEX IF NOT EXISTS idx_my_proofs_pinned ON my_proofs (user_id, is_pinned DESC, created_at DESC);

-- Add recurring_day column to loans table (for monthly EMI reminders)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS recurring_day INTEGER DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN loans.recurring_day IS 'Day of the month (1-31) for recurring monthly EMI reminders';

-- Add recurring_week_day column to loans table (for weekly reminders)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS recurring_week_day VARCHAR DEFAULT NULL;
