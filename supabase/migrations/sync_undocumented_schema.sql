-- ─── Sync undocumented schema drift ─────────────────────────────────────────
-- Run this once in the Supabase SQL Editor.
--
-- schema.sql is a snapshot taken at project start; every feature added since
-- then went live as a separate migration file run by hand in the SQL editor.
-- A few columns/tables, though, were added directly via the Supabase Table
-- Editor and never got a matching SQL file at all — so the live database
-- already has them, but nothing in this repo documented them. This migration
-- is purely a documentation catch-up: everything below is guarded with
-- IF NOT EXISTS, so it's a no-op on the live DB (the columns/tables already
-- exist there) and only matters if you ever recreate the database from
-- schema.sql + migrations/*.sql from scratch.

ALTER TABLE events ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS paypal_email text;

ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS adults_count integer NOT NULL DEFAULT 1;
ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS with_partner boolean; -- legacy, superseded by adults_count, kept for old rows

ALTER TABLE user_key_links ADD COLUMN IF NOT EXISTS guest_name text;

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_token UUID        NOT NULL UNIQUE,
  subscription JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
