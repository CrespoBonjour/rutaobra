-- Modelo de "cuentas": la ficha es una OBRA (o cliente). Constructora y estudio son
-- dos etiquetas encima. Agrega el nombre de la obra y el tipo de cliente para separar
-- obras de empresa de clientes particulares en las estadisticas.
-- Aditivo. Correr una vez en el SQL Editor de Supabase.

begin;

alter table public.visitas
  add column if not exists obra text,
  add column if not exists tipo_cliente text;   -- 'empresa' | 'particular' (null = empresa por defecto)

commit;
