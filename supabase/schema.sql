-- ============================================================
-- Wishly — Supabase Schema
-- Run this in the Supabase SQL editor
--
-- Questo file è la baseline consolidata: rispecchia lo stato del database
-- dopo aver applicato schema.sql + tutti i file in migrations/. Se ricrei
-- il database da zero, questo file basta da solo (non serve più rieseguire
-- i singoli migration file elencati sotto, sono stati incorporati qui).
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── EVENTS ──────────────────────────────────────────────────────────────────

create table if not exists events (
  id                    uuid primary key default uuid_generate_v4(),
  created_at            timestamptz not null default now(),

  -- Party info
  child_name            text not null,
  gender                varchar(1),
  birth_date            date,
  party_date            date not null,
  party_time            time,
  location              text,
  address               text,
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
  collective_amount     numeric(10,2) not null default 0,
  collective_fixed_quota numeric(10,2),
  paypal_email          text,

  -- Analytics
  referral_source        text,
  utm_source              text,
  utm_medium              text,
  utm_campaign            text,
  first_rsvp_at           timestamptz,
  first_gift_reserved_at  timestamptz
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
  adults_count    integer not null default 1,
  with_partner    boolean, -- legacy, superseded da adults_count, mantenuto per righe storiche
  idempotency_key uuid,

  unique (event_id, guest_name)
);

create index if not exists rsvp_event_id_idx on rsvp(event_id);

create unique index if not exists rsvp_event_idempotency_key_idx
  on rsvp(event_id, idempotency_key) where idempotency_key is not null;

-- ─── LINK VIEWS ──────────────────────────────────────────────────────────────

create table if not exists link_views (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now(),
  event_id        uuid not null references events(id) on delete cascade,

  guest_name      text,
  view_count      integer not null default 1,

  device_type     text, -- 'mobile' | 'tablet' | 'desktop' | 'unknown'
  os              text, -- 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'other'
  browser         text  -- 'Safari' | 'Chrome' | 'Firefox' | 'Edge' | 'other'
);

create index if not exists link_views_event_id_idx on link_views(event_id);
create index if not exists link_views_device_type_idx on link_views(device_type);

-- ─── CONTRIBUTIONS ───────────────────────────────────────────────────────────

create table if not exists contributions (
  id                      uuid primary key default uuid_generate_v4(),
  created_at              timestamptz not null default now(),
  event_id                uuid not null references events(id) on delete cascade,

  contributor_name        text not null,
  amount                  numeric(10,2) not null check (amount >= 10),
  payment_method          text not null check (payment_method in ('contanti', 'paypal', 'satispay')),
  status                  text not null default 'pending' check (status in ('pending', 'completed', 'failed')),

  idempotency_key         uuid,
  edit_token              uuid, -- segreto per-contributo per autorizzare le modifiche (vedi PUT /contributions/:cid)

  -- Payment provider refs
  paypal_order_id         text,
  satispay_payment_id     text
);

create index if not exists contributions_event_id_idx on contributions(event_id);

create unique index if not exists contributions_event_idempotency_key_idx
  on contributions(event_id, idempotency_key) where idempotency_key is not null;

-- ─── USER KEYS ───────────────────────────────────────────────────────────────
-- Codice personale anonimo per ritrovare le proprie liste/inviti su altri dispositivi.

create table if not exists user_keys (
  id          uuid primary key default gen_random_uuid(),
  key_value   text unique not null,
  created_at  timestamptz default now()
);

create table if not exists user_key_links (
  id          uuid primary key default gen_random_uuid(),
  user_key    text not null,
  link_type   text not null check (link_type in ('event', 'invite', 'collective')),
  token       text not null,
  child_name  text,
  party_date  date,
  guest_name  text,
  created_at  timestamptz default now(),
  unique(user_key, token)
);

create index if not exists idx_ukl_key on user_key_links(user_key);

-- ─── APP SETTINGS ────────────────────────────────────────────────────────────
-- Coppie chiave/valore generiche usate dal backend (es. chiavi VAPID per le push).

create table if not exists app_settings (
  key   text primary key,
  value text
);

-- ─── PUSH SUBSCRIPTIONS ────────────────────────────────────────────────────

create table if not exists push_subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  parent_token  uuid not null unique,
  subscription  jsonb not null,
  created_at    timestamptz not null default now()
);

-- ─── RPC: increment collective amount atomically ──────────────────────────────
-- Applica anche il tetto massimo (collective_goal) dentro la UPDATE: ritorna
-- NULL se l'incremento supererebbe l'obiettivo (o se l'evento non esiste),
-- così il check "non sforare" è atomico insieme all'incremento e non soggetto
-- a race condition tra contributi concorrenti. collective_goal NULL = nessun tetto.

create or replace function increment_collective_amount(p_event_id uuid, p_amount numeric)
returns numeric
language plpgsql
as $$
declare
  v_new_amount numeric;
begin
  update events
  set collective_amount = collective_amount + p_amount
  where id = p_event_id
    and (collective_goal is null or collective_amount + p_amount <= collective_goal)
  returning collective_amount into v_new_amount;

  return v_new_amount;
end;
$$;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- The backend uses the service role key (bypasses RLS).
-- Enable RLS to protect direct client access via anon key.

alter table events enable row level security;
alter table gifts enable row level security;
alter table rsvp enable row level security;
alter table link_views enable row level security;
alter table contributions enable row level security;
alter table user_keys enable row level security;
alter table user_key_links enable row level security;
alter table app_settings enable row level security;
alter table push_subscriptions enable row level security;

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
create index if not exists events_utm_source_idx on events(utm_source);
create index if not exists events_first_rsvp_at_idx on events(first_rsvp_at);
