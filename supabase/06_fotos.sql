-- Agrega soporte para varias fotos por contacto (obra + cartel de obra, etc.).
-- Aditivo: no toca la columna `photo` vieja (que sigue guardando la primera foto
-- para compatibilidad). Correr una vez en el SQL Editor de Supabase.

begin;

alter table public.visitas
  add column if not exists fotos jsonb not null default '[]'::jsonb;

commit;
