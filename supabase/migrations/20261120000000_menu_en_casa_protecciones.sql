-- ════════════════════════════════════════════════════════════════════════════
-- Menú en Casa · protecciones
--  1. Los planes se guardan solo si nadie los cambió desde que se abrieron
--     (evita que un teléfono con datos viejos o vacíos borre lo que guardó otro).
--  2. No se puede quitar ni bajar de permiso al último administrador.
-- Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.menu_planes_guardar(p_hogar text, p_people jsonb, p_plans jsonb, p_base timestamptz)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_actual timestamptz; v_nuevo timestamptz := clock_timestamp();
begin
  if public.menu_rol() is distinct from 'admin' then raise exception 'menu:sin_permiso'; end if;
  select actualizado into v_actual from public.menu_planes where hogar = p_hogar for update;
  if found and v_actual is distinct from p_base then raise exception 'menu:desactualizado'; end if;
  insert into public.menu_planes (hogar, people, plans, actualizado, actualizado_por)
  values (p_hogar, p_people, p_plans, v_nuevo, auth.uid())
  on conflict (hogar) do update set people = excluded.people, plans = excluded.plans,
    actualizado = excluded.actualizado, actualizado_por = excluded.actualizado_por;
  return v_nuevo;
end $$;
revoke all on function public.menu_planes_guardar(text, jsonb, jsonb, timestamptz) from public, anon;
grant execute on function public.menu_planes_guardar(text, jsonb, jsonb, timestamptz) to authenticated;

-- Desde ahora los planes solo se escriben con menu_planes_guardar
drop policy if exists menu_planes_admin on public.menu_planes;
revoke insert, update, delete on public.menu_planes from authenticated;

create or replace function public.menu_agregar_miembro(p_email text, p_rol text, p_nombre text)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if public.menu_rol() is distinct from 'admin' then raise exception 'menu:sin_permiso'; end if;
  select id into v from auth.users where lower(email) = lower(trim(p_email));
  if v is null then raise exception 'menu:sin_usuario'; end if;
  if p_rol <> 'admin'
     and exists (select 1 from public.menu_miembros where user_id = v and rol = 'admin')
     and (select count(*) from public.menu_miembros where rol = 'admin') = 1 then
    raise exception 'menu:ultimo_admin';
  end if;
  insert into public.menu_miembros (user_id, nombre, rol) values (v, p_nombre, p_rol)
  on conflict (user_id) do update set rol = excluded.rol, nombre = coalesce(excluded.nombre, public.menu_miembros.nombre);
end $$;

create or replace function public.menu_quitar_miembro(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if public.menu_rol() is distinct from 'admin' then raise exception 'menu:sin_permiso'; end if;
  select id into v from auth.users where lower(email) = lower(trim(p_email));
  if exists (select 1 from public.menu_miembros where user_id = v and rol = 'admin')
     and (select count(*) from public.menu_miembros where rol = 'admin') = 1 then
    raise exception 'menu:ultimo_admin';
  end if;
  delete from public.menu_miembros where user_id = v;
end $$;
