-- Suma soporte para crear tambien la Negociacion (Deal) en Bitrix, con
-- actividades y notas, ademas del Contacto que ya se sincroniza.

begin;

alter table public.visitas add column if not exists bitrix_deal_id text;
alter table public.agenda add column if not exists bitrix_activity_id text;

commit;
