-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · Respuestas heredadas y eventos confirmados como ocupados
--
-- 1) Quien ya confirmó su calendario en un evento que CUBRE al nuevo (mismas fechas posibles y
--    mismo horario, o más amplio) queda como «respondió» en el nuevo, sin volver a marcar.
--    Si solo lo cubre en parte, sigue «sin respuesta» (de las fechas nuevas no sabemos nada),
--    pero sus días ocupados ya se aplican porque el calendario es de la persona.
-- 2) Un evento CONFIRMADO cuenta como ocupado para sus invitados en otros eventos, si el
--    horario choca (por ejemplo, la fiesta del gym del miércoles 16 a las 7:00 p. m.).
--
-- Requiere 20261112000000 … 20261116000000. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.sno_invitados add column if not exists heredado boolean not null default false;

-- ¿El evento f cubre todas las fechas y el horario posibles del evento e?
create or replace function public.sno_cubre(f public.sno_eventos, e public.sno_eventos) returns boolean
language sql immutable as $$
  select f.desde <= e.desde and f.hasta >= e.hasta and e.dias <@ f.dias
     and f.hora_inicio <= e.hora_inicio
     and coalesce(f.hora_fin, '24:00'::time) >= coalesce(e.hora_fin, '24:00'::time)
$$;

-- ¿La persona ya tiene otro evento confirmado ese día a una hora que choca?
create or replace function public.sno_ocupado_por_evento(p_persona uuid, p_fecha date, p_ini time, p_fin time, p_excluir uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from sno_eventos o join sno_invitados oi on oi.evento_id = o.id
                  where oi.persona_id = p_persona and o.id <> p_excluir and o.estado = 'confirmado'
                    and o.fecha_elegida = p_fecha and sno_choca(o.hora_inicio, o.hora_fin, p_ini, p_fin))
$$;

-- Al invitar a alguien: si ya respondió un evento que cubre a este, hereda la respuesta
create or replace function public.sno_heredar_respuesta() returns trigger
language plpgsql security definer set search_path = public as $$
declare e sno_eventos;
begin
  if new.respondio_en is not null then return new; end if;
  select * into e from sno_eventos where id = new.evento_id;
  if exists (select 1 from sno_invitados oi join sno_eventos f on f.id = oi.evento_id
              where oi.persona_id = new.persona_id and oi.evento_id <> new.evento_id
                and oi.respondio_en is not null and f.estado <> 'cancelado' and sno_cubre(f, e)) then
    new.respondio_en := now();
    new.heredado := true;
  end if;
  return new;
end $$;
drop trigger if exists sno_heredar_respuesta on public.sno_invitados;
create trigger sno_heredar_respuesta before insert on public.sno_invitados
  for each row execute function public.sno_heredar_respuesta();

-- Para los eventos que ya existen: aplicar la herencia a quien todavía no ha respondido
update public.sno_invitados i set respondio_en = now(), heredado = true
  from public.sno_eventos e
 where e.id = i.evento_id and i.respondio_en is null and e.estado = 'disponibilidad'
   and exists (select 1 from public.sno_invitados oi join public.sno_eventos f on f.id = oi.evento_id
                where oi.persona_id = i.persona_id and oi.evento_id <> i.evento_id
                  and oi.respondio_en is not null and f.estado <> 'cancelado' and public.sno_cubre(f, e));

-- Resultados: los eventos confirmados de cada invitado cuentan como «no puede»
create or replace function public.sno_resultados(p_evento uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e sno_eventos;
begin
  if not sno_es_admin() then raise exception 'sno:sin_permiso'; end if;
  select * into e from sno_eventos where id = p_evento;
  if not found then raise exception 'sno:evento_no_encontrado'; end if;
  return jsonb_build_object(
    'hoy', sno_hoy(),
    'fechas', coalesce((
      with f as (select fecha from sno_fechas_evento(e.id) fecha),
      x as (
        select f.fecha, i.persona_id, i.respondio_en is not null as resp,
               (exists (select 1 from sno_bloqueos b where b.persona_id = i.persona_id and b.fecha = f.fecha
                        and sno_choca(b.hora_desde, b.hora_hasta, e.hora_inicio, e.hora_fin))
                or sno_ocupado_por_evento(i.persona_id, f.fecha, e.hora_inicio, e.hora_fin, e.id)) as ocupado
          from f left join sno_invitados i on i.evento_id = e.id)
      select jsonb_agg(jsonb_build_object('fecha', fecha, 'pueden', pueden, 'no_pueden', no_pueden,
                                          'sin_respuesta', sin_respuesta,
                                          'eventos', (select jsonb_agg(distinct o.titulo) from sno_eventos o
                                                       join sno_invitados oi on oi.evento_id = o.id
                                                       join sno_invitados ei on ei.persona_id = oi.persona_id and ei.evento_id = e.id
                                                      where o.id <> e.id and o.estado = 'confirmado' and o.fecha_elegida = t.fecha
                                                        and sno_choca(o.hora_inicio, o.hora_fin, e.hora_inicio, e.hora_fin))) order by fecha)
        from (select fecha,
                     count(*) filter (where persona_id is not null and resp and not ocupado) as pueden,
                     count(*) filter (where persona_id is not null and ocupado) as no_pueden,
                     count(*) filter (where persona_id is not null and not resp and not ocupado) as sin_respuesta
                from x group by fecha) t), '[]'::jsonb),
    'votos', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', fecha, 'votos', n) order by n desc, fecha)
        from (select fecha, count(*) n from sno_votos where evento_id = e.id and ronda = e.ronda group by fecha) v), '[]'::jsonb),
    'invitados', coalesce((
      select jsonb_agg(jsonb_build_object('persona_id', p.id, 'nombre', p.nombre, 'telefono', p.telefono,
               'token', p.token, 'activo', p.activo, 'respondio_en', i.respondio_en, 'actualizado_en', p.actualizado_en,
               'heredado', i.heredado,
               'voto', exists (select 1 from sno_votos v where v.evento_id = e.id and v.persona_id = p.id and v.ronda = e.ronda))
               order by p.nombre)
        from sno_invitados i join sno_personas p on p.id = i.persona_id where i.evento_id = e.id), '[]'::jsonb));
end $$;

revoke all on function public.sno_ocupado_por_evento(uuid, date, time, time, uuid) from public, anon;

notify pgrst, 'reload schema';
