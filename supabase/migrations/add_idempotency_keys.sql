-- Idempotency keys: evitano righe/notifiche duplicate quando il client
-- ritenta un invio (RSVP o contributo) dopo un problema di rete.
alter table rsvp add column if not exists idempotency_key uuid;
alter table contributions add column if not exists idempotency_key uuid;

create unique index if not exists rsvp_event_idempotency_key_idx
  on rsvp(event_id, idempotency_key) where idempotency_key is not null;

create unique index if not exists contributions_event_idempotency_key_idx
  on contributions(event_id, idempotency_key) where idempotency_key is not null;
