-- ════════════════════════════════════════════════════════════════════════════
-- Cartas con Amor · Enlace privado para cada matrimonio del equipo (sin cuenta ni contraseña)
--
-- Cada matrimonio del equipo recibe un enlace /cartas/equipo?t=TOKEN. Con él ve SOLO sus parejas
-- asignadas (avance, contactos de la familia, últimas cartas sin contenido) y registra cartas en papel.
-- No crea usuarios en Supabase ni da acceso a nada de Entre tu Arte. Nunca devuelve el texto ni los
-- archivos de las cartas. El administrador puede cambiar el enlace y el anterior deja de funcionar.
--
-- Requiere 20261106000000_cartas_con_amor.sql y 20261107000000_cartas_equipo.sql. Se puede repetir.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.cca_equipo add column if not exists token text;
update public.cca_equipo set token = md5(random()::text || clock_timestamp()::text || id::text) where token is null;
alter table public.cca_equipo alter column token set default md5(random()::text || clock_timestamp()::text);
alter table public.cca_equipo alter column token set not null;
create unique index if not exists cca_equipo_token_idx on public.cca_equipo (token);

-- Bandeja del matrimonio: todo lo que necesita para dar seguimiento, nada del contenido de las cartas
create or replace function public.cca_equipo_bandeja(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e cca_equipo; r cca_retiros;
begin
  if coalesce(length(p_token), 0) < 20 then return jsonb_build_object('estado', 'no_disponible'); end if;
  select * into e from cca_equipo where token = p_token;
  if not found then return jsonb_build_object('estado', 'no_disponible'); end if;
  select * into r from cca_retiros where id = e.retiro_id;
  if r.estado = 'archivado' then return jsonb_build_object('estado', 'no_disponible'); end if;

  return jsonb_build_object(
    'estado', 'ok',
    'equipo', jsonb_build_object('id', e.id, 'apellidos', e.apellidos,
      'esposo_nombre', e.esposo_nombre, 'esposo_telefono', e.esposo_telefono,
      'esposa_nombre', e.esposa_nombre, 'esposa_telefono', e.esposa_telefono),
    'retiro', jsonb_build_object('id', r.id, 'nombre', r.nombre, 'codigo', r.codigo, 'estado', r.estado,
      'inicio', r.inicio, 'fin', r.fin, 'fecha_limite', r.fecha_limite, 'meta_por_persona', r.meta_por_persona,
      'plantilla_mensaje', r.plantilla_mensaje),
    'parejas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'codigo', p.codigo, 'nombre_a', p.nombre_a, 'nombre_b', p.nombre_b,
        'apodo_a', p.apodo_a, 'apodo_b', p.apodo_b, 'apellidos', p.apellidos,
        'apellidos_a', p.apellidos_a, 'apellidos_b', p.apellidos_b, 'token', p.token, 'equipo_id', p.equipo_id,
        'paraA', (select count(*) from cca_cartas c where c.pareja_id = p.id and c.estado not in ('rechazada', 'duplicada') and c.destinatario <> 'B'),
        'paraB', (select count(*) from cca_cartas c where c.pareja_id = p.id and c.estado not in ('rechazada', 'duplicada') and c.destinatario <> 'A'),
        'recibidas', (select count(*) from cca_cartas c where c.pareja_id = p.id and c.estado not in ('rechazada', 'duplicada')),
        'contactos', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre, 'relacion', x.relacion,
                        'telefono', x.telefono, 'correo', x.correo, 'estado', x.estado, 'coordinador', true,
                        'ultimo_recordatorio', x.ultimo_recordatorio, 'token', x.token, 'destinatario', x.destinatario) order by x.nombre)
                      from cca_remitentes x where x.pareja_id = p.id and x.coordinador), '[]'::jsonb),
        'ultimas', coalesce((select jsonb_agg(u) from (
                      select c.folio, c.relacion, c.remitente_nombre, c.destinatario, c.origen, c.created_at
                        from cca_cartas c where c.pareja_id = p.id and c.estado not in ('rechazada', 'duplicada')
                       order by c.created_at desc limit 8) u), '[]'::jsonb)
      ) order by p.codigo)
      from cca_parejas p where p.equipo_id = e.id and p.estado = 'activa'), '[]'::jsonb));
end $$;

-- Registro de cartas en papel desde el enlace del equipo (solo para sus parejas)
-- p_lineas: [{ "relacion": "Hermanos", "nombre": "", "para": "ambos", "cantidad": 3 }, ...]
create or replace function public.cca_equipo_registrar(p_token text, p_pareja uuid, p_lineas jsonb,
                                                      p_coordinador uuid default null, p_entrego text default null)
returns int language plpgsql volatile security definer set search_path = public as $$
declare e cca_equipo; v_p cca_parejas; v_coord cca_remitentes; l jsonb; v_cant int; v_total int := 0; v_para text;
        v_rel text; v_nombre text;
begin
  select * into e from cca_equipo where token = p_token and length(p_token) >= 20;
  if not found then raise exception 'cca:no_disponible'; end if;
  select * into v_p from cca_parejas where id = p_pareja and equipo_id = e.id and estado = 'activa';
  if not found then raise exception 'cca:pareja_invalida'; end if;
  if coalesce(jsonb_typeof(p_lineas), '') <> 'array' then raise exception 'cca:carta_vacia'; end if;
  if jsonb_array_length(p_lineas) not between 1 and 30 then raise exception 'cca:carta_vacia'; end if;
  if p_coordinador is not null then
    select * into v_coord from cca_remitentes where id = p_coordinador and pareja_id = p_pareja and coordinador;
  end if;

  for l in select * from jsonb_array_elements(p_lineas) loop
    v_cant := least(greatest(coalesce((l->>'cantidad')::int, 1), 1), 50);
    v_para := case when l->>'para' in ('A', 'B', 'ambos') then l->>'para' else 'ambos' end;
    v_rel := nullif(left(btrim(coalesce(l->>'relacion', '')), 60), '');
    v_nombre := coalesce(nullif(left(btrim(coalesce(l->>'nombre', '')), 120), ''), v_rel, 'Sin identificar');
    for i in 1..v_cant loop
      insert into cca_cartas (retiro_id, pareja_id, destinatario, remitente_nombre, relacion, origen, estado,
                              coordinador_id, recibida_de, created_by)
      values (v_p.retiro_id, v_p.id, v_para, v_nombre, v_rel, 'fisica', 'recibida',
              v_coord.id, coalesce(v_coord.nombre, nullif(left(btrim(coalesce(p_entrego, '')), 120), ''),
              'Matrimonio ' || e.apellidos), null);
      v_total := v_total + 1;
    end loop;
  end loop;
  if v_total > 200 then raise exception 'cca:demasiados_envios'; end if;   -- deshace todo
  insert into cca_auditoria (retiro_id, entidad, entidad_id, accion, datos)
  values (v_p.retiro_id, 'equipo', e.id, 'registro', jsonb_build_object('pareja', v_p.codigo, 'cartas', v_total, 'matrimonio', e.apellidos));
  return v_total;
end $$;

-- Deja constancia de que el matrimonio envió el mensaje a un contacto de la familia
create or replace function public.cca_equipo_recordatorio(p_token text, p_remitente uuid, p_canal text, p_mensaje text default null)
returns timestamptz language plpgsql volatile security definer set search_path = public as $$
declare e cca_equipo; x cca_remitentes;
begin
  select * into e from cca_equipo where token = p_token and length(p_token) >= 20;
  if not found then raise exception 'cca:no_disponible'; end if;
  select r.* into x from cca_remitentes r join cca_parejas p on p.id = r.pareja_id
   where r.id = p_remitente and p.equipo_id = e.id;
  if not found then raise exception 'cca:no_disponible'; end if;
  insert into cca_recordatorios (retiro_id, remitente_id, canal, mensaje, usuario_id)
  values (x.retiro_id, x.id, case when p_canal in ('whatsapp', 'correo', 'copiado') then p_canal else 'otro' end, left(p_mensaje, 6000), null);
  update cca_remitentes set ultimo_recordatorio = now(), invitacion = 'invitado' where id = x.id;
  return now();
end $$;

revoke all on function public.cca_equipo_bandeja(text) from public;
revoke all on function public.cca_equipo_registrar(text, uuid, jsonb, uuid, text) from public;
revoke all on function public.cca_equipo_recordatorio(text, uuid, text, text) from public;
grant execute on function public.cca_equipo_bandeja(text) to anon, authenticated;
grant execute on function public.cca_equipo_registrar(text, uuid, jsonb, uuid, text) to anon, authenticated;
grant execute on function public.cca_equipo_recordatorio(text, uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
