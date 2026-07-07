-- Agrega la lista de productos (para el checklist "¿Le interesa recibir
-- informacion de...?") y una columna en agenda para guardar que productos
-- dispararon cada actividad de seguimiento. Aditivo, no toca nada existente.
--
-- Requiere haber corrido antes 01_usuarios_autorizados.sql (usa las
-- funciones is_authorized_user / is_admin_user que crea ese script).

begin;

create table if not exists public.productos_catalogo (
  id          bigint primary key,
  nombre      text not null,
  orden       bigint not null default 0,
  creado_por  text,
  creado_en   timestamptz not null default now()
);

alter table public.productos_catalogo enable row level security;
grant select, insert, update, delete on public.productos_catalogo to authenticated;
revoke all on public.productos_catalogo from anon;

drop policy if exists productos_select on public.productos_catalogo;
create policy productos_select on public.productos_catalogo
  for select using ( public.is_authorized_user(auth.jwt() ->> 'email') );

drop policy if exists productos_write_admin on public.productos_catalogo;
create policy productos_write_admin on public.productos_catalogo
  for all using ( public.is_admin_user(auth.jwt() ->> 'email') )
  with check ( public.is_admin_user(auth.jwt() ->> 'email') );

-- Lista inicial pedida por Martin. Despues se administra desde el Panel de la app.
insert into public.productos_catalogo (id, nombre, orden, creado_por) values
  (1, 'Servicio Técnico', 1, 'sistema (bootstrap)'),
  (2, 'VHO', 2, 'sistema (bootstrap)'),
  (3, 'AVE', 3, 'sistema (bootstrap)'),
  (4, 'Noark', 4, 'sistema (bootstrap)'),
  (5, 'Luxlightning', 5, 'sistema (bootstrap)'),
  (6, 'Chint', 6, 'sistema (bootstrap)'),
  (7, 'Deutsch', 7, 'sistema (bootstrap)'),
  (8, 'Milanlux', 8, 'sistema (bootstrap)'),
  (9, 'EMT', 9, 'sistema (bootstrap)')
on conflict (id) do nothing;

-- Columna nueva en agenda: que productos dispararon esta actividad puntual
alter table public.agenda add column if not exists productos text;

commit;
