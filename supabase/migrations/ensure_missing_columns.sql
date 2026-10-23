-- ─── Ensure all columns used by the app are present ─────────────────────────
-- Safe to run multiple times (IF NOT EXISTS / DO $$ guards).
-- Run once in the Supabase SQL Editor.

-- rsvp: parent_name (genitore dell'ospite)
ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS parent_name text;

-- rsvp: idempotency_key (evita duplicati su retry di rete)
ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS idempotency_key uuid;

-- rsvp: adults_count + with_partner (già nel sync_undocumented_schema ma ripetiamo per sicurezza)
ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS adults_count integer NOT NULL DEFAULT 1;
ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS with_partner boolean;

-- rsvp: updated_at (usato dagli UPDATE RSVP)
ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Unique index case-insensitive su guest_name (se non esiste già)
CREATE UNIQUE INDEX IF NOT EXISTS rsvp_event_guest_name_lower_idx
  ON rsvp(event_id, lower(guest_name));

-- Unique index su idempotency_key (se non esiste già)
CREATE UNIQUE INDEX IF NOT EXISTS rsvp_event_idempotency_key_idx
  ON rsvp(event_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- contributions: idempotency_key + edit_token (se non esistono già)
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS edit_token uuid;

CREATE UNIQUE INDEX IF NOT EXISTS contributions_event_idempotency_key_idx
  ON contributions(event_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
