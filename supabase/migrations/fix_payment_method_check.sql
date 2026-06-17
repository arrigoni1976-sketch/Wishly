-- ─── Fix payment_method CHECK constraint ────────────────────────────────────
-- Run this once in the Supabase SQL Editor.
--
-- The original constraint only allowed ('stripe', 'paypal', 'satispay'), but
-- the app has always sent 'contanti' for cash pledges — every cash
-- contribution insert has been violating this constraint. Stripe support has
-- now been removed entirely (dead code, never reachable from the UI), so
-- 'stripe' is dropped from the allowed values.

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'contributions'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%payment_method%'
  LOOP
    EXECUTE format('ALTER TABLE contributions DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE contributions
  ADD CONSTRAINT contributions_payment_method_check
  CHECK (payment_method IN ('contanti', 'paypal', 'satispay'));
