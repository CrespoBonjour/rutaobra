-- Campos para el seguimiento de obra que alimentan la pestaña "Hoy":
--  - tamano_obra: chico / mediano / grande (para priorizar).
--  - fecha_instalacion: fecha estimada de instalaciones eléctricas (el momento que compra material).
-- Aditivo, no toca nada existente. Correr una vez en el SQL Editor de Supabase.

begin;

alter table public.visitas
  add column if not exists tamano_obra text,
  add column if not exists fecha_instalacion date;

commit;
