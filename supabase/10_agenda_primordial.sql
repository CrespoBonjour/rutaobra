-- Marca de "actividad primordial" (prioridad alta): se pinta de violeta, sube arriba
-- en Hoy / por día, y hay un filtro propio en Actividades. Aditivo y seguro.
-- Correr una vez en el SQL Editor de Supabase.

begin;

alter table public.agenda
  add column if not exists primordial boolean not null default false;

commit;
