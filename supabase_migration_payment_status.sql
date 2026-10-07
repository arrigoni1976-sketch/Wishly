-- Migration: aggiunge colonne per la gestione dei pagamenti Stripe
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(200);

-- Tutti gli eventi esistenti rimangono 'active'
CREATE INDEX IF NOT EXISTS events_payment_status_idx ON events(payment_status);
