-- Add fixed quota per person to collective gift
ALTER TABLE events ADD COLUMN IF NOT EXISTS collective_fixed_quota NUMERIC(10,2);
