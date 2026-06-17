-- ─── Fix race condition sul tetto massimo del regalo collettivo ────────────
-- Run this once in the Supabase SQL Editor.
--
-- Prima, il controllo "questo contributo supera l'obiettivo?" leggeva
-- collective_amount un istante prima di scrivere il contributo: due
-- contributi concorrenti potevano entrambi passare il controllo basandosi
-- sulla stessa lettura, facendo sforare l'obiettivo. L'incremento in sé era
-- già atomico, ma il controllo "non superare il tetto" non lo era.
--
-- Ora la funzione applica il tetto direttamente nella UPDATE (where
-- collective_amount + p_amount <= collective_goal) e ritorna NULL se
-- l'incremento supererebbe l'obiettivo (o se l'evento non esiste), così il
-- backend può rifiutare l'operazione invece di sforare in silenzio.
-- collective_goal NULL = nessun tetto (comportamento invariato).

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
