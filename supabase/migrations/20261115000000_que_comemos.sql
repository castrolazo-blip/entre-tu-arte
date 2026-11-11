-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · ¿Qué comemos? (dentro de cada evento)
--
-- Paso 1 (tipo 'modo'): ¿cocinamos, pedimos o mandamos hacer? Se vota o lo decide el administrador.
-- Paso 2 (tipo 'menu'): solo si se cocina o se pide, se vota qué comer entre las opciones del
-- administrador. Si se manda hacer, no hay votación: se ponen de acuerdo en el evento.
-- Un voto por persona (se puede cambiar mientras esté abierta). Los invitados ven los conteos,
-- nunca quién votó qué.
--
-- Requiere 20261112000000 … 20261114000000. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.sno_encuestas (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.sno_eventos(id) on delete cascade,
  tipo       text not null check (tipo in ('modo', 'menu')),
  opciones   text[] not null check (cardinality(opciones) between 1 and 12),
  estado     text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  resultado  text,                       -- la opción elegida al cerrar
  created_at timestamptz not null default now(),
  unique (evento_id, tipo),
  check (estado = 'abierta' or resultado is not null),
  check (resultado is null or resultado = any(opciones))
);

create table if not exists public.sno_encuesta_votos (
  encuesta_id uuid not null references public.sno_encuestas(id) on delete cascade,
  persona_id  uuid not null references public.sno_personas(id) on delete cascade,
  opcion      text not null,
  created_at  timestamptz not null default now(),
  primary key (encuesta_id, persona_id)
);

alter table public.sno_encuestas      enable row level security;
alter table public.sno_encuesta_votos enable row level security;
drop policy if exists sno_encuestas_admin on public.sno_encuestas;
create policy sno_encuestas_admin on public.sno_encuestas for all
  using (public.sno_es_admin()) with check (public.sno_es_admin());
-- sno_encuesta_votos: sin reglas; solo salen conteos por las funciones.

-- Participante: votar (o cambiar el voto)
create or replace function public.sno_votar_encuesta(p_token text, p_encuesta uuid, p_opcion text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid; q sno_encuestas;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  select * into q from sno_encuestas where id = p_encuesta;
  if not found or q.estado <> 'abierta' then raise exception 'sno:votacion_cerrada'; end if;
  if not (p_opcion = any(q.opciones)) then raise exception 'sno:opcion_invalida'; end if;
  if not exists (select 1 from sno_invitados where evento_id = q.evento_id and persona_id = v_persona) then
    raise exception 'sno:no_invitado';
  end if;
  insert into sno_encuesta_votos (encuesta_id, persona_id, opcion) values (p_encuesta, v_persona, p_opcion)
  on conflict (encuesta_id, persona_id) do update set opcion = excluded.opcion, created_at = now();
  update sno_personas set actualizado_en = now() where id = v_persona;
  return true;
end $$;

-- Administrador: conteos y quién falta por votar (no por qué votó cada quien)
create or replace function public.sno_resultados_comida(p_evento uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not sno_es_admin() then raise exception 'sno:sin_permiso'; end if;
  return coalesce((select jsonb_object_agg(q.tipo, jsonb_build_object(
      'id', q.id, 'estado', q.estado, 'opciones', to_jsonb(q.opciones), 'resultado', q.resultado,
      'conteo', coalesce((select jsonb_object_agg(opcion, n) from (select opcion, count(*) n from sno_encuesta_votos
                   where encuesta_id = q.id group by opcion) c), '{}'::jsonb),
      'votaron', (select count(*) from sno_encuesta_votos v where v.encuesta_id = q.id),
      'faltan', coalesce((select jsonb_agg(p.nombre order by p.nombre) from sno_invitados i join sno_personas p on p.id = i.persona_id
                   where i.evento_id = q.evento_id and not exists (select 1 from sno_encuesta_votos v
                     where v.encuesta_id = q.id and v.persona_id = i.persona_id)), '[]'::jsonb)))
    from sno_encuestas q where q.evento_id = p_evento), '{}'::jsonb);
end $$;

-- La agenda incluye «¿qué comemos?» de cada evento
create or replace function public.sno_agenda(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p sno_personas; v_hoy date := sno_hoy();
begin
  select * into p from sno_personas where token = p_token and activo;
  if not found then return jsonb_build_object('estado', 'no_encontrado'); end if;
  return jsonb_build_object(
    'estado', 'ok', 'hoy', v_hoy, 'nombre', p.nombre, 'deseo', p.deseo,
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'titulo', e.titulo, 'descripcion', e.descripcion, 'lugar', e.lugar,
        'desde', e.desde, 'hasta', e.hasta, 'dias', e.dias,
        'hora_inicio', to_char(e.hora_inicio, 'HH24:MI'), 'hora_fin', to_char(e.hora_fin, 'HH24:MI'),
        'fecha_limite', e.fecha_limite, 'estado', e.estado, 'ronda', e.ronda,
        'opciones', case when e.estado in ('votacion', 'cerrada') then to_jsonb(e.opciones) else '[]'::jsonb end,
        'fecha_elegida', e.fecha_elegida,
        'respondio', i.respondio_en is not null,
        'mi_voto', (select v.fecha from sno_votos v where v.evento_id = e.id and v.persona_id = p.id and v.ronda = e.ronda),
        'amigo', (select jsonb_build_object('id', s.id, 'monto', s.monto, 'mensaje', s.mensaje,
                    'fecha_intercambio', s.fecha_intercambio, 'estado', s.estado,
                    'participantes', (select count(*) from sno_sorteo_participantes x where x.sorteo_id = s.id),
                    'visto', sp.visto_en is not null)
                    from sno_sorteos s join sno_sorteo_participantes sp on sp.sorteo_id = s.id and sp.persona_id = p.id
                   where s.evento_id = e.id),
        'encargos', coalesce((select jsonb_agg(jsonb_build_object('id', en.id, 'nombre', en.nombre, 'detalle', en.detalle,
                    'cupos', en.cupos,
                    'responsables', coalesce((select jsonb_agg(jsonb_build_object('nombre', split_part(btrim(pr.nombre), ' ', 1),
                                       'yo', pr.id = p.id) order by r.created_at)
                                     from sno_encargo_responsables r join sno_personas pr on pr.id = r.persona_id
                                    where r.encargo_id = en.id), '[]'::jsonb)) order by en.orden, en.created_at)
                    from sno_encargos en where en.evento_id = e.id), '[]'::jsonb),
        'comida', (select jsonb_object_agg(q.tipo, jsonb_build_object('id', q.id, 'estado', q.estado,
                      'opciones', to_jsonb(q.opciones), 'resultado', q.resultado,
                      'mi_voto', (select v.opcion from sno_encuesta_votos v where v.encuesta_id = q.id and v.persona_id = p.id),
                      'conteo', coalesce((select jsonb_object_agg(opcion, n) from (select opcion, count(*) n from sno_encuesta_votos
                                   where encuesta_id = q.id group by opcion) c), '{}'::jsonb)))
                    from sno_encuestas q where q.evento_id = e.id)
      ) order by case e.estado when 'votacion' then 0 when 'disponibilidad' then 1 when 'cerrada' then 2 else 3 end,
                 coalesce(e.fecha_elegida, e.desde))
        from sno_invitados i join sno_eventos e on e.id = i.evento_id
       where i.persona_id = p.id and e.estado <> 'cancelado'
         and (e.estado <> 'confirmado' or e.fecha_elegida >= v_hoy - 30)), '[]'::jsonb),
    'bloqueos', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'fecha', b.fecha,
               'desde', to_char(b.hora_desde, 'HH24:MI'), 'hasta', to_char(b.hora_hasta, 'HH24:MI'))
               order by b.fecha, b.hora_desde nulls first)
        from sno_bloqueos b where b.persona_id = p.id and b.fecha >= v_hoy), '[]'::jsonb));
end $$;

revoke all on function public.sno_votar_encuesta(text, uuid, text) from public;
grant execute on function public.sno_votar_encuesta(text, uuid, text) to anon, authenticated;
revoke all on function public.sno_resultados_comida(uuid) from public, anon;
grant execute on function public.sno_resultados_comida(uuid) to authenticated;
grant execute on function public.sno_agenda(text) to anon, authenticated;

notify pgrst, 'reload schema';
