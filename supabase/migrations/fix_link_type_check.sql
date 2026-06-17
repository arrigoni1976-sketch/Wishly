-- ─── Fix link_type CHECK constraint ──────────────────────────────────────────
-- Run this once in the Supabase SQL Editor.
--
-- The original constraint only allowed ('event', 'invite'), but
-- CollectiveGiftPage calls addUserKeyLink with linkType: 'collective' to let
-- guests recover their contributions on another device — every such call has
-- been silently failing (error swallowed by .catch(() => {})), so this
-- recovery path has never actually worked.

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT con.conname INTO con_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'user_key_links'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%link_type%'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_key_links DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE user_key_links
  ADD CONSTRAINT user_key_links_link_type_check
  CHECK (link_type IN ('event', 'invite', 'collective'));
