-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · Gastos (repartir lo que cada quien gastó en lo que llevó)
--
-- Cada responsable de un encargo registra cuánto gastó; la app suma, divide entre los invitados
-- que pagan (sno_invitados.paga; por defecto todos) y calcula quién le paga a quién.
-- Los montos y el cuadre los ven todos los invitados del evento (transparencia), solo con el
-- primer nombre. Nunca teléfonos.
--
-- Requiere 20261112000000 … 20261115000000. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.sno_encargo_responsables add column if not exists gasto numeric(10, 2);
alter table public.sno_encargo_responsables drop constraint if exists sno_encargo_responsables_gasto_check;
alter table public.sno_encargo_responsables add constraint sno_encargo_responsables_gasto_check
  check (gasto is null or (gasto >= 0 and gasto <= 100000));

-- ¿Entra en el reparto? (por ejemplo, un niño o un invitado especial no paga)
alter table public.sno_invitados add column if not exists paga boolean not null default true;

-- Participante: registra (o borra, con vacío) cuánto gastó en algo que lleva
create or replace function public.sno_registrar_gasto(p_token text, p_encargo uuid, p_monto numeric) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  if p_monto is not null and (p_monto < 0 or p_monto > 100000) then raise exception 'sno:monto_invalido'; end if;
  update sno_encargo_responsables set gasto = round(p_monto, 2)
   where encargo_id = p_encargo and persona_id = v_persona;
  if not found then raise exception 'sno:no_es_responsable'; end if;
  update sno_personas set actualizado_en = now() where id = v_persona;
  return true;
end $$;

-- La agenda incluye los gastos de cada encargo y el reparto del evento
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
                                       'yo', pr.id = p.id, 'gasto', r.gasto) order by r.created_at)
                                     from sno_encargo_responsables r join sno_personas pr on pr.id = r.persona_id
                                    where r.encargo_id = en.id), '[]'::jsonb)) order by en.orden, en.created_at)
                    from sno_encargos en where en.evento_id = e.id), '[]'::jsonb),
        'comida', (select jsonb_object_agg(q.tipo, jsonb_build_object('id', q.id, 'estado', q.estado,
                      'opciones', to_jsonb(q.opciones), 'resultado', q.resultado,
                      'mi_voto', (select v.opcion from sno_encuesta_votos v where v.encuesta_id = q.id and v.persona_id = p.id),
                      'conteo', coalesce((select jsonb_object_agg(opcion, n) from (select opcion, count(*) n from sno_encuesta_votos
                                   where encuesta_id = q.id group by opcion) c), '{}'::jsonb)))
                    from sno_encuestas q where q.evento_id = e.id),
        'reparto', (select jsonb_agg(jsonb_build_object('id', pi.id, 'nombre', split_part(btrim(pi.nombre), ' ', 1),
                      'yo', pi.id = p.id, 'paga', ii.paga,
                      'pagado', coalesce((select sum(r.gasto) from sno_encargo_responsables r join sno_encargos en on en.id = r.encargo_id
                                           where en.evento_id = e.id and r.persona_id = pi.id), 0)) order by pi.nombre)
                    from sno_invitados ii join sno_personas pi on pi.id = ii.persona_id where ii.evento_id = e.id)
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

revoke all on function public.sno_registrar_gasto(text, uuid, numeric) from public;
grant execute on function public.sno_registrar_gasto(text, uuid, numeric) to anon, authenticated;
grant execute on function public.sno_agenda(text) to anon, authenticated;

notify pgrst, 'reload schema';
