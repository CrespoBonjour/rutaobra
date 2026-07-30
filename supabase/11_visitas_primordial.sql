-- Marca de "obra primordial" (prioridad alta de venta): se pinta de violeta y hay
-- un filtro propio en Obras. NO reordena las tarjetas (se mantiene el orden de carga).
-- Aditivo y seguro. Correr una vez en el SQL Editor de Supabase.

begin;

alter table public.visitas
  add column if not exists primordial boolean not null default false;

commit;
