-- ════════════════════════════════════════════════════════════════════════════
-- Cartas con Amor · Entrada del equipo a la aplicación general SIN contraseña
--
-- Cada matrimonio del equipo recibe un enlace /cartas/entrar?equipo=TOKEN. Al abrirlo elige
-- quién es (él o ella), se inicia una sesión anónima de Supabase (sin correo ni contraseña) y queda
-- como organizador SIN lectura de cartas, vinculado a su matrimonio: entra al panel general y ve
-- «Mis parejas». La sesión anónima no da ningún permiso en Entre tu Arte (todas sus reglas exigen admin).
-- Si el administrador cambia el enlace o quita al matrimonio, esas sesiones quedan desactivadas.
--
-- Requisito en Supabase: Authentication › Sign In / Providers › «Allow anonymous sign-ins» = activado.
-- Requiere 20261106000000_cartas_con_amor.sql y 20261107000000_cartas_equipo.sql. Se puede repetir.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.cca_equipo add column if not exists token text;
update public.cca_equipo set token = md5(random()::text || clock_timestamp()::text || id::text) where token is null;
alter table public.cca_equipo alter column token set default md5(random()::text || clock_timestamp()::text);
alter table public.cca_equipo alter column token set not null;
create unique index if not exists cca_equipo_token_idx on public.cca_equipo (token);

-- Usuario vinculado a un matrimonio del equipo (para «Mis parejas» sin depender del correo)
alter table public.cca_usuarios add column if not exists equipo_id uuid references public.cca_equipo(id) on delete set null;

-- Datos mínimos para la pantalla de entrada: «Matrimonio Castro Lazo · ¿Quién eres? Ronald / Ana»
create or replace function public.cca_equipo_info(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e cca_equipo; r cca_retiros;
begin
  if coalesce(length(p_token), 0) < 20 then return jsonb_build_object('estado', 'no_disponible'); end if;
  select * into e from cca_equipo where token = p_token;
  if not found then return jsonb_build_object('estado', 'no_disponible'); end if;
  select * into r from cca_retiros where id = e.retiro_id;
  if r.estado = 'archivado' then return jsonb_build_object('estado', 'no_disponible'); end if;
  return jsonb_build_object('estado', 'ok', 'id', e.id, 'apellidos', e.apellidos,
    'esposo_nombre', e.esposo_nombre, 'esposa_nombre', e.esposa_nombre, 'retiro', r.nombre);
end $$;

-- Vincula la sesión actual (anónima o no) al matrimonio del enlace. Devuelve el id del matrimonio.
-- A un administrador no le cambia nada (solo puede usar el enlace para ver esa bandeja).
create or replace function public.cca_entrar_equipo(p_token text, p_quien text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare e cca_equipo; v_nombre text; v_rol text;
begin
  if auth.uid() is null then raise exception 'cca:no_disponible'; end if;
  select * into e from cca_equipo where token = p_token and length(p_token) >= 20;
  if not found then raise exception 'cca:no_disponible'; end if;
  if exists (select 1 from cca_retiros where id = e.retiro_id and estado = 'archivado') then raise exception 'cca:no_disponible'; end if;

  select rol into v_rol from cca_usuarios where user_id = auth.uid();
  if v_rol = 'administrador' then return e.id; end if;

  v_nombre := btrim(coalesce(case when p_quien = 'esposa' then e.esposa_nombre else e.esposo_nombre end, '')
                    || ' ' || e.apellidos);
  insert into cca_usuarios (user_id, nombre, correo, rol, puede_leer, activo, equipo_id)
  values (auth.uid(), v_nombre, null, 'organizador', false, true, e.id)
  on conflict (user_id) do update set equipo_id = excluded.equipo_id, nombre = excluded.nombre,
    activo = true, puede_leer = false
  where cca_usuarios.rol = 'organizador';
  insert into cca_retiro_organizadores (retiro_id, user_id) values (e.retiro_id, auth.uid()) on conflict do nothing;
  -- Queda registrada cada entrada con el enlace
  insert into cca_auditoria (retiro_id, usuario_id, entidad, entidad_id, accion, datos)
  values (e.retiro_id, auth.uid(), 'equipo', e.id, 'entrada', jsonb_build_object('nombre', v_nombre, 'matrimonio', e.apellidos));
  return e.id;
end $$;

-- Cambiar el enlace o quitar al matrimonio desactiva las sesiones que entraron con el enlace
-- (solo las anónimas: no tienen correo). Para volver a entrar necesitan el enlace nuevo.
create or replace function public.cca_revocar_enlace_equipo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or new.token is distinct from old.token then
    update cca_usuarios set activo = false
     where equipo_id = old.id and rol = 'organizador' and correo is null;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists cca_revocar_enlace_equipo on public.cca_equipo;
create trigger cca_revocar_enlace_equipo before update of token or delete on public.cca_equipo
  for each row execute function public.cca_revocar_enlace_equipo();

revoke all on function public.cca_equipo_info(text) from public;
revoke all on function public.cca_entrar_equipo(text, text) from public, anon;
grant execute on function public.cca_equipo_info(text) to anon, authenticated;
grant execute on function public.cca_entrar_equipo(text, text) to authenticated;

notify pgrst, 'reload schema';
