-- Un collectiveToken è condiviso da tutti gli invitati: senza un secret
-- per-contributo, chiunque avesse il link poteva modificare il contributo
-- (nome/importo) di un altro ospite. edit_token è generato alla creazione
-- e restituito una sola volta a chi ha creato il contributo.
alter table contributions add column if not exists edit_token uuid;
