-- Migration 012: SMS Transaction Deduplication
-- 
-- Adds a unique database index to prevent duplicate transaction entries 
-- from concurrent native background synchronization and frontend actions.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_sms_ref_unique ON transactions (sms_reference) WHERE sms_reference IS NOT NULL;
