-- Agrega campos para llevar registro de la sincronizacion manual con Bitrix24.
-- No guarda ninguna clave secreta aca (esa vive en Supabase Edge Functions,
-- como variable de entorno, nunca en la base de datos ni en el codigo).

begin;

alter table public.visitas add column if not exists bitrix_contact_id text;
alter table public.visitas add column if not exists bitrix_synced_count integer not null default 0;

commit;
