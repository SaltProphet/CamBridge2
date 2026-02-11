-- Phase 1 Database Migration Script
-- Idempotent - can be run multiple times safely
-- Adds magic-link auth, creator system, join requests, and bans

-- ==================================================
-- 1. Extend existing users table
-- ==================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'client';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_attested_at TIMESTAMPTZ;

-- ==================================================
-- 2. New login_tokens table (for magic links)
-- ==================================================
CREATE TABLE IF NOT EXISTS login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_tokens_email ON login_tokens(email);
CREATE INDEX IF NOT EXISTS idx_login_tokens_token_hash ON login_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_login_tokens_expires_at ON login_tokens(expires_at);

-- ==================================================
-- 3. New creators table
-- ==================================================
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200),
  plan VARCHAR(50) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active',
  referral_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creators_slug ON creators(slug);
CREATE INDEX IF NOT EXISTS idx_creators_user_id ON creators(user_id);
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);

-- ==================================================
-- 4. Extend existing rooms table
-- ==================================================
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_slug VARCHAR(100);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) DEFAULT 'public';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS join_mode VARCHAR(20) DEFAULT 'knock';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_participants INTEGER;

CREATE INDEX IF NOT EXISTS idx_rooms_creator_id ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_slug ON rooms(room_slug);

-- ==================================================
-- 5. New join_requests table
-- ==================================================
CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  daily_token VARCHAR(500),
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMPTZ,
  decision_reason VARCHAR(500),
  ip_hash VARCHAR(255),
  device_hash VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_creator_id ON join_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_created_at ON join_requests(created_at);

-- ==================================================
-- 6. New bans table
-- ==================================================
CREATE TABLE IF NOT EXISTS bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_hash VARCHAR(255),
  device_hash VARCHAR(255),
  reason VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_bans_creator_id ON bans(creator_id);
CREATE INDEX IF NOT EXISTS idx_bans_user_id ON bans(user_id);
CREATE INDEX IF NOT EXISTS idx_bans_email ON bans(email);
CREATE INDEX IF NOT EXISTS idx_bans_active ON bans(active);

-- ==================================================
-- Migration complete
-- ==================================================
