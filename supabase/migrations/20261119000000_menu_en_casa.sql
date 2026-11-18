-- ════════════════════════════════════════════════════════════════════════════
-- Menú en Casa · planes de alimentación de la familia (privado)
-- Aplicación independiente en /menu. Los planes son información de salud:
-- nadie los ve sin iniciar sesión y estar registrado como miembro.
--
-- Permisos:
--   admin       lee todo, cambia planes y perfiles, da y quita accesos
--   cocina      lee todo y marca alternativas, listos y compras (no cambia dietas)
--   integrante  lee todo y elige alternativas
-- Arranque: mientras no exista ningún administrador del menú, los administradores
-- de Entre tu Arte (public.admins) entran como administradores del menú.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.menu_miembros (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre  text,
  rol     text not null check (rol in ('admin', 'cocina', 'integrante')),
  creado  timestamptz not null default now()
);

create table if not exists public.menu_planes (
  hogar           text primary key,
  people          jsonb not null default '[]',
  plans           jsonb not null default '[]',
  actualizado     timestamptz not null default now(),
  actualizado_por uuid default auth.uid()
);

create table if not exists public.menu_cocina (
  hogar       text primary key,
  choices     jsonb not null default '{}',
  ready       jsonb not null default '{}',
  bought      jsonb not null default '{}',
  stock       jsonb not null default '{}',
  actualizado timestamptz not null default now()
);

create or replace function public.menu_rol()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rol from public.menu_miembros where user_id = auth.uid()),
    case when not exists (select 1 from public.menu_miembros where rol = 'admin') and public.es_admin()
         then 'admin' end)
$$;

alter table public.menu_miembros enable row level security;
alter table public.menu_planes   enable row level security;
alter table public.menu_cocina   enable row level security;

drop policy if exists menu_miembros_propio on public.menu_miembros;
create policy menu_miembros_propio on public.menu_miembros for select using (user_id = auth.uid());

drop policy if exists menu_planes_leer on public.menu_planes;
create policy menu_planes_leer on public.menu_planes for select using (public.menu_rol() is not null);
drop policy if exists menu_planes_admin on public.menu_planes;
create policy menu_planes_admin on public.menu_planes for all
  using (public.menu_rol() = 'admin') with check (public.menu_rol() = 'admin');

drop policy if exists menu_cocina_leer on public.menu_cocina;
create policy menu_cocina_leer on public.menu_cocina for select using (public.menu_rol() is not null);
-- La cocina se escribe solo con menu_cocina_cambiar (una marca a la vez)

-- Cambia una sola marca (alternativa elegida, platillo listo, comprado o inventario) sin pisar las demás
create or replace function public.menu_cocina_cambiar(p_hogar text, p_campo text, p_clave text, p_valor jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.menu_rol() is null then raise exception 'menu:sin_permiso'; end if;
  if p_campo not in ('choices', 'ready', 'bought', 'stock') then raise exception 'menu:campo_invalido'; end if;
  insert into public.menu_cocina (hogar) values (p_hogar) on conflict (hogar) do nothing;
  execute format(
    'update public.menu_cocina set %1$I = case when $2 is null or $2 = ''null''::jsonb then %1$I - $1 else jsonb_set(%1$I, array[$1], $2) end, actualizado = now() where hogar = $3',
    p_campo) using p_clave, p_valor, p_hogar;
end $$;

create or replace function public.menu_miembros_lista()
returns table (email text, nombre text, rol text) language plpgsql stable security definer set search_path = public as $$
begin
  if public.menu_rol() is distinct from 'admin' then raise exception 'menu:sin_permiso'; end if;
  return query select u.email::text, m.nombre, m.rol from public.menu_miembros m join auth.users u on u.id = m.user_id order by m.creado;
end $$;

create or replace function public.menu_agregar_miembro(p_email text, p_rol text, p_nombre text)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if public.menu_rol() is distinct from 'admin' then raise exception 'menu:sin_permiso'; end if;
  select id into v from auth.users where lower(email) = lower(trim(p_email));
  if v is null then raise exception 'menu:sin_usuario'; end if;
  insert into public.menu_miembros (user_id, nombre, rol) values (v, p_nombre, p_rol)
  on conflict (user_id) do update set rol = excluded.rol, nombre = coalesce(excluded.nombre, public.menu_miembros.nombre);
end $$;

create or replace function public.menu_quitar_miembro(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.menu_rol() is distinct from 'admin' then raise exception 'menu:sin_permiso'; end if;
  delete from public.menu_miembros m using auth.users u where u.id = m.user_id and lower(u.email) = lower(trim(p_email));
end $$;

revoke all on public.menu_miembros, public.menu_planes, public.menu_cocina from anon;
revoke all on function public.menu_rol() from public, anon;
revoke all on function public.menu_cocina_cambiar(text, text, text, jsonb) from public, anon;
revoke all on function public.menu_miembros_lista() from public, anon;
revoke all on function public.menu_agregar_miembro(text, text, text) from public, anon;
revoke all on function public.menu_quitar_miembro(text) from public, anon;
grant execute on function public.menu_rol() to authenticated;
grant execute on function public.menu_cocina_cambiar(text, text, text, jsonb) to authenticated;
grant execute on function public.menu_miembros_lista() to authenticated;
grant execute on function public.menu_agregar_miembro(text, text, text) to authenticated;
grant execute on function public.menu_quitar_miembro(text) to authenticated;
