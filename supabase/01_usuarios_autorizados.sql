-- PASO 1 de 2. Correr esto PRIMERO en el SQL Editor de Supabase.
-- Es aditivo y seguro: crea la tabla de usuarios autorizados y te siembra
-- a vos (Martin) como admin. Nada en la app todavia la lee, así que esto
-- no afecta a los usuarios actuales de RutaObra.
--
-- Después de correrlo, verificá con:
--   select * from public.usuarios_autorizados;
-- Debe aparecer una fila con tu email y es_admin = true.
--
-- NO corras 02_rls_policies.sql todavía — esperá a que el código nuevo
-- (con el panel de "Usuarios autorizados") esté desplegado y probado.

begin;

create table if not exists public.usuarios_autorizados (
  id          bigint primary key,
  email       text not null,
  nombre      text,
  es_admin    boolean not null default false,
  creado_por  text,
  creado_en   timestamptz not null default now()
);

create unique index if not exists usuarios_autorizados_email_lower_idx
  on public.usuarios_autorizados (lower(email));

-- Funciones SECURITY DEFINER: evitan recursion de RLS al consultar esta
-- misma tabla desde sus propias políticas de seguridad.
create or replace function public.is_authorized_user(check_email text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.usuarios_autorizados where lower(email) = lower(check_email));
$$;

create or replace function public.is_admin_user(check_email text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.usuarios_autorizados where lower(email) = lower(check_email) and es_admin = true);
$$;

grant execute on function public.is_authorized_user(text) to authenticated;
grant execute on function public.is_admin_user(text) to authenticated;

grant select, insert, update, delete on public.usuarios_autorizados to authenticated;
revoke all on public.usuarios_autorizados from anon;

alter table public.usuarios_autorizados enable row level security;

drop policy if exists ua_select on public.usuarios_autorizados;
create policy ua_select on public.usuarios_autorizados
  for select using (
    lower(email) = lower(auth.jwt() ->> 'email')
    or public.is_admin_user(auth.jwt() ->> 'email')
  );

drop policy if exists ua_insert_admin on public.usuarios_autorizados;
create policy ua_insert_admin on public.usuarios_autorizados
  for insert with check ( public.is_admin_user(auth.jwt() ->> 'email') );

drop policy if exists ua_update_admin on public.usuarios_autorizados;
create policy ua_update_admin on public.usuarios_autorizados
  for update using ( public.is_admin_user(auth.jwt() ->> 'email') )
  with check ( public.is_admin_user(auth.jwt() ->> 'email') );

drop policy if exists ua_delete_admin on public.usuarios_autorizados;
create policy ua_delete_admin on public.usuarios_autorizados
  for delete using ( public.is_admin_user(auth.jwt() ->> 'email') );

-- Sembrar a Martín como admin. Verificá que el email coincide con el real
-- (el mismo que usás para loguearte en RutaObra con Google).
insert into public.usuarios_autorizados (id, email, nombre, es_admin, creado_por)
values (extract(epoch from now())::bigint * 1000, 'arq.crespobonjour@gmail.com', 'Martín', true, 'sistema (bootstrap)')
on conflict do nothing;

commit;
