-- ─── User keys system ────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_keys (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value   TEXT        UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_key_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key    TEXT        NOT NULL,
  link_type   TEXT        NOT NULL CHECK (link_type IN ('event', 'invite')),
  token       TEXT        NOT NULL,
  child_name  TEXT,
  party_date  DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_key, token)
);

CREATE INDEX IF NOT EXISTS idx_ukl_key ON user_key_links(user_key);
