-- Aggiunge la colonna owner_id alla tabella events
-- Collega ogni evento all'utente Supabase Auth che lo ha creato

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS events_owner_id_idx ON events(owner_id);
