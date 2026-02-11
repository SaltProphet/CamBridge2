-- BETA MODE Database Migration Script
-- Idempotent - can be run multiple times safely
-- Adds self-serve creator signup, password auth, and manual payment links

-- ==================================================
-- 1. Add columns to creators table
-- ==================================================
-- plan_status tracks enrollment state (beta/active/suspended)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS plan_status VARCHAR(50) DEFAULT 'beta';

-- Manual payment links for creators
ALTER TABLE creators ADD COLUMN IF NOT EXISTS cashapp_handle VARCHAR(255);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS paypal_link VARCHAR(500);

-- Track paid subscription expiry for future paid plans
ALTER TABLE creators ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;

-- ==================================================
-- 2. Create indexes for new columns
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_creators_plan_status ON creators(plan_status);
CREATE INDEX IF NOT EXISTS idx_creators_paid_until ON creators(paid_until);

-- ==================================================
-- 3. Backfill existing creators with default plan_status (already set in DEFAULT, but explicit for clarity)
-- ==================================================
-- Note: No data migration needed - DEFAULT 'beta' applies to new rows
-- Existing creators retain their current implicit status
