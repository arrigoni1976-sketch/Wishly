-- ============================================================
-- Wishly — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── EVENTS ──────────────────────────────────────────────────────────────────

create table if not exists events (
  id                    uuid primary key default uuid_generate_v4(),
  created_at            timestamptz not null default now(),

  -- Party info
  child_name            text not null,
  birth_date            date,
  party_date            date not null,
  party_time            time,
  location              text,
  notes                 text,

  -- Access tokens
  parent_email          text not null,
  parent_token          uuid not null unique,
  guest_token           uuid not null unique,
  collective_token      uuid not null unique,

  -- Closing
  closing_date          date,
  reminder_sent         boolean not null default false,
  summary_sent          boolean not null default false,

  -- Collective gift
  collective_enabled    boolean not null default false,
  collective_goal       numeric(10,2),
  collective_description text,
  collective_amount     numeric(10,2) not null default 0
);

-- ─── GIFTS ───────────────────────────────────────────────────────────────────

create table if not exists gifts (
  id                uuid primary key default uuid_generate_v4(),
  created_at        timestamptz not null default now(),
  event_id          uuid not null references events(id) on delete cascade,

  name              text not null,
  description       text,
  price             numeric(10,2),
  amazon_url        text,
  store_url         text,
  sort_order        integer not null default 0,

  -- Reservation
  reserved_by       text,
  reserved_partner  text,
  purchased_offline boolean not null default false,
  reserved_at       timestamptz
);

create index if not exists gifts_event_id_idx on gifts(event_id);
create index if not exists gifts_sort_order_idx on gifts(event_id, sort_order);

-- ─── RSVP ────────────────────────────────────────────────────────────────────

create table if not exists rsvp (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  event_id        uuid not null references events(id) on delete cascade,

  guest_name      text not null,
  guest_email     text,
  status          text not null check (status in ('yes', 'maybe', 'no')),
  children_count  integer not null default 0,

  unique (event_id, guest_name)
);

create index if not exists rsvp_event_id_idx on rsvp(event_id);

-- ─── LINK VIEWS ──────────────────────────────────────────────────────────────

create table if not exists link_views (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now(),
  event_id        uuid not null references events(id) on delete cascade,

  guest_name      text,
  view_count      integer not null default 1
);

create index if not exists link_views_event_id_idx on link_views(event_id);

-- ─── CONTRIBUTIONS ───────────────────────────────────────────────────────────

create table if not exists contributions (
  id                      uuid primary key default uuid_generate_v4(),
  created_at              timestamptz not null default now(),
  event_id                uuid not null references events(id) on delete cascade,

  contributor_name        text not null,
  amount                  numeric(10,2) not null check (amount >= 10),
  payment_method          text not null check (payment_method in ('contanti', 'paypal', 'satispay')),
  status                  text not null default 'pending' check (status in ('pending', 'completed', 'failed')),

  -- Payment provider refs
  stripe_payment_intent   text,
  paypal_order_id         text,
  satispay_payment_id     text
);

create index if not exists contributions_event_id_idx on contributions(event_id);

-- ─── RPC: increment collective amount atomically ──────────────────────────────

create or replace function increment_collective_amount(p_event_id uuid, p_amount numeric)
returns void
language sql
as $$
  update events
  set collective_amount = collective_amount + p_amount
  where id = p_event_id;
$$;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- The backend uses the service role key (bypasses RLS).
-- Enable RLS to protect direct client access via anon key.

alter table events enable row level security;
alter table gifts enable row level security;
alter table rsvp enable row level security;
alter table link_views enable row level security;
alter table contributions enable row level security;

-- No public read/write via anon key — all access goes through the backend API.
-- If you want to use Supabase realtime or direct client queries,
-- add policies here with token-based conditions.

-- Example: allow reading gifts by guest_token (if you use Supabase directly from frontend)
-- create policy "guests can read gifts" on gifts
--   for select using (
--     exists (
--       select 1 from events e
--       where e.id = gifts.event_id
--         and e.guest_token = current_setting('app.guest_token', true)::uuid
--     )
--   );

-- ─── INDEXES FOR TOKENS ───────────────────────────────────────────────────────

create index if not exists events_parent_token_idx on events(parent_token);
create index if not exists events_guest_token_idx on events(guest_token);
create index if not exists events_collective_token_idx on events(collective_token);
create index if not exists events_party_date_idx on events(party_date);
create index if not exists events_closing_date_idx on events(closing_date);
