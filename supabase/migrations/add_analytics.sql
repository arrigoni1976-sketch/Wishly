-- Analytics enhancement — June 2026
-- Esegui questo file nel SQL Editor di Supabase

-- link_views: tracciamento dispositivo
ALTER TABLE link_views ADD COLUMN IF NOT EXISTS device_type text; -- 'mobile' | 'tablet' | 'desktop' | 'unknown'
ALTER TABLE link_views ADD COLUMN IF NOT EXISTS os text;           -- 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'other'
ALTER TABLE link_views ADD COLUMN IF NOT EXISTS browser text;      -- 'Safari' | 'Chrome' | 'Firefox' | 'Edge' | 'other'

-- events: fonte di acquisizione
ALTER TABLE events ADD COLUMN IF NOT EXISTS referral_source text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS utm_campaign text;

-- events: latenza (quando arriva il primo segnale di vita)
ALTER TABLE events ADD COLUMN IF NOT EXISTS first_rsvp_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS first_gift_reserved_at timestamptz;

-- Indici utili per le query di analytics
CREATE INDEX IF NOT EXISTS events_utm_source_idx ON events(utm_source);
CREATE INDEX IF NOT EXISTS events_first_rsvp_at_idx ON events(first_rsvp_at);
CREATE INDEX IF NOT EXISTS link_views_device_type_idx ON link_views(device_type);
