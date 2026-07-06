-- PASO 2 de 2. Correr SOLO DESPUÉS de:
--   1) Haber corrido 01_usuarios_autorizados.sql y verificado tu fila de admin.
--   2) Que el código nuevo de RutaObra (con el panel "Usuarios autorizados"
--      y el mensaje de "cuenta no autorizada") ya esté desplegado y lo hayas
--      probado entrando con tu cuenta de Google.
--
-- Esto es lo que efectivamente bloquea el acceso a la base de datos: a
-- partir de acá, solo los emails que estén en usuarios_autorizados van a
-- poder leer o escribir datos, sin importar qué cuenta de Google se logueó.
--
-- Visibilidad: cualquier usuario autorizado ve TODOS los contactos y
-- negociaciones del equipo (no solo los propios). Editar o borrar sigue
-- restringido al dueño del contacto o a un admin — igual que ya funciona
-- hoy en la interfaz (el botón "Editar" del mapa).

begin;

-- Informativo: ver qué políticas existen hoy antes de tocar nada
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('visitas','zonas','agenda','negociaciones');

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('visitas','zonas','agenda','negociaciones')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.visitas        enable row level security;
alter table public.zonas          enable row level security;
alter table public.agenda         enable row level security;
alter table public.negociaciones  enable row level security;

-- visitas: cualquier autorizado ve todo; solo dueño o admin puede escribir/editar/borrar
create policy visitas_select on public.visitas
  for select using ( public.is_authorized_user(auth.jwt() ->> 'email') );
create policy visitas_insert on public.visitas
  for insert with check (
    public.is_authorized_user(auth.jwt() ->> 'email')
    and (user_id = (auth.uid())::text or public.is_admin_user(auth.jwt() ->> 'email'))
  );
create policy visitas_update on public.visitas
  for update using (
    public.is_admin_user(auth.jwt() ->> 'email')
    or (public.is_authorized_user(auth.jwt() ->> 'email') and user_id = (auth.uid())::text)
  ) with check (
    public.is_admin_user(auth.jwt() ->> 'email')
    or (public.is_authorized_user(auth.jwt() ->> 'email') and user_id = (auth.uid())::text)
  );
create policy visitas_delete on public.visitas
  for delete using (
    public.is_admin_user(auth.jwt() ->> 'email')
    or (public.is_authorized_user(auth.jwt() ->> 'email') and user_id = (auth.uid())::text)
  );

-- negociaciones: misma regla que visitas
create policy negociaciones_select on public.negociaciones
  for select using ( public.is_authorized_user(auth.jwt() ->> 'email') );
create policy negociaciones_insert on public.negociaciones
  for insert with check (
    public.is_authorized_user(auth.jwt() ->> 'email')
    and (user_id = (auth.uid())::text or public.is_admin_user(auth.jwt() ->> 'email'))
  );
create policy negociaciones_update on public.negociaciones
  for update using (
    public.is_admin_user(auth.jwt() ->> 'email')
    or (public.is_authorized_user(auth.jwt() ->> 'email') and user_id = (auth.uid())::text)
  ) with check (
    public.is_admin_user(auth.jwt() ->> 'email')
    or (public.is_authorized_user(auth.jwt() ->> 'email') and user_id = (auth.uid())::text)
  );
create policy negociaciones_delete on public.negociaciones
  for delete using (
    public.is_admin_user(auth.jwt() ->> 'email')
    or (public.is_authorized_user(auth.jwt() ->> 'email') and user_id = (auth.uid())::text)
  );

-- zonas y agenda: ya se comparten entre todo el equipo sin filtro de dueño
-- hoy; solo se exige estar autorizado.
create policy zonas_all on public.zonas
  for all using ( public.is_authorized_user(auth.jwt() ->> 'email') )
  with check ( public.is_authorized_user(auth.jwt() ->> 'email') );

create policy agenda_all on public.agenda
  for all using ( public.is_authorized_user(auth.jwt() ->> 'email') )
  with check ( public.is_authorized_user(auth.jwt() ->> 'email') );

commit;
