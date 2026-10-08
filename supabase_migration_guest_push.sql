-- Migration: guest_push_subscriptions
-- Run this in Supabase SQL editor before deploying the broadcast feature.

CREATE TABLE IF NOT EXISTS guest_push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_token text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_push_parent_token ON guest_push_subscriptions (parent_token);
