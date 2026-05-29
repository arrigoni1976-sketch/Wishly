-- Aggiunge il campo genere alla tabella events
ALTER TABLE events ADD COLUMN IF NOT EXISTS gender VARCHAR(1);
