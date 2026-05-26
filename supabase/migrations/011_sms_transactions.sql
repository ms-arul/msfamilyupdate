-- ============================================================================
-- Migration 011: SMS Transaction Reader Support
-- 
-- Adds source tracking to transactions table for SMS-detected entries
-- No separate staging table needed since transactions auto-add directly
-- ============================================================================

-- Add source column to existing transactions table
-- 'manual' = user-entered, 'sms' = auto-detected from bank SMS
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';

-- Add bank metadata for SMS-sourced transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(200);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sms_confidence DECIMAL(3,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sms_reference VARCHAR(100);

-- Index for filtering SMS transactions
CREATE INDEX IF NOT EXISTS idx_tx_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_tx_bank ON transactions(bank_name) WHERE bank_name IS NOT NULL;
