-- ─── Fix race condition su nomi RSVP con maiuscole/minuscole diverse ───────
-- Run this once in the Supabase SQL Editor.
--
-- Il controllo "esiste già un RSVP con questo nome?" usa ilike (case-insensitive)
-- per decidere se aggiornare una riga esistente invece di crearne una nuova.
-- Ma il vincolo unique a livello di tabella è case-sensitive (unique(event_id,
-- guest_name)), quindi due richieste concorrenti con varianti diverse di
-- maiuscole/minuscole (es. "Mario" e "mario") potevano entrambe superare il
-- check ilike e creare due righe distinte per la stessa persona.
--
-- Questo indice unico case-insensitive chiude la finestra di race: se due
-- insert concorrenti arrivano con lo stesso nome (a prescindere dal case),
-- il secondo fallisce con un vincolo violato — il backend lo intercetta e
-- lo trasforma in un update invece di un errore.
--
-- ATTENZIONE: se nel database esistono già righe duplicate case-insensitive
-- per lo stesso evento (es. "Mario" e "mario" come righe separate), questa
-- CREATE INDEX fallirà segnalando il conflitto. In tal caso vanno unite a
-- mano prima di rieseguire la migration. Per controllare prima di procedere:
--
-- SELECT event_id, lower(guest_name), array_agg(guest_name)
-- FROM rsvp GROUP BY event_id, lower(guest_name) HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS rsvp_event_guest_name_lower_idx
  ON rsvp(event_id, lower(guest_name));
